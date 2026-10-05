const IPettyCashRepository = require('../../../domain/repositories/IPettyCashRepository');
const PettyCashEntry = require('../../../domain/entities/PettyCashEntry');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLPettyCashRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async createEntry(entry) {
    const data = {
      entryId: entry.entryId,
      description: entry.description,
      amount: entry.amount,
      entryType: entry.entryType,
      jobId: entry.jobId || null,
      createdBy: entry.createdBy,
      balanceAfter: entry.balanceAfter,
      date: entry.date ? new Date(entry.date) : new Date()
    };

    await this.prisma.pettycash.create({ data });
    return entry;
  }

  async findById(entryId) {
    const row = await this.prisma.pettycash.findUnique({
      where: { entryId }
    });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll(filters = {}) {
    const where = {};
    if (filters.entryType) where.entryType = filters.entryType;
    if (filters.createdBy) where.createdBy = filters.createdBy;

    const rows = await this.prisma.pettycash.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByJob(jobId) {
    const rows = await this.prisma.pettycash.findMany({
      where: { jobId },
      orderBy: { date: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByUser(userId) {
    const rows = await this.prisma.pettycash.findMany({
      where: { createdBy: userId },
      orderBy: { date: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async getBalance() {
    const row = await this.prisma.pettycashbalance.findUnique({
      where: { id: 1 }
    });
    return row && row.balance ? parseFloat(row.balance) : 0;
  }

  async updateBalance(amount) {
    await this.prisma.pettycashbalance.upsert({
      where: { id: 1 },
      update: {
        balance: amount,
        lastUpdated: new Date()
      },
      create: {
        id: 1,
        balance: amount,
        lastUpdated: new Date()
      }
    });
    return amount;
  }

  async generateNextId() {
    return this.generateNextFormattedId('pettycash', 'entryId', 'PC', 4);
  }

  mapToEntity(row) {
    return new PettyCashEntry({
      entryId: row.entryId,
      description: row.description,
      amount: row.amount ? Number(row.amount) : 0,
      entryType: row.entryType,
      jobId: row.jobId,
      createdBy: row.createdBy,
      date: row.date,
      balanceAfter: row.balanceAfter ? Number(row.balanceAfter) : 0
    });
  }
}

module.exports = MySQLPettyCashRepository;
