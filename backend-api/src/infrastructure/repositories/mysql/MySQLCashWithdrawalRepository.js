const ICashWithdrawalRepository = require('../../../domain/repositories/ICashWithdrawalRepository');
const CashWithdrawal = require('../../../domain/entities/CashWithdrawal');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLCashWithdrawalRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(withdrawal) {
    const data = {
      withdrawalId: withdrawal.withdrawalId,
      amount: withdrawal.amount,
      bankName: withdrawal.bankName || null,
      withdrawalDate: withdrawal.withdrawalDate ? new Date(withdrawal.withdrawalDate) : new Date(),
      notes: withdrawal.notes || null,
      transactionType: withdrawal.transactionType || 'withdrawal',
      createdBy: withdrawal.createdBy,
      createdAt: new Date()
    };

    await this.prisma.cashwithdrawals.create({ data });
    return withdrawal;
  }

  async findAll() {
    const rows = await this.prisma.cashwithdrawals.findMany({
      include: { users: true },
      orderBy: [
        { withdrawalDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findById(withdrawalId) {
    const row = await this.prisma.cashwithdrawals.findUnique({
      where: { withdrawalId },
      include: { users: true }
    });
    return row ? this.mapToEntity(row) : null;
  }

  async findByDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const rows = await this.prisma.cashwithdrawals.findMany({
      where: {
        withdrawalDate: {
          gte: from,
          lte: to
        }
      },
      include: { users: true },
      orderBy: [
        { withdrawalDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async generateNextId() {
    return this.generateNextFormattedId('cashwithdrawals', 'withdrawalId', 'CW', 4);
  }

  mapToEntity(row) {
    return new CashWithdrawal({
      withdrawalId: row.withdrawalId,
      amount: row.amount ? Number(row.amount) : 0,
      bankName: row.bankName,
      withdrawalDate: row.withdrawalDate,
      notes: row.notes,
      transactionType: row.transactionType || 'withdrawal',
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      createdByName: row.users ? row.users.fullName : (row.createdByName || null)
    });
  }
}

module.exports = MySQLCashWithdrawalRepository;
