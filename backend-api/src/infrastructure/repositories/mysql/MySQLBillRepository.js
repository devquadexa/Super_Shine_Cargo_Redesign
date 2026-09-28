const IBillRepository = require('../../../domain/repositories/IBillRepository');
const Bill = require('../../../domain/entities/Bill');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLBillRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(bill) {
    const data = {
      billId: bill.billId,
      jobId: bill.jobId,
      customerId: bill.customerId,
      amount: bill.amount || bill.billingAmount || 0,
      tax: bill.tax || 0,
      total: bill.total || 0,
      actualCost: bill.actualCost || 0,
      billingAmount: bill.billingAmount || 0,
      profit: bill.profit || 0,
      advancePayment: bill.advancePayment || 0.00,
      grossTotal: bill.grossTotal || bill.billingAmount || 0,
      netTotal: bill.netTotal || bill.billingAmount || 0,
      paymentStatus: bill.paymentStatus || 'Pending',
      invoiceNumber: bill.invoiceNumber || null,
      invoiceDate: bill.invoiceDate ? new Date(bill.invoiceDate) : new Date(),
      dueDate: bill.dueDate ? new Date(bill.dueDate) : null,
      isOverdue: Boolean(bill.isOverdue),
      createdDate: new Date()
    };

    await this.prisma.bills.create({ data });
    return bill;
  }

  async findById(billId) {
    const row = await this.prisma.bills.findUnique({
      where: { billId }
    });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    const rows = await this.prisma.bills.findMany({
      where,
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByJob(jobId) {
    const rows = await this.prisma.bills.findMany({
      where: { jobId },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByCustomer(customerId) {
    const rows = await this.prisma.bills.findMany({
      where: { customerId },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findUnpaid() {
    const rows = await this.prisma.bills.findMany({
      where: {
        paymentStatus: { not: 'Paid' }
      },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async update(billId, bill) {
    const existing = await this.findById(billId);
    if (!existing) return null;

    const data = {
      amount: bill.amount !== undefined ? bill.amount : existing.amount,
      tax: bill.tax !== undefined ? bill.tax : existing.tax,
      total: bill.total !== undefined ? bill.total : existing.total,
      advancePayment: bill.advancePayment !== undefined ? bill.advancePayment : existing.advancePayment,
      grossTotal: bill.grossTotal !== undefined ? bill.grossTotal : existing.grossTotal,
      netTotal: bill.netTotal !== undefined ? bill.netTotal : existing.netTotal,
      paymentStatus: bill.paymentStatus !== undefined ? bill.paymentStatus : existing.paymentStatus,
      isOverdue: bill.isOverdue !== undefined ? Boolean(bill.isOverdue) : Boolean(existing.isOverdue)
    };

    const updated = await this.prisma.bills.update({
      where: { billId },
      data
    });
    return this.mapToEntity(updated);
  }

  async markAsPaid(billId, paymentDetails = {}) {
    const bill = await this.findById(billId);
    const billingAmount = parseFloat(bill?.billingAmount) || parseFloat(bill?.grossTotal) || parseFloat(bill?.amount) || 0;
    const advancePayment = parseFloat(bill?.advancePayment) || 0;
    const netTotal = bill?.netTotal !== undefined && bill?.netTotal !== null
      ? parseFloat(bill.netTotal)
      : Math.max(0, billingAmount - advancePayment);
    const invoiceTotal = netTotal > 0 ? netTotal : billingAmount;

    const data = {
      paymentStatus: 'Paid',
      paidAmount: invoiceTotal,
      balanceAmount: 0,
      billDate: paymentDetails.paidDate ? new Date(paymentDetails.paidDate) : new Date(),
      chequeStatus: paymentDetails.chequeNumber ? 'Received' : null
    };

    const updated = await this.prisma.bills.update({
      where: { billId },
      data
    });
    return this.mapToEntity(updated);
  }

  async applyPartialPayment(billId, paymentAmount, paymentDetails = {}) {
    const bill = await this.findById(billId);
    if (!bill) throw new Error('Bill not found');

    const billingAmount = parseFloat(bill.billingAmount) || parseFloat(bill.grossTotal) || parseFloat(bill.amount) || 0;
    const advancePayment = parseFloat(bill.advancePayment) || 0;
    const netTotal = bill.netTotal !== undefined && bill.netTotal !== null
      ? parseFloat(bill.netTotal)
      : Math.max(0, billingAmount - advancePayment);
    const invoiceTotal = netTotal > 0 ? netTotal : billingAmount;
    const currentPaid = parseFloat(bill.paidAmount) || 0;
    const newPaidAmount = currentPaid + parseFloat(paymentAmount);
    const newRemaining = Math.max(0, invoiceTotal - newPaidAmount);
    const newStatus = newRemaining <= 0 ? 'Paid' : 'Partially Paid';

    const data = {
      paidAmount: newPaidAmount,
      balanceAmount: newRemaining,
      paymentStatus: newStatus,
      billDate: paymentDetails.paidDate ? new Date(paymentDetails.paidDate) : new Date()
    };

    const updated = await this.prisma.bills.update({
      where: { billId },
      data
    });
    return this.mapToEntity(updated);
  }

  async replaceBill(billId, billData) {
    const data = {
      customerId: billData.customerId,
      amount: billData.amount || billData.billingAmount || 0,
      tax: billData.tax || 0,
      total: billData.total,
      actualCost: billData.actualCost,
      billingAmount: billData.billingAmount,
      profit: billData.profit,
      advancePayment: billData.advancePayment || 0,
      grossTotal: billData.grossTotal,
      netTotal: billData.netTotal,
      paymentStatus: billData.paymentStatus || 'Unpaid',
      invoiceNumber: billData.invoiceNumber || null,
      invoiceDate: billData.invoiceDate ? new Date(billData.invoiceDate) : new Date(),
      dueDate: billData.dueDate ? new Date(billData.dueDate) : null,
      isOverdue: Boolean(billData.isOverdue)
    };

    const updated = await this.prisma.bills.update({
      where: { billId },
      data
    });
    return this.mapToEntity(updated);
  }

  async delete(billId) {
    await this.prisma.bills.delete({
      where: { billId }
    }).catch(() => null);
  }

  async generateNextId() {
    return this.generateNextFormattedId('bills', 'billId', 'BILL', 4);
  }

  mapToEntity(row) {
    return new Bill({
      billId: row.billId,
      jobId: row.jobId,
      customerId: row.customerId,
      amount: row.amount ? Number(row.amount) : 0,
      tax: row.tax ? Number(row.tax) : 0,
      total: row.total ? Number(row.total) : 0,
      actualCost: row.actualCost ? Number(row.actualCost) : 0,
      billingAmount: row.billingAmount !== null && row.billingAmount !== undefined
        ? Number(row.billingAmount)
        : (row.amount ? Number(row.amount) : 0),
      profit: row.profit ? Number(row.profit) : 0,
      advancePayment: row.advancePayment !== undefined && row.advancePayment !== null
        ? Number(row.advancePayment)
        : 0.00,
      grossTotal: row.grossTotal ? Number(row.grossTotal) : (row.billingAmount ? Number(row.billingAmount) : (row.amount ? Number(row.amount) : 0)),
      netTotal: row.netTotal ? Number(row.netTotal) : (row.billingAmount ? Number(row.billingAmount) : (row.amount ? Number(row.amount) : 0)),
      paymentStatus: row.paymentStatus,
      createdDate: row.createdDate,
      billDate: row.billDate || row.createdDate,
      paidDate: row.paidDate,
      invoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate,
      dueDate: row.dueDate,
      isOverdue: Boolean(row.isOverdue),
      paymentMethod: row.paymentMethod,
      chequeNumber: row.chequeNumber,
      chequeDate: row.chequeDate,
      chequeAmount: row.chequeAmount,
      bankName: row.bankName,
      paidAmount: row.paidAmount ? Number(row.paidAmount) : 0,
      remainingAmount: row.balanceAmount !== undefined && row.balanceAmount !== null
        ? Number(row.balanceAmount)
        : (row.netTotal ? Number(row.netTotal) : (row.total ? Number(row.total) : 0))
    });
  }
}

module.exports = MySQLBillRepository;
