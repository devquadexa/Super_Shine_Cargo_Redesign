class UpdateExpenseType {
  constructor(expenseTypeRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
  }

  async execute(typeId, typeData) {
    if (!typeId) {
      throw new Error('Type ID is required');
    }

    if (typeData.category) {
      const validCategories = ['General', 'Operational'];
      const matchedCategory = validCategories.find(c => c.toLowerCase() === typeData.category.toLowerCase());
      if (!matchedCategory) {
        throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }
      typeData.category = matchedCategory;
    }

    return await this.expenseTypeRepository.update(typeId, typeData);
  }
}

module.exports = UpdateExpenseType;
