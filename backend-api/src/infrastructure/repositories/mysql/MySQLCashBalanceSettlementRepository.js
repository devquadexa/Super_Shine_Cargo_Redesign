const CashBalanceSettlement = require('../../../domain/entities/CashBalanceSettlement');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLCashBalanceSettlementRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
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
    return settlement;
  }

  async findById(settlementId) {
    const row = await this.prisma.cashbalancesettlements.findUnique({
      where: { settlementId }
    });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.managerId) where.managerId = filters.managerId;
    if (filters.status) where.status = filters.status;
    if (filters.settlementType) where.settlementType = filters.settlementType;

    const rows = await this.prisma.cashbalancesettlements.findMany({
      where,
      orderBy: { requestDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByUser(userId) {
    const rows = await this.prisma.cashbalancesettlements.findMany({
      where: { userId },
      orderBy: { requestDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByManager(managerId) {
    const rows = await this.prisma.cashbalancesettlements.findMany({
      where: { managerId },
      orderBy: { requestDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findPendingSettlements() {
    const rows = await this.prisma.cashbalancesettlements.findMany({
      where: { status: 'PENDING' },
      orderBy: { requestDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findApprovedSettlements() {
    const rows = await this.prisma.cashbalancesettlements.findMany({
      where: { status: 'APPROVED' },
      orderBy: { requestDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findRejectedSettlements() {
    const rows = await this.prisma.cashbalancesettlements.findMany({
      where: { status: 'REJECTED' },
      orderBy: { requestDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async update(settlementId, settlement) {
    const existing = await this.findById(settlementId);
    if (!existing) return null;

    const data = {
      managerId: settlement.managerId !== undefined ? settlement.managerId : existing.managerId,
      managerName: settlement.managerName !== undefined ? settlement.managerName : existing.managerName,
      status: settlement.status !== undefined ? settlement.status : existing.status,
      approvedDate: settlement.approvedDate !== undefined ? (settlement.approvedDate ? new Date(settlement.approvedDate) : null) : existing.approvedDate,
      completedDate: settlement.completedDate !== undefined ? (settlement.completedDate ? new Date(settlement.completedDate) : null) : existing.completedDate,
      managerNotes: settlement.managerNotes !== undefined ? settlement.managerNotes : existing.managerNotes,
      updatedBy: settlement.updatedBy !== undefined ? settlement.updatedBy : existing.updatedBy,
      updatedDate: new Date()
    };

    const updated = await this.prisma.cashbalancesettlements.update({
      where: { settlementId },
      data
    });

    return this.mapToEntity(updated);
  }

  async delete(settlementId) {
    await this.prisma.cashbalancesettlements.delete({
      where: { settlementId }
    }).catch(() => null);
  }

  async generateNextId() {
    return this.generateNextFormattedId('cashbalancesettlements', 'settlementId', 'CBS', 6);
  }

  async getSettlementsSummary() {
    const all = await this.prisma.cashbalancesettlements.findMany({
      select: { status: true, amount: true }
    });

    let totalSettlements = all.length;
    let pendingCount = 0;
    let approvedCount = 0;
    let completedCount = 0;
    let rejectedCount = 0;
    let totalAmount = 0;
    let completedAmount = 0;

    for (const item of all) {
      const amt = Number(item.amount) || 0;
      totalAmount += amt;
      if (item.status === 'PENDING') pendingCount++;
      else if (item.status === 'APPROVED') approvedCount++;
      else if (item.status === 'COMPLETED') {
        completedCount++;
        completedAmount += amt;
      } else if (item.status === 'REJECTED') {
        rejectedCount++;
      }
    }

    return [{
      totalSettlements,
      pendingCount,
      approvedCount,
      completedCount,
      rejectedCount,
      totalAmount,
      completedAmount
    }];
  }

  async getUserSettlementsSummary(userId) {
    const all = await this.prisma.cashbalancesettlements.findMany({
      where: { userId },
      select: { status: true, amount: true }
    });

    let totalSettlements = all.length;
    let pendingCount = 0;
    let approvedCount = 0;
    let completedCount = 0;
    let rejectedCount = 0;
    let totalAmount = 0;
    let completedAmount = 0;

    for (const item of all) {
      const amt = Number(item.amount) || 0;
      totalAmount += amt;
      if (item.status === 'PENDING') pendingCount++;
      else if (item.status === 'APPROVED') approvedCount++;
      else if (item.status === 'COMPLETED') {
        completedCount++;
        completedAmount += amt;
      } else if (item.status === 'REJECTED') {
        rejectedCount++;
      }
    }

    return [{
      totalSettlements,
      pendingCount,
      approvedCount,
      completedCount,
      rejectedCount,
      totalAmount,
      completedAmount
    }];
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
