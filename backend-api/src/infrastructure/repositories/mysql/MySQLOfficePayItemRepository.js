const IOfficePayItemRepository = require('../../../domain/repositories/IOfficePayItemRepository');
const OfficePayItem = require('../../../domain/entities/OfficePayItem');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLOfficePayItemRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(officePayItem) {
    const data = {
      officePayItemId: officePayItem.officePayItemId,
      jobId: officePayItem.jobId,
      description: officePayItem.description,
      actualCost: officePayItem.actualCost,
      billingAmount: officePayItem.billingAmount || null,
      paidBy: officePayItem.paidBy,
      paymentDate: officePayItem.paymentDate || null,
      notes: officePayItem.notes || null,
      createdDate: new Date()
    };

    await this.prisma.officepayitems.create({ data });
    this._clearJobCache();
    return officePayItem;
  }

  _clearJobCache() {
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') {
        jobRepo.clearCache();
      }
    } catch (e) {}
  }

  async _attachPaidByName(rows) {
    if (!rows || rows.length === 0) return [];
    const paidByIds = [...new Set(rows.map(r => r.paidBy).filter(Boolean))];
    let userMap = {};
    if (paidByIds.length > 0) {
      const users = await this.prisma.users.findMany({
        where: { userId: { in: paidByIds } },
        select: { userId: true, fullName: true }
      });
      userMap = users.reduce((acc, u) => {
        acc[u.userId] = u.fullName;
        return acc;
      }, {});
    }

    return rows.map(r => new OfficePayItem({
      ...r,
      actualCost: r.actualCost ? Number(r.actualCost) : 0,
      billingAmount: r.billingAmount ? Number(r.billingAmount) : null,
      paidByName: userMap[r.paidBy] || null
    }));
  }

  async findById(officePayItemId) {
    const row = await this.prisma.officepayitems.findUnique({
      where: { officePayItemId }
    });
    if (!row) return null;

    let paidByName = null;
    if (row.paidBy) {
      const user = await this.prisma.users.findUnique({
        where: { userId: row.paidBy },
        select: { fullName: true }
      });
      paidByName = user?.fullName || null;
    }

    return new OfficePayItem({
      ...row,
      actualCost: row.actualCost ? Number(row.actualCost) : 0,
      billingAmount: row.billingAmount ? Number(row.billingAmount) : null,
      paidByName
    });
  }

  async findByJobId(jobId) {
    const rows = await this.prisma.officepayitems.findMany({
      where: { jobId },
      orderBy: { createdDate: 'asc' }
    });
    return this._attachPaidByName(rows);
  }

  async findAll() {
    const rows = await this.prisma.officepayitems.findMany({
      orderBy: { createdDate: 'desc' }
    });
    return this._attachPaidByName(rows);
  }

  async update(officePayItemId, updateData) {
    const data = { updatedDate: new Date() };
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.actualCost !== undefined) data.actualCost = updateData.actualCost;
    if (updateData.billingAmount !== undefined) data.billingAmount = updateData.billingAmount;
    if (updateData.notes !== undefined) data.notes = updateData.notes;

    const row = await this.prisma.officepayitems.update({
      where: { officePayItemId },
      data
    });

    this._clearJobCache();
    return new OfficePayItem({
      ...row,
      actualCost: row.actualCost ? Number(row.actualCost) : 0,
      billingAmount: row.billingAmount ? Number(row.billingAmount) : null,
      paidByName: updateData.paidByName || null
    });
  }

  async delete(officePayItemId) {
    await this.prisma.officepayitems.delete({
      where: { officePayItemId }
    }).catch(() => null);
    this._clearJobCache();
    return true;
  }

  async generateNextId() {
    return this.generateNextFormattedId('officepayitems', 'officePayItemId', 'OPI', 4);
  }
}

module.exports = MySQLOfficePayItemRepository;
