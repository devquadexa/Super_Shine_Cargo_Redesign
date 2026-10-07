/**
 * Replace Pay Items for Job Use Case
 * Replaces all existing pay items with new ones
 */
class ReplacePayItems {
  constructor(jobRepository) {
    this.jobRepository = jobRepository;
  }

  async execute(jobId, payItemsData, userId) {
    // Validate pay items
    for (const item of payItemsData) {
      const description = item.description || item.name || '';
      const amount = parseFloat(item.amount || item.actualCost || 0);
      const billingAmount = parseFloat(item.billingAmount || item.amount || item.actualCost || 0);

      if (!description.trim()) {
        throw new Error(`Invalid pay item: description is required`);
      }
      if (isNaN(amount) || amount < 0) {
        throw new Error(`Invalid amount for pay item: ${description}`);
      }
      if (isNaN(billingAmount) || billingAmount < 0) {
        throw new Error(`Invalid billing amount for pay item: ${description}`);
      }
    }

    // Replace all pay items through repository fast
    await this.jobRepository.replacePayItems(jobId, payItemsData, userId);

    return { jobId, payItems: payItemsData };
  }
}

module.exports = ReplacePayItems;
