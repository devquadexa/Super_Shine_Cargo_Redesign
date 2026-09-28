const ICategoryRepository = require('../../../domain/repositories/ICategoryRepository');
const Category = require('../../../domain/entities/Category');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLCategoryRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async findAll() {
    const rows = await this.prisma.categories.findMany({
      orderBy: { categoryName: 'asc' }
    });
    return rows.map(row => this.mapToEntity(row));
  }

  async findById(categoryId) {
    const row = await this.prisma.categories.findUnique({
      where: { categoryId: parseInt(categoryId, 10) }
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findByCustomerId(customerId) {
    const records = await this.prisma.customercategories.findMany({
      where: { customerId },
      include: { categories: true }
    });
    return records
      .map(r => r.categories)
      .filter(Boolean)
      .map(c => this.mapToEntity(c));
  }

  async assignToCustomer(customerId, categoryIds) {
    await this.removeFromCustomer(customerId);

    if (categoryIds && categoryIds.length > 0) {
      await this.prisma.customercategories.createMany({
        data: categoryIds.map(id => ({
          customerId,
          categoryId: parseInt(id, 10)
        }))
      });
    }
    return true;
  }

  async removeFromCustomer(customerId) {
    await this.prisma.customercategories.deleteMany({
      where: { customerId }
    });
    return true;
  }

  mapToEntity(row) {
    return new Category({
      categoryId: row.categoryId,
      categoryName: row.categoryName
    });
  }

  formatId(id) {
    return String(id).padStart(6, '0');
  }
}

module.exports = MySQLCategoryRepository;
