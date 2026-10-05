const CashBalanceSettlement = require('../../../domain/entities/CashBalanceSettlement');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLCashBalanceSettlementRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
  }

  async create(settlement) {
    const data = {
      settlementId: settlement.settlementId,
      userId: settlement.userId,
      userName: settlement.userName || null,
      managerId: settlement.managerId || null,
      managerName: settlement.managerName || null,
      settlementType: settlement.settlementType,
      amount: settlement.amount,
      status: settlement.status || 'PENDING',
      requestDate: settlement.requestDate ? new Date(settlement.requestDate) : new Date(),
      notes: settlement.notes || null,
      relatedAssignments: typeof settlement.relatedAssignments === 'object'
        ? JSON.stringify(settlement.relatedAssignments)
        : (settlement.relatedAssignments || '[]'),
      createdBy: settlement.createdBy,
      createdDate: new Date()
    };

    await this.prisma.cashbalancesettlements.create({ data });
    this.clearCache();
    return settlement;
  }

  async findById(settlementId) {
    const row = await this.prisma.cashbalancesettlements.findUnique({
      where: { settlementId }
    });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters = {}) {
    const hasFilters = Boolean(filters.userId || filters.managerId || filters.status || filters.settlementType);
    const now = Date.now();
    if (!hasFilters && this._cache && (now - this._cacheTime < 30000)) {
      return this._cache;
    }

    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.managerId) where.managerId = filters.managerId;
    if (filters.status) where.status = filters.status;
    if (filters.settlementType) where.settlementType = filters.settlementType;

    const rows = await this.prisma.cashbalancesettlements.findMany({
      where,
      orderBy: { requestDate: 'desc' }
    });
    const result = rows.map(r => this.mapToEntity(r));

    if (!hasFilters) {
      this._cache = result;
      this._cacheTime = now;
    }
    return result;
  }

  async findByUser(userId) {
    return this.findAll({ userId });
  }

  async findByManager(managerId) {
    return this.findAll({ managerId });
  }

  async findPendingSettlements() {
    return this.findAll({ status: 'PENDING' });
  }

  async findApprovedSettlements() {
    return this.findAll({ status: 'APPROVED' });
  }

  async findRejectedSettlements() {
    return this.findAll({ status: 'REJECTED' });
  }

  async update(settlementId, settlement) {
    // Avoid double-fetch: update directly and return the updated row
    const data = {
      updatedDate: new Date()
    };
    if (settlement.managerId !== undefined) data.managerId = settlement.managerId;
    if (settlement.managerName !== undefined) data.managerName = settlement.managerName;
    if (settlement.status !== undefined) data.status = settlement.status;
    if (settlement.approvedDate !== undefined) data.approvedDate = settlement.approvedDate ? new Date(settlement.approvedDate) : null;
    if (settlement.completedDate !== undefined) data.completedDate = settlement.completedDate ? new Date(settlement.completedDate) : null;
    if (settlement.managerNotes !== undefined) data.managerNotes = settlement.managerNotes;
    if (settlement.updatedBy !== undefined) data.updatedBy = settlement.updatedBy;

    const updated = await this.prisma.cashbalancesettlements.update({
      where: { settlementId },
      data
    });
    this.clearCache();
    return this.mapToEntity(updated);
  }

  async delete(settlementId) {
    await this.prisma.cashbalancesettlements.delete({
      where: { settlementId }
    }).catch(() => null);
    this.clearCache();
  }

  async generateNextId() {
    return this.generateNextFormattedId('cashbalancesettlements', 'settlementId', 'CBS', 6);
  }

  /**
   * Returns summary stats via a single GROUP BY SQL query instead of
   * fetching all rows and counting in JS.
   */
  async getSettlementsSummary() {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const rows = await mysqlDb.query(
      `SELECT status, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
       FROM cashbalancesettlements
       GROUP BY status`
    );

    let totalSettlements = 0, pendingCount = 0, approvedCount = 0,
      completedCount = 0, rejectedCount = 0, totalAmount = 0, completedAmount = 0;

    for (const r of rows) {
      const cnt = Number(r.cnt || 0);
      const amt = Number(r.total || 0);
      totalSettlements += cnt;
      totalAmount += amt;
      if (r.status === 'PENDING') { pendingCount = cnt; }
      else if (r.status === 'APPROVED') { approvedCount = cnt; }
      else if (r.status === 'COMPLETED') { completedCount = cnt; completedAmount = amt; }
      else if (r.status === 'REJECTED') { rejectedCount = cnt; }
    }

    return [{ totalSettlements, pendingCount, approvedCount, completedCount, rejectedCount, totalAmount, completedAmount }];
  }

  /**
   * Per-user summary via single GROUP BY query.
   */
  async getUserSettlementsSummary(userId) {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const rows = await mysqlDb.query(
      `SELECT status, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total
       FROM cashbalancesettlements
       WHERE userId = ?
       GROUP BY status`,
      [userId]
    );

    let totalSettlements = 0, pendingCount = 0, approvedCount = 0,
      completedCount = 0, rejectedCount = 0, totalAmount = 0, completedAmount = 0;

    for (const r of rows) {
      const cnt = Number(r.cnt || 0);
      const amt = Number(r.total || 0);
      totalSettlements += cnt;
      totalAmount += amt;
      if (r.status === 'PENDING') { pendingCount = cnt; }
      else if (r.status === 'APPROVED') { approvedCount = cnt; }
      else if (r.status === 'COMPLETED') { completedCount = cnt; completedAmount = amt; }
      else if (r.status === 'REJECTED') { rejectedCount = cnt; }
    }

    return [{ totalSettlements, pendingCount, approvedCount, completedCount, rejectedCount, totalAmount, completedAmount }];
  }

  mapToEntity(row) {
    let relatedAssignments = [];
    if (row.relatedAssignments) {
      try {
        relatedAssignments = typeof row.relatedAssignments === 'string'
          ? JSON.parse(row.relatedAssignments)
          : row.relatedAssignments;
      } catch (e) {}
    }

    const entity = new CashBalanceSettlement({
      settlementId: row.settlementId,
      userId: row.userId,
      userName: row.userName,
      managerId: row.managerId,
      managerName: row.managerName,
      settlementType: row.settlementType,
      amount: row.amount ? Number(row.amount) : 0,
      status: row.status,
      requestDate: row.requestDate,
      approvedDate: row.approvedDate,
      completedDate: row.completedDate,
      notes: row.notes,
      managerNotes: row.managerNotes,
      relatedAssignments,
      createdBy: row.createdBy,
      createdDate: row.createdDate,
      updatedBy: row.updatedBy,
      updatedDate: row.updatedDate
    });
    entity.jobId = row.jobId || null;
    entity.cusdecNumber = row.cusdecNumber || null;
    return entity;
  }
}

module.exports = MySQLCashBalanceSettlementRepository;
