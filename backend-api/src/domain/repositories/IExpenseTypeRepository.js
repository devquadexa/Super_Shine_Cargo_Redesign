/**
 * ExpenseType Repository Interface
 */
class IExpenseTypeRepository {
  async getAll() {
    throw new Error('Method not implemented');
  }

  async getByCategory(category) {
    throw new Error('Method not implemented');
  }

  async create(typeData) {
    throw new Error('Method not implemented');
  }

  async update(typeId, typeData) {
    throw new Error('Method not implemented');
  }

  async delete(typeId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IExpenseTypeRepository;
