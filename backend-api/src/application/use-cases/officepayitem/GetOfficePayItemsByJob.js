/**
 * Get Office Pay Items by Job Use Case
 */
class GetOfficePayItemsByJob {
  constructor(officePayItemRepository) {
    this.officePayItemRepository = officePayItemRepository;
  }

  async execute(jobId) {
    try {
      if (!jobId) {
        throw new Error('Job ID is required');
      }
      
      return await this.officePayItemRepository.findByJobId(jobId);
    } catch (error) {
      console.error('GetOfficePayItemsByJob.execute - ERROR:', error);
      throw error;
    }
  }
}

module.exports = GetOfficePayItemsByJob;