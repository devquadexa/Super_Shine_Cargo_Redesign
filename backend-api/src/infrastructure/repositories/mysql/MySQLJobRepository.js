const IJobRepository = require('../../../domain/repositories/IJobRepository');
const Job = require('../../../domain/entities/Job');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLJobRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  _getStandardInclude() {
    return {
      customers: true,
      bills: {
        orderBy: { createdDate: 'desc' },
        take: 1
      },
      payitems: {
        orderBy: { addedDate: 'desc' }
      },
      officepayitems: {
        orderBy: { createdDate: 'asc' }
      },
      jobassignments: {
        where: { isActive: true },
        include: { users: true },
        orderBy: { assignedDate: 'desc' }
      },
      pettycashassignments: {
        include: {
          users_pettycashassignments_assignedToTousers: true
        },
        orderBy: { assignedDate: 'desc' }
      }
    };
  }

  async create(job) {
    const data = {
      jobId: job.jobId,
      customerId: job.customerId,
      blNumber: job.blNumber || null,
      cusdecNumber: job.cusdecNumber || null,
      openDate: job.openDate ? new Date(job.openDate) : null,
      shipmentCategory: job.shipmentCategory || null,
      status: job.status || 'Pending',
      assignedTo: job.assignedTo || null,
      createdDate: job.createdDate ? new Date(job.createdDate) : new Date(),
      exporter: job.exporter || null,
      transporter: job.transporter || null,
      lcNumber: job.lcNumber || null,
      containerNumber: job.containerNumber || null,
      chassisNumber: job.chassisNumber || null,
      TransportDeliveryDate: job.transportDeliveryDate || null,
      CUSDECDate: job.cusdecDate ? new Date(job.cusdecDate) : null
    };

    await this.prisma.jobs.create({ data });
    return job;
  }

  async findById(jobId) {
    const row = await this.prisma.jobs.findUnique({
      where: { jobId },
      include: this._getStandardInclude()
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findAll(filters = {}) {
    if (filters.assignedTo) {
      return this.findByAssignedUser(filters.assignedTo);
    }

    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;

    const rows = await this.prisma.jobs.findMany({
      where,
      include: this._getStandardInclude(),
      orderBy: { jobId: 'asc' }
    });

    return Promise.all(rows.map(row => this.mapToEntity(row)));
  }

  async findByAssignedUser(userId) {
    const rows = await this.prisma.jobs.findMany({
      where: {
        jobassignments: {
          some: {
            userId,
            isActive: true
          }
        }
      },
      include: this._getStandardInclude(),
      orderBy: { openDate: 'desc' }
    });

    return Promise.all(rows.map(row => this.mapToEntity(row)));
  }

  async findByCustomer(customerId) {
    const rows = await this.prisma.jobs.findMany({
      where: { customerId },
      include: this._getStandardInclude(),
      orderBy: { createdDate: 'desc' }
    });

    return Promise.all(rows.map(row => this.mapToEntity(row)));
  }

  async update(jobId, job) {
    const data = {
      blNumber: job.blNumber || null,
      cusdecNumber: job.cusdecNumber || null,
      openDate: job.openDate ? new Date(job.openDate) : null,
      shipmentCategory: job.shipmentCategory || null,
      exporter: job.exporter || null,
      transporter: job.transporter || null,
      lcNumber: job.lcNumber || null,
      containerNumber: job.containerNumber || null,
      status: job.status || 'Pending',
      assignedTo: job.assignedTo || null
    };

    if (job.chassisNumber !== undefined) data.chassisNumber = job.chassisNumber || null;
    if (job.transportDeliveryDate !== undefined) data.TransportDeliveryDate = job.transportDeliveryDate || null;
    if (job.cusdecDate !== undefined) data.CUSDECDate = job.cusdecDate ? new Date(job.cusdecDate) : null;

    await this.prisma.jobs.update({
      where: { jobId },
      data
    });

    return job;
  }

  async syncAdvancePaymentAggregate(jobId) {
    const sumResult = await this.prisma.jobadvancepayments.aggregate({
      where: { jobId },
      _sum: { amount: true },
      _max: { paymentMadeDate: true }
    });

    const latest = await this.prisma.jobadvancepayments.findFirst({
      where: { jobId },
      orderBy: [
        { paymentMadeDate: 'desc' },
        { advancePaymentId: 'desc' }
      ]
    });

    const total = parseFloat(sumResult._sum.amount || 0);

    await this.prisma.jobs.update({
      where: { jobId },
      data: {
        advancePayment: total,
        advancePaymentDate: sumResult._max.paymentMadeDate || null,
        advancePaymentType: latest?.paymentType || null,
        advancePaymentCheckNo: latest?.checkNo || null,
        advancePaymentNotes: latest?.notes || null,
        advancePaymentRecordedBy: latest?.recordedBy || null
      }
    });

    return {
      totalAdvancePayment: total,
      latestPaymentDate: sumResult._max.paymentMadeDate || null,
      latestPaymentType: latest?.paymentType || null,
      latestCheckNo: latest?.checkNo || null,
      latestNotes: latest?.notes || null,
      latestRecordedBy: latest?.recordedBy || null
    };
  }

  async addAdvancePayment(jobId, advancePayment, paymentDate, paymentType, checkNo, notes, recordedByUserId) {
    const amount = parseFloat(advancePayment) || 0;
    if (amount <= 0) throw new Error('Advance payment amount must be greater than 0');

    const advanceDate = paymentDate ? new Date(paymentDate) : new Date();
    const finalPaymentType = paymentType || null;
    const finalCheckNo = paymentType === 'check' ? checkNo : null;

    const count = await this.prisma.jobadvancepayments.count({ where: { jobId } });
    if (count === 0) {
      const legacyJob = await this.prisma.jobs.findUnique({
        where: { jobId },
        select: {
          advancePayment: true,
          advancePaymentDate: true,
          advancePaymentType: true,
          advancePaymentCheckNo: true,
          advancePaymentNotes: true,
          advancePaymentRecordedBy: true
        }
      });

      const legacyAmount = parseFloat(legacyJob?.advancePayment || 0);
      if (legacyAmount > 0) {
        await this.prisma.jobadvancepayments.create({
          data: {
            jobId,
            amount: legacyAmount,
            paymentMadeDate: legacyJob.advancePaymentDate || new Date(),
            paymentType: legacyJob.advancePaymentType || null,
            checkNo: legacyJob.advancePaymentCheckNo || null,
            notes: legacyJob.advancePaymentNotes || 'Legacy advance payment',
            recordedBy: legacyJob.advancePaymentRecordedBy || null
          }
        });
      }
    }

    const created = await this.prisma.jobadvancepayments.create({
      data: {
        jobId,
        amount,
        paymentMadeDate: advanceDate,
        paymentType: finalPaymentType,
        checkNo: finalCheckNo,
        notes: notes || null,
        recordedBy: recordedByUserId,
        recordedDate: new Date()
      }
    });

    await this.syncAdvancePaymentAggregate(jobId);

    return {
      advancePaymentId: created.advancePaymentId,
      jobId: created.jobId,
      amount: parseFloat(created.amount),
      paymentMadeDate: created.paymentMadeDate,
      paymentType: created.paymentType,
      checkNo: created.checkNo,
      notes: created.notes,
      recordedBy: created.recordedBy,
      recordedDate: created.recordedDate
    };
  }

  async getAdvancePaymentsByJob(jobId) {
    const rows = await this.prisma.jobadvancepayments.findMany({
      where: { jobId },
      orderBy: [
        { paymentMadeDate: 'desc' },
        { advancePaymentId: 'desc' }
      ]
    });

    const recordedByIds = [...new Set(rows.map(r => r.recordedBy).filter(Boolean))];
    let userMap = {};
    if (recordedByIds.length > 0) {
      const users = await this.prisma.users.findMany({
        where: { userId: { in: recordedByIds } },
        select: { userId: true, fullName: true }
      });
      userMap = users.reduce((acc, u) => {
        acc[u.userId] = u.fullName;
        return acc;
      }, {});
    }

    return rows.map(row => ({
      advancePaymentId: row.advancePaymentId,
      jobId: row.jobId,
      amount: parseFloat(row.amount),
      paymentMadeDate: row.paymentMadeDate,
      paymentType: row.paymentType,
      checkNo: row.checkNo,
      notes: row.notes,
      recordedBy: row.recordedBy,
      recordedByName: userMap[row.recordedBy] || null,
      recordedDate: row.recordedDate
    }));
  }

  async updateAdvancePaymentEntry(jobId, paymentId, amount, paymentDate, paymentType, checkNo, notes) {
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) throw new Error('Advance payment amount must be greater than 0');

    const paymentIdInt = parseInt(paymentId, 10);
    if (Number.isNaN(paymentIdInt)) throw new Error('Invalid advance payment record id');

    const updated = await this.prisma.jobadvancepayments.update({
      where: { advancePaymentId: paymentIdInt },
      data: {
        amount: parsedAmount,
        paymentMadeDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentType: paymentType || null,
        checkNo: paymentType === 'check' ? (checkNo || null) : null,
        notes: notes || null
      }
    });

    await this.syncAdvancePaymentAggregate(jobId);

    return {
      advancePaymentId: updated.advancePaymentId,
      jobId: updated.jobId,
      amount: parseFloat(updated.amount),
      paymentMadeDate: updated.paymentMadeDate,
      paymentType: updated.paymentType,
      checkNo: updated.checkNo,
      notes: updated.notes,
      recordedBy: updated.recordedBy,
      recordedDate: updated.recordedDate
    };
  }

  async deleteAdvancePaymentEntry(jobId, paymentId) {
    const paymentIdInt = parseInt(paymentId, 10);
    if (Number.isNaN(paymentIdInt)) throw new Error('Invalid advance payment record id');

    await this.prisma.jobadvancepayments.delete({
      where: { advancePaymentId: paymentIdInt }
    });

    await this.syncAdvancePaymentAggregate(jobId);
    return true;
  }

  async updateAdvancePayment(jobId, advancePayment, paymentDate, paymentType, checkNo, notes, recordedByUserId) {
    return this.addAdvancePayment(jobId, advancePayment, paymentDate, paymentType, checkNo, notes, recordedByUserId);
  }

  async updateStatus(jobId, status) {
    await this.prisma.jobs.update({
      where: { jobId },
      data: { status }
    });
    return true;
  }

  async assignToUser(jobId, userId) {
    await this.prisma.jobassignments.create({
      data: {
        jobId,
        userId,
        assignedDate: new Date(),
        isActive: true
      }
    });
    return true;
  }

  async delete(jobId) {
    await this.prisma.jobs.delete({
      where: { jobId }
    }).catch(() => null);
    return true;
  }

  async generateNextId() {
    return this.generateNextFormattedId('jobs', 'jobId', 'JOB', 4);
  }

  async addPayItem(jobId, payItem) {
    const payItemId = `PI${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const created = await this.prisma.payitems.create({
      data: {
        payItemId,
        jobId,
        description: payItem.description,
        actualCost: payItem.actualCost || payItem.amount || 0,
        billingAmount: payItem.billingAmount || 0,
        addedBy: payItem.addedBy || 'System',
        isCustomItem: Boolean(payItem.isCustomItem),
        addedDate: new Date()
      }
    });
    return {
      payItemId,
      ...payItem,
      actualCost: Number(created.actualCost) || 0,
      billingAmount: Number(created.billingAmount) || 0
    };
  }

  async replacePayItems(jobId, payItems, userId) {
    await this.prisma.jobs.update({
      where: { jobId },
      data: { payItems: JSON.stringify(payItems) }
    });

    try {
      await this.prisma.payitems.deleteMany({ where: { jobId } });
      if (Array.isArray(payItems) && payItems.length > 0) {
        for (const item of payItems) {
          const payItemId = `PI${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await this.prisma.payitems.create({
            data: {
              payItemId,
              jobId,
              description: item.description,
              actualCost: item.amount || item.actualCost || 0,
              billingAmount: item.billingAmount || item.amount || 0,
              addedBy: userId || 'System',
              addedDate: new Date()
            }
          });
        }
      }
    } catch (e) {
      console.warn('Warning: Could not sync to PayItems table:', e.message);
    }
    return true;
  }

  async getPayItems(jobId) {
    const job = await this.prisma.jobs.findUnique({
      where: { jobId },
      select: { payItems: true }
    });

    if (job && job.payItems) {
      try {
        const parsed = typeof job.payItems === 'string'
          ? JSON.parse(job.payItems)
          : job.payItems;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }

    const rows = await this.prisma.payitems.findMany({
      where: { jobId },
      orderBy: { addedDate: 'desc' }
    });

    return rows.map(r => ({
      id: r.payItemId,
      payItemId: r.payItemId,
      description: r.description,
      actualCost: parseFloat(r.actualCost || 0),
      billingAmount: parseFloat(r.billingAmount || 0),
      amount: parseFloat(r.actualCost || 0),
      addedBy: r.addedBy,
      addedDate: r.addedDate,
      isCustomItem: Boolean(r.isCustomItem)
    }));
  }

  async mapToEntity(row) {
    const jobId = row.jobId;

    // 1. Pay items
    let payItems = [];
    if (row.payItems) {
      try {
        const parsed = typeof row.payItems === 'string' ? JSON.parse(row.payItems) : row.payItems;
        if (Array.isArray(parsed) && parsed.length > 0) payItems = parsed;
      } catch (e) {}
    }
    if (payItems.length === 0 && row.payitems && row.payitems.length > 0) {
      payItems = row.payitems.map(r => ({
        id: r.payItemId,
        payItemId: r.payItemId,
        description: r.description,
        actualCost: parseFloat(r.actualCost || 0),
        billingAmount: parseFloat(r.billingAmount || 0),
        amount: parseFloat(r.actualCost || 0),
        addedBy: r.addedBy,
        addedDate: r.addedDate,
        isCustomItem: Boolean(r.isCustomItem)
      }));
    } else if (payItems.length === 0 && !row.payitems) {
      payItems = await this.getPayItems(jobId);
    }

    // 2. Office pay items
    let officePayItems = [];
    if (row.officepayitems && row.officepayitems.length > 0) {
      officePayItems = row.officepayitems.map(item => ({
        officePayItemId: item.officePayItemId,
        description: item.description,
        actualCost: parseFloat(item.actualCost) || 0,
        billingAmount: item.billingAmount ? parseFloat(item.billingAmount) : null,
        paidBy: item.paidBy,
        paidByName: null,
        paymentDate: item.paymentDate,
        notes: item.notes
      }));
    } else if (row.officePayItems) {
      try {
        officePayItems = typeof row.officePayItems === 'string'
          ? JSON.parse(row.officePayItems)
          : row.officePayItems;
      } catch (e) {}
    }

    // 3. Assigned users
    let assignedUsers = [];
    if (row.jobassignments && row.jobassignments.length > 0) {
      assignedUsers = row.jobassignments.map(a => ({
        userId: a.userId,
        userName: a.users?.fullName || null
      }));
    }

    // 4. Petty Cash Assignments
    let assignments = [];
    if (row.pettycashassignments && row.pettycashassignments.length > 0) {
      assignments = row.pettycashassignments.map(pa => ({
        pettyAssignmentId: pa.assignmentId,
        userId: pa.assignedTo,
        userName: pa.users_pettycashassignments_assignedToTousers?.fullName || null,
        waff_clerk_name: pa.users_pettycashassignments_assignedToTousers?.fullName || null,
        assignedAmount: parseFloat(pa.assignedAmount || 0),
        settledAmount: parseFloat(pa.actualSpent || 0),
        status: (pa.status && pa.status.toUpperCase() === 'ASSIGNED') ? 'Assigned' : pa.status,
        groupId: pa.groupId,
        assignedDate: pa.assignedDate,
        notes: pa.notes
      }));
    }

    // 5. Customer name
    const customerName = row.customers?.name || null;

    // 6. Bills (latest)
    const latestBill = (row.bills && row.bills.length > 0) ? row.bills[0] : null;
    const billTotalAmount = latestBill?.netTotal ? parseFloat(latestBill.netTotal) : (row.billTotalAmount ? parseFloat(row.billTotalAmount) : null);
    const billPaidAmount = latestBill?.paidAmount ? parseFloat(latestBill.paidAmount) : (row.billPaidAmount ? parseFloat(row.billPaidAmount) : 0);

    // 7. Metadata
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (e) {}
    }

    return new Job({
      jobId,
      customerId: row.customerId,
      customerName,
      blNumber: row.blNumber,
      cusdecNumber: row.cusdecNumber,
      cusdecDate: row.CUSDECDate || row.cusdecDate,
      openDate: row.openDate,
      shipmentCategory: row.shipmentCategory,
      chassisNumber: row.chassisNumber,
      exporter: row.exporter,
      transporter: row.transporter,
      lcNumber: row.lcNumber,
      containerNumber: row.containerNumber,
      transportDeliveryDate: row.TransportDeliveryDate || row.transportDeliveryDate,
      status: row.status || 'Open',
      assignedTo: row.assignedTo,
      assignedUsers,
      assignments,
      createdDate: row.createdDate,
      completedDate: row.completedDate,
      pettyCashStatus: row.pettyCashStatus,
      advancePayment: row.advancePayment !== undefined ? parseFloat(row.advancePayment) : 0,
      advancePaymentDate: row.advancePaymentDate,
      advancePaymentType: row.advancePaymentType,
      advancePaymentCheckNo: row.advancePaymentCheckNo,
      advancePaymentNotes: row.advancePaymentNotes,
      advancePaymentRecordedBy: row.advancePaymentRecordedBy,
      payItems: payItems || [],
      officePayItems: officePayItems || [],
      metadata,
      billTotalAmount,
      billPaidAmount
    });
  }
}

module.exports = MySQLJobRepository;
