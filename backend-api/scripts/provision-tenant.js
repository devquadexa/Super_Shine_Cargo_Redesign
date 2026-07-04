/**
 * Tenant provisioning (phase 4 starter).
 *
 * Creates a new tenant database, deploys the schema + all stored procedures,
 * seeds a super-admin user, and registers the tenant in the catalog.
 *
 * Usage:
 *   node scripts/provision-tenant.js \
 *     --slug acme --name "Acme Cargo" \
 *     --db SuperShineCargo_acme \
 *     --admin-user admin --admin-password 'ChangeMe123!'
 *
 * Requires the same DB_* env as the app, plus CATALOG_DB_* for the catalog.
 * NOTE: a clean table-schema SQL file is required (TENANT_SCHEMA_SQL). The
 * committed export.sql is an SSMS dump with machine-specific paths and is NOT
 * suitable here — extract a portable schema.sql as part of adopting this.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

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

// mssql cannot execute a script containing multiple `GO` batch separators in a
// single request, so split on GO and run each batch sequentially.
async function runSqlFile(pool, filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`   (skip, not found) ${filePath}`);
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const batches = raw.split(/^\s*GO\s*$/gim).map(b => b.trim()).filter(Boolean);
  for (const batch of batches) {
    await pool.request().batch(batch);
  }
  console.log(`   applied ${path.basename(filePath)} (${batches.length} batches)`);
}

async function deployProcedures(pool) {
  const backendRoot = path.join(__dirname, '..');
  const procFiles = fs.readdirSync(backendRoot).filter(f => /^usp_.*\.sql$/.test(f));
  for (const f of procFiles) {
    await runSqlFile(pool, path.join(backendRoot, f));
  }
  // Runtime migrations kept under src/config
  const configDir = path.join(backendRoot, 'src', 'config');
  if (fs.existsSync(configDir)) {
    for (const f of fs.readdirSync(configDir).filter(f => /\.sql$/.test(f) && f !== 'catalog-schema.sql')) {
      await runSqlFile(pool, path.join(configDir, f));
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const required = ['slug', 'name', 'db', 'admin-user', 'admin-password'];
  const missing = required.filter(k => !args[k]);
  if (missing.length) {
    console.error(`Missing required args: ${missing.map(m => '--' + m).join(', ')}`);
    process.exit(1);
  }

  const tenantId = args.slug; // simple: tenantId == slug for the prototype
  const dbName = args.db;

  // 1) Create the tenant database (connect to master).
  console.log(`\n1) Creating database [${dbName}] ...`);
  let master = await new sql.ConnectionPool(baseConfig('master')).connect();
  await master.request().query(
    `IF DB_ID('${dbName}') IS NULL CREATE DATABASE [${dbName}];`
  );
  await master.close();

  // 2) Deploy schema + procedures into the tenant DB.
  console.log(`\n2) Deploying schema + procedures into [${dbName}] ...`);
  const tenantPool = await new sql.ConnectionPool(baseConfig(dbName)).connect();
  const schemaFile = process.env.TENANT_SCHEMA_SQL;
  if (schemaFile) {
    await runSqlFile(tenantPool, path.resolve(schemaFile));
  } else {
    console.warn('   TENANT_SCHEMA_SQL not set — tables must already exist or be created separately.');
  }
  await deployProcedures(tenantPool);

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
    .input('Email', sql.VarChar(255), args.email || null)
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
