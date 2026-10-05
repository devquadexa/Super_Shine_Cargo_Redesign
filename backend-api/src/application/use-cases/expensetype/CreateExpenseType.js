class CreateExpenseType {
  constructor(expenseTypeRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
  }

  async execute(typeData) {
    if (!typeData.category || !typeData.typeName) {
      throw new Error('Expense category and type name are required');
    }
    
    // Normalize category
    const validCategories = ['General', 'Operational'];
    const matchedCategory = validCategories.find(c => c.toLowerCase() === typeData.category.toLowerCase());
    if (!matchedCategory) {
      throw new Error(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
    }

    return await this.expenseTypeRepository.create({
      ...typeData,
      category: matchedCategory
    });
  }
}

module.exports = CreateExpenseType;
