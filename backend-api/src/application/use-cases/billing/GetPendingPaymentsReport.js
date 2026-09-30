/**
 * Get Pending Payments Report
 * Retrieves all pending/unpaid invoices with optional date range and overdue filter
 */
class GetPendingPaymentsReport {
  constructor(billRepository) {
    this.billRepository = billRepository;
  }

  async execute(fromDate, toDate, showOverdueOnly = false) {
    if (typeof this.billRepository.getPendingPaymentsReport === 'function') {
      return this.billRepository.getPendingPaymentsReport(fromDate, toDate, showOverdueOnly);
    }
    throw new Error('getPendingPaymentsReport is not supported by the active bill repository');
  }
}

module.exports = GetPendingPaymentsReport;
