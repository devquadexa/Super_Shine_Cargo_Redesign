const IPettyCashAssignmentRepository = require('../../../domain/repositories/IPettyCashAssignmentRepository');
const PettyCashAssignment = require('../../../domain/entities/PettyCashAssignment');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLPettyCashAssignmentRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(assignmentData) {
    let groupId = assignmentData.groupId || `${assignmentData.jobId}_${assignmentData.assignedTo}`;

    if (!assignmentData.groupId) {
      const last = await this.prisma.pettycashassignments.findFirst({
        where: {
          jobId: assignmentData.jobId,
          assignedTo: assignmentData.assignedTo
        },
        orderBy: { assignedDate: 'desc' }
      });

      if (last) {
        const settledStatuses = [
          'Full Petty Cash Returned',
          'Settled / Balance Returned',
          'Settled / Over Due Collected',
          'Settled'
        ];
        if (settledStatuses.includes(last.status)) {
          groupId = `${assignmentData.jobId}_${assignmentData.assignedTo}_${Date.now()}`;
        } else {
          groupId = last.groupId || `${assignmentData.jobId}_${assignmentData.assignedTo}`;
        }
      }
    }

    const created = await this.prisma.pettycashassignments.create({
      data: {
        jobId: assignmentData.jobId,
        assignedTo: assignmentData.assignedTo,
        assignedBy: assignmentData.assignedBy,
        assignedAmount: assignmentData.assignedAmount,
        notes: assignmentData.notes || null,
        groupId,
        status: 'Assigned',
        assignedDate: new Date(),
        isMainAssignment: true
      },
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true
      }
    });

    await this.prisma.jobs.update({
      where: { jobId: assignmentData.jobId },
      data: { pettyCashStatus: 'Assigned' }
    }).catch(() => null);

    const mysqlDb = require('../../../config/mysqlDatabase');
    await mysqlDb.query(
      "UPDATE jobs SET status = 'In Progress' WHERE jobId = ? AND status = 'Open'",
      [assignmentData.jobId]
    ).catch(() => null);

    const entity = this.mapToEntity({ ...created, groupId, settlementItems: [] });
    if (this._cache) {
      this._cache.unshift(entity);
    }
    this.clearCache(true);
    return entity;
  }

  clearCache(clearMemory = true) {
    if (clearMemory) {
      this._cache = null;
      this._cacheTime = 0;
      this._userCache = null;
    }
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') jobRepo.clearCache(true);
    } catch (e) {}
  }

  async _fetchAssignmentsWithWorkflow(whereClause = '', params = []) {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const sql = `
      SELECT 
        pca.*,
        u_to.fullName AS assignedToName,
        u_to.role AS assignedToRole,
        u_by.fullName AS assignedByName,
        u_by.role AS assignedByRole,
        u_app.fullName AS approvedByName,
        u_app.role AS approvedByRole,
        u_rej.fullName AS rejectedByName,
        u_rej.role AS rejectedByRole,
        u_iss.fullName AS issuedByName,
        u_iss.role AS issuedByRole,
        COALESCE(pca.assignedManagerId, cma.managerId) AS effectiveManagerId,
        u_mgr.fullName AS assignedManagerName
      FROM pettycashassignments pca
      LEFT JOIN users u_to ON pca.assignedTo = u_to.userId
      LEFT JOIN users u_by ON pca.assignedBy = u_by.userId
      LEFT JOIN users u_app ON pca.approvedBy = u_app.userId
      LEFT JOIN users u_rej ON pca.rejectedBy = u_rej.userId
      LEFT JOIN users u_iss ON pca.issuedBy = u_iss.userId
      LEFT JOIN clerk_manager_assignments cma ON pca.assignedTo = cma.clerkId
      LEFT JOIN users u_mgr ON COALESCE(pca.assignedManagerId, cma.managerId) = u_mgr.userId
      ${whereClause ? `WHERE ${whereClause}` : ''}
      ORDER BY pca.assignedDate DESC
    `;
    const rows = await mysqlDb.query(sql, params);
    if (!rows || rows.length === 0) return [];

    const assignmentIds = rows.map(r => r.assignmentId);
    let itemsByAssignmentId = {};
    if (assignmentIds.length > 0) {
      const placeholders = assignmentIds.map(() => '?').join(',');
      const itemsSql = `
        SELECT * FROM pettycashsettlementitems 
        WHERE assignmentId IN (${placeholders})
        ORDER BY createdDate ASC
      `;
      const itemRows = await mysqlDb.query(itemsSql, assignmentIds).catch(() => []);
      for (const item of (itemRows || [])) {
        if (!itemsByAssignmentId[item.assignmentId]) {
          itemsByAssignmentId[item.assignmentId] = [];
        }
        itemsByAssignmentId[item.assignmentId].push({
          ...item,
          actualCost: Number(item.actualCost) || 0,
          isCustomItem: Boolean(item.isCustomItem),
          hasBill: Boolean(item.hasBill)
        });
      }
    }

    return rows.map(r => this.mapToEntity({
      ...r,
      settlementItems: itemsByAssignmentId[r.assignmentId] || []
    }));
  }

  async getAll() {
    const now = Date.now();
    if (this._cache && (now - this._cacheTime < 30000)) {
      return this._cache;
    }

    const result = await this._fetchAssignmentsWithWorkflow();
    this._cache = result;
    this._cacheTime = now;
    return result;
  }

  async findAll() {
    return this.getAll();
  }

  async getByUser(userId) {
    const now = Date.now();
    if (this._cache && (now - this._cacheTime < 30000)) {
      return this._cache.filter(a => a.assignedTo === userId);
    }

    if (!this._userCache) this._userCache = new Map();
    const userCached = this._userCache.get(userId);
    if (userCached && (now - userCached.time < 30000)) {
      return userCached.data;
    }

    const result = await this._fetchAssignmentsWithWorkflow('pca.assignedTo = ?', [userId]);
    this._userCache.set(userId, { data: result, time: now });
    return result;
  }

  async getByJob(jobId) {
    const rows = await this._fetchAssignmentsWithWorkflow('pca.jobId = ?', [jobId]);
    if (!rows || rows.length === 0) return null;

    let allSettlementItems = [];
    for (const assignment of rows) {
      const items = (assignment.settlementItems || []).map(i => ({
        ...i,
        actualCost: Number(i.actualCost) || 0,
        isCustomItem: Boolean(i.isCustomItem),
        hasBill: Boolean(i.hasBill)
      }));
      allSettlementItems = allSettlementItems.concat(items);
    }

    const first = rows[0];
    return { ...first, settlementItems: allSettlementItems };
  }

  async getById(assignmentId) {
    const id = parseInt(assignmentId, 10);
    if (isNaN(id)) return null;
    const rows = await this._fetchAssignmentsWithWorkflow('pca.assignmentId = ?', [id]);
    return rows && rows.length > 0 ? rows[0] : null;
  }

  async findById(assignmentId) {
    return this.getById(assignmentId);
  }

  async getSettlementItems(assignmentId) {
    const id = parseInt(assignmentId, 10);
    if (isNaN(id)) return [];

    let targetIds = [id];
    try {
      const assignment = await this.prisma.pettycashassignments.findUnique({
        where: { assignmentId: id },
        select: { groupId: true, jobId: true, assignedTo: true }
      });

      if (assignment) {
        const gid = assignment.groupId || `${assignment.jobId}_${assignment.assignedTo}`;
        const related = await this.prisma.pettycashassignments.findMany({
          where: {
            OR: [
              { groupId: gid },
              { jobId: assignment.jobId, assignedTo: assignment.assignedTo }
            ]
          },
          select: { assignmentId: true }
        });
        if (related.length > 0) {
          targetIds = related.map(r => r.assignmentId);
        }
      }
    } catch (e) {
      console.warn('Error fetching group assignments for items:', e.message);
    }

    const rows = await this.prisma.pettycashsettlementitems.findMany({
      where: { assignmentId: { in: targetIds } },
      orderBy: { createdDate: 'asc' }
    });

    return rows.map(r => ({
      ...r,
      actualCost: Number(r.actualCost) || 0,
      isCustomItem: Boolean(r.isCustomItem),
      hasBill: Boolean(r.hasBill)
    }));
  }

  async settle(assignmentId, settlementData, options = {}) {
    const id = parseInt(assignmentId, 10);
    const assignment = await this.getById(id);
    if (!assignment) throw new Error('Assignment not found');

    if (['Requested', 'Approved', 'Rejected'].includes(assignment.status)) {
      throw new Error(`Cannot settle petty cash with status '${assignment.status}'. Petty cash must be issued by Finance first.`);
    }

    const incomingItems = settlementData.items || [];

    // 1. In ONE single query: find any predefined items already claimed by other assignments for this job
    const otherClaimedItems = await this.prisma.pettycashsettlementitems.findMany({
      where: {
        isCustomItem: false,
        pettycashassignments: {
          jobId: assignment.jobId,
          assignmentId: { not: id }
        }
      },
      select: { itemName: true }
    });
    const claimedSet = new Set(otherClaimedItems.map(i => i.itemName));

    // 2. Delete all existing items for this assignment in ONE single batch operation
    await this.prisma.pettycashsettlementitems.deleteMany({
      where: { assignmentId: id }
    });

    // 3. Prepare all non-duplicate items
    const itemsToInsert = incomingItems
      .filter(item => item.isCustomItem || !claimedSet.has(item.itemName))
      .map(item => ({
        assignmentId: id,
        itemName: item.itemName,
        actualCost: parseFloat(item.actualCost || 0),
        isCustomItem: Boolean(item.isCustomItem),
        paidBy: item.paidBy || assignment.assignedTo,
        hasBill: (item.hasBill === true || item.hasBill === 1 || item.hasBill === 'true'),
        createdDate: new Date()
      }));

    // 4. Batch insert all settlement items at once
    if (itemsToInsert.length > 0) {
      await this.prisma.pettycashsettlementitems.createMany({
        data: itemsToInsert
      });
    }

    // Calculate spent directly from incoming items without waiting on a remote aggregate roundtrip
    const currentItemsSpent = itemsToInsert.reduce((sum, item) => sum + item.actualCost, 0);
    let actualSpent = currentItemsSpent;
    let assignedAmount = options.groupTotalAssigned ? parseFloat(options.groupTotalAssigned) : parseFloat(assignment.assignedAmount);

    if (!options.groupTotalAssigned && assignment.isMainAssignment) {
      const subAssignments = await this.prisma.pettycashassignments.findMany({
        where: { parentAssignmentId: id },
        select: { assignmentId: true, assignedAmount: true }
      });

      if (subAssignments.length > 0) {
        const subTotal = subAssignments.reduce((acc, s) => acc + parseFloat(s.assignedAmount || 0), 0);
        if (subTotal > 0) assignedAmount = subTotal;
      }
    }

    const balanceAmount = assignedAmount > actualSpent ? assignedAmount - actualSpent : 0;
    const overAmount = actualSpent > assignedAmount ? actualSpent - assignedAmount : 0;

    let newStatus = 'Settled';
    if (actualSpent === 0 && balanceAmount === assignedAmount) {
      newStatus = 'Full Petty Cash Returned';
    } else if (balanceAmount > 0) {
      newStatus = 'Balance To Be Return';
    } else if (overAmount > 0) {
      newStatus = 'Over Due';
    }

    if (options.overrideStatus) {
      newStatus = options.overrideStatus;
    }

    // Run assignment update and job status check concurrently to cut latency in half
    await Promise.all([
      this.prisma.pettycashassignments.update({
        where: { assignmentId: id },
        data: {
          status: newStatus,
          actualSpent,
          balanceAmount,
          overAmount,
          settlementDate: new Date()
        }
      }),
      this._checkAndUpdateJobPettyCashStatus(assignment.jobId)
    ]);

    const settledEntity = this.mapToEntity({
      ...assignment,
      status: newStatus,
      actualSpent,
      balanceAmount,
      overAmount,
      settlementDate: new Date(),
      settlementItems: itemsToInsert
    });

    if (this._cache) {
      const idx = this._cache.findIndex(a => a.assignmentId === id);
      if (idx !== -1) this._cache[idx] = settledEntity;
    }
    this.clearCache(false);

    return settledEntity;
  }

  async _checkAndUpdateJobPettyCashStatus(jobId) {
    if (!jobId) return;
    const mysqlDb = require('../../../config/mysqlDatabase');
    try {
      const rows = await mysqlDb.query(
        'SELECT status FROM pettycashassignments WHERE jobId = ?',
        [jobId]
      );

      if (!rows || rows.length === 0) {
        await mysqlDb.query('UPDATE jobs SET pettyCashStatus = NULL WHERE jobId = ?', [jobId]).catch(() => null);
        this.clearCache(false);
        return;
      }

      const statuses = rows.map(r => r.status);
      const settledStatuses = [
        'Settled',
        'Settled / Balance Returned',
        'Settled / Over Due Collected',
        'Full Petty Cash Returned',
        'Returned',
        'Paid',
        'Closed'
      ];

      let newJobStatus = 'Assigned';
      if (statuses.every(s => settledStatuses.includes(s))) {
        newJobStatus = 'Settled';
      } else if (statuses.some(s => s === 'Requested')) {
        newJobStatus = 'Requested';
      } else if (statuses.some(s => s === 'Approved')) {
        newJobStatus = 'Approved';
      } else if (statuses.some(s => s === 'Assigned')) {
        newJobStatus = 'Assigned';
      } else if (statuses.every(s => s === 'Rejected')) {
        newJobStatus = 'Rejected';
      }

      await mysqlDb.query(
        'UPDATE jobs SET pettyCashStatus = ? WHERE jobId = ?',
        [newJobStatus, jobId]
      ).catch(() => null);

      // Auto-update job main status from "Open" to "In Progress" when petty cash is assigned or requested
      if (statuses.some(s => s === 'Assigned' || s === 'Requested' || s === 'Approved')) {
        await mysqlDb.query(
          "UPDATE jobs SET status = 'In Progress' WHERE jobId = ? AND status = 'Open'",
          [jobId]
        ).catch(() => null);
      }
    } catch (e) {
      console.warn('Error in _checkAndUpdateJobPettyCashStatus:', e.message);
    }

    this.clearCache(true);
  }

  async updateStatus(assignmentId, status) {
    const id = parseInt(assignmentId, 10);
    const updated = await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: { status }
    });
    if (this._cache) {
      const item = this._cache.find(a => a.assignmentId === id);
      if (item) item.status = status;
    }
    await this._checkAndUpdateJobPettyCashStatus(updated.jobId);
    this.clearCache(false);
    return updated;
  }

  async updateStatuses(assignmentIds, status) {
    if (!assignmentIds || assignmentIds.length === 0) return true;
    const ids = assignmentIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (ids.length === 0) return true;

    await this.prisma.pettycashassignments.updateMany({
      where: { assignmentId: { in: ids } },
      data: { status }
    });

    if (this._cache) {
      const idSet = new Set(ids);
      this._cache.forEach(item => {
        if (idSet.has(item.assignmentId)) {
          item.status = status;
        }
      });
    }

    const first = await this.prisma.pettycashassignments.findFirst({
      where: { assignmentId: { in: ids } },
      select: { jobId: true }
    });

    if (first?.jobId) {
      await this._checkAndUpdateJobPettyCashStatus(first.jobId);
    } else {
      this.clearCache(false);
    }
    return true;
  }

  async recalculateStatus(assignmentId) {
    const id = parseInt(assignmentId, 10);
    const row = await this.prisma.pettycashassignments.findUnique({
      where: { assignmentId: id }
    });
    if (!row) throw new Error('Assignment not found');

    const settledStatuses = ['Settled', 'Balance To Be Return', 'Over Due'];
    if (!settledStatuses.includes(row.status)) return await this.getById(id);

    const assignedAmount = parseFloat(row.assignedAmount) || 0;
    const actualSpent = parseFloat(row.actualSpent) || 0;
    const recalcBalance = assignedAmount > actualSpent ? assignedAmount - actualSpent : 0;
    const recalcOver = actualSpent > assignedAmount ? actualSpent - assignedAmount : 0;

    let correctStatus = 'Settled';
    if (recalcBalance > 0) correctStatus = 'Balance To Be Return';
    else if (recalcOver > 0) correctStatus = 'Over Due';

    await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: {
        status: correctStatus,
        balanceAmount: recalcBalance,
        overAmount: recalcOver
      }
    });

    if (this._cache) {
      const item = this._cache.find(a => a.assignmentId === id);
      if (item) {
        item.status = correctStatus;
        item.balanceAmount = recalcBalance;
        item.overAmount = recalcOver;
      }
    }

    await this._checkAndUpdateJobPettyCashStatus(row.jobId);

    return await this.getById(id);
  }

  async closeAllByJob(jobId) {
    await this.prisma.pettycashassignments.updateMany({
      where: { jobId },
      data: { status: 'Closed' }
    });
    if (this._cache) {
      this._cache.forEach(item => {
        if (item.jobId === jobId) item.status = 'Closed';
      });
    }
    await this._checkAndUpdateJobPettyCashStatus(jobId);
  }

  async updateStatusAndClearAmount(assignmentId, newStatus, settlementType) {
    const id = parseInt(assignmentId, 10);
    const data = { status: newStatus };
    if (settlementType === 'BALANCE_RETURN') {
      data.balanceAmount = 0;
    } else if (settlementType === 'OVERDUE_COLLECTION') {
      data.overAmount = 0;
    }

    const updated = await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data
    });
    if (this._cache) {
      const item = this._cache.find(a => a.assignmentId === id);
      if (item) {
        item.status = newStatus;
        if (settlementType === 'BALANCE_RETURN') item.balanceAmount = 0;
        if (settlementType === 'OVERDUE_COLLECTION') item.overAmount = 0;
      }
    }
    await this._checkAndUpdateJobPettyCashStatus(updated.jobId);
    this.clearCache(false);
    return await this.getById(id);
  }

  async returnBalance(assignmentId) {
    const id = parseInt(assignmentId, 10);
    const updated = await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: { status: 'Settled / Balance Returned' }
    });
    if (this._cache) {
      const item = this._cache.find(a => a.assignmentId === id);
      if (item) item.status = 'Settled / Balance Returned';
    }
    await this._checkAndUpdateJobPettyCashStatus(updated.jobId);
    this.clearCache(false);
    return await this.getById(id);
  }

  async payOverAmount(assignmentId) {
    const id = parseInt(assignmentId, 10);
    const updated = await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: { status: 'Settled / Over Due Collected' }
    });
    if (this._cache) {
      const item = this._cache.find(a => a.assignmentId === id);
      if (item) item.status = 'Settled / Over Due Collected';
    }
    await this._checkAndUpdateJobPettyCashStatus(updated.jobId);
    this.clearCache(false);
    return await this.getById(id);
  }

  async getByJobAndUser(jobId, userId, assignmentId = null) {
    let row;
    if (assignmentId) {
      row = await this.prisma.pettycashassignments.findFirst({
        where: {
          jobId,
          assignedTo: userId,
          assignmentId: parseInt(assignmentId, 10)
        },
        include: {
          users_pettycashassignments_assignedToTousers: true,
          users_pettycashassignments_assignedByTousers: true
        }
      });
    } else {
      row = await this.prisma.pettycashassignments.findFirst({
        where: {
          jobId,
          assignedTo: userId
        },
        orderBy: { assignedDate: 'desc' },
        include: {
          users_pettycashassignments_assignedToTousers: true,
          users_pettycashassignments_assignedByTousers: true
        }
      });
    }

    if (!row) return null;

    const userOwnItems = await this.getSettlementItems(row.assignmentId);

    const otherItemsRows = await this.prisma.pettycashsettlementitems.findMany({
      where: {
        pettycashassignments: {
          jobId,
          assignmentId: { not: row.assignmentId }
        }
      }
    });

    const userOwnItemIds = new Set(userOwnItems.map(i => i.settlementItemId));
    const userEditableItems = userOwnItems.map(i => ({
      ...i,
      actualCost: Number(i.actualCost) || 0,
      isReadOnly: false,
      isOwnItem: true,
      countInTotalSpent: true
    }));

    const otherItems = otherItemsRows
      .filter(i => !userOwnItemIds.has(i.settlementItemId) && (!i.isCustomItem))
      .map(i => ({
        ...i,
        actualCost: Number(i.actualCost) || 0,
        isReadOnly: true,
        isOwnItem: false,
        countInTotalSpent: false
      }));

    const userOwnTotalSpent = userEditableItems.reduce((sum, i) => sum + parseFloat(i.actualCost || 0), 0);

    return new PettyCashAssignment({
      ...row,
      assignedAmount: Number(row.assignedAmount) || 0,
      actualSpent: userOwnTotalSpent,
      balanceAmount: parseFloat(row.assignedAmount) - userOwnTotalSpent,
      overAmount: userOwnTotalSpent > parseFloat(row.assignedAmount) ? userOwnTotalSpent - parseFloat(row.assignedAmount) : 0,
      assignedToName: row.users_pettycashassignments_assignedToTousers?.fullName || null,
      assignedByName: row.users_pettycashassignments_assignedByTousers?.fullName || null,
      settlementItems: userEditableItems,
      readOnlyPredefinedItems: otherItems
    });
  }

  async getAllByJob(jobId) {
    return await this._fetchAssignmentsWithWorkflow('pca.jobId = ?', [jobId]);
  }

  async updateSettlementItem(itemId, itemName, actualCost) {
    const id = parseInt(itemId, 10);
    const updated = await this.prisma.pettycashsettlementitems.update({
      where: { settlementItemId: id },
      data: { itemName, actualCost }
    });
    this.clearCache(false);
    return {
      ...updated,
      actualCost: Number(updated.actualCost) || 0,
      isCustomItem: Boolean(updated.isCustomItem),
      hasBill: Boolean(updated.hasBill)
    };
  }

  async deleteSettlementItem(itemId) {
    const id = parseInt(itemId, 10);
    await this.prisma.pettycashsettlementitems.delete({
      where: { settlementItemId: id }
    }).catch(() => null);
    this.clearCache(false);
    return true;
  }

  async recalculateAssignmentTotals(assignmentId) {
    const id = parseInt(assignmentId, 10);
    const sumResult = await this.prisma.pettycashsettlementitems.aggregate({
      where: { assignmentId: id },
      _sum: { actualCost: true }
    });
    const actualSpent = parseFloat(sumResult._sum.actualCost || 0);

    const assignment = await this.prisma.pettycashassignments.findUnique({
      where: { assignmentId: id }
    });
    const assignedAmount = parseFloat(assignment?.assignedAmount || 0);

    const balanceAmount = assignedAmount > actualSpent ? assignedAmount - actualSpent : 0;
    const overAmount = actualSpent > assignedAmount ? actualSpent - assignedAmount : 0;

    const updated = await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: {
        actualSpent,
        balanceAmount,
        overAmount
      }
    });

    if (this._cache) {
      const item = this._cache.find(a => a.assignmentId === id);
      if (item) {
        item.actualSpent = actualSpent;
        item.balanceAmount = balanceAmount;
        item.overAmount = overAmount;
      }
    }

    this.clearCache(false);
    return {
      ...updated,
      assignedAmount: Number(updated.assignedAmount) || 0,
      actualSpent: Number(updated.actualSpent) || 0,
      balanceAmount: Number(updated.balanceAmount) || 0,
      overAmount: Number(updated.overAmount) || 0
    };
  }

  async createSubAssignment(assignmentData) {
    const created = await this.prisma.pettycashassignments.create({
      data: {
        jobId: assignmentData.jobId,
        assignedTo: assignmentData.assignedTo,
        assignedBy: assignmentData.assignedBy,
        assignedAmount: assignmentData.assignedAmount,
        notes: assignmentData.notes || null,
        groupId: assignmentData.groupId,
        parentAssignmentId: assignmentData.parentAssignmentId ? parseInt(assignmentData.parentAssignmentId, 10) : null,
        isMainAssignment: false,
        status: 'Assigned',
        assignedDate: new Date()
      }
    });

    const mysqlDb = require('../../../config/mysqlDatabase');
    await mysqlDb.query(
      "UPDATE jobs SET status = 'In Progress' WHERE jobId = ? AND status = 'Open'",
      [assignmentData.jobId]
    ).catch(() => null);

    if (this._cache) {
      this._cache.unshift(this.mapToEntity({ ...created, settlementItems: [] }));
    }
    this.clearCache(true);
    return {
      ...created,
      assignedAmount: Number(created.assignedAmount) || 0
    };
  }

  async getMainAssignments(userId = null) {
    const where = { isMainAssignment: true };
    if (userId) where.assignedTo = userId;

    const rows = await this.prisma.pettycashassignments.findMany({
      where,
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true,
        jobs: true
      },
      orderBy: { assignedDate: 'desc' }
    });

    return rows.map(r => ({
      ...r,
      assignedAmount: Number(r.assignedAmount) || 0,
      actualSpent: Number(r.actualSpent) || 0,
      balanceAmount: Number(r.balanceAmount) || 0,
      overAmount: Number(r.overAmount) || 0,
      groupId: r.groupId || `${r.jobId}_${r.assignedTo}`,
      shipmentCategory: r.jobs?.shipmentCategory || null,
      customerId: r.jobs?.customerId || null,
      assignedToName: r.users_pettycashassignments_assignedToTousers?.fullName || null,
      assignedByName: r.users_pettycashassignments_assignedByTousers?.fullName || null
    }));
  }

  async getSubAssignments(parentAssignmentId) {
    const id = parseInt(parentAssignmentId, 10);
    const rows = await this.prisma.pettycashassignments.findMany({
      where: { parentAssignmentId: id },
      include: {
        users_pettycashassignments_assignedByTousers: true
      },
      orderBy: { assignedDate: 'asc' }
    });

    return rows.map(r => ({
      ...r,
      assignedAmount: Number(r.assignedAmount) || 0,
      actualSpent: Number(r.actualSpent) || 0,
      balanceAmount: Number(r.balanceAmount) || 0,
      overAmount: Number(r.overAmount) || 0,
      assignedByName: r.users_pettycashassignments_assignedByTousers?.fullName || null
    }));
  }

  async getTotalAssignedAmount(mainAssignmentId) {
    const id = parseInt(mainAssignmentId, 10);
    const sumResult = await this.prisma.pettycashassignments.aggregate({
      where: {
        OR: [
          { assignmentId: id },
          { parentAssignmentId: id }
        ]
      },
      _sum: { assignedAmount: true }
    });

    return parseFloat(sumResult._sum.assignedAmount || 0);
  }

  async findByDateRange(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const rows = await this.prisma.pettycashassignments.findMany({
      where: {
        assignedDate: {
          gte: from,
          lte: to
        }
      },
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true,
        jobs: {
          include: {
            customers: true
          }
        }
      },
      orderBy: [
        { assignedDate: 'desc' },
        { assignmentId: 'desc' }
      ]
    });

    return rows.map(r => ({
      assignmentId: r.assignmentId,
      jobId: r.jobId,
      assignedAmount: Number(r.assignedAmount) || 0,
      assignedDate: r.assignedDate,
      status: r.status,
      actualSpent: Number(r.actualSpent) || 0,
      balanceAmount: Number(r.balanceAmount) || 0,
      overAmount: Number(r.overAmount) || 0,
      notes: r.notes,
      groupId: r.groupId,
      clerkName: r.users_pettycashassignments_assignedToTousers?.fullName || null,
      clerkId: r.users_pettycashassignments_assignedToTousers?.userId || null,
      managerName: r.users_pettycashassignments_assignedByTousers?.fullName || null,
      managerId: r.users_pettycashassignments_assignedByTousers?.userId || null,
      shipmentCategory: r.jobs?.shipmentCategory || null,
      customerId: r.jobs?.customerId || null,
      customerName: r.jobs?.customers?.name || null,
      customerPhone: r.jobs?.customers?.mainPhone || null
    }));
  }

  async findByDate(date) {
    return this.findByDateRange(date, date);
  }

  async requestPettyCash({ jobId, assignedTo, requestedAmount, notes }) {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const amount = parseFloat(requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Requested amount must be greater than 0');
    }

    // Check if there is already an active request or pending approval for this job + user
    const existing = await mysqlDb.query(
      `SELECT assignmentId, status FROM pettycashassignments WHERE jobId = ? AND assignedTo = ? AND status IN ('Requested', 'Approved') LIMIT 1`,
      [jobId, assignedTo]
    );
    if (existing && existing.length > 0) {
      throw new Error(`A petty cash request is already ${existing[0].status.toLowerCase()} for this job.`);
    }

    // Lookup assigned manager & request threshold limit for this clerk from clerk_manager_assignments
    const ruleRows = await mysqlDb.query(
      'SELECT managerId, requestThreshold FROM clerk_manager_assignments WHERE clerkId = ? LIMIT 1',
      [assignedTo]
    ).catch(() => []);
    const assignedManagerId = (ruleRows && ruleRows.length > 0 && ruleRows[0].managerId) ? ruleRows[0].managerId : null;
    const threshold = (ruleRows && ruleRows.length > 0 && ruleRows[0].requestThreshold !== null && ruleRows[0].requestThreshold !== undefined)
      ? parseFloat(ruleRows[0].requestThreshold)
      : null;

    if (threshold !== null && threshold > 0 && amount > threshold) {
      throw new Error(
        `Requested amount of LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds your allowed petty cash threshold limit of LKR ${threshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
      );
    }

    const tempGroupId = `req_${Date.now()}`;
    const insertSql = `
      INSERT INTO pettycashassignments 
        (jobId, assignedTo, assignedBy, assignedAmount, assignedDate, status, notes, groupId, isMainAssignment, assignedManagerId)
      VALUES 
        (?, ?, ?, ?, NOW(), 'Requested', ?, ?, 1, ?)
    `;
    const result = await mysqlDb.query(insertSql, [
      jobId,
      assignedTo,
      assignedTo,
      amount,
      notes || null,
      tempGroupId,
      assignedManagerId
    ]);

    const newId = result.insertId;
    await mysqlDb.query('UPDATE pettycashassignments SET groupId = ? WHERE assignmentId = ?', [`req_${newId}`, newId]).catch(() => null);
    await mysqlDb.query("UPDATE jobs SET status = 'In Progress' WHERE jobId = ? AND status = 'Open'", [jobId]).catch(() => null);
    await this._checkAndUpdateJobPettyCashStatus(jobId);
    this.clearCache(true);

    // Send notification to the designated manager (or all managers if unassigned)
    try {
      const container = require('../../di/container');
      const createNotification = container.get('createNotification');
      if (createNotification) {
        const clerkRows = await mysqlDb.query('SELECT fullName FROM users WHERE userId = ? LIMIT 1', [assignedTo]).catch(() => []);
        const clerkName = (clerkRows && clerkRows[0]) ? clerkRows[0].fullName : 'Wharf Clerk';

        if (assignedManagerId) {
          await createNotification.execute({
            userId: assignedManagerId,
            type: 'PETTY_CASH_REQUESTED',
            title: 'New Petty Cash Request',
            message: `Wharf clerk ${clerkName} requested LKR ${amount.toLocaleString()} for Job #${jobId}`,
            relatedId: String(newId),
            relatedType: 'PETTY_CASH_ASSIGNMENT',
            metadata: { assignmentId: newId, jobId, clerkId: assignedTo, clerkName, amount },
            createdBy: assignedTo
          }).catch(() => null);
        } else {
          const allManagers = await mysqlDb.query("SELECT userId FROM users WHERE role = 'Manager' AND isActive = 1").catch(() => []);
          for (const mgr of (allManagers || [])) {
            await createNotification.execute({
              userId: mgr.userId,
              type: 'PETTY_CASH_REQUESTED',
              title: 'New Petty Cash Request',
              message: `Wharf clerk ${clerkName} requested LKR ${amount.toLocaleString()} for Job #${jobId}`,
              relatedId: String(newId),
              relatedType: 'PETTY_CASH_ASSIGNMENT',
              metadata: { assignmentId: newId, jobId, clerkId: assignedTo, clerkName, amount },
              createdBy: assignedTo
            }).catch(() => null);
          }
        }
      }
    } catch (notifErr) {
      console.warn('Failed to send petty cash notification:', notifErr.message);
    }

    return await this.getById(newId);
  }

  async approvePettyCash(assignmentId, { approvedBy, approvedAmount, notes }) {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const id = parseInt(assignmentId, 10);
    const existing = await this.getById(id);
    if (!existing) throw new Error('Petty cash request not found');
    if (existing.status !== 'Requested') {
      throw new Error(`Cannot approve request with status '${existing.status}'. Must be in 'Requested' status.`);
    }

    // Role check: if approver is a Manager, verify they are the designated manager for this clerk
    const targetManagerId = existing.assignedManagerId || existing.effectiveManagerId;
    if (targetManagerId && approvedBy && targetManagerId !== approvedBy) {
      const approverRows = await mysqlDb.query('SELECT role FROM users WHERE userId = ?', [approvedBy]).catch(() => []);
      const approverRole = (approverRows && approverRows[0]) ? approverRows[0].role : null;
      if (approverRole === 'Manager') {
        throw new Error('Only the assigned manager for this clerk can approve this request.');
      }
    }

    const finalAmount = (approvedAmount && !isNaN(parseFloat(approvedAmount)) && parseFloat(approvedAmount) > 0)
      ? parseFloat(approvedAmount)
      : parseFloat(existing.assignedAmount);

    const updateSql = `
      UPDATE pettycashassignments 
      SET 
        status = 'Approved',
        approvedBy = ?,
        approvedDate = NOW(),
        assignedAmount = ?,
        notes = COALESCE(?, notes)
      WHERE assignmentId = ?
    `;
    await mysqlDb.query(updateSql, [
      approvedBy,
      finalAmount,
      notes || null,
      id
    ]);

    await mysqlDb.query(
      "UPDATE jobs SET status = 'In Progress' WHERE jobId = ? AND status = 'Open'",
      [existing.jobId]
    ).catch(() => null);
    await this._checkAndUpdateJobPettyCashStatus(existing.jobId);
    this.clearCache(true);
    return await this.getById(id);
  }

  async rejectPettyCash(assignmentId, { rejectedBy, rejectionReason }) {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const id = parseInt(assignmentId, 10);
    const existing = await this.getById(id);
    if (!existing) throw new Error('Petty cash request not found');
    if (existing.status !== 'Requested') {
      throw new Error(`Cannot reject request with status '${existing.status}'. Must be in 'Requested' status.`);
    }

    // Role check: if rejecter is a Manager, verify they are the designated manager for this clerk
    const targetManagerId = existing.assignedManagerId || existing.effectiveManagerId;
    if (targetManagerId && rejectedBy && targetManagerId !== rejectedBy) {
      const rejecterRows = await mysqlDb.query('SELECT role FROM users WHERE userId = ?', [rejectedBy]).catch(() => []);
      const rejecterRole = (rejecterRows && rejecterRows[0]) ? rejecterRows[0].role : null;
      if (rejecterRole === 'Manager') {
        throw new Error('Only the assigned manager for this clerk can reject this request.');
      }
    }
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new Error('Rejection reason is required.');
    }

    const updateSql = `
      UPDATE pettycashassignments 
      SET 
        status = 'Rejected',
        rejectedBy = ?,
        rejectedDate = NOW(),
        rejectionReason = ?
      WHERE assignmentId = ?
    `;
    await mysqlDb.query(updateSql, [
      rejectedBy,
      rejectionReason.trim(),
      id
    ]);

    await this._checkAndUpdateJobPettyCashStatus(existing.jobId);
    this.clearCache(true);
    return await this.getById(id);
  }

  async reRequestPettyCash(assignmentId, { requestedAmount, notes, userId }) {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const id = parseInt(assignmentId, 10);
    const existing = await this.getById(id);
    if (!existing) throw new Error('Petty cash assignment not found');
    if (existing.status !== 'Rejected') {
      throw new Error(`Cannot re-request petty cash with status '${existing.status}'. Must be in 'Rejected' status.`);
    }
    if (userId && existing.assignedTo !== userId) {
      throw new Error('You can only re-request petty cash for yourself.');
    }

    const amount = parseFloat(requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Requested amount must be greater than 0');
    }

    // Check petty cash request threshold limit
    const clerkId = userId || existing.assignedTo;
    const ruleRows = await mysqlDb.query(
      'SELECT requestThreshold FROM clerk_manager_assignments WHERE clerkId = ? LIMIT 1',
      [clerkId]
    ).catch(() => []);
    const threshold = (ruleRows && ruleRows.length > 0 && ruleRows[0].requestThreshold !== null && ruleRows[0].requestThreshold !== undefined)
      ? parseFloat(ruleRows[0].requestThreshold)
      : null;

    if (threshold !== null && threshold > 0 && amount > threshold) {
      throw new Error(
        `Requested amount of LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} exceeds your allowed petty cash threshold limit of LKR ${threshold.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
      );
    }

    const updateSql = `
      UPDATE pettycashassignments 
      SET 
        status = 'Requested',
        assignedAmount = ?,
        notes = ?,
        assignedDate = NOW()
      WHERE assignmentId = ?
    `;
    await mysqlDb.query(updateSql, [
      amount,
      notes || null,
      id
    ]);

    await mysqlDb.query(
      "UPDATE jobs SET status = 'In Progress' WHERE jobId = ? AND status = 'Open'",
      [existing.jobId]
    ).catch(() => null);
    await this._checkAndUpdateJobPettyCashStatus(existing.jobId);
    this.clearCache(true);
    return await this.getById(id);
  }

  async issuePettyCash(assignmentId, { issuedBy, issuedAmount, paymentMethod, referenceNumber, notes }) {
    const mysqlDb = require('../../../config/mysqlDatabase');
    const id = parseInt(assignmentId, 10);
    const existing = await this.getById(id);
    if (!existing) throw new Error('Petty cash request not found');
    if (existing.status !== 'Approved') {
      throw new Error(`Cannot issue petty cash with status '${existing.status}'. Request must be 'Approved' first.`);
    }

    const finalAmount = (issuedAmount && !isNaN(parseFloat(issuedAmount)) && parseFloat(issuedAmount) > 0)
      ? parseFloat(issuedAmount)
      : parseFloat(existing.assignedAmount);

    const canonicalGroupId = `${existing.jobId}_${existing.assignedTo}`;
    const updateSql = `
      UPDATE pettycashassignments 
      SET 
        status = 'Assigned',
        issuedBy = ?,
        issuedDate = NOW(),
        assignedAmount = ?,
        paymentMethod = ?,
        referenceNumber = ?,
        notes = COALESCE(?, notes),
        groupId = ?
      WHERE assignmentId = ?
    `;
    await mysqlDb.query(updateSql, [
      issuedBy,
      finalAmount,
      paymentMethod || 'Cash',
      referenceNumber || null,
      notes || null,
      canonicalGroupId,
      id
    ]);

    await mysqlDb.query("UPDATE jobs SET status = 'In Progress' WHERE jobId = ? AND status = 'Open'", [existing.jobId]).catch(() => null);
    await this._checkAndUpdateJobPettyCashStatus(existing.jobId);
    this.clearCache(true);
    return await this.getById(id);
  }

  mapToEntity(row) {
    const assignedToUser = row.users_pettycashassignments_assignedToTousers;
    const assignedByUser = row.users_pettycashassignments_assignedByTousers;

    let settlementItems = row.settlementItems || [];
    if (row.pettycashsettlementitems && settlementItems.length === 0) {
      settlementItems = row.pettycashsettlementitems.map(i => ({
        ...i,
        actualCost: Number(i.actualCost) || 0,
        isCustomItem: Boolean(i.isCustomItem),
        hasBill: Boolean(i.hasBill)
      }));
    }

    const rawStatus = row.status || 'Requested';
    const status = (rawStatus.toUpperCase() === 'ASSIGNED') ? 'Assigned' : rawStatus;

    return new PettyCashAssignment({
      assignmentId: row.assignmentId,
      jobId: row.jobId,
      assignedTo: row.assignedTo,
      assignedBy: row.assignedBy,
      assignedAmount: Number(row.assignedAmount) || 0,
      assignedDate: row.assignedDate,
      status,
      settlementDate: row.settlementDate,
      actualSpent: Number(row.actualSpent) || 0,
      balanceAmount: Number(row.balanceAmount) || 0,
      overAmount: Number(row.overAmount) || 0,
      notes: row.notes,
      groupId: row.groupId,
      parentAssignmentId: row.parentAssignmentId,
      isMainAssignment: Boolean(row.isMainAssignment),
      assignedToName: assignedToUser ? assignedToUser.fullName : (row.assignedToName || null),
      assignedByName: assignedByUser ? assignedByUser.fullName : (row.assignedByName || null),
      approvedBy: row.approvedBy || null,
      approvedDate: row.approvedDate || null,
      rejectedBy: row.rejectedBy || null,
      rejectedDate: row.rejectedDate || null,
      rejectionReason: row.rejectionReason || null,
      issuedBy: row.issuedBy || null,
      issuedDate: row.issuedDate || null,
      paymentMethod: row.paymentMethod || null,
      referenceNumber: row.referenceNumber || null,
      approvedByName: row.approvedByName || null,
      approvedByRole: row.approvedByRole || null,
      rejectedByName: row.rejectedByName || null,
      rejectedByRole: row.rejectedByRole || null,
      issuedByName: row.issuedByName || null,
      issuedByRole: row.issuedByRole || null,
      assignedByRole: row.assignedByRole || null,
      assignedManagerId: row.assignedManagerId || null,
      assignedManagerName: row.assignedManagerName || null,
      effectiveManagerId: row.effectiveManagerId || row.assignedManagerId || null,
      settlementItems
    });
  }
}

module.exports = MySQLPettyCashAssignmentRepository;
