const IBillRepository = require('../../../domain/repositories/IBillRepository');
const Bill = require('../../../domain/entities/Bill');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLBillRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  clearCache(clearMemory = true) {
    if (clearMemory) {
      this._cache = null;
      this._cacheTime = 0;
    }
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') jobRepo.clearCache(clearMemory);
    } catch (e) {}
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
      paymentStatus: bill.paymentStatus || 'Unpaid',
      invoiceNumber: bill.invoiceNumber || null,
      invoiceDate: bill.invoiceDate ? new Date(bill.invoiceDate) : new Date(),
      dueDate: bill.dueDate ? new Date(bill.dueDate) : null,
      isOverdue: Boolean(bill.isOverdue),
      createdDate: new Date()
    };

    const created = await this.prisma.bills.create({ data });
    const entity = this.mapToEntity(created);
    if (this._cache) {
      this._cache.unshift(entity);
    }
    this.clearCache(false);
    return entity;
  }

  async findById(billId) {
    if (!billId) return null;
    const now = Date.now();
    if (this._cache && (now - this._cacheTime < 60000)) {
      const cached = this._cache.find(b => b.billId === billId);
      if (cached) return cached;
    }
    const row = await this.prisma.bills.findUnique({ where: { billId } });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters = {}) {
    const now = Date.now();
    if (!filters.paymentStatus && this._cache && (now - this._cacheTime < 60000)) {
      return this._cache;
    }

    const where = {};
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

    const rows = await this.prisma.bills.findMany({
      where,
      orderBy: { createdDate: 'desc' }
    });
    const result = rows.map(r => this.mapToEntity(r));

    if (!filters.paymentStatus) {
      this._cache = result;
      this._cacheTime = now;
    }
    return result;
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
      where: { paymentStatus: { not: 'Paid' } },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  /**
   * Update without a pre-fetch: only supply the fields you want changed.
   * If a full-object merge is needed by the caller, it must pass the merged data.
   */
  async update(billId, bill) {
    const existing = await this.findById(billId);
    if (!existing) return null;

    const data = {
      amount:        bill.amount        !== undefined ? bill.amount        : existing.amount,
      tax:           bill.tax           !== undefined ? bill.tax           : existing.tax,
      total:         bill.total         !== undefined ? bill.total         : existing.total,
      advancePayment: bill.advancePayment !== undefined ? bill.advancePayment : existing.advancePayment,
      grossTotal:    bill.grossTotal    !== undefined ? bill.grossTotal    : existing.grossTotal,
      netTotal:      bill.netTotal      !== undefined ? bill.netTotal      : existing.netTotal,
      paymentStatus: bill.paymentStatus !== undefined ? bill.paymentStatus : existing.paymentStatus,
      isOverdue:     bill.isOverdue     !== undefined ? Boolean(bill.isOverdue) : Boolean(existing.isOverdue)
    };

    const updated = await this.prisma.bills.update({ where: { billId }, data });
    const entity = this.mapToEntity(updated);
    if (this._cache) {
      const idx = this._cache.findIndex(b => b.billId === billId);
      if (idx !== -1) this._cache[idx] = entity;
    }
    this.clearCache(false);
    return entity;
  }

  async markAsPaid(billId, paymentDetails = {}) {
    const bill = await this.findById(billId);
    const billingAmount = parseFloat(bill?.billingAmount) || parseFloat(bill?.grossTotal) || parseFloat(bill?.amount) || 0;
    const advancePayment = parseFloat(bill?.advancePayment) || 0;
    const netTotal = bill?.netTotal != null ? parseFloat(bill.netTotal) : Math.max(0, billingAmount - advancePayment);
    const invoiceTotal = netTotal > 0 ? netTotal : billingAmount;

    const updated = await this.prisma.bills.update({
      where: { billId },
      data: {
        paymentStatus: 'Paid',
        paidAmount: invoiceTotal,
        balanceAmount: 0,
        billDate: paymentDetails.paidDate ? new Date(paymentDetails.paidDate) : new Date(),
        chequeStatus: paymentDetails.chequeNumber ? 'Received' : null
      }
    });
    const entity = this.mapToEntity(updated);
    if (this._cache) {
      const idx = this._cache.findIndex(b => b.billId === billId);
      if (idx !== -1) this._cache[idx] = entity;
    }
    this.clearCache(false);
    return entity;
  }

  async applyPartialPayment(billId, paymentAmount, paymentDetails = {}) {
    const bill = await this.findById(billId);
    if (!bill) throw new Error('Bill not found');

    const billingAmount = parseFloat(bill.billingAmount) || parseFloat(bill.grossTotal) || parseFloat(bill.amount) || 0;
    const advancePayment = parseFloat(bill.advancePayment) || 0;
    const netTotal = bill.netTotal != null ? parseFloat(bill.netTotal) : Math.max(0, billingAmount - advancePayment);
    const invoiceTotal = netTotal > 0 ? netTotal : billingAmount;
    const newPaidAmount = (parseFloat(bill.paidAmount) || 0) + parseFloat(paymentAmount);
    const newRemaining = Math.max(0, invoiceTotal - newPaidAmount);

    const updated = await this.prisma.bills.update({
      where: { billId },
      data: {
        paidAmount: newPaidAmount,
        balanceAmount: newRemaining,
        paymentStatus: newRemaining <= 0 ? 'Paid' : 'Partially Paid',
        billDate: paymentDetails.paidDate ? new Date(paymentDetails.paidDate) : new Date()
      }
    });
    const entity = this.mapToEntity(updated);
    if (this._cache) {
      const idx = this._cache.findIndex(b => b.billId === billId);
      if (idx !== -1) this._cache[idx] = entity;
    }
    this.clearCache(false);
    return entity;
  }

  async replaceBill(billId, billData) {
    const updated = await this.prisma.bills.update({
      where: { billId },
      data: {
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
      }
    });
    const entity = this.mapToEntity(updated);
    if (this._cache) {
      const idx = this._cache.findIndex(b => b.billId === billId);
      if (idx !== -1) this._cache[idx] = entity;
    }
    this.clearCache(false);
    return entity;
  }

  async delete(billId) {
    await this.prisma.bills.delete({ where: { billId } }).catch(() => null);
    if (this._cache) {
      this._cache = this._cache.filter(b => b.billId !== billId);
    }
    this.clearCache(false);
    return true;
  }

  async generateNextId() {
    return this.generateNextFormattedId('bills', 'billId', 'BILL', 4);
  }

  mapToEntity(row) {
    const amount      = row.amount      ? Number(row.amount)      : 0;
    const billingAmt  = row.billingAmount != null ? Number(row.billingAmount) : amount;
    const grossTotal  = row.grossTotal  ? Number(row.grossTotal)  : billingAmt;
    const netTotal    = row.netTotal    ? Number(row.netTotal)    : billingAmt;

    return new Bill({
      billId: row.billId,
      jobId: row.jobId,
      customerId: row.customerId,
      amount,
      tax: row.tax ? Number(row.tax) : 0,
      total: row.total ? Number(row.total) : 0,
      actualCost: row.actualCost ? Number(row.actualCost) : 0,
      billingAmount: billingAmt,
      profit: row.profit ? Number(row.profit) : 0,
      advancePayment: row.advancePayment != null ? Number(row.advancePayment) : 0,
      grossTotal,
      netTotal,
      paymentStatus: (row.paymentStatus === 'Pending' || !row.paymentStatus) ? 'Unpaid' : row.paymentStatus,
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
      remainingAmount: row.balanceAmount != null ? Number(row.balanceAmount) : netTotal
    });
  }

  async getPendingPaymentsReport(fromDate, toDate, showOverdueOnly = false) {
    const fromStr = fromDate instanceof Date ? fromDate.toISOString().split('T')[0] : (fromDate ? String(fromDate).split('T')[0] : null);
    const toStr   = toDate   instanceof Date ? toDate.toISOString().split('T')[0]   : (toDate   ? String(toDate).split('T')[0]   : null);

    let sql = `
      SELECT 
        b.billId, b.jobId, b.customerId, b.invoiceNumber, b.invoiceDate,
        b.dueDate, b.grossTotal, b.netTotal, b.advancePayment,
        b.paidAmount, b.balanceAmount, b.remainingAmount, b.billingAmount,
        b.amount, b.paymentStatus, b.isOverdue,
        c.name AS customerName,
        j.shipmentCategory, j.containerNumber, j.blNumber
      FROM bills b
      LEFT JOIN customers c ON b.customerId = c.customerId
      LEFT JOIN jobs j ON b.jobId = j.jobId
      WHERE (b.paymentStatus IS NULL OR LOWER(b.paymentStatus) != 'paid')
    `;
    const params = [];

    if (fromStr && toStr) {
      sql += ` AND DATE(b.invoiceDate) BETWEEN DATE(?) AND DATE(?)`;
      params.push(fromStr, toStr);
    } else if (fromStr) {
      sql += ` AND DATE(b.invoiceDate) >= DATE(?)`;
      params.push(fromStr);
    } else if (toStr) {
      sql += ` AND DATE(b.invoiceDate) <= DATE(?)`;
      params.push(toStr);
    }

    if (showOverdueOnly) {
      sql += ` AND (b.isOverdue = 1 OR (b.dueDate IS NOT NULL AND b.dueDate < NOW()))`;
    }
    sql += ` ORDER BY b.invoiceDate DESC, b.jobId ASC`;

    const mysqlDb = require('../../../config/mysqlDatabase');
    const rows = await mysqlDb.query(sql, params);

    return (rows || []).map(row => {
      const grossTotal    = parseFloat(row.grossTotal || row.billingAmount || row.amount || 0);
      const advancePayment = parseFloat(row.advancePayment || 0);
      const netTotal      = parseFloat(row.netTotal != null ? row.netTotal : Math.max(0, grossTotal - advancePayment));
      const paidAmount    = parseFloat(row.paidAmount || 0);
      const balanceAmt    = parseFloat(row.balanceAmount);
      const remainingAmt  = parseFloat(row.remainingAmount);
      const remainingAmount = !isNaN(balanceAmt) && balanceAmt > 0
        ? balanceAmt
        : (!isNaN(remainingAmt) && remainingAmt > 0 ? remainingAmt : Math.max(0, netTotal - paidAmount));

      return {
        billId: row.billId,
        jobId: row.jobId,
        customerId: row.customerId,
        customerName: row.customerName || '-',
        invoiceNumber: row.invoiceNumber || row.billId,
        invoiceDate: row.invoiceDate,
        dueDate: row.dueDate,
        grossTotal,
        netTotal,
        advancePayment,
        paidAmount,
        remainingAmount,
        paymentStatus: row.paymentStatus || 'Unpaid',
        isOverdue: Boolean(row.isOverdue || (row.dueDate && new Date(row.dueDate) < new Date())),
        shipmentCategory: row.shipmentCategory || '-',
        containerNumber: row.containerNumber || '-',
        blNumber: row.blNumber || '-'
      };
    });
  }
}

module.exports = MySQLBillRepository;
