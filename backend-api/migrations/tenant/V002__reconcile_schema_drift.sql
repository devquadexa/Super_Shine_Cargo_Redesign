/*
 * Reconcile schema drift between the exported baseline (V001) and the current
 * stored procedures.
 *
 * The baseline was extracted from an SSMS export taken before several columns
 * were added in production via ad-hoc ALTER scripts that were never committed.
 * The stored procedures (usp_*.sql) reference those columns, so a fresh tenant
 * DB built from V001 alone fails to create the procs. Each ALTER below is
 * guarded (COL_LENGTH ... IS NULL) so it is safe to re-run and safe on DBs that
 * already have the column.
 */

-- Jobs: columns referenced by usp_CreateJob / usp_UpdateJob / usp_Payments.
IF COL_LENGTH('dbo.Jobs', 'CUSDECDate') IS NULL
    ALTER TABLE dbo.Jobs ADD CUSDECDate DATE NULL;
GO
IF COL_LENGTH('dbo.Jobs', 'chassisNumber') IS NULL
    ALTER TABLE dbo.Jobs ADD chassisNumber NVARCHAR(100) NULL;
GO
IF COL_LENGTH('dbo.Jobs', 'transportDeliveryDate') IS NULL
    ALTER TABLE dbo.Jobs ADD transportDeliveryDate DATE NULL;
GO

-- OfficePayItems: column referenced by usp_CreateOfficePayItem / usp_UpdateOfficePayItem.
IF COL_LENGTH('dbo.OfficePayItems', 'hasBill') IS NULL
    ALTER TABLE dbo.OfficePayItems ADD hasBill BIT NOT NULL DEFAULT (0);
GO

-- Transporters: columns referenced by usp_CreateTransporter / usp_UpdateTransporter.
IF COL_LENGTH('dbo.Transporters', 'lorryNumber') IS NULL
    ALTER TABLE dbo.Transporters ADD lorryNumber NVARCHAR(100) NULL;
GO
IF COL_LENGTH('dbo.Transporters', 'transporterType') IS NULL
    ALTER TABLE dbo.Transporters ADD transporterType NVARCHAR(50) NULL;
GO
IF COL_LENGTH('dbo.Transporters', 'driverName') IS NULL
    ALTER TABLE dbo.Transporters ADD driverName NVARCHAR(200) NULL;
GO
IF COL_LENGTH('dbo.Transporters', 'size') IS NULL
    ALTER TABLE dbo.Transporters ADD size NVARCHAR(100) NULL;
GO
