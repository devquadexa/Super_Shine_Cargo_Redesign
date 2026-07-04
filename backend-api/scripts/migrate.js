#!/usr/bin/env node
/**
 * Migration CLI with tenant fan-out.
 *
 *   node scripts/migrate.js --single           # legacy single DB (DB_* env)
 *   node scripts/migrate.js --catalog          # control-plane catalog DB
 *   node scripts/migrate.js --tenant <slug>    # one tenant DB
 *   node scripts/migrate.js --all-tenants      # every active tenant DB
 *   node scripts/migrate.js --catalog --all-tenants   # combine targets
 *
 * Applies the versioned + repeatable migrations from migrationManifest.js to
 * each selected target, recording state in each DB's SchemaMigrations table.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sql = require('mssql');
const runner = require('./lib/migrationRunner');
const manifest = require('./migrationManifest');
const catalog = require('../src/infrastructure/tenancy/catalog');

function parseArgs(argv) {
  const args = { tenants: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--single') args.single = true;
    else if (a === '--catalog') args.catalog = true;
    else if (a === '--all-tenants') args.allTenants = true;
    else if (a === '--tenant') { args.tenants.push(argv[++i]); }
    else { console.warn(`Unknown arg: ${a}`); }
  }
  return args;
}

function baseOptions() {
  return {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  };
}

function tenantConfig(tenant) {
  return {
    user: tenant.dbUser || process.env.DB_USER,
    password: tenant.dbPassword || process.env.DB_PASSWORD,
    server: tenant.dbServer || process.env.DB_SERVER,
    database: tenant.dbName,
    port: tenant.dbPort || parseInt(process.env.DB_PORT, 10) || 1433,
    options: baseOptions(),
  };
}

function singleConfig() {
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: baseOptions(),
  };
}

async function migrateTarget(config, sources, label) {
  const pool = await new sql.ConnectionPool(config).connect();
  try {
    return await runner.run(pool, { ...sources, label });
  } finally {
    await pool.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.single && !args.catalog && !args.allTenants && args.tenants.length === 0) {
    console.error('Nothing to do. Pass one of: --single | --catalog | --tenant <slug> | --all-tenants');
    process.exit(1);
  }

  const tenantSources = { versioned: manifest.tenantVersioned, repeatable: manifest.tenantRepeatable };

  if (args.catalog) {
    await migrateTarget(
      { ...singleConfig(), database: process.env.CATALOG_DB_DATABASE || 'SuperShineCargoCatalog' },
      { versioned: manifest.catalogVersioned },
      'catalog'
    );
  }

  if (args.single) {
    await migrateTarget(singleConfig(), tenantSources, `single:${process.env.DB_DATABASE}`);
  }

  const tenants = [];
  if (args.allTenants) {
    tenants.push(...await catalog.listActiveTenants());
  }
  for (const slug of args.tenants) {
    const t = await catalog.getTenantBySlug(slug);
    if (!t) { console.error(`Tenant not found or inactive: ${slug}`); process.exit(1); }
    tenants.push(t);
  }
  // De-dupe by tenantId.
  const seen = new Set();
  for (const t of tenants) {
    if (seen.has(t.tenantId)) continue;
    seen.add(t.tenantId);
    await migrateTarget(tenantConfig(t), tenantSources, `tenant:${t.slug}`);
  }

  console.log('\n✅ Migrations complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
