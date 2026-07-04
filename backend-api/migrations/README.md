# Migrations

Versioned + repeatable SQL migrations applied by `scripts/migrate.js` (runner in
`scripts/lib/migrationRunner.js`, ordering in `scripts/migrationManifest.js`).

## Layout
- `catalog/` — control-plane (tenant registry) database schema.
- `tenant/V001__baseline_schema.sql` — portable, **schema-only** baseline for a
  tenant business DB: tables, views, indexes, constraints, defaults, FKs and the
  `sp_*` programmables. Extracted from `export.sql` with the non-portable SSMS
  preamble removed (CREATE DATABASE + machine paths, `ALTER DATABASE SET…`,
  `CREATE USER` / `ALTER ROLE`, `USE` statements) **and all `INSERT` data
  removed** — the export was a live DB dump, so it carried real customer/job/
  bill/user rows that must never seed a new tenant.
- `tenant/V002__reconcile_schema_drift.sql` — adds columns that were introduced
  in production (via ad-hoc `ALTER`s that were never committed) *after* the
  export was taken, and which the stored procedures require: `Jobs.CUSDECDate` /
  `chassisNumber` / `transportDeliveryDate`, `OfficePayItems.hasBill`, and
  `Transporters.lorryNumber` / `transporterType` / `driverName` / `size`. Each
  `ALTER` is `COL_LENGTH`-guarded so it is idempotent. Without this, creating the
  procs on a fresh DB fails with `Invalid column name`.
- `tenant/V003__seed_reference_data.sql` — non-PII lookup seed a fresh tenant
  needs: `Districts`, `Cities`, `Categories`, `PayItemTemplates` (the only data
  kept from the export; ordered so `Districts` precedes `Cities` for the FK).
- `tenant/repeatable/` — reserved for repeatable migrations. Currently the stored
  procedures are referenced in place from the backend-api root (`usp_*.sql`) via
  the manifest; they are re-applied whenever their content changes.

## Kinds
- **versioned**: applied exactly once, in manifest order, tracked by filename in
  each database's `SchemaMigrations` table.
- **repeatable**: re-applied whenever the file checksum changes (stored procs are
  idempotent `DROP IF EXISTS` + `CREATE`).

## Running
```bash
node scripts/migrate.js --catalog          # migrate the catalog DB
node scripts/migrate.js --single           # legacy single DB (DB_* env)
node scripts/migrate.js --tenant acme      # one tenant
node scripts/migrate.js --all-tenants      # every active tenant
```

## Applied incremental scripts
The manifest replays the historical incremental scripts (payments, notifications,
transporter payments, invoice reviews, password reset, old invoices, cash-balance
settlement, petty-cash grouping) in dependency order on top of the baseline. They
are guarded with `IF [NOT] EXISTS`, so re-running is safe.

## Verified end-to-end
Provisioning two tenants from a clean server (`migrate --catalog`, which now
bootstraps the catalog DB, then `provision-tenant` for each) installs all 208
stored procedures with **zero** production rows (only the reference lookups +
the seeded admin), and a tenant-isolation test confirms one tenant's token
cannot read another's data.

## ⚠️ Deliberately EXCLUDED scripts (need manual reconciliation)
These existing scripts are **not** in the manifest because they are unsafe to
replay verbatim on a fresh database. The team should reconcile them before
production use:

| Script | Problem |
|---|---|
| `src/config/DROP_CUSTOMER_EMAIL_UNIQUE_CONSTRAINT.sql` | Drops a constraint by its **auto-generated name** (`UQ__Customer__A9D1…`), which differs per database. Needs a dynamic drop (look up the constraint name from `sys.key_constraints`). |
| `create-notifications-table.sql` | Creates a lowercase `notifications` table — **competes** with `create-notifications-system.sql` (`Notifications`). Superseded. |
| `fix-notifications-table.sql`, `check-and-fix-notifications.sql`, `verify-notifications-table.sql` | Diagnostic / contain hardcoded `USE SuperShineCargoDb`. Not migrations. |
| `src/config/ADD_PARENT_ASSIGNMENT_STRUCTURE_SIMPLE.sql` | Duplicate of `ADD_PARENT_ASSIGNMENT_STRUCTURE.sql`. Only one should run. |
| `src/config/FIX_GROUPING_COMPLETE.sql` | Contains `USE` + overlaps `GROUPED_PETTY_CASH_MIGRATION.sql`; partly diagnostic. |

> The runner strips standalone `USE [db]` statements defensively, but the
> competing-definition and hardcoded-name issues above require human judgement.

This whole chain is a faithful **reconstruction** from ad-hoc scripts and must be
validated against a staging database before being used to provision real tenants.
