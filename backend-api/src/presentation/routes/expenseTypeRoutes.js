const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../../middleware/auth');

module.exports = (container) => {
  const ExpenseTypeController = require('../controllers/ExpenseTypeController');
  const controller = new ExpenseTypeController(container);

  // Get all expense types grouped by category (accessible to all authenticated users)
  router.get('/all', 
    auth, 
    (req, res) => controller.getAll(req, res)
  );

  // Get expense types by category (accessible to all authenticated users)
  router.get('/category/:category', 
    auth, 
    (req, res) => controller.getByCategory(req, res)
  );

  // Create new expense type (Admin, Super Admin)
  router.post('/', 
    auth, 
    checkRole('Admin', 'Super Admin'), 
    (req, res) => controller.create(req, res)
  );

  // Update expense type (Admin, Super Admin)
  router.put('/:id', 
    auth, 
    checkRole('Admin', 'Super Admin'), 
    (req, res) => controller.update(req, res)
  );

  // Delete expense type (Admin, Super Admin)
  router.delete('/:id', 
    auth, 
    checkRole('Admin', 'Super Admin'), 
    (req, res) => controller.delete(req, res)
  );

  return router;
};
