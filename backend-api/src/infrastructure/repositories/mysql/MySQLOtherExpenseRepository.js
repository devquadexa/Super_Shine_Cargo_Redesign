const IOtherExpenseRepository = require('../../../domain/repositories/IOtherExpenseRepository');
const OtherExpense = require('../../../domain/entities/OtherExpense');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLOtherExpenseRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(expense) {
    await this.prisma.otherexpenses.create({
      data: {
        expenseId: expense.expenseId,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        expenseDate: expense.expenseDate ? new Date(expense.expenseDate) : new Date(),
        paymentMethod: expense.paymentMethod || null,
        referenceNumber: expense.referenceNumber || null,
        notes: expense.notes || null,
        recordedBy: expense.recordedBy,
        attachmentUrl: expense.attachmentUrl || null,
        createdDate: new Date()
      }
    });

    return expense;
  }

  async findById(expenseId) {
    const row = await this.prisma.otherexpenses.findUnique({
      where: { expenseId },
      include: { users: true }
    });
    if (!row) return null;
    return this.mapToEntity({
      ...row,
      recordedByName: row.users?.fullName || null
    });
  }

  async findAll(filters = {}) {
    const where = {};

    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.fromDate || filters.toDate) {
      where.expenseDate = {};
      if (filters.fromDate) where.expenseDate.gte = new Date(filters.fromDate);
      if (filters.toDate) where.expenseDate.lte = new Date(filters.toDate);
    }

    const rows = await this.prisma.otherexpenses.findMany({
      where,
      include: { users: true },
      orderBy: [
        { expenseDate: 'desc' },
        { createdDate: 'desc' }
      ]
    });

    return rows.map(r => this.mapToEntity({
      ...r,
      recordedByName: r.users?.fullName || null
    }));
  }

  async findByDateRange(fromDate, toDate, category = null) {
    const where = {
      expenseDate: {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      }
    };

    if (category) {
      where.category = category;
    }

    const rows = await this.prisma.otherexpenses.findMany({
      where,
      include: { users: true },
      orderBy: { expenseDate: 'desc' }
    });

    return rows.map(r => this.mapToEntity({
      ...r,
      recordedByName: r.users?.fullName || null
    }));
  }

  async update(expenseId, expense) {
    const existing = await this.findById(expenseId);
    if (!existing) return null;

    const data = {
      category: expense.category !== undefined ? expense.category : existing.category,
      description: expense.description !== undefined ? expense.description : existing.description,
      amount: expense.amount !== undefined ? expense.amount : existing.amount,
      expenseDate: expense.expenseDate !== undefined ? new Date(expense.expenseDate) : new Date(existing.expenseDate),
      paymentMethod: expense.paymentMethod !== undefined ? expense.paymentMethod : existing.paymentMethod,
      referenceNumber: expense.referenceNumber !== undefined ? expense.referenceNumber : existing.referenceNumber,
      notes: expense.notes !== undefined ? expense.notes : existing.notes,
      attachmentUrl: expense.attachmentUrl !== undefined ? expense.attachmentUrl : existing.attachmentUrl
    };

    await this.prisma.otherexpenses.update({
      where: { expenseId },
      data
    });

    return this.findById(expenseId);
  }

  async delete(expenseId) {
    await this.prisma.otherexpenses.delete({
      where: { expenseId }
    });
    return true;
  }

  async generateNextId() {
    return this.generateNextFormattedId('otherexpenses', 'expenseId', 'OE', 4);
  }

  async getCategories() {
    const rows = await this.prisma.otherexpenses.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    return rows.map(r => r.category);
  }

  async getSummaryByCategory(fromDate, toDate) {
    const groups = await this.prisma.otherexpenses.groupBy({
      by: ['category'],
      where: {
        expenseDate: {
          gte: new Date(fromDate),
          lte: new Date(toDate)
        }
      },
      _count: { expenseId: true },
      _sum: { amount: true }
    });

    return groups.map(g => ({
      category: g.category,
      count: g._count.expenseId,
      totalAmount: Number(g._sum.amount || 0)
    }));
  }

  mapToEntity(row) {
    return new OtherExpense({
      expenseId: row.expenseId,
      category: row.category,
      description: row.description,
      amount: Number(row.amount) || 0,
      expenseDate: row.expenseDate,
      paymentMethod: row.paymentMethod,
      referenceNumber: row.referenceNumber,
      notes: row.notes,
      recordedBy: row.recordedBy,
      recordedByName: row.recordedByName,
      createdDate: row.createdDate,
      attachmentUrl: row.attachmentUrl
    });
  }
}

module.exports = MySQLOtherExpenseRepository;
