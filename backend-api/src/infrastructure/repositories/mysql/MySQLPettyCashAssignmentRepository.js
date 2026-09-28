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
        status: 'ASSIGNED',
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
      data: { pettyCashStatus: 'ASSIGNED' }
    }).catch(() => null);

    return this.mapToEntity({ ...created, groupId, settlementItems: [] });
  }

  async getAll() {
    const rows = await this.prisma.pettycashassignments.findMany({
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true,
        pettycashsettlementitems: {
          orderBy: { createdDate: 'asc' }
        }
      },
      orderBy: { assignedDate: 'desc' }
    });

    return rows.map(r => this.mapToEntity(r));
  }

  async findAll() {
    return this.getAll();
  }

  async getByUser(userId) {
    const rows = await this.prisma.pettycashassignments.findMany({
      where: { assignedTo: userId },
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true,
        pettycashsettlementitems: {
          orderBy: { createdDate: 'asc' }
        }
      },
      orderBy: { assignedDate: 'desc' }
    });

    return rows.map(r => this.mapToEntity(r));
  }

  async getByJob(jobId) {
    const rows = await this.prisma.pettycashassignments.findMany({
      where: { jobId },
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true,
        pettycashsettlementitems: {
          orderBy: { createdDate: 'asc' }
        }
      },
      orderBy: { assignedDate: 'desc' }
    });

    if (!rows || rows.length === 0) return null;

    let allSettlementItems = [];
    for (const assignment of rows) {
      const items = (assignment.pettycashsettlementitems || []).map(i => ({
        ...i,
        actualCost: Number(i.actualCost) || 0,
        isCustomItem: Boolean(i.isCustomItem),
        hasBill: Boolean(i.hasBill)
      }));
      allSettlementItems = allSettlementItems.concat(items);
    }

    const first = rows[0];
    return this.mapToEntity({ ...first, settlementItems: allSettlementItems });
  }

  async getById(assignmentId) {
    const id = parseInt(assignmentId, 10);
    const row = await this.prisma.pettycashassignments.findUnique({
      where: { assignmentId: id },
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true,
        pettycashsettlementitems: {
          orderBy: { createdDate: 'asc' }
        }
      }
    });

    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findById(assignmentId) {
    return this.getById(assignmentId);
  }

  async getSettlementItems(assignmentId) {
    const rows = await this.prisma.pettycashsettlementitems.findMany({
      where: { assignmentId: parseInt(assignmentId, 10) },
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

    for (const item of settlementData.items || []) {
      if (!item.isCustomItem) {
        const existing = await this.prisma.pettycashsettlementitems.findFirst({
          where: {
            itemName: item.itemName,
            isCustomItem: false,
            pettycashassignments: {
              jobId: assignment.jobId,
              assignmentId: { not: id }
            }
          }
        });

        if (existing) {
          continue;
        }

        await this.prisma.pettycashsettlementitems.deleteMany({
          where: {
            assignmentId: id,
            itemName: item.itemName,
            isCustomItem: false
          }
        });
      } else {
        await this.prisma.pettycashsettlementitems.deleteMany({
          where: {
            assignmentId: id,
            itemName: item.itemName,
            isCustomItem: true
          }
        });
      }

      const hasBillValue = (item.hasBill === true || item.hasBill === 1 || item.hasBill === 'true');
      await this.prisma.pettycashsettlementitems.create({
        data: {
          assignmentId: id,
          itemName: item.itemName,
          actualCost: item.actualCost,
          isCustomItem: Boolean(item.isCustomItem),
          paidBy: item.paidBy || assignment.assignedTo,
          hasBill: hasBillValue,
          createdDate: new Date()
        }
      });
    }

    let actualSpent = 0;
    let assignedAmount = parseFloat(assignment.assignedAmount);

    if (assignment.isMainAssignment) {
      const subAssignments = await this.prisma.pettycashassignments.findMany({
        where: { parentAssignmentId: id },
        select: { assignmentId: true, assignedAmount: true }
      });

      if (subAssignments.length > 0) {
        const targetIds = [id, ...subAssignments.map(s => s.assignmentId)];
        const sumResult = await this.prisma.pettycashsettlementitems.aggregate({
          where: { assignmentId: { in: targetIds } },
          _sum: { actualCost: true }
        });
        actualSpent = parseFloat(sumResult._sum.actualCost || 0);

        const subTotal = subAssignments.reduce((acc, s) => acc + parseFloat(s.assignedAmount || 0), 0);
        if (subTotal > 0) assignedAmount = subTotal;
      } else {
        const sumResult = await this.prisma.pettycashsettlementitems.aggregate({
          where: { assignmentId: id },
          _sum: { actualCost: true }
        });
        actualSpent = parseFloat(sumResult._sum.actualCost || 0);
      }
    } else {
      const sumResult = await this.prisma.pettycashsettlementitems.aggregate({
        where: { assignmentId: id },
        _sum: { actualCost: true }
      });
      actualSpent = parseFloat(sumResult._sum.actualCost || 0);
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

    await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: {
        status: newStatus,
        actualSpent,
        balanceAmount,
        overAmount,
        settlementDate: new Date()
      }
    });

    const unsettledCount = await this.prisma.pettycashassignments.count({
      where: {
        jobId: assignment.jobId,
        status: {
          notIn: ['Settled', 'Settled / Balance Returned', 'Settled / Over Due Collected', 'Full Petty Cash Returned']
        }
      }
    });

    if (unsettledCount === 0) {
      await this.prisma.jobs.update({
        where: { jobId: assignment.jobId },
        data: { pettyCashStatus: 'Settled' }
      }).catch(() => null);
    }

    return await this.getById(id);
  }

  async updateStatus(assignmentId, status) {
    const id = parseInt(assignmentId, 10);
    await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: { status }
    });
    return await this.getById(id);
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

    return await this.getById(id);
  }

  async closeAllByJob(jobId) {
    await this.prisma.pettycashassignments.updateMany({
      where: { jobId },
      data: { status: 'Closed' }
    });
  }

  async updateStatusAndClearAmount(assignmentId, newStatus, settlementType) {
    const id = parseInt(assignmentId, 10);
    const data = { status: newStatus };
    if (settlementType === 'BALANCE_RETURN') {
      data.balanceAmount = 0;
    } else if (settlementType === 'OVERDUE_COLLECTION') {
      data.overAmount = 0;
    }

    await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data
    });
    return await this.getById(id);
  }

  async returnBalance(assignmentId) {
    const id = parseInt(assignmentId, 10);
    await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: { status: 'Returned' }
    });
    return await this.getById(id);
  }

  async payOverAmount(assignmentId) {
    const id = parseInt(assignmentId, 10);
    await this.prisma.pettycashassignments.update({
      where: { assignmentId: id },
      data: { status: 'Paid' }
    });
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
    const rows = await this.prisma.pettycashassignments.findMany({
      where: { jobId },
      include: {
        users_pettycashassignments_assignedToTousers: true,
        users_pettycashassignments_assignedByTousers: true,
        pettycashsettlementitems: {
          orderBy: { createdDate: 'asc' }
        }
      },
      orderBy: { assignedDate: 'desc' }
    });

    return rows.map(r => this.mapToEntity(r));
  }

  async updateSettlementItem(itemId, itemName, actualCost) {
    const id = parseInt(itemId, 10);
    const updated = await this.prisma.pettycashsettlementitems.update({
      where: { settlementItemId: id },
      data: { itemName, actualCost }
    });
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
        status: 'ASSIGNED',
        assignedDate: new Date()
      }
    });

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

    return new PettyCashAssignment({
      assignmentId: row.assignmentId,
      jobId: row.jobId,
      assignedTo: row.assignedTo,
      assignedBy: row.assignedBy,
      assignedAmount: Number(row.assignedAmount) || 0,
      assignedDate: row.assignedDate,
      status: row.status,
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
      settlementItems
    });
  }
}

module.exports = MySQLPettyCashAssignmentRepository;
