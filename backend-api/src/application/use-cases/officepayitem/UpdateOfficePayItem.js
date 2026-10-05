/**
 * Update Office Pay Item Use Case
 * Allows updating billing amounts and other details
 */
class UpdateOfficePayItem {
  constructor(officePayItemRepository) {
    this.officePayItemRepository = officePayItemRepository;
  }

  async execute(officePayItemId, updateData) {
    try {
      // Check if item exists
      const existingItem = await this.officePayItemRepository.findById(officePayItemId);
      if (!existingItem) {
        throw new Error('Office pay item not found');
      }
      
      // Validate update data
      if (updateData.actualCost !== undefined && updateData.actualCost <= 0) {
        throw new Error('Actual cost must be greater than 0');
      }
      
      // Update
      return await this.officePayItemRepository.update(officePayItemId, updateData);
    } catch (error) {
      console.error('UpdateOfficePayItem.execute - ERROR:', error);
      throw error;
    }
  }
}

module.exports = UpdateOfficePayItem;