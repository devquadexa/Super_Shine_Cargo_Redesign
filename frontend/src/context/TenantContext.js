import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { tenantService } from '../api/services/tenantService';

/**
 * Tenant context (Phase 6, Model A).
 *
 * Loads the current tenant's public branding + feature flags (resolved by the
 * backend from the hostname) and applies the theme so the app presents itself as
 * that tenant's own application. Falls back to the default Super Shine Cargo
 * brand when running single-tenant or when a tenant has no custom branding.
 */
const DEFAULT_BRAND = {
  displayName: 'Super Shine Cargo',
  tagline: 'Sri Lankan Premier Cargo Solutions',
  logoUrl: null,
  primaryColor: '#1e3f63',
  accentColor: '#2f5e8f',
  features: {},
};

const TenantContext = createContext();

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
};

function applyBranding(brand) {
  const root = document.documentElement;
  if (brand.primaryColor) root.style.setProperty('--brand-primary', brand.primaryColor);
  if (brand.accentColor) root.style.setProperty('--brand-accent', brand.accentColor);
  if (brand.displayName) document.title = brand.displayName;
}

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [multiTenant, setMultiTenant] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await tenantService.getContext();
        if (!active) return;
        setMultiTenant(Boolean(data.multiTenant));
        setTenant(data.tenant || null);
      } catch {
        // Network/error → keep defaults; app still works with default branding.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Merge tenant branding over the default brand.
  const brand = useMemo(() => ({ ...DEFAULT_BRAND, ...(tenant || {}) }), [tenant]);

  useEffect(() => { applyBranding(brand); }, [brand]);

  // A feature is on unless explicitly set to false for this tenant.
  const hasFeature = (name, fallback = true) => {
    const features = (tenant && tenant.features) || {};
    if (!(name in features)) return fallback;
    return Boolean(features[name]);
  };

  // Allow the login flow to refresh branding from the authenticated response.
  const setTenantFromLogin = (t) => { if (t) setTenant(t); };

  const value = { tenant, brand, multiTenant, loading, hasFeature, setTenantFromLogin };
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};
