const IOldInvoiceRepository = require('../../../domain/repositories/IOldInvoiceRepository');
const OldInvoice = require('../../../domain/entities/OldInvoice');
const prisma = require('../../../config/prisma');

class MySQLOldInvoiceRepository extends IOldInvoiceRepository {
  constructor() {
    super();
  }

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
  }

  async create(invoiceData) {
    const created = await prisma.oldinvoices.create({
      data: {
        customerId: invoiceData.customerId,
        cusdecNumber: invoiceData.cusdecNumber || null,
        cusdecDate: invoiceData.cusdecDate ? new Date(invoiceData.cusdecDate) : null,
        invoiceDate: new Date(invoiceData.invoiceDate),
        invoiceNumber: invoiceData.invoiceNumber,
        totalAmount: invoiceData.totalAmount,
        amountReceived: invoiceData.amountReceived || 0,
        balance: invoiceData.balance,
        status: invoiceData.status || 'Pending',
        settleDate: invoiceData.settleDate ? new Date(invoiceData.settleDate) : null,
        daysAfterInvoice: invoiceData.daysAfterInvoice || null,
        createdBy: invoiceData.createdBy
      },
      include: {
        customers: true,
        oldinvoicepayments: true
      }
    });

    this.clearCache();
    return this.mapToEntity(created);
  }

  async findAll() {
    const now = Date.now();
    if (this._cache && (now - this._cacheTime < 60000)) {
      return this._cache;
    }

    const rows = await prisma.oldinvoices.findMany({
      include: {
        customers: true,
        oldinvoicepayments: true
      },
      orderBy: [
        { invoiceDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const result = rows.map(r => this.mapToEntity(r));
    this._cache = result;
    this._cacheTime = now;
    return result;
  }

  async findById(oldInvoiceId) {
    const row = await prisma.oldinvoices.findUnique({
      where: { oldInvoiceId: parseInt(oldInvoiceId, 10) },
      include: {
        customers: true,
        oldinvoicepayments: true
      }
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async update(oldInvoiceId, invoiceData) {
    const id = parseInt(oldInvoiceId, 10);
    const updated = await prisma.oldinvoices.update({
      where: { oldInvoiceId: id },
      data: {
        customerId: invoiceData.customerId,
        cusdecNumber: invoiceData.cusdecNumber || null,
        cusdecDate: invoiceData.cusdecDate ? new Date(invoiceData.cusdecDate) : null,
        invoiceDate: new Date(invoiceData.invoiceDate),
        invoiceNumber: invoiceData.invoiceNumber,
        totalAmount: invoiceData.totalAmount,
        amountReceived: invoiceData.amountReceived,
        balance: invoiceData.balance,
        status: invoiceData.status,
        settleDate: invoiceData.settleDate ? new Date(invoiceData.settleDate) : null,
        daysAfterInvoice: invoiceData.daysAfterInvoice || null,
        updatedAt: new Date()
      },
      include: {
        customers: true,
        oldinvoicepayments: true
      }
    });

    this.clearCache();
    return this.mapToEntity(updated);
  }

  async delete(oldInvoiceId) {
    const id = parseInt(oldInvoiceId, 10);
    await prisma.oldinvoices.delete({
      where: { oldInvoiceId: id }
    });
    this.clearCache();
    return { success: true };
  }

  async addPayment(oldInvoiceId, paymentData) {
    const id = parseInt(oldInvoiceId, 10);

    await prisma.oldinvoicepayments.create({
      data: {
        oldInvoiceId: id,
        paymentAmount: paymentData.paymentAmount,
        paymentMethod: paymentData.paymentMethod,
        receivedDate: new Date(paymentData.receivedDate),
        notes: paymentData.notes || null,
        chequeNumber: paymentData.chequeNumber ? String(paymentData.chequeNumber) : null,
        chequeDate: paymentData.chequeDate ? String(paymentData.chequeDate) : null,
        chequeAmount: paymentData.chequeAmount ? String(paymentData.chequeAmount) : null,
        bankName: paymentData.bankName ? String(paymentData.bankName) : null,
        createdBy: paymentData.createdBy
      }
    });

    await this.recalculateTotals(id);
    this.clearCache();
    return await this.findById(id);
  }

  async getPayments(oldInvoiceId) {
    const id = parseInt(oldInvoiceId, 10);
    return await prisma.oldinvoicepayments.findMany({
      where: { oldInvoiceId: id },
      orderBy: [
        { receivedDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async deletePayment(paymentId) {
    const pId = parseInt(paymentId, 10);
    const payment = await prisma.oldinvoicepayments.findUnique({
      where: { paymentId: pId }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const oldInvoiceId = payment.oldInvoiceId;
    await prisma.oldinvoicepayments.delete({
      where: { paymentId: pId }
    });

    await this.recalculateTotals(oldInvoiceId);
    this.clearCache();
    return await this.findById(oldInvoiceId);
  }

  async recalculateTotals(oldInvoiceId) {
    const invoice = await prisma.oldinvoices.findUnique({
      where: { oldInvoiceId }
    });
    if (!invoice) return;

    const aggregate = await prisma.oldinvoicepayments.aggregate({
      where: { oldInvoiceId },
      _sum: { paymentAmount: true }
    });

    const totalAmount = Number(invoice.totalAmount);
    const totalReceived = Number(aggregate._sum.paymentAmount || 0);
    const balance = totalAmount - totalReceived;
    const status = balance <= 0 ? 'Fully Settled' : (totalReceived > 0 ? 'Partially Paid' : 'Pending');

    let settleDate = null;
    let daysAfterInvoice = null;

    if (status === 'Fully Settled') {
      const latestPay = await prisma.oldinvoicepayments.findFirst({
        where: { oldInvoiceId },
        orderBy: { receivedDate: 'desc' }
      });
      if (latestPay) {
        settleDate = latestPay.receivedDate;
        const invDate = new Date(invoice.invoiceDate);
        const setDate = new Date(settleDate);
        daysAfterInvoice = Math.floor((setDate - invDate) / (1000 * 60 * 60 * 24));
      }
    }

    await prisma.oldinvoices.update({
      where: { oldInvoiceId },
      data: {
        amountReceived: totalReceived,
        balance,
        status,
        settleDate,
        daysAfterInvoice,
        updatedAt: new Date()
      }
    });
  }

  mapToEntity(row) {
    return new OldInvoice({
      oldInvoiceId: row.oldInvoiceId,
      customerId: row.customerId,
      customerName: row.customers?.name || null,
      cusdecNumber: row.cusdecNumber,
      cusdecDate: row.cusdecDate,
      invoiceDate: row.invoiceDate,
      invoiceNumber: row.invoiceNumber,
      totalAmount: Number(row.totalAmount),
      amountReceived: Number(row.amountReceived || 0),
      balance: Number(row.balance),
      status: row.status,
      settleDate: row.settleDate,
      daysAfterInvoice: row.daysAfterInvoice,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payments: (row.oldinvoicepayments || []).map(p => ({
        paymentId: p.paymentId,
        oldInvoiceId: p.oldInvoiceId,
        paymentAmount: Number(p.paymentAmount),
        paymentMethod: p.paymentMethod,
        receivedDate: p.receivedDate,
        notes: p.notes,
        chequeNumber: p.chequeNumber,
        chequeDate: p.chequeDate,
        chequeAmount: p.chequeAmount ? Number(p.chequeAmount) : null,
        bankName: p.bankName,
        createdAt: p.createdAt,
        createdBy: p.createdBy
      }))
    });
  }
}

module.exports = MySQLOldInvoiceRepository;
