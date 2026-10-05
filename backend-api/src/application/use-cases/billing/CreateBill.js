/**
 * Create Bill Use Case
 * 
 * Business Rules:
 * - A job can only have ONE bill. The bill number stays the same for a job.
 * - If a bill already exists for the job (unpaid), it will be replaced/updated with new data.
 * - If a bill already exists and is Paid, no new bill can be generated.
 */
const Bill = require('../../../domain/entities/Bill');

class CreateBill {
  constructor(billRepository, jobRepository, customerRepository, pettyCashAssignmentRepository) {
    this.billRepository = billRepository;
    this.jobRepository = jobRepository;
    this.customerRepository = customerRepository;
    this.pettyCashAssignmentRepository = pettyCashAssignmentRepository;
  }

  async execute(billData) {
    // Verify job exists
    const job = await this.jobRepository.findById(billData.jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Check if a bill already exists for this job
    const existingBills = await this.billRepository.findByJob(billData.jobId);
    const existingBill = existingBills.length > 0 ? existingBills[0] : null;

    if (existingBill) {
      // If the existing bill is paid or partially paid, return a status message (not an error)
      if (existingBill.paymentStatus === 'Paid' || existingBill.paymentStatus === 'Partially Paid' || parseFloat(existingBill.paidAmount || 0) > 0) {
        return { 
          blocked: true, 
          message: `Bill is ${existingBill.paymentStatus.toLowerCase()} and cannot be updated`,
          billId: existingBill.billId,
          paymentStatus: existingBill.paymentStatus
        };
      }

      // Update existing bill instead of creating a new one
      return await this._updateExistingBill(existingBill, billData, job);
    }

    // No existing bill — create a new one
    return await this._createNewBill(billData, job);
  }

  async _updateExistingBill(existingBill, billData, job) {
    // Get customer to fetch credit period
    const customer = await this.customerRepository.findById(job.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const actualCost = billData.actualCost || 0;
    const billingAmount = billData.billingAmount || 0;
    const advancePayment = job.advancePayment || 0;

    // Recalculate invoice date and due date
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + (customer.creditPeriodDays || 30));

    // Build updated bill data
    const grossTotal = billingAmount;
    const netTotal = Math.max(0, billingAmount - advancePayment);
    const profit = billingAmount - actualCost;

    // Update the existing bill record in the database (keep same BillId)
    const updatedBill = await this.billRepository.replaceBill(existingBill.billId, {
      customerId: job.customerId,
      amount: billingAmount,
      actualCost: actualCost,
      billingAmount: billingAmount,
      advancePayment: advancePayment,
      grossTotal: grossTotal,
      netTotal: netTotal,
      profit: profit,
      tax: 0,
      total: netTotal,
      invoiceNumber: billData.invoiceNumber || existingBill.invoiceNumber || null,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      isOverdue: false,
      paymentStatus: 'Unpaid'
    });

    // Update job status to "Pending Payment"
    await this.jobRepository.updateStatus(billData.jobId, 'Pending Payment');

    // Close all petty cash assignments for this job
    try {
      await this.pettyCashAssignmentRepository.closeAllByJob(billData.jobId);
    } catch (err) {
      console.error('CreateBill - Failed to close petty cash assignments:', err.message);
    }

    return updatedBill;
  }

  async _createNewBill(billData, job) {
    // Get customer to fetch credit period
    const customer = await this.customerRepository.findById(job.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Calculate actual cost from pay items
    const actualCost = billData.actualCost || 0;
    const billingAmount = billData.billingAmount || 0;
    const advancePayment = job.advancePayment || 0;
    
    // Calculate invoice date and due date
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + (customer.creditPeriodDays || 30));
    
    // Create bill entity with advance payment
    const bill = new Bill({
      billId: await this.billRepository.generateNextId(),
      jobId: billData.jobId,
      customerId: job.customerId,
      amount: billingAmount,
      actualCost: actualCost,
      billingAmount: billingAmount,
      advancePayment: advancePayment,
      grossTotal: billingAmount,
      netTotal: Math.max(0, billingAmount - advancePayment),
      profit: billingAmount - actualCost,
      paymentStatus: 'Unpaid',
      invoiceNumber: billData.invoiceNumber || null,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      isOverdue: false
    });
    
    // Validate
    const validation = bill.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Calculate totals with advance payment
    bill.calculateTotalsWithAdvance(advancePayment);
    
    // Calculate profit
    bill.calculateProfit();
    
    // Persist
    const savedBill = await this.billRepository.create(bill);
    
    // Update job status to "Pending Payment"
    await this.jobRepository.updateStatus(billData.jobId, 'Pending Payment');

    // Close all petty cash assignments for this job
    try {
      await this.pettyCashAssignmentRepository.closeAllByJob(billData.jobId);
    } catch (err) {
      console.error('CreateBill - Failed to close petty cash assignments:', err.message);
      // Non-fatal — bill is already saved
    }
    
    return savedBill;
  }
}

module.exports = CreateBill;
