const IPaymentRepository = require('../../../domain/repositories/IPaymentRepository');
const Payment = require('../../../domain/entities/Payment');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLPaymentRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') jobRepo.clearCache();
      const billRepo = container.get('billRepository');
      if (billRepo && typeof billRepo.clearCache === 'function') billRepo.clearCache();
    } catch (e) {}
  }

  async create(payment) {
    await this.prisma.payments.create({
      data: {
        paymentId: payment.paymentId,
        jobId: payment.jobId,
        customerId: payment.customerId,
        customerName: payment.customerName || null,
        invoiceNumber: payment.invoiceNumber || null,
        billId: payment.billId || null,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
        amount: payment.amount,
        status: payment.status || 'Pending',
        chequeNumber: payment.chequeNumber || null,
        chequeDate: payment.chequeDate ? new Date(payment.chequeDate) : null,
        bankName: payment.bankName || null,
        referenceNumber: payment.referenceNumber || null,
        notes: payment.notes || null,
        createdBy: payment.createdBy || null,
        createdDate: new Date()
      }
    });
    this.clearCache();
    return payment;
  }

  async findById(paymentId) {
    const row = await this.prisma.payments.findUnique({
      where: { paymentId },
      include: { jobs: true }
    });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters = {}) {
    const hasFilters = Boolean(filters.status || filters.paymentMethod || filters.customerId || filters.jobId);
    const now = Date.now();
    if (!hasFilters && this._cache && (now - this._cacheTime < 60000)) {
      return this._cache;
    }

    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.jobId) where.jobId = filters.jobId;

    const rows = await this.prisma.payments.findMany({
      where,
      include: { jobs: true },
      orderBy: { paymentDate: 'desc' }
    });
    const result = rows.map(r => this.mapToEntity(r));
    if (!hasFilters) {
      this._cache = result;
      this._cacheTime = now;
    }
    return result;
  }

  async findByJob(jobId) {
    return this.findAll({ jobId });
  }

  async findByCustomer(customerId) {
    return this.findAll({ customerId });
  }

  async findByBillId(billId) {
    const rows = await this.prisma.payments.findMany({
      where: { billId },
      include: { jobs: true },
      orderBy: { paymentDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByChequeNumber(chequeNumber) {
    const rows = await this.prisma.payments.findMany({
      where: { chequeNumber },
      include: { jobs: true },
      orderBy: { paymentDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByStatus(status) {
    return this.findAll({ status });
  }

  async findByPaymentMethod(paymentMethod) {
    return this.findAll({ paymentMethod });
  }

  async updateStatus(paymentId, status, statusDate = new Date()) {
    const data = { status, updatedDate: new Date() };
    if (status === 'Cleared') data.clearedDate = statusDate ? new Date(statusDate) : new Date();
    else if (status === 'Bounced') data.bouncedDate = statusDate ? new Date(statusDate) : new Date();

    const row = await this.prisma.payments.update({
      where: { paymentId },
      data,
      include: { jobs: true }
    });
    this.clearCache();
    return row ? this.mapToEntity(row) : null;
  }

  async updateStatusByChequeNumber(chequeNumber, status, statusDate = new Date()) {
    const data = { status, updatedDate: new Date() };
    if (status === 'Cleared') data.clearedDate = statusDate ? new Date(statusDate) : new Date();
    else if (status === 'Bounced') data.bouncedDate = statusDate ? new Date(statusDate) : new Date();

    const result = await this.prisma.payments.updateMany({
      where: { chequeNumber },
      data
    });
    this.clearCache();
    return result;
  }

  async update(paymentId, payment) {
    const data = { updatedDate: new Date() };
    if (payment.status !== undefined) data.status = payment.status;
    if (payment.amount !== undefined) data.amount = payment.amount;
    if (payment.chequeNumber !== undefined) data.chequeNumber = payment.chequeNumber;
    if (payment.chequeDate !== undefined) data.chequeDate = payment.chequeDate ? new Date(payment.chequeDate) : null;
    if (payment.bankName !== undefined) data.bankName = payment.bankName;
    if (payment.referenceNumber !== undefined) data.referenceNumber = payment.referenceNumber;
    if (payment.notes !== undefined) data.notes = payment.notes;

    const row = await this.prisma.payments.update({
      where: { paymentId },
      data,
      include: { jobs: true }
    });
    this.clearCache();
    return row ? this.mapToEntity(row) : null;
  }

  async delete(paymentId) {
    await this.prisma.payments.delete({ where: { paymentId } }).catch(() => null);
    this.clearCache();
    return true;
  }

  async generateNextId() {
    return this.generateNextFormattedId('payments', 'paymentId', 'PAY', 4);
  }

  mapToEntity(row) {
    return new Payment({
      paymentId: row.paymentId,
      jobId: row.jobId,
      customerId: row.customerId,
      customerName: row.customerName,
      invoiceNumber: row.invoiceNumber,
      billId: row.billId,
      paymentMethod: row.paymentMethod,
      paymentDate: row.paymentDate,
      amount: row.amount ? Number(row.amount) : 0,
      status: row.status,
      chequeNumber: row.chequeNumber,
      chequeDate: row.chequeDate,
      chequeAmount: row.ChequeAmount || row.chequeAmount,
      bankName: row.bankName,
      referenceNumber: row.referenceNumber,
      clearedDate: row.clearedDate,
      bouncedDate: row.bouncedDate,
      notes: row.notes,
      createdBy: row.createdBy,
      createdDate: row.createdDate,
      updatedDate: row.updatedDate,
      cusdecNumber: row.cusdecNumber || (row.jobs && row.jobs.cusdecNumber) || null,
      cusdecDate: row.cusdecDate || (row.jobs && row.jobs.CUSDECDate) || null
    });
  }
}

module.exports = MySQLPaymentRepository;
