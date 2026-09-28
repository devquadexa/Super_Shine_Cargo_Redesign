class MSSQLInvoiceReviewRepository {
  constructor(getConnection, sql) {
    this.getConnection = getConnection;
    this.sql = sql;
  }

  async create(reviewData) {
    const pool = await this.getConnection();
    await pool.request()
      .input('reviewId', this.sql.VarChar(50), reviewData.reviewId)
      .input('jobId', this.sql.VarChar(50), reviewData.jobId)
      .input('clerkId', this.sql.VarChar(50), reviewData.clerkId)
      .input('sentBy', this.sql.VarChar(50), reviewData.sentBy)
      .input('reviewNotes', this.sql.NVarChar(this.sql.MAX), reviewData.reviewNotes)
      .input('payItems', this.sql.NVarChar(this.sql.MAX), JSON.stringify(reviewData.payItems || []))
      .input('invoiceDetails', this.sql.NVarChar(this.sql.MAX), JSON.stringify(reviewData.invoiceDetails || {}))
      .input('status', this.sql.VarChar(20), reviewData.status || 'Pending')
      .input('createdDate', this.sql.DateTime, new Date())
      .input('updatedDate', this.sql.DateTime, new Date())
      .query(`
        INSERT INTO invoice_reviews (
          reviewId, jobId, clerkId, sentBy, reviewNotes, payItems, 
          invoiceDetails, status, createdDate, updatedDate
        ) VALUES (
          @reviewId, @jobId, @clerkId, @sentBy, @reviewNotes, @payItems,
          @invoiceDetails, @status, @createdDate, @updatedDate
        )
      `);

    return this.findById(reviewData.reviewId);
  }

  async getAll() {
    const pool = await this.getConnection();
    const result = await pool.request().query(`
      SELECT 
        ir.*, 
        u.FullName as sentByName,
        c.FullName as clerkName
      FROM invoice_reviews ir
      LEFT JOIN Users u ON ir.sentBy = u.UserId
      LEFT JOIN Users c ON ir.clerkId = c.UserId
      ORDER BY ir.createdDate DESC
    `);
    return result.recordset.map(r => this.parseReview(r));
  }

  async getByClerkId(clerkId) {
    const pool = await this.getConnection();
    const result = await pool.request()
      .input('clerkId', this.sql.VarChar(50), clerkId)
      .query(`
        SELECT 
          ir.*, 
          u.FullName as sentByName,
          c.FullName as clerkName
        FROM invoice_reviews ir
        LEFT JOIN Users u ON ir.sentBy = u.UserId
        LEFT JOIN Users c ON ir.clerkId = c.UserId
        WHERE ir.clerkId = @clerkId
        ORDER BY ir.createdDate DESC
      `);
    return result.recordset.map(r => this.parseReview(r));
  }

  async getByJobId(jobId) {
    const pool = await this.getConnection();
    const result = await pool.request()
      .input('jobId', this.sql.VarChar(50), jobId)
      .query(`
        SELECT 
          ir.*, 
          u.FullName as sentByName,
          c.FullName as clerkName
        FROM invoice_reviews ir
        LEFT JOIN Users u ON ir.sentBy = u.UserId
        LEFT JOIN Users c ON ir.clerkId = c.UserId
        WHERE ir.jobId = @jobId
        ORDER BY ir.createdDate DESC
      `);
    return result.recordset.map(r => this.parseReview(r));
  }

  async findById(reviewId) {
    const pool = await this.getConnection();
    const result = await pool.request()
      .input('reviewId', this.sql.VarChar(50), reviewId)
      .query(`
        SELECT 
          ir.*, 
          u.FullName as sentByName,
          c.FullName as clerkName
        FROM invoice_reviews ir
        LEFT JOIN Users u ON ir.sentBy = u.UserId
        LEFT JOIN Users c ON ir.clerkId = c.UserId
        WHERE ir.reviewId = @reviewId
      `);
    if (!result.recordset || result.recordset.length === 0) return null;
    return this.parseReview(result.recordset[0]);
  }

  async approve(reviewId) {
    const pool = await this.getConnection();
    await pool.request()
      .input('reviewId', this.sql.VarChar(50), reviewId)
      .input('updatedDate', this.sql.DateTime, new Date())
      .query(`
        UPDATE invoice_reviews 
        SET status = 'Approved', updatedDate = @updatedDate
        WHERE reviewId = @reviewId
      `);
    return this.findById(reviewId);
  }

  async reject(reviewId, rejectionReason) {
    const pool = await this.getConnection();
    await pool.request()
      .input('reviewId', this.sql.VarChar(50), reviewId)
      .input('rejectionReason', this.sql.NVarChar(this.sql.MAX), rejectionReason)
      .input('updatedDate', this.sql.DateTime, new Date())
      .query(`
        UPDATE invoice_reviews 
        SET status = 'Rejected', rejectionReason = @rejectionReason, updatedDate = @updatedDate
        WHERE reviewId = @reviewId
      `);
    return this.findById(reviewId);
  }

  parseReview(row) {
    return {
      ...row,
      payItems: row.payItems ? (typeof row.payItems === 'string' ? JSON.parse(row.payItems) : row.payItems) : [],
      invoiceDetails: row.invoiceDetails ? (typeof row.invoiceDetails === 'string' ? JSON.parse(row.invoiceDetails) : row.invoiceDetails) : {}
    };
  }
}

module.exports = MSSQLInvoiceReviewRepository;
