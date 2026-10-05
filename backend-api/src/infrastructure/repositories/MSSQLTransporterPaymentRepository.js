/**
 * MSSQL Transporter Payment Repository
 * All database operations are delegated to stored procedures.
 */
class MSSQLTransporterPaymentRepository {
  constructor(getConnection, sql) {
    this.getConnection = getConnection;
    this.sql = sql;
  }

  async create(paymentData) {
    const pool = await this.getConnection();
    const paymentId = `TP${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      await pool.request()
        .input('PaymentId',     this.sql.VarChar(50),     paymentId)
        .input('JobId',         this.sql.VarChar(50),     paymentData.jobId)
        .input('TransporterId', this.sql.VarChar(50),     paymentData.transporterId)
        .input('Amount',        this.sql.Decimal(18, 2),  paymentData.amount)
        .input('PaymentMethod', this.sql.VarChar(50),     paymentData.paymentMethod)
        .input('PaymentDate',   this.sql.DateTime,        paymentData.paymentDate)
        .input('Status',        this.sql.VarChar(50),     paymentData.status)
        .input('ChequeNumber',  this.sql.VarChar(100),    paymentData.chequeNumber)
        .input('ChequeDate',    this.sql.Date,            paymentData.chequeDate)
        .input('ChequeAmount',  this.sql.Decimal(18, 2),  paymentData.chequeAmount)
        .input('BankName',      this.sql.NVarChar(200),   paymentData.bankName)
        .input('PaidBy',        this.sql.VarChar(50),     paymentData.paidBy)
        .input('PaidByName',    this.sql.NVarChar(200),   paymentData.paidByName)
        .input('Notes',         this.sql.NVarChar(4000),  paymentData.notes)
        .execute('usp_CreateTransporterPayment');

      return { paymentId, ...paymentData, createdDate: new Date() };
    } catch (error) {
      console.error('Error creating transporter payment:', error);
      throw error;
    }
  }

  async findAll(filters = {}) {
    const pool = await this.getConnection();

    try {
      let query = `
        SELECT tp.*, t.Name AS TransporterName, j.ShipmentCategory, j.TransportDeliveryDate, c.Name AS CustomerName
        FROM TransporterPayments tp
        LEFT JOIN Transporters t ON tp.TransporterId = t.TransporterId
        LEFT JOIN Jobs j ON tp.JobId = j.JobId
        LEFT JOIN Customers c ON j.CustomerId = c.CustomerId
        WHERE 1=1
      `;
      const request = pool.request();

      if (filters.status && filters.status !== 'All') {
        query += ' AND tp.Status = @Status';
        request.input('Status', this.sql.VarChar(50), filters.status);
      }
      if (filters.method && filters.method !== 'All') {
        query += ' AND tp.PaymentMethod = @PaymentMethod';
        request.input('PaymentMethod', this.sql.VarChar(50), filters.method);
      }
      if (filters.fromDate) {
        query += ' AND tp.PaymentDate >= @FromDate';
        request.input('FromDate', this.sql.DateTime, new Date(filters.fromDate));
      }
      if (filters.toDate) {
        query += ' AND tp.PaymentDate <= @ToDate';
        request.input('ToDate', this.sql.DateTime, new Date(filters.toDate));
      }

      query += ' ORDER BY tp.PaymentDate DESC, tp.CreatedDate DESC';

      const result = await request.query(query);
      return result.recordset || [];
    } catch (error) {
      console.error('Error fetching all transporter payments:', error);
      throw error;
    }
  }

  async findByTransporterId(transporterId, filters = {}) {
    const pool = await this.getConnection();

    try {
      const result = await pool.request()
        .input('TransporterId', this.sql.VarChar(50),  transporterId)
        .input('Status',        this.sql.VarChar(50),  filters.status   || null)
        .input('FromDate',      this.sql.DateTime,     filters.fromDate ? new Date(filters.fromDate) : null)
        .input('ToDate',        this.sql.DateTime,     filters.toDate   ? new Date(filters.toDate)   : null)
        .execute('usp_GetTransporterPaymentsByTransporterId');

      return result.recordset || [];
    } catch (error) {
      console.error('Error fetching transporter payments:', error);
      throw error;
    }
  }

  async findByJobId(jobId) {
    const pool = await this.getConnection();

    try {
      const result = await pool.request()
        .input('JobId', this.sql.VarChar(50), jobId)
        .execute('usp_GetTransporterPaymentsByJobId');

      return result.recordset || [];
    } catch (error) {
      console.error('Error fetching payments for job:', error);
      throw error;
    }
  }

  async findById(paymentId) {
    const pool = await this.getConnection();

    try {
      const result = await pool.request()
        .input('PaymentId', this.sql.VarChar(50), paymentId)
        .execute('usp_GetTransporterPaymentById');

      return result.recordset?.[0] || null;
    } catch (error) {
      console.error('Error fetching transporter payment:', error);
      throw error;
    }
  }

  async updateStatus(paymentId, status) {
    const pool = await this.getConnection();

    try {
      const result = await pool.request()
        .input('PaymentId', this.sql.VarChar(50), paymentId)
        .input('Status',    this.sql.VarChar(50), status)
        .execute('usp_UpdateTransporterPaymentStatus');

      if (result.rowsAffected[0] === 0) {
        throw new Error('Payment not found');
      }

      return await this.findById(paymentId);
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  }

  async getOutstandingBalance(transporterId) {
    const pool = await this.getConnection();

    try {
      const result = await pool.request()
        .input('TransporterId', this.sql.VarChar(50), transporterId)
        .execute('usp_GetTransporterOutstandingBalance');

      return result.recordset?.[0]?.TotalOutstanding || 0;
    } catch (error) {
      console.error('Error calculating outstanding balance:', error);
      throw error;
    }
  }
}

module.exports = MSSQLTransporterPaymentRepository;
