/**
 * Client-side tenant resolution (Phase 6, Model A).
 *
 * Each tenant reaches the app on its own hostname (e.g. `acme.app.com`), so the
 * tenant is derived from the URL — there is no tenant picker. For local
 * development (where everything is `localhost`) the slug can be overridden via,
 * in order of precedence:
 *   1. `?tenant=acme` query param (persisted to localStorage for the session)
 *   2. `REACT_APP_TENANT` build-time env
 *   3. the last value stashed in localStorage
 *
 * The resolved slug is sent as the `X-Tenant` header on every API call so the
 * backend routes to the right tenant even without a real subdomain.
 */
const BASE_DOMAIN = process.env.REACT_APP_BASE_DOMAIN || '';
const RESERVED = new Set(['www', 'api', 'app', 'admin']);
const DEV_KEY = 'devTenantSlug';

function isIp(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function slugFromHost(hostname) {
  if (!hostname || hostname === 'localhost' || isIp(hostname)) return null;

  if (BASE_DOMAIN && hostname.endsWith(`.${BASE_DOMAIN}`)) {
    const label = hostname.slice(0, -(BASE_DOMAIN.length + 1)).split('.')[0];
    return RESERVED.has(label) ? null : label || null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const label = parts[0];
    return RESERVED.has(label) ? null : label;
  }
  return null;
}

function slugFromDevOverride() {
  try {
    const qs = new URLSearchParams(window.location.search);
    const q = qs.get('tenant');
    if (q) {
      window.localStorage.setItem(DEV_KEY, q);
      return q;
    }
    if (process.env.REACT_APP_TENANT) return process.env.REACT_APP_TENANT;
    return window.localStorage.getItem(DEV_KEY);
  } catch {
    return null;
  }
}

let cachedSlug;

export function getTenantSlug() {
  if (cachedSlug !== undefined) return cachedSlug;
  cachedSlug = slugFromHost(window.location.hostname) || slugFromDevOverride() || null;
  return cachedSlug;
}

export function setDevTenantSlug(slug) {
  try {
    if (slug) window.localStorage.setItem(DEV_KEY, slug);
    else window.localStorage.removeItem(DEV_KEY);
  } catch {
    /* ignore */
  }
  cachedSlug = undefined;
}
