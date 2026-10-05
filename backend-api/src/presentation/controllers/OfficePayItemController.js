/**
 * Office Pay Item Controller
 * Handles HTTP requests for office pay item operations
 */
class OfficePayItemController {
  constructor(createOfficePayItem, getOfficePayItemsByJob, updateOfficePayItem, deleteOfficePayItem) {
    this.createOfficePayItem = createOfficePayItem;
    this.getOfficePayItemsByJob = getOfficePayItemsByJob;
    this.updateOfficePayItem = updateOfficePayItem;
    this.deleteOfficePayItem = deleteOfficePayItem;
  }

  async create(req, res) {
    try {
      const payItemData = {
        jobId: req.body.jobId,
        description: req.body.description,
        actualCost: req.body.actualCost,
        paidBy: req.user.userId // Current user making the payment
      };
      
      const officePayItem = await this.createOfficePayItem.execute(payItemData);
      res.status(201).json(officePayItem);
    } catch (error) {
      console.error('OfficePayItemController.create - ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async getByJobId(req, res) {
    try {
      const items = await this.getOfficePayItemsByJob.execute(req.params.jobId);
      res.json(items);
    } catch (error) {
      console.error('OfficePayItemController.getByJobId - ERROR:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async update(req, res) {
    try {
      const updateData = {
        description: req.body.description,
        actualCost: req.body.actualCost
      };
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      const updatedItem = await this.updateOfficePayItem.execute(req.params.id, updateData);
      res.json(updatedItem);
    } catch (error) {
      console.error('OfficePayItemController.update - ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      await this.deleteOfficePayItem.execute(req.params.id);
      res.json({ message: 'Office pay item deleted successfully' });
    } catch (error) {
      console.error('OfficePayItemController.delete - ERROR:', error);
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = OfficePayItemController;