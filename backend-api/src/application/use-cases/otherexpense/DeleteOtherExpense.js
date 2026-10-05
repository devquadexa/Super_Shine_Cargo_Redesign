/**
 * Delete Other Expense Use Case
 */
class DeleteOtherExpense {
  constructor(otherExpenseRepository) {
    this.otherExpenseRepository = otherExpenseRepository;
  }

  async execute(expenseId) {
    return await this.otherExpenseRepository.delete(expenseId);
  }
}

module.exports = DeleteOtherExpense;
