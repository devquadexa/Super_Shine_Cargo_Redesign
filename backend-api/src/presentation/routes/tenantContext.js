/**
 * Public (pre-login, no auth) tenant context.
 *
 *   GET /api/tenant/context
 *
 * Returns the credential-free branding + feature flags for the tenant resolved
 * from the request (subdomain -> X-Tenant header -> ?tenant= query). The browser
 * uses this to theme the login screen as the tenant's own application before any
 * user has authenticated. DB connection details are never exposed here.
 *
 * When MULTI_TENANT is disabled it returns a single-tenant default so the same
 * frontend code works unchanged.
 */
const express = require('express');
const tenantContext = require('../../infrastructure/tenancy/tenantContext');
const catalog = require('../../infrastructure/tenancy/catalog');
const { resolveSlug } = require('../middleware/tenantResolver');

const MULTI_TENANT = process.env.MULTI_TENANT === 'true';

const router = express.Router();

router.get('/context', async (req, res) => {
  if (!MULTI_TENANT) {
    return res.json({ multiTenant: false, tenant: null });
  }

  try {
    // tenantResolver may already have resolved + cached the tenant on req.
    let tenant = req.tenant || tenantContext.getTenant();
    if (!tenant) {
      const slug = resolveSlug(req);
      if (slug) tenant = await catalog.getTenantBySlug(slug);
    }

    if (!tenant) {
      // No tenant for this host yet — let the UI show generic branding.
      return res.json({ multiTenant: true, tenant: null });
    }

    return res.json({ multiTenant: true, tenant: catalog.toPublicTenant(tenant) });
  } catch (err) {
    console.error('Tenant context error:', err.message);
    return res.status(500).json({ message: 'Failed to load tenant context' });
  }
});

module.exports = router;
