const BaseMySQLRepository = require('./BaseMySQLRepository');
const mysqlDb = require('../../../config/mysqlDatabase');

class MySQLAdvancePaymentRequestRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async generateRequestId() {
    const today = new Date();
    const prefix = `APR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    const rows = await mysqlDb.query(
      `SELECT requestId FROM advancepaymentrequests WHERE requestId LIKE ? ORDER BY requestedDate DESC LIMIT 1`,
      [`${prefix}-%`]
    );

    let nextNum = 1;
    if (rows && rows.length > 0) {
      const parts = rows[0].requestId.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextNum = lastSeq + 1;
      }
    }

    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
  }

  async createRequest(data) {
    const requestId = data.requestId || await this.generateRequestId();
    const requestedDate = data.requestedDate ? new Date(data.requestedDate) : new Date();

    await mysqlDb.query(
      `INSERT INTO advancepaymentrequests 
        (requestId, jobId, customerId, customerEmail, requestedAmount, notes, status, requestedBy, requestedDate) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        data.jobId,
        data.customerId || null,
        data.customerEmail,
        parseFloat(data.requestedAmount || 0),
        data.notes || null,
        data.status || 'PENDING',
        data.requestedBy || null,
        requestedDate
      ]
    );

    return this.getRequestById(requestId);
  }

  async getRequestById(requestId) {
    const rows = await mysqlDb.query(
      `SELECT apr.*, 
              u1.fullName AS requestedByName,
              u2.fullName AS completedByName,
              c.name AS customerName
       FROM advancepaymentrequests apr
       LEFT JOIN users u1 ON apr.requestedBy = u1.userId
       LEFT JOIN users u2 ON apr.completedBy = u2.userId
       LEFT JOIN customers c ON apr.customerId = c.customerId
       WHERE apr.requestId = ?`,
      [requestId]
    );

    return rows && rows.length > 0 ? this._mapRow(rows[0]) : null;
  }

  async getRequestsByJob(jobId) {
    const rows = await mysqlDb.query(
      `SELECT apr.*, 
              u1.fullName AS requestedByName,
              u2.fullName AS completedByName,
              c.name AS customerName
       FROM advancepaymentrequests apr
       LEFT JOIN users u1 ON apr.requestedBy = u1.userId
       LEFT JOIN users u2 ON apr.completedBy = u2.userId
       LEFT JOIN customers c ON apr.customerId = c.customerId
       WHERE apr.jobId = ?
       ORDER BY apr.requestedDate DESC`,
      [jobId]
    );

    return (rows || []).map(r => this._mapRow(r));
  }

  async completeRequest(requestId, { completedBy, completedDate, paidAmount, paymentType, checkNo, advancePaymentId }) {
    const date = completedDate ? new Date(completedDate) : new Date();

    await mysqlDb.query(
      `UPDATE advancepaymentrequests 
       SET status = 'COMPLETED',
           completedBy = ?,
           completedDate = ?,
           paidAmount = ?,
           paymentType = ?,
           checkNo = ?,
           advancePaymentId = ?
       WHERE requestId = ?`,
      [
        completedBy || null,
        date,
        paidAmount !== undefined ? parseFloat(paidAmount) : null,
        paymentType || null,
        checkNo || null,
        advancePaymentId || null,
        requestId
      ]
    );

    this._clearJobCache();
    return this.getRequestById(requestId);
  }

  async cancelRequest(requestId, cancelledBy) {
    await mysqlDb.query(
      `UPDATE advancepaymentrequests 
       SET status = 'CANCELLED',
           completedBy = ?,
           completedDate = NOW()
       WHERE requestId = ?`,
      [cancelledBy || null, requestId]
    );

    this._clearJobCache();
    return this.getRequestById(requestId);
  }

  _clearJobCache() {
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') {
        jobRepo.clearCache();
      }
    } catch (e) {}
  }

  _mapRow(row) {
    if (!row) return null;
    return {
      requestId: row.requestId,
      jobId: row.jobId,
      customerId: row.customerId,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      requestedAmount: parseFloat(row.requestedAmount || 0),
      notes: row.notes,
      status: row.status,
      requestedBy: row.requestedBy,
      requestedByName: row.requestedByName || row.requestedBy,
      requestedDate: row.requestedDate,
      completedBy: row.completedBy,
      completedByName: row.completedByName || row.completedBy,
      completedDate: row.completedDate,
      paidAmount: row.paidAmount !== null && row.paidAmount !== undefined ? parseFloat(row.paidAmount) : null,
      paymentType: row.paymentType,
      checkNo: row.checkNo,
      advancePaymentId: row.advancePaymentId
    };
  }
}

module.exports = MySQLAdvancePaymentRequestRepository;
