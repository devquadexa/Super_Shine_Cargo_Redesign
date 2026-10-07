const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../../middleware/auth');

module.exports = (container) => {
  const ClerkManagerController = require('../controllers/ClerkManagerController');
  const controller = new ClerkManagerController(container);

  // Get current user's petty cash request threshold (Accessible by any authenticated user)
  router.get('/my-threshold',
    auth,
    (req, res) => controller.getMyThreshold(req, res)
  );

  // Get all clerks and available managers (Admin / Super Admin only)
  router.get('/',
    auth,
    checkRole('Admin', 'Super Admin'),
    (req, res) => controller.getAll(req, res)
  );

  // Batch update clerk manager assignments & thresholds
  router.put('/batch',
    auth,
    checkRole('Admin', 'Super Admin'),
    (req, res) => controller.updateBatch(req, res)
  );

  // Update specific clerk's assigned manager & threshold
  router.put('/:clerkId',
    auth,
    checkRole('Admin', 'Super Admin'),
    (req, res) => controller.update(req, res)
  );

  return router;
};
