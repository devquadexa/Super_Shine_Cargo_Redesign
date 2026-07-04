/**
 * Tenant provisioning.
 *
 * Creates a new tenant database, runs all migrations (schema + stored
 * procedures) via the shared migration runner, seeds a super-admin user, and
 * registers the tenant in the catalog.
 *
 * Usage:
 *   node scripts/provision-tenant.js \
 *     --slug acme --name "Acme Cargo" \
 *     --db SuperShineCargo_acme \
 *     --admin-user admin --admin-password 'ChangeMe123!' \
 *     --admin-email admin@acme.example
 *
 * Requires the same DB_* env as the app, plus CATALOG_DB_* for the catalog.
 * The catalog database itself must already be migrated:
 *   node scripts/migrate.js --catalog
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const runner = require('./lib/migrationRunner');
const manifest = require('./migrationManifest');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function baseConfig(database) {
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      enableArithAbort: true,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  // Users.Email is NOT NULL, so an admin email is required (accept --admin-email or --email).
  const adminEmail = args['admin-email'] || args.email;
  const required = ['slug', 'name', 'db', 'admin-user', 'admin-password'];
  const missing = required.filter(k => !args[k]);
  if (!adminEmail) missing.push('admin-email');
  if (missing.length) {
    console.error(`Missing required args: ${missing.map(m => '--' + m).join(', ')}`);
    process.exit(1);
  }

  const tenantId = args.slug; // simple: tenantId == slug for the prototype
  const dbName = args.db;

  // 1) Create the tenant database (connect to master).
  console.log(`\n1) Creating database [${dbName}] ...`);
  const master = await new sql.ConnectionPool(baseConfig('master')).connect();
  await master.request().query(`IF DB_ID('${dbName}') IS NULL CREATE DATABASE [${dbName}];`);
  await master.close();

  // 2) Run all migrations (schema + stored procedures) into the tenant DB.
  console.log(`\n2) Running migrations into [${dbName}] ...`);
  const tenantPool = await new sql.ConnectionPool(baseConfig(dbName)).connect();
  await runner.run(tenantPool, {
    versioned: manifest.tenantVersioned,
    repeatable: manifest.tenantRepeatable,
    label: `tenant:${args.slug}`,
  });

  // 3) Seed the super-admin user.
  console.log(`\n3) Seeding super-admin '${args['admin-user']}' ...`);
  const hashed = await bcrypt.hash(args['admin-password'], 10);
  const nextId = await tenantPool.request().execute('usp_GenerateNextUserId');
  const userId = nextId.recordset[0].NextUserId;
  await tenantPool.request()
    .input('UserId', sql.VarChar(50), userId)
    .input('Username', sql.VarChar(100), args['admin-user'])
    .input('Password', sql.VarChar(255), hashed)
    .input('FullName', sql.VarChar(255), args.name + ' Admin')
    .input('Role', sql.VarChar(50), 'Super Admin')
    .input('Email', sql.VarChar(255), adminEmail)
    .input('CreatedDate', sql.DateTime, new Date())
    .input('IsActive', sql.Bit, true)
    .input('IsTemporaryPassword', sql.Bit, true)
    .input('PasswordResetRequired', sql.Bit, true)
    .input('LastPasswordChange', sql.DateTime, new Date())
    .execute('usp_CreateUser');
  await tenantPool.close();

  // 4) Register in the catalog + username directory.
  console.log('\n4) Registering tenant in catalog ...');
  const catalogDb = process.env.CATALOG_DB_DATABASE || 'SuperShineCargoCatalog';
  const catalogPool = await new sql.ConnectionPool(baseConfig(catalogDb)).connect();
  await catalogPool.request()
    .input('TenantId', sql.VarChar(50), tenantId)
    .input('Slug', sql.VarChar(100), args.slug)
    .input('Name', sql.VarChar(255), args.name)
    .input('DbName', sql.VarChar(128), dbName)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM Tenants WHERE TenantId = @TenantId)
        INSERT INTO Tenants (TenantId, Slug, Name, DbName, Status)
        VALUES (@TenantId, @Slug, @Name, @DbName, 'active');
    `);
  await catalogPool.request()
    .input('Username', sql.VarChar(100), args['admin-user'])
    .input('TenantId', sql.VarChar(50), tenantId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM TenantUserDirectory WHERE Username = @Username AND TenantId = @TenantId)
        INSERT INTO TenantUserDirectory (Username, TenantId) VALUES (@Username, @TenantId);
    `);
  await catalogPool.close();

  console.log(`\n✅ Tenant '${args.slug}' provisioned (db: ${dbName}, tenantId: ${tenantId}).`);
}

main().catch(err => {
  console.error('❌ Provisioning failed:', err);
  process.exit(1);
});
