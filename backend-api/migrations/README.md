# Migrations

Versioned + repeatable SQL migrations applied by `scripts/migrate.js` (runner in
`scripts/lib/migrationRunner.js`, ordering in `scripts/migrationManifest.js`).

## Layout
- `catalog/` — control-plane (tenant registry) database schema.
- `tenant/V001__baseline_schema.sql` — portable baseline for a tenant business
  DB: tables, views, indexes, constraints, defaults, FKs and the `sp_*`
  programmables. Extracted from `export.sql` with the non-portable SSMS preamble
  removed (CREATE DATABASE + machine paths, `ALTER DATABASE SET…`, `CREATE USER`
  / `ALTER ROLE`, `USE` statements).
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
