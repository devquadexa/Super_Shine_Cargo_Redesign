/* ============================================================================
 * Catalog: per-tenant branding + feature flags (Phase 6, Model A)
 * ----------------------------------------------------------------------------
 * Adds the configuration that lets one shared deployment present itself as each
 * tenant's own application: display name, logo, theme colours and a JSON blob of
 * feature flags. This is read (credential-free) by the public tenant-context
 * endpoint before login so the UI can theme itself per hostname.
 *
 * All columns are nullable so existing rows keep working (the app falls back to
 * default branding when a value is missing). Guarded so the migration is safe
 * to re-run.
 * ==========================================================================*/

IF COL_LENGTH('dbo.Tenants', 'DisplayName') IS NULL
    ALTER TABLE dbo.Tenants ADD DisplayName VARCHAR(255) NULL;
GO
IF COL_LENGTH('dbo.Tenants', 'Tagline') IS NULL
    ALTER TABLE dbo.Tenants ADD Tagline VARCHAR(255) NULL;
GO
IF COL_LENGTH('dbo.Tenants', 'LogoUrl') IS NULL
    ALTER TABLE dbo.Tenants ADD LogoUrl VARCHAR(500) NULL;
GO
IF COL_LENGTH('dbo.Tenants', 'PrimaryColor') IS NULL
    ALTER TABLE dbo.Tenants ADD PrimaryColor VARCHAR(20) NULL;
GO
IF COL_LENGTH('dbo.Tenants', 'AccentColor') IS NULL
    ALTER TABLE dbo.Tenants ADD AccentColor VARCHAR(20) NULL;
GO
-- JSON object of feature flags, e.g. {"transporters":true,"oldInvoices":false}.
IF COL_LENGTH('dbo.Tenants', 'Features') IS NULL
    ALTER TABLE dbo.Tenants ADD Features NVARCHAR(MAX) NULL;
GO
