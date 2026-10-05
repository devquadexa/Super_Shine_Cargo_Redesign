const IExpenseTypeRepository = require('../../../domain/repositories/IExpenseTypeRepository');
const BaseMySQLRepository = require('./BaseMySQLRepository');

const DEFAULT_EXPENSE_TYPES = [
  // General Category
  { category: 'General', typeName: 'Food & Beverages', description: 'Office refreshments, lunch, staff meals', itemOrder: 1 },
  { category: 'General', typeName: 'Utility Bills', description: 'Electricity, water, municipal rates', itemOrder: 2 },
  { category: 'General', typeName: 'WiFi & Internet', description: 'Office fiber internet and data packages', itemOrder: 3 },
  { category: 'General', typeName: 'Phone Cards & Mobile', description: 'Staff phone reloads and communication', itemOrder: 4 },
  { category: 'General', typeName: 'Office Supplies & Stationery', description: 'Paper, toner, stationery, consumables', itemOrder: 5 },
  { category: 'General', typeName: 'Office Maintenance & Cleaning', description: 'Repairs, AC servicing, cleaning supplies', itemOrder: 6 },
  { category: 'General', typeName: 'Office Rent & Rates', description: 'Building lease and monthly rental fees', itemOrder: 7 },
  { category: 'General', typeName: 'Staff Welfare & Amenities', description: 'Tea, medical kits, staff amenities', itemOrder: 8 },
  { category: 'General', typeName: 'Postage & Courier', description: 'Postal dispatches and local courier charges', itemOrder: 9 },
  { category: 'General', typeName: 'Miscellaneous General', description: 'Unclassified general office expenses', itemOrder: 10 },

  // Operational Category
  { category: 'Operational', typeName: 'Fuel & Diesel / Petrol', description: 'Vehicle fuel, van transport, generator diesel', itemOrder: 1 },
  { category: 'Operational', typeName: 'Port & Terminal Charges', description: 'SLPA port charges, terminal handling fees', itemOrder: 2 },
  { category: 'Operational', typeName: 'Customs Clearance & Examination', description: 'Customs inspection, appraisal and clearance', itemOrder: 3 },
  { category: 'Operational', typeName: 'Loading & Handling Charges', description: 'Labor fees, warehouse handling, forklifts', itemOrder: 4 },
  { category: 'Operational', typeName: 'Delivery Order (DO) & Shipping Line Fees', description: 'DO endorsement and line documentation', itemOrder: 5 },
  { category: 'Operational', typeName: 'Demurrage & Detention Charges', description: 'Port demurrage and container detention', itemOrder: 6 },
  { category: 'Operational', typeName: 'Transporter Freight Charges', description: 'Third-party haulier and container transport', itemOrder: 7 },
  { category: 'Operational', typeName: 'Vehicle Repairs & Servicing', description: 'Operational vehicle maintenance and tires', itemOrder: 8 },
  { category: 'Operational', typeName: 'Gate Pass & Port Security Stickers', description: 'Harbor entry passes and port decals', itemOrder: 9 },
  { category: 'Operational', typeName: 'Miscellaneous Operational', description: 'Other field and operational expenses', itemOrder: 10 },
];

class MySQLExpenseTypeRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
    this._initialized = false;
  }

  async ensureSeeded() {
    if (this._initialized) return;
    try {
      const rows = await this.prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM expensetypes`);
      const count = Number(rows[0]?.count || 0);
      if (count === 0) {
        // Batch insert all default types in a single query
        const placeholders = DEFAULT_EXPENSE_TYPES.map(() => '(?, ?, ?, ?, 1, NOW())').join(', ');
        const values = DEFAULT_EXPENSE_TYPES.flatMap(item => [item.category, item.typeName, item.description, item.itemOrder]);
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO expensetypes (category, typeName, description, itemOrder, isActive, createdDate) VALUES ${placeholders}`,
          ...values
        );
      }
      this._initialized = true;
    } catch (error) {
      // Silently fail — non-critical seeding
    }
  }

  clearCache() {
    this._cache = null;
    this._categoryCache = {};
  }

  async getAll() {
    if (this._cache) return this._cache;
    await this.ensureSeeded();
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT typeId, category, typeName, description, itemOrder, isActive, createdDate
       FROM expensetypes
       WHERE isActive = 1
       ORDER BY category ASC, itemOrder ASC, typeName ASC`
    );

    const grouped = {
      General: [],
      Operational: []
    };

    rows.forEach(row => {
      const cat = row.category || 'General';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push({
        typeId: row.typeId,
        category: row.category,
        typeName: row.typeName,
        description: row.description,
        itemOrder: row.itemOrder,
        isActive: Boolean(row.isActive),
        createdDate: row.createdDate
      });
    });

    this._cache = grouped;
    return grouped;
  }

  async getByCategory(category) {
    if (!this._categoryCache) this._categoryCache = {};
    if (this._categoryCache[category]) return this._categoryCache[category];

    await this.ensureSeeded();
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT typeId, category, typeName, description, itemOrder, isActive, createdDate
       FROM expensetypes
       WHERE category = ? AND isActive = 1
       ORDER BY itemOrder ASC, typeName ASC`,
      category
    );

    const result = rows.map(row => ({
      typeId: row.typeId,
      category: row.category,
      typeName: row.typeName,
      description: row.description,
      itemOrder: row.itemOrder,
      isActive: Boolean(row.isActive),
      createdDate: row.createdDate
    }));

    this._categoryCache[category] = result;
    return result;
  }

  async create(typeData) {
    const category = typeData.category === 'Operational' ? 'Operational' : 'General';
    const typeName = (typeData.typeName || '').trim();
    const description = (typeData.description || '').trim() || null;

    if (!typeName) {
      throw new Error('Expense type name is required');
    }

    // Get max itemOrder
    const maxRows = await this.prisma.$queryRawUnsafe(
      `SELECT MAX(itemOrder) as maxOrder FROM expensetypes WHERE category = ?`,
      category
    );
    const nextOrder = Number(maxRows[0]?.maxOrder || 0) + 1;

    const result = await this.prisma.$executeRawUnsafe(
      `INSERT INTO expensetypes (category, typeName, description, itemOrder, isActive, createdDate)
       VALUES (?, ?, ?, ?, 1, NOW())`,
      category,
      typeName,
      description,
      nextOrder
    );

    const newRows = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM expensetypes WHERE category = ? AND typeName = ? ORDER BY typeId DESC LIMIT 1`,
      category,
      typeName
    );

    this.clearCache();
    return newRows[0];
  }

  async update(typeId, typeData) {
    const id = parseInt(typeId, 10);
    const typeName = (typeData.typeName || '').trim();
    const description = typeData.description !== undefined ? typeData.description : null;
    const category = typeData.category || null;

    if (!typeName) {
      throw new Error('Expense type name is required');
    }

    if (category) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE expensetypes SET typeName = ?, description = ?, category = ? WHERE typeId = ?`,
        typeName,
        description,
        category,
        id
      );
    } else {
      await this.prisma.$executeRawUnsafe(
        `UPDATE expensetypes SET typeName = ?, description = ? WHERE typeId = ?`,
        typeName,
        description,
        id
      );
    }

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM expensetypes WHERE typeId = ?`,
      id
    );

    this.clearCache();
    return rows[0];
  }

  async delete(typeId) {
    const id = parseInt(typeId, 10);
    await this.prisma.$executeRawUnsafe(
      `UPDATE expensetypes SET isActive = 0 WHERE typeId = ?`,
      id
    );
    this.clearCache();
    return { success: true };
  }
}

module.exports = MySQLExpenseTypeRepository;
