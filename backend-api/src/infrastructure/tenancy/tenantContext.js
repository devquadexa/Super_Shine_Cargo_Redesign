/**
 * Tenant Context (request-scoped)
 *
 * Uses Node's AsyncLocalStorage so the current tenant is available anywhere
 * downstream of a request WITHOUT threading `tenantId` through every use case
 * and repository. The connection manager (config/database.js) reads the active
 * tenant from here to pick the correct per-tenant database pool.
 *
 * Lifecycle per request:
 *   1. `tenantScope` middleware opens an (empty) store for the request.
 *   2. `tenantResolver` populates it from subdomain / header / body slug.
 *   3. `auth` middleware overrides it from the (authoritative) JWT claim.
 */
const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/**
 * Open a fresh store and run `fn` inside it. Everything awaited within `fn`
 * shares the same tenant slot.
 */
function run(fn, initialTenant = null) {
  return storage.run({ tenant: initialTenant }, fn);
}

/**
 * Run `fn` with an explicit tenant already set (used by background jobs that
 * fan out over every tenant).
 */
function runWithTenant(tenant, fn) {
  return storage.run({ tenant }, fn);
}

function setTenant(tenant) {
  const store = storage.getStore();
  if (!store) {
    throw new Error('Tenant context not initialized. Ensure tenantScope middleware runs first.');
  }
  store.tenant = tenant;
}

function getTenant() {
  const store = storage.getStore();
  return store ? store.tenant : null;
}

function getTenantOrThrow() {
  const tenant = getTenant();
  if (!tenant) {
    throw new Error('No tenant resolved for the current context.');
  }
  return tenant;
}

function hasStore() {
  return storage.getStore() !== undefined;
}

module.exports = {
  run,
  runWithTenant,
  setTenant,
  getTenant,
  getTenantOrThrow,
  hasStore,
};
