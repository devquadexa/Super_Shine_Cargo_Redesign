const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLInvoiceReviewRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(reviewData) {
    const data = {
      reviewId: reviewData.reviewId,
      jobId: reviewData.jobId,
      clerkId: reviewData.clerkId,
      sentBy: reviewData.sentBy,
      reviewNotes: reviewData.reviewNotes || null,
      payItems: typeof reviewData.payItems === 'object' ? JSON.stringify(reviewData.payItems) : (reviewData.payItems || '[]'),
      invoiceDetails: typeof reviewData.invoiceDetails === 'object' ? JSON.stringify(reviewData.invoiceDetails) : (reviewData.invoiceDetails || '{}'),
      status: reviewData.status || 'Pending',
      createdDate: new Date(),
      updatedDate: new Date()
    };

    await this.prisma.invoice_reviews.create({ data });
    return this.findById(reviewData.reviewId);
  }

  async getAll() {
    const rows = await this.prisma.invoice_reviews.findMany({
      include: {
        users_invoice_reviews_sentByTousers: true,
        users_invoice_reviews_clerkIdTousers: true
      },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.parseReview(r));
  }

  async getByClerkId(clerkId) {
    const rows = await this.prisma.invoice_reviews.findMany({
      where: { clerkId },
      include: {
        users_invoice_reviews_sentByTousers: true,
        users_invoice_reviews_clerkIdTousers: true
      },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.parseReview(r));
  }

  async getByJobId(jobId) {
    const rows = await this.prisma.invoice_reviews.findMany({
      where: { jobId },
      include: {
        users_invoice_reviews_sentByTousers: true,
        users_invoice_reviews_clerkIdTousers: true
      },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.parseReview(r));
  }

  async findById(reviewId) {
    const row = await this.prisma.invoice_reviews.findUnique({
      where: { reviewId },
      include: {
        users_invoice_reviews_sentByTousers: true,
        users_invoice_reviews_clerkIdTousers: true
      }
    });
    if (!row) return null;
    return this.parseReview(row);
  }

  async approve(reviewId) {
    await this.prisma.invoice_reviews.update({
      where: { reviewId },
      data: {
        status: 'Approved',
        updatedDate: new Date()
      }
    });
    return this.findById(reviewId);
  }

  async reject(reviewId, rejectionReason) {
    await this.prisma.invoice_reviews.update({
      where: { reviewId },
      data: {
        status: 'Rejected',
        rejectionReason,
        updatedDate: new Date()
      }
    });
    return this.findById(reviewId);
  }

  parseReview(row) {
    const sentByUser = row.users_invoice_reviews_sentByTousers;
    const clerkUser = row.users_invoice_reviews_clerkIdTousers;

    return {
      reviewId: row.reviewId,
      jobId: row.jobId,
      clerkId: row.clerkId,
      sentBy: row.sentBy,
      reviewNotes: row.reviewNotes,
      status: row.status,
      rejectionReason: row.rejectionReason,
      createdDate: row.createdDate,
      updatedDate: row.updatedDate,
      sentByName: sentByUser ? sentByUser.fullName : (row.sentByName || null),
      clerkName: clerkUser ? clerkUser.fullName : (row.clerkName || null),
      payItems: row.payItems ? (typeof row.payItems === 'string' ? JSON.parse(row.payItems) : row.payItems) : [],
      invoiceDetails: row.invoiceDetails ? (typeof row.invoiceDetails === 'string' ? JSON.parse(row.invoiceDetails) : row.invoiceDetails) : {}
    };
  }
}

module.exports = MySQLInvoiceReviewRepository;
