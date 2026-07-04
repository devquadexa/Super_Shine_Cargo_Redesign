/* ============================================================================
 * Control-Plane (Catalog) Database Schema
 * ----------------------------------------------------------------------------
 * This is the small central database the application ALWAYS knows how to reach.
 * It is the registry of tenants and (optionally) a username -> tenant directory
 * used to route logins when subdomain-based resolution is not available.
 *
 * Tenant business data lives in one physical database PER tenant; this catalog
 * only stores where each tenant's database is and how to connect to it.
 *
 * Apply once to the catalog database (see CATALOG_DB_DATABASE in .env).
 * ==========================================================================*/

IF OBJECT_ID('Tenants', 'U') IS NULL
BEGIN
    CREATE TABLE Tenants (
        TenantId      VARCHAR(50)  NOT NULL PRIMARY KEY,
        Slug          VARCHAR(100) NOT NULL,   -- subdomain / picker value, e.g. 'acme'
        Name          VARCHAR(255) NOT NULL,
        Status        VARCHAR(20)  NOT NULL DEFAULT 'active', -- active | suspended | provisioning

        -- Where this tenant's business database lives. Server/port/user/password
        -- are optional overrides; when NULL the app falls back to the default
        -- DB_* environment variables (same SQL Server, different database).
        DbName        VARCHAR(128) NOT NULL,
        DbServer      VARCHAR(255) NULL,
        DbPort        INT          NULL,
        DbUser        VARCHAR(128) NULL,
        DbPassword    VARCHAR(255) NULL,

        [Plan]        VARCHAR(50)  NULL,
        CreatedDate   DATETIME     NOT NULL DEFAULT GETDATE()
    );

    CREATE UNIQUE INDEX UX_Tenants_Slug   ON Tenants(Slug);
    CREATE UNIQUE INDEX UX_Tenants_DbName ON Tenants(DbName);
END;
GO

/* Optional: username -> tenant directory. Lets a user log in with just a
 * username/password (no subdomain / picker) by looking up their tenant here.
 * A username may exist in more than one tenant, hence no unique on Username. */
IF OBJECT_ID('TenantUserDirectory', 'U') IS NULL
BEGIN
    CREATE TABLE TenantUserDirectory (
        Username    VARCHAR(100) NOT NULL,
        TenantId    VARCHAR(50)  NOT NULL,
        CreatedDate DATETIME     NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_TenantUserDirectory PRIMARY KEY (Username, TenantId),
        CONSTRAINT FK_TenantUserDirectory_Tenant
            FOREIGN KEY (TenantId) REFERENCES Tenants(TenantId)
    );

    CREATE INDEX IX_TenantUserDirectory_Username ON TenantUserDirectory(Username);
END;
GO
