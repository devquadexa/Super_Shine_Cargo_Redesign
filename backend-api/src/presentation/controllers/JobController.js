/**
 * Job Controller
 * Handles HTTP requests for job operations
 */
class JobController {
  constructor(createJob, getAllJobs, getJobById, updateJobStatus, assignJob, addPayItem, assignMultipleUsersToJob, replacePayItems, updateJob) {
    this.createJob = createJob;
    this.getAllJobs = getAllJobs;
    this.getJobById = getJobById;
    this.updateJobStatus = updateJobStatus;
    this.assignJob = assignJob;
    this.addPayItemUseCase = addPayItem;
    this.assignMultipleUsersToJob = assignMultipleUsersToJob;
    this.replacePayItemsUseCase = replacePayItems;
    this.updateJobUseCase = updateJob;
    this.updateJob = updateJob;
  }

  async create(req, res) {
    try {
      console.log('=== CREATE JOB START ===');
      console.log('create - req.body:', req.body);
      console.log('create - req.user:', req.user);
      
      const jobData = {
        customerId: req.body.customerId,
        blNumber: req.body.blNumber || null,
        cusdecNumber: req.body.cusdecNumber || null,
        cusdecDate: req.body.cusdecDate || null,
        openDate: req.body.openDate || null,
        shipmentCategory: req.body.shipmentCategory,
        chassisNumber: req.body.chassisNumber || null,
        exporter: req.body.exporter || null,
        transporter: req.body.transporter || null,
        lcNumber: req.body.lcNumber || null,
        containerNumber: req.body.containerNumber || null,
        transportDeliveryDate: req.body.transportDeliveryDate || null,
        assignedTo: req.body.assignedTo || null
      };
      
      console.log('create - jobData:', jobData);
      
      // Validate required fields
      if (!jobData.customerId) {
        console.log('create - Missing customerId');
        return res.status(400).json({ message: 'Customer ID is required' });
      }
      if (!jobData.shipmentCategory) {
        console.log('create - Missing shipmentCategory');
        return res.status(400).json({ message: 'Shipment Category is required' });
      }
      
      // Create the job first
      const job = await this.createJob.execute(jobData);
      console.log('create - job created:', job);
      
      // NOTE: Removed automatic addition of a default advance payment pay item.
      // Advance payments should be recorded explicitly via the advance payment
      // endpoints or added by the client when appropriate.
      
      // Handle multiple user assignments if provided
      if (req.body.assignedUsers && Array.isArray(req.body.assignedUsers) && req.body.assignedUsers.length > 0) {
        try {
          console.log('create - assigning users:', req.body.assignedUsers);
          await this.assignMultipleUsersToJob.execute(
            job.jobId, 
            req.body.assignedUsers, 
            req.user.userId
          );
          
          // Get updated job with assignments
          const updatedJob = await this.getJobById.execute(job.jobId);
          console.log('create - job with assignments:', updatedJob);
          console.log('=== CREATE JOB END ===');
          return res.status(201).json(updatedJob);
        } catch (assignmentError) {
          console.error('Error assigning users to job:', assignmentError);
          console.log('=== CREATE JOB END (with assignment error) ===');
          return res.status(201).json({
            ...job,
            message: 'Job created successfully (Note: Job created but user assignment failed)!'
          });
        }
      }
      
      console.log('=== CREATE JOB END ===');
      res.status(201).json(job);
    } catch (error) {
      console.error('Create job error:', error);
      console.error('Error stack:', error.stack);
      console.log('=== CREATE JOB END (with error) ===');
      res.status(400).json({ message: error.message });
    }
  }

