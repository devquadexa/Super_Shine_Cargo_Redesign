class GetAllExpenseTypes {
  constructor(expenseTypeRepository) {
    this.expenseTypeRepository = expenseTypeRepository;
  }

  async execute() {
    return await this.expenseTypeRepository.getAll();
  }
}

module.exports = GetAllExpenseTypes;
