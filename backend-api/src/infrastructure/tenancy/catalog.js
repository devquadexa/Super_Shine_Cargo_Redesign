/**
 * Catalog (control-plane) access.
 *
 * Owns a dedicated connection pool to the catalog database and exposes tenant
 * lookups used by the resolver, the auth middleware and background jobs.
 * Lookups are cached in-memory (short TTL) so per-request tenant resolution
 * does not hit the catalog DB every time.
 */
const sql = require('mssql');

const CACHE_TTL_MS = parseInt(process.env.TENANT_CACHE_TTL_MS, 10) || 60000;

const catalogConfig = {
  user: process.env.CATALOG_DB_USER || process.env.DB_USER,
  password: process.env.CATALOG_DB_PASSWORD || process.env.DB_PASSWORD,
  server: process.env.CATALOG_DB_SERVER || process.env.DB_SERVER,
  database: process.env.CATALOG_DB_DATABASE || 'SuperShineCargoCatalog',
  port: parseInt(process.env.CATALOG_DB_PORT, 10) || parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
};

let catalogPool = null;

// tenantId/slug -> { tenant, expiresAt }
const cache = new Map();

async function getCatalogConnection() {
  if (!catalogPool) {
    catalogPool = await new sql.ConnectionPool(catalogConfig).connect();
  }
  return catalogPool;
}

function parseFeatures(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    tenantId: row.TenantId,
    slug: row.Slug,
    name: row.Name,
    status: row.Status,
    dbName: row.DbName,
    dbServer: row.DbServer,
    dbPort: row.DbPort,
    dbUser: row.DbUser,
    dbPassword: row.DbPassword,
    plan: row.Plan,
    // Branding + feature flags (may be null on tenants provisioned before V002).
    displayName: row.DisplayName,
    tagline: row.Tagline,
    logoUrl: row.LogoUrl,
    primaryColor: row.PrimaryColor,
    accentColor: row.AccentColor,
    features: parseFeatures(row.Features),
  };
}

/**
 * Public, credential-free view of a tenant: only what the browser may see
 * before login (branding + feature flags). NEVER includes DB connection info.
 */
function toPublicTenant(tenant) {
  if (!tenant) return null;
  return {
    slug: tenant.slug,
    name: tenant.name,
    displayName: tenant.displayName || tenant.name,
    tagline: tenant.tagline || null,
    logoUrl: tenant.logoUrl || null,
    primaryColor: tenant.primaryColor || null,
    accentColor: tenant.accentColor || null,
    features: tenant.features || {},
  };
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.tenant;
}

function cacheSet(tenant) {
  if (!tenant) return;
  const expiresAt = Date.now() + CACHE_TTL_MS;
  cache.set(`id:${tenant.tenantId}`, { tenant, expiresAt });
  cache.set(`slug:${tenant.slug}`, { tenant, expiresAt });
}

async function getTenantBySlug(slug) {
  if (!slug) return null;
  const cached = cacheGet(`slug:${slug}`);
  if (cached !== undefined) return cached;

  const pool = await getCatalogConnection();
  const result = await pool.request()
    .input('Slug', sql.VarChar(100), slug)
    .query('SELECT * FROM Tenants WHERE Slug = @Slug AND Status = \'active\'');

  const tenant = mapRow(result.recordset[0]);
  cacheSet(tenant);
  return tenant;
}

async function getTenantById(tenantId) {
  if (!tenantId) return null;
  const cached = cacheGet(`id:${tenantId}`);
  if (cached !== undefined) return cached;

  const pool = await getCatalogConnection();
  const result = await pool.request()
    .input('TenantId', sql.VarChar(50), tenantId)
    .query('SELECT * FROM Tenants WHERE TenantId = @TenantId AND Status = \'active\'');

  const tenant = mapRow(result.recordset[0]);
  cacheSet(tenant);
  return tenant;
}

/** Directory lookup: which tenant(s) a username belongs to (login routing). */
async function findTenantsForUsername(username) {
  if (!username) return [];
  const pool = await getCatalogConnection();
  const result = await pool.request()
    .input('Username', sql.VarChar(100), username)
    .query(`
      SELECT t.*
      FROM TenantUserDirectory d
      INNER JOIN Tenants t ON t.TenantId = d.TenantId
      WHERE d.Username = @Username AND t.Status = 'active'
    `);
  return result.recordset.map(mapRow);
}

async function listActiveTenants() {
  const pool = await getCatalogConnection();
  const result = await pool.request()
    .query('SELECT * FROM Tenants WHERE Status = \'active\'');
  return result.recordset.map(mapRow);
}

function clearCache() {
  cache.clear();
}

module.exports = {
  getCatalogConnection,
  getTenantBySlug,
  getTenantById,
  findTenantsForUsername,
  listActiveTenants,
  toPublicTenant,
  clearCache,
};
