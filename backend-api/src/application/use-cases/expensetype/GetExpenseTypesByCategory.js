class GetExpenseTypesByCategory {
  constructor(expenseTypeRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
  }

  async execute(category) {
    if (!category) {
      throw new Error('Expense category is required');
    }
    return await this.expenseTypeRepository.getByCategory(category);
  }
}

module.exports = GetExpenseTypesByCategory;
