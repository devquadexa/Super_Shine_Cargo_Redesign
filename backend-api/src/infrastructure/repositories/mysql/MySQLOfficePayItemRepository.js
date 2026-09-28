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
    return officePayItem;
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
    const existing = await this.findById(officePayItemId);
    if (!existing) throw new Error('Office pay item not found');

    const description = updateData.description !== undefined ? updateData.description : existing.description;
    const actualCost = updateData.actualCost !== undefined ? updateData.actualCost : existing.actualCost;
    const billingAmount = updateData.billingAmount !== undefined ? updateData.billingAmount : existing.billingAmount;
    const notes = updateData.notes !== undefined ? updateData.notes : existing.notes;

    await this.prisma.officepayitems.update({
      where: { officePayItemId },
      data: {
        description,
        actualCost,
        billingAmount,
        notes,
        updatedDate: new Date()
      }
    });

    return this.findById(officePayItemId);
  }

  async delete(officePayItemId) {
    await this.prisma.officepayitems.delete({
      where: { officePayItemId }
    }).catch(() => null);
    return true;
  }

  async generateNextId() {
    return this.generateNextFormattedId('officepayitems', 'officePayItemId', 'OPI', 4);
  }
}

module.exports = MySQLOfficePayItemRepository;
