/**
 * Ordered migration manifest.
 *
 * Existing SQL scripts are referenced in place (not moved) so their provenance
 * is preserved. Order matters for `versioned` entries — it is the dependency /
 * historical order in which they must be applied to a fresh database.
 *
 * See migrations/README.md for the scripts that were deliberately EXCLUDED
 * (non-portable / diagnostic / superseded) and why.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..'); // backend-api/
const p = (...rel) => path.join(ROOT, ...rel);

// Applied once each, in this exact order.
const tenantVersioned = [
  'migrations/tenant/V001__baseline_schema.sql', // portable baseline (schema only: tables/views/indexes/constraints)
  'migrations/tenant/V002__reconcile_schema_drift.sql', // columns added in prod after the export dump was taken
  'migrations/tenant/V003__seed_reference_data.sql', // non-PII lookups (districts/cities/categories/pay-item templates)

  // Payments feature + its incremental fixes (historical order).
  'create-payments-table.sql',
  'fix-payments-table.sql',
  'update-payments-schema.sql',
  'fix-payment-status-constraint.sql',
  'add-partial-payment-columns.sql',

  // Other feature tables.
  'create-transporter-payments-table.sql',
  'create-invoice-reviews-table.sql',
  'create-notifications-system.sql',

  // Password reset.
  'PASSWORD_RESET_DATABASE_SCRIPTS.sql',
  'add-password-reset-columns.sql',

  // Old invoices (OldInvoicePayments must exist before the bank/cheque alters).
  'src/config/CREATE_OLD_INVOICES_TABLE.sql',
  'src/config/ADD_BANK_FIELD_TO_PAYMENTS.sql',
  'src/config/ADD_CHEQUE_FIELDS_TO_PAYMENTS.sql',
  'fix-null-invoice-dates.sql',

  // Cash balance settlement + bills.
  'src/config/CREATE_CASH_BALANCE_SETTLEMENT_TABLE.sql',
  'src/config/ADD_PAYMENT_DETAILS_TO_BILLS.sql',
  'src/config/ADD_HAS_BILL_COLUMN.sql',

  // Petty cash grouping / parent-child structure.
  'expand-status-column.sql',
  'src/config/ADD_GROUPID_COLUMN.sql',
  'src/config/ADD_GROUP_ID_TO_PETTY_CASH_ASSIGNMENTS.sql',
  'src/config/ADD_PARENT_ASSIGNMENT_STRUCTURE.sql',
  'src/config/GROUPED_PETTY_CASH_MIGRATION.sql',
].map(rel => p(rel));

// Re-applied whenever their content changes. All stored procedures live at the
// backend-api root as usp_*.sql and are idempotent (DROP IF EXISTS + CREATE).
const tenantRepeatable = fs
  .readdirSync(ROOT)
  .filter(f => /^usp_.*\.sql$/.test(f))
  .sort()
  .map(f => p(f));

const catalogVersioned = [
  'migrations/catalog/V001__catalog_schema.sql',
  'migrations/catalog/V002__tenant_branding.sql', // per-tenant branding + feature flags
].map(rel => p(rel));

module.exports = { ROOT, tenantVersioned, tenantRepeatable, catalogVersioned };
