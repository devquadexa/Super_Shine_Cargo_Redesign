/**
 * Tenant resolution middleware.
 *
 * `tenantScope` opens a request-scoped async store so any downstream code can
 * read/set the active tenant. `tenantResolver` populates it from (in order):
 *   1. Subdomain      e.g. acme.app.com          -> slug 'acme'
 *   2. X-Tenant header                            -> slug
 *   3. Request body `tenantSlug` (login picker)   -> slug
 *
 * Authenticated requests are additionally (and authoritatively) resolved from
 * the JWT `tenantId` claim inside the auth middleware.
 *
 * All of this is a no-op unless MULTI_TENANT=true.
 */
const tenantContext = require('../../infrastructure/tenancy/tenantContext');
const catalog = require('../../infrastructure/tenancy/catalog');

const MULTI_TENANT = process.env.MULTI_TENANT === 'true';
const APP_BASE_DOMAIN = process.env.APP_BASE_DOMAIN || '';
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'app', 'admin']);

function isIpAddress(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function extractSlugFromHost(hostHeader) {
  if (!hostHeader) return null;
  const host = hostHeader.split(':')[0]; // strip port
  if (host === 'localhost' || isIpAddress(host)) return null;

  // With a configured base domain, take the label immediately in front of it.
  if (APP_BASE_DOMAIN && host.endsWith(`.${APP_BASE_DOMAIN}`)) {
    const sub = host.slice(0, -(APP_BASE_DOMAIN.length + 1));
    const label = sub.split('.')[0];
    return RESERVED_SUBDOMAINS.has(label) ? null : label || null;
  }

  // Fallback heuristic: treat the first label as the slug when there is one
  // (e.g. acme.example.com). Single/two-label hosts yield no slug.
  const parts = host.split('.');
  if (parts.length >= 3) {
    const label = parts[0];
    return RESERVED_SUBDOMAINS.has(label) ? null : label;
  }
  return null;
}

function resolveSlug(req) {
  return (
    extractSlugFromHost(req.headers.host) ||
    (req.headers['x-tenant'] ? String(req.headers['x-tenant']).trim() : null) ||
    (req.body && req.body.tenantSlug ? String(req.body.tenantSlug).trim() : null)
  );
}

// Opens the async store for the whole request lifecycle.
function tenantScope(req, res, next) {
  if (!MULTI_TENANT) return next();
  tenantContext.run(() => next());
}

async function tenantResolver(req, res, next) {
  if (!MULTI_TENANT) return next();

  try {
    const slug = resolveSlug(req);
    if (!slug) return next(); // may still be resolved from JWT by auth middleware

    const tenant = await catalog.getTenantBySlug(slug);
    if (!tenant) {
      return res.status(400).json({ message: `Unknown or inactive tenant: ${slug}` });
    }

    tenantContext.setTenant(tenant);
    req.tenant = tenant;
    return next();
  } catch (err) {
    console.error('Tenant resolution error:', err.message);
    return res.status(500).json({ message: 'Tenant resolution failed' });
  }
}

module.exports = { tenantScope, tenantResolver, resolveSlug };
