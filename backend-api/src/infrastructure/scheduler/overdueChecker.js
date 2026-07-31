/**
 * Overdue Invoice Checker Scheduler
 * Runs daily at midnight to check for overdue invoices.
 *
 * In multi-tenant mode the check fans out over every active tenant, running
 * each pass inside that tenant's async context so DB access targets the right
 * database.
 */
const cron = require('node-cron');
const tenantContext = require('../tenancy/tenantContext');
const catalog = require('../tenancy/catalog');

const MULTI_TENANT = process.env.MULTI_TENANT === 'true';

async function runForCurrentContext(container) {
  const checkOverdueInvoices = container.get('checkOverdueInvoices');
  const result = await checkOverdueInvoices.execute();
  console.log(`✅ Overdue check complete: ${result.updatedCount} jobs updated to Overdue status`);
  if (result.updatedJobs.length > 0) {
    console.log('Updated jobs:', result.updatedJobs);
  }
}

async function runOverdueCheck(container) {
  console.log('=== Running overdue invoice check ===');
  console.log('Time:', new Date().toISOString());

  if (!MULTI_TENANT) {
    await runForCurrentContext(container);
    return;
  }

  const tenants = await catalog.listActiveTenants();
  console.log(`Fanning out overdue check across ${tenants.length} tenant(s)`);
  for (const tenant of tenants) {
    try {
      await tenantContext.runWithTenant(tenant, () => runForCurrentContext(container));
    } catch (err) {
      console.error(`❌ Overdue check failed for tenant ${tenant.tenantId}:`, err.message);
    }
  }
}

function startOverdueChecker(container) {
  cron.schedule('0 0 * * *', async () => {
    try {
      await runOverdueCheck(container);
    } catch (error) {
      console.error('❌ Error checking overdue invoices:', error);
    }
  });

  console.log('✅ Overdue invoice checker scheduled (runs daily at midnight)');
}

module.exports = { startOverdueChecker, runOverdueCheck };
