/**
 * Get Accounting Dashboard Use Case
 * Provides comprehensive financial overview for Super Admin
 */
class GetAccountingDashboard {
  constructor(jobRepository, billRepository, pettyCashAssignmentRepository, customerRepository) {
    this.jobRepository = jobRepository;
    this.billRepository = billRepository;
    this.pettyCashAssignmentRepository = pettyCashAssignmentRepository;
    this.customerRepository = customerRepository;
  }

  async execute(filters = {}) {
    const { fromDate, toDate } = filters || {};
    
    // Get all jobs with their financial data
    const jobs = await this.jobRepository.findAll();
    
    // Get all bills
    const bills = await this.billRepository.findAll();
    
    // Get all petty cash assignments
    const pettyCashAssignments = await this.pettyCashAssignmentRepository.findAll();
    
    // Get all customers
    const customers = await this.customerRepository.findAll();
    
    // Build job-wise financial data
    const jobFinancials = [];
    
    for (const job of jobs) {
      // Get bill for this job
      const jobBills = bills.filter(b => b.jobId === job.jobId);
      const bill = jobBills.length > 0 ? jobBills[0] : null;

      // Filter by date range if provided
      if (fromDate || toDate) {
        const rawDate = job.openDate || (bill ? bill.invoiceDate : null) || job.createdAt;
        if (!rawDate) continue;

        let dateStr = '';
        if (typeof rawDate === 'string') {
          dateStr = rawDate.split('T')[0];
        } else if (rawDate instanceof Date) {
          dateStr = rawDate.toISOString().split('T')[0];
        } else {
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) continue;
          dateStr = d.toISOString().split('T')[0];
        }

        if (fromDate && dateStr < fromDate) continue;
        if (toDate && dateStr > toDate) continue;
      }
      
      // Get ALL petty cash assignments for this job (not just the first one)
      const jobPettyCash = pettyCashAssignments.filter(pc => pc.jobId === job.jobId);
      const totalPettyCashIssued = jobPettyCash.reduce((sum, pc) => sum + (parseFloat(pc.assignedAmount || pc.amount || 0)), 0);
      
      // Calculate actual cost from pay items or bill
      const payItemsActualCost = job.payItems ? 
        job.payItems.reduce((sum, item) => sum + (parseFloat(item.actualCost) || 0), 0) : 0;
      const actualCost = payItemsActualCost || (bill ? parseFloat(bill.actualCost || 0) : 0);
      
      // Calculate billing amount (use billingAmount, fallback to grossTotal/amount/total/netTotal)
      const billingAmount = bill ? (parseFloat(bill.billingAmount) || parseFloat(bill.grossTotal) || parseFloat(bill.amount) || parseFloat(bill.total) || parseFloat(bill.netTotal) || 0) : 0;
      
      // Amount already paid
      const paidAmount = bill ? (parseFloat(bill.paidAmount) || 0) : 0;
      
      // Remaining outstanding for this bill (after advance payment deduction)
      const advancePaid = bill ? (parseFloat(bill.advancePayment) || 0) : 0;
      const netPayable = bill && bill.netTotal !== undefined && bill.netTotal !== null ? parseFloat(bill.netTotal) : Math.max(0, billingAmount - advancePaid);
      const remainingAmount = Math.max(0, (netPayable > 0 ? netPayable : billingAmount) - paidAmount);
      
      // Calculate profit (use bill.profit if available, otherwise billingAmount - actualCost)
      const profit = bill && bill.profit !== undefined && bill.profit !== null && !isNaN(parseFloat(bill.profit))
        ? parseFloat(bill.profit)
        : (billingAmount - actualCost);
      
      // Payment status
      const isPaid = bill ? bill.paymentStatus === 'Paid' : false;
      const isPartiallyPaid = bill ? bill.paymentStatus === 'Partially Paid' : false;
      const isOverdue = bill ? bill.isOverdue : false;
      
      // Calculate overdue days
      let overdueDays = 0;
      if (bill && bill.dueDate && !isPaid) {
        const dueDate = new Date(bill.dueDate);
        const today = new Date();
        if (today > dueDate) {
          overdueDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        }
      }
      
      // Get customer info
      const customer = customers.find(c => c.customerId === job.customerId);
      
      jobFinancials.push({
        jobId: job.jobId,
        customerId: job.customerId,
        customerName: customer ? customer.name : job.customerId,
        openDate: job.openDate,
        status: job.status,
        pettyCashIssued: totalPettyCashIssued,
        actualCost: actualCost,
        billingAmount: billingAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        profit: profit,
        isPaid: isPaid,
        isPartiallyPaid: isPartiallyPaid,
        isOverdue: isOverdue,
        overdueDays: overdueDays,
        invoiceDate: bill ? bill.invoiceDate : null,
        dueDate: bill ? bill.dueDate : null,
        billId: bill ? bill.billId : null
      });
    }
    
    // Calculate customer-wise outstanding
    const customerOutstanding = {};
    
    for (const customer of customers) {
      const customerJobs = jobFinancials.filter(j => j.customerId === customer.customerId);
      const unpaidJobs = customerJobs.filter(j => !j.isPaid && j.billingAmount > 0);
      
      // Use remainingAmount (billing - paid) instead of full billingAmount
      const totalOutstanding = unpaidJobs.reduce((sum, job) => sum + job.remainingAmount, 0);
      const overdueAmount = unpaidJobs
        .filter(j => j.isOverdue)
        .reduce((sum, job) => sum + job.remainingAmount, 0);
      
      if (totalOutstanding > 0) {
        customerOutstanding[customer.customerId] = {
          customerId: customer.customerId,
          customerName: customer.name,
          totalOutstanding: totalOutstanding,
          overdueAmount: overdueAmount,
          unpaidJobsCount: unpaidJobs.length,
          overdueJobsCount: unpaidJobs.filter(j => j.isOverdue).length,
          creditPeriodDays: customer.creditPeriodDays || 30
        };
      }
    }
    
    // Calculate summary statistics
    const summary = {
      totalJobs: jobs.length,
      totalPettyCashIssued: jobFinancials.reduce((sum, j) => sum + j.pettyCashIssued, 0),
      totalActualCost: jobFinancials.reduce((sum, j) => sum + j.actualCost, 0),
      totalBillingAmount: jobFinancials.reduce((sum, j) => sum + j.billingAmount, 0),
      totalProfit: jobFinancials.reduce((sum, j) => sum + j.profit, 0),
      totalPaid: jobFinancials.reduce((sum, j) => sum + j.paidAmount, 0),
      totalOutstanding: jobFinancials.filter(j => !j.isPaid).reduce((sum, j) => sum + j.remainingAmount, 0),
      totalOverdue: jobFinancials.filter(j => j.isOverdue).reduce((sum, j) => sum + j.remainingAmount, 0),
      paidJobsCount: jobFinancials.filter(j => j.isPaid).length,
      unpaidJobsCount: jobFinancials.filter(j => !j.isPaid && j.billingAmount > 0).length,
      overdueJobsCount: jobFinancials.filter(j => j.isOverdue).length
    };
    
    return {
      summary,
      jobFinancials,
      customerOutstanding: Object.values(customerOutstanding),
      filters: { fromDate: fromDate || null, toDate: toDate || null }
    };
  }
}

module.exports = GetAccountingDashboard;
