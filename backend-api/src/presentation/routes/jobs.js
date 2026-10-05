/**
 * Job Routes (Clean Architecture)
 */
const express = require('express');
const { auth, checkRole } = require('../../middleware/auth');
const container = require('../../infrastructure/di/container');
const JobController = require('../controllers/JobController');

const router = express.Router();

// Initialize controller with use cases from DI container
const jobController = new JobController(
  container.get('createJob'),
  container.get('getAllJobs'),
  container.get('getJobById'),
  container.get('updateJobStatus'),
  container.get('assignJob'),
  container.get('addPayItem'),
  container.get('assignMultipleUsersToJob'),
  container.get('replacePayItems'),
  container.get('updateJob')
);

// Routes
router.post('/', auth, checkRole('Admin', 'Super Admin', 'Manager', 'Office Executive'), (req, res) => 
  jobController.create(req, res)
);

router.get('/', auth, (req, res) => 
  jobController.getAll(req, res)
);

router.get('/:id', auth, (req, res) => 
  jobController.getById(req, res)
);

router.patch('/:id/status', auth, (req, res) => 
  jobController.updateStatus(req, res)
);

router.put('/:id', auth, checkRole('Admin', 'Super Admin', 'Manager', 'Office Executive'), (req, res) => 
  jobController.update(req, res)
);

router.patch('/:id/assign', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) => 
  jobController.assign(req, res)
);

router.post('/:id/pay-items', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) => 
  jobController.addPayItem(req, res)
);

router.put('/:id/pay-items', auth, checkRole('Admin', 'Super Admin', 'Manager', 'Office Executive'), (req, res) => 
  jobController.replacePayItems(req, res)
);

// New route for advance payment
router.get('/:jobId/advance-payments', auth, (req, res) =>
  jobController.getAdvancePayments(req, res)
);

router.post('/:jobId/advance-payments', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) =>
  jobController.addAdvancePayment(req, res)
);

router.put('/:jobId/advance-payments/:paymentId', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) =>
  jobController.updateAdvancePaymentEntry(req, res)
);

router.delete('/:jobId/advance-payments/:paymentId', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) =>
  jobController.deleteAdvancePaymentEntry(req, res)
);

router.put('/:jobId/advance-payment', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) => 
  jobController.updateAdvancePayment(req, res)
);

// Advance payment request routes (Email request + Complete request)
router.get('/:jobId/advance-payment-requests', auth, (req, res) =>
  jobController.getAdvancePaymentRequests(req, res)
);

router.post('/:jobId/advance-payment-requests', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) =>
  jobController.createAdvancePaymentRequest(req, res)
);

router.post('/:jobId/advance-payment-requests/:requestId/complete', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) =>
  jobController.completeAdvancePaymentRequest(req, res)
);

router.post('/:jobId/advance-payment-requests/:requestId/cancel', auth, checkRole('Admin', 'Super Admin', 'Manager'), (req, res) =>
  jobController.cancelAdvancePaymentRequest(req, res)
);

module.exports = router;
