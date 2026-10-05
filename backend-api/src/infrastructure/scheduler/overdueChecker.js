/**
 * Overdue Invoice Checker Scheduler
 * Runs daily at midnight to check for overdue invoices
 */
const cron = require('node-cron');

function startOverdueChecker(container) {
  // Run every day at midnight (0 0 * * *)
  // For testing, you can use '*/5 * * * *' to run every 5 minutes
  cron.schedule('0 0 * * *', async () => {
    try {
      const checkOverdueInvoices = container.get('checkOverdueInvoices');
      const result = await checkOverdueInvoices.execute();
      
      if (result.updatedCount > 0) {
        console.log(`✅ Overdue check complete: ${result.updatedCount} jobs updated to Overdue status`);
      }
    } catch (error) {
      console.error('❌ Error checking overdue invoices:', error);
    }
  });
  
  console.log('✅ Overdue invoice checker scheduled (runs daily at midnight)');
  console.log('   Schedule: 0 0 * * * (midnight every day)');
}

module.exports = { startOverdueChecker };
