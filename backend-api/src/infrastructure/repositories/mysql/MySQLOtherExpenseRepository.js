const IOtherExpenseRepository = require('../../../domain/repositories/IOtherExpenseRepository');
const OtherExpense = require('../../../domain/entities/OtherExpense');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLOtherExpenseRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(expense) {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO otherexpenses (expenseId, category, expenseType, description, amount, expenseDate, paymentMethod, referenceNumber, notes, recordedBy, attachmentUrl, createdDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        expense.expenseId,
        expense.category,
        expense.expenseType || null,
        expense.description,
        expense.amount,
        expense.expenseDate ? new Date(expense.expenseDate) : new Date(),
        expense.paymentMethod || null,
        expense.referenceNumber || null,
        expense.notes || null,
        expense.recordedBy,
        expense.attachmentUrl || null
      );
    } catch (e) {
      // Fallback
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
    }

    this.clearCache();
    return expense;
  }

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
  }

  async findById(expenseId) {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT oe.*, u.fullName as recordedByName 
       FROM otherexpenses oe 
       LEFT JOIN users u ON oe.recordedBy = u.userId 
       WHERE oe.expenseId = ?`,
      expenseId
    );
    if (!rows || rows.length === 0) return null;
    return this.mapToEntity(rows[0]);
  }

  async findAll(filters = {}) {
    const hasFilters = Boolean(filters.category || filters.expenseType || filters.fromDate || filters.toDate);
    const now = Date.now();
    if (!hasFilters && this._cache && (now - this._cacheTime < 60000)) {
      return this._cache;
    }

    let sql = `SELECT oe.*, u.fullName as recordedByName 
               FROM otherexpenses oe 
               LEFT JOIN users u ON oe.recordedBy = u.userId 
               WHERE 1=1`;
    const params = [];
    if (filters.category) {
      sql += ` AND oe.category = ?`;
      params.push(filters.category);
    }
    if (filters.expenseType) {
      sql += ` AND oe.expenseType = ?`;
      params.push(filters.expenseType);
    }
    if (filters.fromDate) {
      sql += ` AND oe.expenseDate >= ?`;
      params.push(new Date(filters.fromDate));
    }
    if (filters.toDate) {
      sql += ` AND oe.expenseDate <= ?`;
      params.push(new Date(filters.toDate));
    }
    sql += ` ORDER BY oe.expenseDate DESC, oe.createdDate DESC`;

    const rows = await this.prisma.$queryRawUnsafe(sql, ...params);
    const result = rows.map(r => this.mapToEntity(r));
    if (!hasFilters) {
      this._cache = result;
      this._cacheTime = now;
    }
    return result;
  }

  async findByDateRange(fromDate, toDate, category = null) {
    let sql = `SELECT oe.*, u.fullName as recordedByName 
               FROM otherexpenses oe 
               LEFT JOIN users u ON oe.recordedBy = u.userId 
               WHERE oe.expenseDate >= ? AND oe.expenseDate <= ?`;
    const params = [new Date(fromDate), new Date(toDate)];
    if (category) {
      sql += ` AND oe.category = ?`;
      params.push(category);
    }
    sql += ` ORDER BY oe.expenseDate DESC`;

    const rows = await this.prisma.$queryRawUnsafe(sql, ...params);
    return rows.map(r => this.mapToEntity(r));
  }

  async update(expenseId, expense) {
    const existing = await this.findById(expenseId);
    if (!existing) return null;

    const category = expense.category !== undefined ? expense.category : existing.category;
    const expenseType = expense.expenseType !== undefined ? expense.expenseType : existing.expenseType;
    const description = expense.description !== undefined ? expense.description : existing.description;
    const amount = expense.amount !== undefined ? expense.amount : existing.amount;
    const expenseDate = expense.expenseDate !== undefined ? new Date(expense.expenseDate) : new Date(existing.expenseDate);
    const paymentMethod = expense.paymentMethod !== undefined ? expense.paymentMethod : existing.paymentMethod;
    const referenceNumber = expense.referenceNumber !== undefined ? expense.referenceNumber : existing.referenceNumber;
    const notes = expense.notes !== undefined ? expense.notes : existing.notes;
    const attachmentUrl = expense.attachmentUrl !== undefined ? expense.attachmentUrl : existing.attachmentUrl;

    await this.prisma.$executeRawUnsafe(
      `UPDATE otherexpenses 
       SET category = ?, expenseType = ?, description = ?, amount = ?, expenseDate = ?, paymentMethod = ?, referenceNumber = ?, notes = ?, attachmentUrl = ?
       WHERE expenseId = ?`,
      category,
      expenseType,
      description,
      amount,
      expenseDate,
      paymentMethod,
      referenceNumber,
      notes,
      attachmentUrl,
      expenseId
    );

    this.clearCache();
    return new OtherExpense({
      ...existing,
      category,
      expenseType,
      description,
      amount: Number(amount) || 0,
      expenseDate,
      paymentMethod,
      referenceNumber,
      notes,
      attachmentUrl
    });
  }

  async delete(expenseId) {
    await this.prisma.$executeRawUnsafe(`DELETE FROM otherexpenses WHERE expenseId = ?`, expenseId);
    this.clearCache();
    return true;
  }

  async generateNextId() {
    return this.generateNextFormattedId('otherexpenses', 'expenseId', 'OE', 4);
  }

  async getCategories() {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT DISTINCT category FROM otherexpenses WHERE category IS NOT NULL ORDER BY category ASC`
    );
    return rows.map(r => r.category);
  }

  async getSummaryByCategory(fromDate, toDate) {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT category, COUNT(expenseId) as count, SUM(amount) as totalAmount 
       FROM otherexpenses 
       WHERE expenseDate >= ? AND expenseDate <= ?
       GROUP BY category`,
      new Date(fromDate),
      new Date(toDate)
    );

    return rows.map(g => ({
      category: g.category,
      count: Number(g.count || 0),
      totalAmount: Number(g.totalAmount || 0)
    }));
  }

  mapToEntity(row) {
    let category = row.category;
    let expenseType = row.expenseType;
    // Backwards compatibility for rows created before 2-tier categorization
    if (!expenseType && category && !['General', 'Operational'].includes(category)) {
      expenseType = category;
      category = 'General';
    }

    return new OtherExpense({
      expenseId: row.expenseId,
      category: category,
      expenseType: expenseType,
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