  async update(req, res) {
    try {
      const jobId = req.params.id;
      console.log('JobController.update - START');
      console.log('JobController.update - jobId:', jobId);
      console.log('JobController.update - req.body:', JSON.stringify(req.body, null, 2));
      
            // Only include fields that are explicitly present in the request body
      const jobData = {};
      if (req.body.hasOwnProperty('blNumber')) jobData.blNumber = req.body.blNumber || null;
      if (req.body.hasOwnProperty('cusdecNumber')) jobData.cusdecNumber = req.body.cusdecNumber || null;
      if (req.body.hasOwnProperty('cusdecDate')) jobData.cusdecDate = req.body.cusdecDate || null;
      if (req.body.hasOwnProperty('openDate')) jobData.openDate = req.body.openDate || null;
      if (req.body.hasOwnProperty('shipmentCategory')) jobData.shipmentCategory = req.body.shipmentCategory;
      if (req.body.hasOwnProperty('chassisNumber')) jobData.chassisNumber = req.body.chassisNumber || null;
      if (req.body.hasOwnProperty('exporter')) jobData.exporter = req.body.exporter || null;
      if (req.body.hasOwnProperty('transporter')) jobData.transporter = req.body.transporter || null;
      if (req.body.hasOwnProperty('lcNumber')) jobData.lcNumber = req.body.lcNumber || null;
      if (req.body.hasOwnProperty('containerNumber')) jobData.containerNumber = req.body.containerNumber || null;
      if (req.body.hasOwnProperty('transportDeliveryDate')) jobData.transportDeliveryDate = req.body.transportDeliveryDate || null;
      if (req.body.hasOwnProperty('status')) jobData.status = req.body.status;
      if (req.body.hasOwnProperty('assignedTo')) jobData.assignedTo = req.body.assignedTo || null;
      
      console.log('JobController.update - jobData:', JSON.stringify(jobData, null, 2));
      
      const job = await this.updateJob.execute(jobId, jobData);
      console.log('JobController.update - job result:', JSON.stringify(job, null, 2));
      res.json(job);
    } catch (error) {
      console.error('Update job error:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const filters = {};
      
      // Filter by user role - Waff Clerk only sees their assigned jobs
      if (req.user.role === 'Waff Clerk') {
        filters.assignedTo = req.user.userId;
      }
      
      const jobs = await this.getAllJobs.execute(filters);
      console.log('Jobs from use case:', jobs);
      console.log('First job:', JSON.stringify(jobs[0]));
      res.json(jobs);
    } catch (error) {
      console.error('Get jobs error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const job = await this.getJobById.execute(req.params.id);
      
      // Check access for Waff Clerk role - verify they're assigned to this job
      if (req.user.role === 'Waff Clerk') {
        const isAssigned = job.assignedUsers && job.assignedUsers.some(user => user.userId === req.user.userId);
        if (!isAssigned) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      res.json(job);
    } catch (error) {
      console.error('Get job error:', error);
      res.status(404).json({ message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      console.log('JobController.updateStatus - params:', req.params);
      console.log('JobController.updateStatus - body:', req.body);
      console.log('JobController.updateStatus - user:', req.user);
      
      const { status } = req.body;
      
      if (!status) {
        console.log('JobController.updateStatus - No status provided');
        return res.status(400).json({ message: 'Status is required' });
      }
      
      // Check access for Waff Clerk role
      const job = await this.getJobById.execute(req.params.id);
      console.log('JobController.updateStatus - found job:', job);
      
      if (req.user.role === 'Waff Clerk') {
        const isAssigned = job.assignedUsers && job.assignedUsers.some(user => user.userId === req.user.userId);
        if (!isAssigned) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      await this.updateJobStatus.execute(req.params.id, status);
      const updatedJob = await this.getJobById.execute(req.params.id);
      
      console.log('JobController.updateStatus - updated job:', updatedJob);
      res.json(updatedJob);
    } catch (error) {
      console.error('Update job status error:', error);
      console.error('Error stack:', error.stack);
      res.status(400).json({ message: error.message });
    }
  }

  async assign(req, res) {
    try {
      const { assignedTo } = req.body;
      
      await this.assignJob.execute(req.params.id, assignedTo);
      const job = await this.getJobById.execute(req.params.id);
      
      res.json(job);
    } catch (error) {
      console.error('Assign job error:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async addPayItem(req, res) {
    try {
      console.log('Received pay item data:', req.body);
      
      const payItemData = {
        description: req.body.description,
        amount: req.body.amount,
        billingAmount: req.body.billingAmount
      };
      
      console.log('Processed pay item data:', payItemData);
      
      const job = await this.addPayItemUseCase.execute(req.params.id, payItemData, req.user.userId);
      res.json(job);
    } catch (error) {
      console.error('Add pay item error:', error);
      res.status(400).json({ message: error.message });
    }
  }

  async replacePayItems(req, res) {
    try {
      console.log('Received pay items data:', req.body);
      
      const payItemsData = req.body.payItems.map(item => {
        // Handle different data structures for backward compatibility
        const description = item.description || item.name || '';
        const amount = parseFloat(item.amount || item.actualCost || 0);
        const billingAmount = parseFloat(item.billingAmount || item.amount || item.actualCost || 0);
        
        return {
          ...item,
          description: description,
          amount: amount,
          actualCost: amount,
          billingAmount: billingAmount,
          paidBy: item.paidBy || 'Office',
          paidByName: item.paidByName || item.paidBy || 'Office',
          source: item.source || 'Custom',
          addedDate: item.addedDate || new Date(),
          paymentStatus: item.paymentStatus || (item.isPaid ? 'Paid' : item.paymentStatus),
          isPaid: item.isPaid === true,
          paidAmount: item.paidAmount !== undefined ? parseFloat(item.paidAmount || 0) : undefined,
          paidAt: item.paidAt || null
        };
      });
      
      console.log('Processed pay items data:', payItemsData);
      
      const job = await this.replacePayItemsUseCase.execute(req.params.id, payItemsData, req.user.userId);
      res.json(job);
    } catch (error) {
      console.error('Replace pay items error:', error);
      res.status(400).json({ message: error.message });
    }
  }

  validateAdvancePaymentPayload(reqBody) {
    const { advancePayment, paymentMadeDate, paymentType, checkNo } = reqBody;
    const amount = parseFloat(advancePayment);

    if (isNaN(amount) || amount <= 0) {
      return { error: 'Valid advance payment amount is required (must be greater than 0)' };
    }

    const validPaymentTypes = ['cash', 'check', 'bank transfer'];
    if (!paymentType || !validPaymentTypes.includes(paymentType)) {
      return { error: 'Payment type is required (cash, check, or bank transfer)' };
    }

    if (!paymentMadeDate) {
      return { error: 'Payment made date is required' };
    }

    if (paymentType === 'check' && (!checkNo || !String(checkNo).trim())) {
      return { error: 'Check number is required for check payments' };
    }

    return { amount };
  }

  async getAdvancePayments(req, res) {
    try {
      const { jobId } = req.params;
      const container = require('../../infrastructure/di/container');
      const jobRepository = container.get('jobRepository');

      const payments = await jobRepository.getAdvancePaymentsByJob(jobId);
      res.json({ success: true, data: payments });
    } catch (error) {
      console.error('Error fetching advance payments:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async addAdvancePayment(req, res) {
    try {
      const { jobId } = req.params;
      const { paymentMadeDate, paymentType, checkNo, notes } = req.body;
      const userId = req.user.userId;

      console.log('Add advance payment request:', { jobId, ...req.body, userId });

      const validation = this.validateAdvancePaymentPayload(req.body);
      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }

      const container = require('../../infrastructure/di/container');
      const jobRepository = container.get('jobRepository');

      const createdPayment = await jobRepository.addAdvancePayment(
        jobId,
        validation.amount,
        paymentMadeDate,
        paymentType,
        checkNo,
        notes,
        userId
      );

      const updatedJob = await this.getJobById.execute(jobId);
      const payments = await jobRepository.getAdvancePaymentsByJob(jobId);

      res.json({
        message: 'Advance payment added successfully',
        payment: createdPayment,
        payments,
        job: updatedJob
      });
    } catch (error) {
      console.error('Error adding advance payment:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async updateAdvancePaymentEntry(req, res) {
    try {
      const { jobId, paymentId } = req.params;
      const { paymentMadeDate, paymentType, checkNo, notes } = req.body;

      const validation = this.validateAdvancePaymentPayload(req.body);
      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }

      const container = require('../../infrastructure/di/container');
      const jobRepository = container.get('jobRepository');

      const updatedPayment = await jobRepository.updateAdvancePaymentEntry(
        jobId,
        paymentId,
        validation.amount,
        paymentMadeDate,
        paymentType,
        checkNo,
        notes
      );

      const updatedJob = await this.getJobById.execute(jobId);
      const payments = await jobRepository.getAdvancePaymentsByJob(jobId);

      res.json({
        message: 'Advance payment updated successfully',
        payment: updatedPayment,
        payments,
        job: updatedJob
      });
    } catch (error) {
      console.error('Error updating advance payment entry:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ message: error.message });
    }
  }

  async deleteAdvancePaymentEntry(req, res) {
    try {
      const { jobId, paymentId } = req.params;

      const container = require('../../infrastructure/di/container');
      const jobRepository = container.get('jobRepository');

      await jobRepository.deleteAdvancePaymentEntry(jobId, paymentId);

      const updatedJob = await this.getJobById.execute(jobId);
      const payments = await jobRepository.getAdvancePaymentsByJob(jobId);

      res.json({
        message: 'Advance payment deleted successfully',
        payments,
        job: updatedJob
      });
    } catch (error) {
      console.error('Error deleting advance payment entry:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({ message: error.message });
    }
  }

  // Legacy endpoint support: treat update as adding a new payment entry.
  async updateAdvancePayment(req, res) {
    return this.addAdvancePayment(req, res);
  }

  async getAdvancePaymentRequests(req, res) {
    try {
      const { jobId } = req.params;
      const container = require('../../infrastructure/di/container');
      const advancePaymentRequestRepository = container.get('advancePaymentRequestRepository');

      const requests = await advancePaymentRequestRepository.getRequestsByJob(jobId);
      res.json({ success: true, data: requests });
    } catch (error) {
      console.error('Error fetching advance payment requests:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async createAdvancePaymentRequest(req, res) {
    try {
      const { jobId } = req.params;
      const { requestedAmount, customerEmail, notes } = req.body;
      const userId = req.user?.userId;

      const amount = parseFloat(requestedAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Valid advance payment amount is required (must be greater than 0)' });
      }

      const email = String(customerEmail || '').trim();
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid customer email is required' });
      }

      const container = require('../../infrastructure/di/container');
      const advancePaymentRequestRepository = container.get('advancePaymentRequestRepository');
      const customerRepository = container.get('customerRepository');

      const job = await this.getJobById.execute(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      let customerName = job.customerName;
      if (!customerName && job.customerId) {
        try {
          const c = await customerRepository.findById(job.customerId);
          if (c) customerName = c.name;
        } catch (_) {}
      }

      const createdRequest = await advancePaymentRequestRepository.createRequest({
        jobId,
        customerId: job.customerId || null,
        customerEmail: email,
        requestedAmount: amount,
        notes: notes || null,
        status: 'PENDING',
        requestedBy: userId,
        requestedDate: new Date()
      });

      const emailService = require('../../infrastructure/services/EmailService');
      const emailResult = await emailService.sendAdvancePaymentRequestEmail({
        to: email,
        customerName: customerName || 'Customer',
        jobId,
        blNumber: job.blNumber,
        cusdecNumber: job.cusdecNumber,
        requestedAmount: amount,
        notes: notes || '',
        requesterName: req.user?.fullName || req.user?.username || 'Accounts Team'
      });

      const requests = await advancePaymentRequestRepository.getRequestsByJob(jobId);

      res.status(201).json({
        success: true,
        message: emailResult.simulated 
          ? 'Advance payment request created. (Note: Email was simulated in console since SMTP is not yet configured).'
          : (emailResult.sent ? 'Advance payment request created and email sent successfully.' : `Advance payment request created. Note: ${emailResult.message}`),
        request: createdRequest,
        requests,
        emailResult
      });
    } catch (error) {
      console.error('Error creating advance payment request:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async completeAdvancePaymentRequest(req, res) {
    try {
      const { jobId, requestId } = req.params;
      const { paidAmount, paymentType, checkNo, paymentMadeDate, notes } = req.body;
      const userId = req.user?.userId;

      const container = require('../../infrastructure/di/container');
      const jobRepository = container.get('jobRepository');
      const advancePaymentRequestRepository = container.get('advancePaymentRequestRepository');

      const request = await advancePaymentRequestRepository.getRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: 'Advance payment request not found' });
      }

      if (request.status === 'COMPLETED') {
        return res.status(400).json({ message: 'This request has already been marked as completed.' });
      }

      const amount = parseFloat(paidAmount !== undefined && paidAmount !== null && paidAmount !== '' ? paidAmount : request.requestedAmount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Valid payment amount is required (must be greater than 0)' });
      }

      const pType = paymentType || request.paymentType || 'bank_transfer';
      if (pType === 'check' && (!checkNo || !String(checkNo).trim())) {
        return res.status(400).json({ message: 'Check number is required for check payments' });
      }

      const pDate = paymentMadeDate || new Date();
      const pNotes = notes || (request.notes ? `Settlement of request ${requestId}: ${request.notes}` : `Advance payment for request ${requestId}`);

      // 1. Add advance payment to job
      const createdPayment = await jobRepository.addAdvancePayment(
        jobId,
        amount,
        pDate,
        pType,
        checkNo || null,
        pNotes,
        userId
      );

      // 2. Mark advance payment request as completed
      const updatedRequest = await advancePaymentRequestRepository.completeRequest(requestId, {
        completedBy: userId,
        completedDate: pDate,
        paidAmount: amount,
        paymentType: pType,
        checkNo: checkNo || null,
        advancePaymentId: createdPayment.advancePaymentId
      });

      const updatedJob = await this.getJobById.execute(jobId);
      const payments = await jobRepository.getAdvancePaymentsByJob(jobId);
      const requests = await advancePaymentRequestRepository.getRequestsByJob(jobId);

      res.json({
        success: true,
        message: 'Advance payment successfully recorded and request marked as completed',
        request: updatedRequest,
        payment: createdPayment,
        payments,
        requests,
        job: updatedJob
      });
    } catch (error) {
      console.error('Error completing advance payment request:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async cancelAdvancePaymentRequest(req, res) {
    try {
      const { jobId, requestId } = req.params;
      const userId = req.user?.userId;
      const container = require('../../infrastructure/di/container');
      const advancePaymentRequestRepository = container.get('advancePaymentRequestRepository');

      const cancelledRequest = await advancePaymentRequestRepository.cancelRequest(requestId, userId);
      const requests = await advancePaymentRequestRepository.getRequestsByJob(jobId);

      res.json({
        success: true,
        message: 'Advance payment request cancelled',
        request: cancelledRequest,
        requests
      });
    } catch (error) {
      console.error('Error cancelling advance payment request:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = JobController;

