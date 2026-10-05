/**
 * Create Office Pay Item Use Case
 * For payments made by office staff at the beginning of jobs
 */
const OfficePayItem = require('../../../domain/entities/OfficePayItem');

class CreateOfficePayItem {
  constructor(officePayItemRepository, jobRepository) {
    this.officePayItemRepository = officePayItemRepository;
    this.jobRepository = jobRepository;
  }

  async execute(payItemData) {
    try {
      // Validate job exists
      const job = await this.jobRepository.findById(payItemData.jobId);
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Generate ID
      const officePayItemId = await this.officePayItemRepository.generateNextId();
      
      // Create entity
      const officePayItem = new OfficePayItem({
        officePayItemId,
        jobId: payItemData.jobId,
        description: payItemData.description,
        actualCost: payItemData.actualCost,
        paidBy: payItemData.paidBy
      });
      
      // Validate
      const validation = officePayItem.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Save
      return await this.officePayItemRepository.create(officePayItem);
    } catch (error) {
      console.error('CreateOfficePayItem.execute - ERROR:', error);
      throw error;
    }
  }
}

module.exports = CreateOfficePayItem;