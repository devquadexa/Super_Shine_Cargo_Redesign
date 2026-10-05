class DeleteExpenseType {
  constructor(expenseTypeRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
  }

  async execute(typeId) {
    if (!typeId) {
      throw new Error('Type ID is required');
    }
    return await this.expenseTypeRepository.delete(typeId);
  }
}

module.exports = DeleteExpenseType;
