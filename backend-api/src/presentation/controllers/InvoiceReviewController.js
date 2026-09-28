const { v4: uuidv4 } = require('uuid');
const container = require('../../infrastructure/di/container');

class InvoiceReviewController {
  static async sendReview(req, res) {
    const { jobId, clerkId, reviewNotes, payItems, invoiceDetails } = req.body;
    const userId = req.user?.userId;

    try {
      if (!jobId || !clerkId || !reviewNotes) {
        return res.status(400).json({
          message: 'Missing required fields: jobId, clerkId, reviewNotes'
        });
      }

      const reviewId = uuidv4();
      const reviewRepo = container.get('invoiceReviewRepository');
      const userRepo = container.get('userRepository');

      await reviewRepo.create({
        reviewId,
        jobId,
        clerkId,
        sentBy: userId,
        reviewNotes,
        payItems: payItems || [],
        invoiceDetails: invoiceDetails || {},
        status: 'Pending'
      });

      const clerk = await userRepo.findById(clerkId);
      const sender = await userRepo.findById(userId);

      try {
        const createNotification = container.get('createNotification');
        await createNotification.execute({
          userId: clerkId,
          type: 'invoice_review',
          title: 'New Invoice Review',
          message: `${sender?.fullName || sender?.FullName || 'Admin'} sent you a new invoice review for job ${jobId}`,
          relatedId: reviewId,
          relatedType: 'INVOICE_REVIEW',
          createdBy: userId
        });
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      res.status(201).json({
        message: 'Invoice review sent successfully',
        reviewId,
        clerk: clerk?.fullName || clerk?.FullName
      });
    } catch (error) {
      console.error('Error sending invoice review:', error);
      res.status(500).json({
        message: 'Error sending invoice review',
        error: error.message
      });
    }
  }

  static async getAllReviews(req, res) {
    try {
      const reviewRepo = container.get('invoiceReviewRepository');
      const reviews = await reviewRepo.getAll();
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({
        message: 'Error fetching reviews',
        error: error.message
      });
    }
  }

  static async getReviewsForClerk(req, res) {
    const { clerkId } = req.params;
    try {
      const reviewRepo = container.get('invoiceReviewRepository');
      const reviews = await reviewRepo.getByClerkId(clerkId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching clerk reviews:', error);
      res.status(500).json({
        message: 'Error fetching reviews',
        error: error.message
      });
    }
  }

  static async getReviewsByJob(req, res) {
    const { jobId } = req.params;
    try {
      const reviewRepo = container.get('invoiceReviewRepository');
      const reviews = await reviewRepo.getByJobId(jobId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching job reviews:', error);
      res.status(500).json({
        message: 'Error fetching reviews',
        error: error.message
      });
    }
  }

  static async getReviewById(req, res) {
    const { reviewId } = req.params;
    try {
      const reviewRepo = container.get('invoiceReviewRepository');
      const review = await reviewRepo.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
      res.json(review);
    } catch (error) {
      console.error('Error fetching review:', error);
      res.status(500).json({
        message: 'Error fetching review',
        error: error.message
      });
    }
  }

  static async approveReview(req, res) {
    const { reviewId } = req.params;
    const userId = req.user?.userId;

    try {
      const reviewRepo = container.get('invoiceReviewRepository');
      const review = await reviewRepo.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      await reviewRepo.approve(reviewId);

      try {
        const createNotification = container.get('createNotification');
        await createNotification.execute({
          userId: review.sentBy,
          type: 'invoice_review_approved',
          title: 'Invoice Review Approved',
          message: `${review.clerkName || 'Clerk'} approved the invoice review for job ${review.jobId}`,
          relatedId: reviewId,
          relatedType: 'INVOICE_REVIEW',
          createdBy: userId
        });
      } catch (notificationError) {
        console.error('Error creating approval notification:', notificationError);
      }

      res.json({
        message: 'Review approved successfully',
        reviewId
      });
    } catch (error) {
      console.error('Error approving review:', error);
      res.status(500).json({
        message: 'Error approving review',
        error: error.message
      });
    }
  }

  static async rejectReview(req, res) {
    const { reviewId } = req.params;
    const { rejectionReason } = req.body;
    const userId = req.user?.userId;

    try {
      if (!rejectionReason) {
        return res.status(400).json({
          message: 'Rejection reason is required'
        });
      }

      const reviewRepo = container.get('invoiceReviewRepository');
      const review = await reviewRepo.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      await reviewRepo.reject(reviewId, rejectionReason);

      try {
        const createNotification = container.get('createNotification');
        await createNotification.execute({
          userId: review.sentBy,
          type: 'invoice_review_rejected',
          title: 'Invoice Review Rejected',
          message: `${review.clerkName || 'Clerk'} rejected the invoice review for job ${review.jobId}. Reason: ${rejectionReason}`,
          relatedId: reviewId,
          relatedType: 'INVOICE_REVIEW',
          createdBy: userId
        });
      } catch (notificationError) {
        console.error('Error creating rejection notification:', notificationError);
      }

      res.json({
        message: 'Review rejected successfully',
        reviewId
      });
    } catch (error) {
      console.error('Error rejecting review:', error);
      res.status(500).json({
        message: 'Error rejecting review',
        error: error.message
      });
    }
  }
}

module.exports = InvoiceReviewController;
