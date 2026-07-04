const sql = require('mssql');
const tenantContext = require('../infrastructure/tenancy/tenantContext');

const MULTI_TENANT = process.env.MULTI_TENANT === 'true';

// Validate required environment variables
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_SERVER', 'DB_DATABASE'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file in backend-api folder');
  process.exit(1);
}

const baseOptions = {
  encrypt: process.env.DB_ENCRYPT === 'true',
  trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  enableArithAbort: true,
};

const basePool = {
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
};

// Default (single-tenant / fallback) configuration from environment.
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: baseOptions,
  pool: basePool,
};

console.log('📊 Database Configuration:');
console.log(`   Mode: ${MULTI_TENANT ? 'multi-tenant (database-per-tenant)' : 'single-tenant'}`);
console.log(`   Server: ${config.server}:${config.port}`);
console.log(`   Default Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Encrypt: ${config.options.encrypt}`);

// ── Pool cache ────────────────────────────────────────────────────────────
// Legacy single-tenant mode reuses one pool (key '__default__'). Multi-tenant
// mode keeps one pool per tenant database, keyed by tenantId, created lazily.
const pools = new Map();
const MAX_POOLS = parseInt(process.env.MAX_TENANT_POOLS, 10) || 50;

function buildTenantConfig(tenant) {
  return {
    user: tenant.dbUser || config.user,
    password: tenant.dbPassword || config.password,
    server: tenant.dbServer || config.server,
    database: tenant.dbName,
    port: tenant.dbPort || config.port,
    options: baseOptions,
    pool: basePool,
  };
}

async function createPool(cfg) {
  const pool = await new sql.ConnectionPool(cfg).connect();
  return pool;
}

/**
 * Resolve the connection pool for the caller.
 * - Single-tenant mode: always the default DB (unchanged behavior).
 * - Multi-tenant mode: the pool for the tenant in the current async context.
 *   Throws if no tenant is in context (never silently leaks into a default DB).
 */
async function getConnection() {
  if (!MULTI_TENANT) {
    let pool = pools.get('__default__');
    if (!pool) {
      pool = await createPool(config);
      pools.set('__default__', pool);
      console.log('✅ Connected to MSSQL database');
      await runMigrations(pool);
    }
    return pool;
  }

  const tenant = tenantContext.getTenant();
  if (!tenant) {
    throw new Error(
      'No tenant resolved for this request. A tenant must be established (subdomain, ' +
      'X-Tenant header, login slug, or JWT claim) before any database access.'
    );
  }

  const key = tenant.tenantId;
  let pool = pools.get(key);
  if (!pool) {
    if (pools.size >= MAX_POOLS) {
      evictIdlePool();
    }
    pool = await createPool(buildTenantConfig(tenant));
    pools.set(key, pool);
    console.log(`✅ Connected to tenant DB '${tenant.dbName}' (tenant: ${tenant.tenantId})`);
  }
  return pool;
}

// Simple eviction: close and drop the first cached pool. A production system
// should track last-used timestamps; kept minimal for the prototype.
function evictIdlePool() {
  const firstKey = pools.keys().next().value;
  if (!firstKey || firstKey === '__default__') return;
  const pool = pools.get(firstKey);
  pools.delete(firstKey);
  if (pool) {
    pool.close().catch(err => console.error('Error evicting tenant pool:', err));
  }
}

const runMigrations = async (pool) => {
  try {
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.columns
        WHERE object_id = OBJECT_ID('PettyCashSettlementItems')
        AND name = 'hasBill'
      )
      BEGIN
        ALTER TABLE PettyCashSettlementItems
        ADD hasBill BIT NOT NULL DEFAULT 0;
        PRINT 'Migration: Added hasBill column to PettyCashSettlementItems';
      END
    `);
    const check = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM sys.columns
      WHERE object_id = OBJECT_ID('PettyCashSettlementItems') AND name = 'hasBill'
    `);
    const exists = check.recordset[0].cnt === 1;
    console.log('✅ Database migrations applied. hasBill column exists:', exists);
  } catch (err) {
    console.error('❌ Migration FAILED:', err.message);
  }
};

const closeConnection = async () => {
  try {
    for (const [key, pool] of pools.entries()) {
      await pool.close();
      pools.delete(key);
    }
    console.log('Database connection(s) closed');
  } catch (err) {
    console.error('Error closing database connection:', err);
  }
};

module.exports = {
  sql,
  getConnection,
  closeConnection,
  runMigrations,
  MULTI_TENANT,
};
