const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLTransporterPaymentRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(paymentData) {
    const paymentId = `TP${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const created = await this.prisma.transporterpayments.create({
      data: {
        paymentId,
        jobId: paymentData.jobId,
        transporterId: paymentData.transporterId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
        status: paymentData.status || 'Pending',
        chequeNumber: paymentData.chequeNumber ? String(paymentData.chequeNumber) : null,
        chequeDate: paymentData.chequeDate ? new Date(paymentData.chequeDate) : null,
        chequeAmount: paymentData.chequeAmount ? String(paymentData.chequeAmount) : null,
        bankName: paymentData.bankName || null,
        paidBy: paymentData.paidBy || null,
        paidByName: paymentData.paidByName || null,
        notes: paymentData.notes || null,
        createdDate: new Date()
      }
    });

    this.clearCache();
    return { ...paymentData, paymentId, createdDate: created.createdDate };
  }

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') {
        jobRepo.clearCache();
      }
      const transRepo = container.get('transporterRepository');
      if (transRepo && typeof transRepo.clearCache === 'function') {
        transRepo.clearCache();
      }
    } catch (e) {}
  }

  async findAll(filters = {}) {
    const hasFilters = Boolean((filters.status && filters.status !== 'All') || (filters.method && filters.method !== 'All') || filters.fromDate || filters.toDate);
    const now = Date.now();
    if (!hasFilters && this._cache && (now - this._cacheTime < 60000)) {
      return this._cache;
    }

    const where = {};

    if (filters.status && filters.status !== 'All') {
      where.status = filters.status;
    }
    if (filters.method && filters.method !== 'All') {
      where.paymentMethod = filters.method;
    }
    if (filters.fromDate || filters.toDate) {
      where.paymentDate = {};
      if (filters.fromDate) where.paymentDate.gte = new Date(filters.fromDate);
      if (filters.toDate) where.paymentDate.lte = new Date(filters.toDate);
    }

    const rows = await this.prisma.transporterpayments.findMany({
      where,
      include: {
        transporters: true,
        jobs: {
          include: { customers: true }
        }
      },
      orderBy: [
        { paymentDate: 'desc' },
        { createdDate: 'desc' }
      ]
    });

    const result = rows.map(tp => ({
      ...tp,
      amount: Number(tp.amount),
      chequeAmount: tp.chequeAmount ? Number(tp.chequeAmount) : null,
      transporterName: tp.transporters?.name || null,
      shipmentCategory: tp.jobs?.shipmentCategory || null,
      customerName: tp.jobs?.customers?.name || null
    }));

    if (!hasFilters) {
      this._cache = result;
      this._cacheTime = now;
    }
    return result;
  }

  async findByTransporterId(transporterId, filters = {}) {
    const where = { transporterId };

    if (filters.status && filters.status !== 'All') {
      where.status = filters.status;
    }
    if (filters.fromDate || filters.toDate) {
      where.paymentDate = {};
      if (filters.fromDate) where.paymentDate.gte = new Date(filters.fromDate);
      if (filters.toDate) where.paymentDate.lte = new Date(filters.toDate);
    }

    const rows = await this.prisma.transporterpayments.findMany({
      where,
      orderBy: { paymentDate: 'desc' }
    });

    return rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      chequeAmount: r.chequeAmount ? Number(r.chequeAmount) : null
    }));
  }

  async findByJobId(jobId) {
    const rows = await this.prisma.transporterpayments.findMany({
      where: { jobId },
      orderBy: { paymentDate: 'desc' }
    });

    return rows.map(r => ({
      ...r,
      amount: Number(r.amount),
      chequeAmount: r.chequeAmount ? Number(r.chequeAmount) : null
    }));
  }

  async findById(paymentId) {
    const row = await this.prisma.transporterpayments.findUnique({
      where: { paymentId }
    });
    if (!row) return null;
    return {
      ...row,
      amount: Number(row.amount),
      chequeAmount: row.chequeAmount ? Number(row.chequeAmount) : null
    };
  }

  async updateStatus(paymentId, status) {
    const data = {
      status,
      updatedDate: new Date()
    };
    if (status === 'Cleared') {
      data.clearedDate = new Date();
    }

    const updated = await this.prisma.transporterpayments.update({
      where: { paymentId },
      data
    });

    this.clearCache();

    return {
      ...updated,
      amount: Number(updated.amount),
      chequeAmount: updated.chequeAmount ? Number(updated.chequeAmount) : null
    };
  }

  async getOutstandingBalance(transporterId) {
    const agg = await this.prisma.transporterpayments.aggregate({
      where: {
        transporterId,
        status: { in: ['Pending', 'Bounced'] }
      },
      _sum: { amount: true }
    });

    return Number(agg._sum.amount || 0);
  }
}

module.exports = MySQLTransporterPaymentRepository;
