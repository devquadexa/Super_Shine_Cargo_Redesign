const IPaymentRepository = require('../../../domain/repositories/IPaymentRepository');
const Payment = require('../../../domain/entities/Payment');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLPaymentRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(payment) {
    const data = {
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
    };

    await this.prisma.payments.create({ data });
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
    return rows.map(r => this.mapToEntity(r));
  }

  async findByJob(jobId) {
    const rows = await this.prisma.payments.findMany({
      where: { jobId },
      include: { jobs: true },
      orderBy: { paymentDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByCustomer(customerId) {
    const rows = await this.prisma.payments.findMany({
      where: { customerId },
      include: { jobs: true },
      orderBy: { paymentDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
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
    const rows = await this.prisma.payments.findMany({
      where: { status },
      include: { jobs: true },
      orderBy: { paymentDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByPaymentMethod(paymentMethod) {
    const rows = await this.prisma.payments.findMany({
      where: { paymentMethod },
      include: { jobs: true },
      orderBy: { paymentDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async updateStatus(paymentId, status, statusDate = new Date()) {
    const data = {
      status,
      updatedDate: new Date()
    };
    if (status === 'Cleared') {
      data.clearedDate = statusDate ? new Date(statusDate) : new Date();
    } else if (status === 'Bounced') {
      data.bouncedDate = statusDate ? new Date(statusDate) : new Date();
    }

    await this.prisma.payments.update({
      where: { paymentId },
      data
    });
    return this.findById(paymentId);
  }

  async update(paymentId, payment) {
    const existing = await this.findById(paymentId);
    if (!existing) return null;

    const data = {
      status: payment.status !== undefined ? payment.status : existing.status,
      amount: payment.amount !== undefined ? payment.amount : existing.amount,
      chequeNumber: payment.chequeNumber !== undefined ? payment.chequeNumber : existing.chequeNumber,
      chequeDate: payment.chequeDate !== undefined ? (payment.chequeDate ? new Date(payment.chequeDate) : null) : existing.chequeDate,
      bankName: payment.bankName !== undefined ? payment.bankName : existing.bankName,
      referenceNumber: payment.referenceNumber !== undefined ? payment.referenceNumber : existing.referenceNumber,
      notes: payment.notes !== undefined ? payment.notes : existing.notes,
      updatedDate: new Date()
    };

    await this.prisma.payments.update({
      where: { paymentId },
      data
    });
    return this.findById(paymentId);
  }

  async delete(paymentId) {
    await this.prisma.payments.delete({
      where: { paymentId }
    }).catch(() => null);
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
