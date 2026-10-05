class ExpenseTypeController {
  constructor(container) {
    this.container = container;
  }

  async getAll(req, res) {
    try {
      const getAllExpenseTypes = this.container.resolve('getAllExpenseTypes');
      const types = await getAllExpenseTypes.execute();
      res.json(types);
    } catch (error) {
      console.error('Error in getAll expense types:', error);
      res.status(500).json({ message: 'Error fetching expense types', error: error.message });
    }
  }

  async getByCategory(req, res) {
    try {
      const { category } = req.params;
      const getExpenseTypesByCategory = this.container.resolve('getExpenseTypesByCategory');
      const types = await getExpenseTypesByCategory.execute(category);
      res.json(types);
    } catch (error) {
      console.error('Error in getByCategory expense types:', error);
      res.status(500).json({ message: 'Error fetching expense types', error: error.message });
    }
  }

  async create(req, res) {
    try {
      const createExpenseType = this.container.resolve('createExpenseType');
      const type = await createExpenseType.execute(req.body);
      res.status(201).json(type);
    } catch (error) {
      console.error('Error in create expense type:', error);
      res.status(500).json({ message: 'Error creating expense type', error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updateExpenseType = this.container.resolve('updateExpenseType');
      const type = await updateExpenseType.execute(parseInt(id), req.body);
      res.json(type);
    } catch (error) {
      console.error('Error in update expense type:', error);
      res.status(500).json({ message: 'Error updating expense type', error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleteExpenseType = this.container.resolve('deleteExpenseType');
      await deleteExpenseType.execute(parseInt(id));
      res.json({ message: 'Expense type deleted successfully' });
    } catch (error) {
      console.error('Error in delete expense type:', error);
      res.status(500).json({ message: 'Error deleting expense type', error: error.message });
    }
  }
}

module.exports = ExpenseTypeController;
