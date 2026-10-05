/**
 * Update Other Expense Use Case
 */
class UpdateOtherExpense {
  constructor(otherExpenseRepository) {
    this.otherExpenseRepository = otherExpenseRepository;
  }

  async execute(expenseId, expenseData) {
    const updated = await this.otherExpenseRepository.update(expenseId, expenseData);
    if (!updated) {
      throw new Error('Expense not found');
    }
    return updated;
  }
}

module.exports = UpdateOtherExpense;
