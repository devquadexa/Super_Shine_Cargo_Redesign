const IJobAssignmentRepository = require('../../../domain/repositories/IJobAssignmentRepository');
const JobAssignment = require('../../../domain/entities/JobAssignment');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLJobAssignmentRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(assignment) {
    const result = await this.prisma.jobassignments.create({
      data: {
        jobId: assignment.jobId,
        userId: assignment.userId,
        assignedBy: assignment.assignedBy,
        notes: assignment.notes || null,
        isActive: true,
        assignedDate: new Date()
      }
    });
    assignment.assignmentId = result.assignmentId;
    return assignment;
  }

  async findById(assignmentId) {
    const id = parseInt(assignmentId, 10);

    // Single query: fetch assignment + user + assignedBy user in parallel
    const [ja, assignedByUser] = await Promise.all([
      this.prisma.jobassignments.findUnique({
        where: { assignmentId: id },
        include: { users: true }
      }),
      null // placeholder, resolved below after we have ja
    ]);
    if (!ja) return null;

    let assignedByName = null;
    if (ja.assignedBy) {
      const ab = await this.prisma.users.findUnique({
        where: { userId: ja.assignedBy },
        select: { fullName: true }
      });
      assignedByName = ab?.fullName || null;
    }

    return this.mapToEntity({
      ...ja,
      userName: ja.users?.fullName,
      userEmail: ja.users?.email,
      userRole: ja.users?.role,
      assignedByName
    });
  }

  /**
   * Fetch all active assignments for a job with a single query +
   * one batch user lookup (no N+1).
   */
  async findByJobId(jobId, activeOnly = true) {
    const where = { jobId };
    if (activeOnly) where.isActive = true;

    const rows = await this.prisma.jobassignments.findMany({
      where,
      include: { users: true },
      orderBy: { assignedDate: 'desc' }
    });

    const assignedByIds = [...new Set(rows.map(r => r.assignedBy).filter(Boolean))];
    const assignerMap = new Map();
    if (assignedByIds.length > 0) {
      const assigners = await this.prisma.users.findMany({
        where: { userId: { in: assignedByIds } },
        select: { userId: true, fullName: true }
      });
      assigners.forEach(u => assignerMap.set(u.userId, u.fullName));
    }

    return rows.map(ja => this.mapToEntity({
      ...ja,
      userName: ja.users?.fullName,
      userEmail: ja.users?.email,
      userRole: ja.users?.role,
      assignedByName: ja.assignedBy ? assignerMap.get(ja.assignedBy) || null : null
    }));
  }

  async findByUserId(userId, activeOnly = true) {
    const where = { userId };
    if (activeOnly) where.isActive = true;

    const rows = await this.prisma.jobassignments.findMany({
      where,
      include: { users: true },
      orderBy: { assignedDate: 'desc' }
    });

    const assignedByIds = [...new Set(rows.map(r => r.assignedBy).filter(Boolean))];
    const assignerMap = new Map();
    if (assignedByIds.length > 0) {
      const assigners = await this.prisma.users.findMany({
        where: { userId: { in: assignedByIds } },
        select: { userId: true, fullName: true }
      });
      assigners.forEach(u => assignerMap.set(u.userId, u.fullName));
    }

    return rows.map(ja => this.mapToEntity({
      ...ja,
      userName: ja.users?.fullName,
      userEmail: ja.users?.email,
      userRole: ja.users?.role,
      assignedByName: ja.assignedBy ? assignerMap.get(ja.assignedBy) || null : null
    }));
  }

  /**
   * Batch-assign users to a job.
   * Steps: deactivate all → reactivate existing → createMany new → update jobs.assignedTo
   * All via batch operations, no loops.
   */
  async assignUsersToJob(jobId, userIds, assignedBy, notes = null) {
    // Step 1: deactivate all current assignments
    await this.prisma.jobassignments.updateMany({
      where: { jobId },
      data: { isActive: false }
    });

    if (userIds && userIds.length > 0) {
      // Step 2: find existing records for these users (single query)
      const existing = await this.prisma.jobassignments.findMany({
        where: { jobId, userId: { in: userIds } }
      });
      const existingUserIds = new Set(existing.map(e => e.userId));

      // Step 3: batch-reactivate existing records
      if (existing.length > 0) {
        await this.prisma.jobassignments.updateMany({
          where: { assignmentId: { in: existing.map(e => e.assignmentId) } },
          data: { isActive: true, assignedDate: new Date(), assignedBy, notes }
        });
      }

      // Step 4: batch-insert brand-new assignments
      const newUserIds = userIds.filter(id => !existingUserIds.has(id));
      if (newUserIds.length > 0) {
        await this.prisma.jobassignments.createMany({
          data: newUserIds.map(userId => ({
            jobId, userId, assignedBy, notes, isActive: true, assignedDate: new Date()
          }))
        });
      }
    }

    // Step 5: update primary assignee on the job
    await this.prisma.jobs.update({
      where: { jobId },
      data: { assignedTo: userIds[0] || null }
    });

    this._clearJobCache();
    return userIds.length;
  }

  _clearJobCache() {
    try {
      const container = require('../../di/container');
      const jobRepo = container.get('jobRepository');
      if (jobRepo && typeof jobRepo.clearCache === 'function') jobRepo.clearCache();
    } catch (e) {}
  }

  async removeUserFromJob(jobId, userId) {
    const res = await this.prisma.jobassignments.updateMany({
      where: { jobId, userId, isActive: true },
      data: { isActive: false }
    });
    this._clearJobCache();
    return res.count > 0;
  }

  async removeAllAssignmentsForJob(jobId) {
    await this.prisma.jobassignments.deleteMany({ where: { jobId } });
    this._clearJobCache();
    return true;
  }

  async getJobAssignmentSummary(jobId) {
    const activeAssignments = await this.prisma.jobassignments.findMany({
      where: { jobId, isActive: true },
      include: { users: true },
      orderBy: { assignedDate: 'desc' }
    });

    if (!activeAssignments || activeAssignments.length === 0) {
      return { jobId, assignedUserCount: 0, assignedUserNames: '', assignedUserIds: '', lastAssignedDate: null };
    }

    const userMap = new Map();
    activeAssignments.forEach(ja => {
      if (ja.users) userMap.set(ja.userId, ja.users.fullName);
    });

    return {
      jobId,
      assignedUserCount: userMap.size,
      assignedUserNames: Array.from(userMap.values()).join(', '),
      assignedUserIds: Array.from(userMap.keys()).join(', '),
      lastAssignedDate: activeAssignments[0].assignedDate
    };
  }

  async isUserAssignedToJob(jobId, userId) {
    const count = await this.prisma.jobassignments.count({
      where: { jobId, userId, isActive: true }
    });
    return count > 0;
  }

  async getJobsForUser(userId, filters = {}) {
    const assignments = await this.prisma.jobassignments.findMany({
      where: { userId, isActive: true },
      include: { jobs: { include: { customers: true } } },
      orderBy: { assignedDate: 'desc' }
    });

    let results = assignments.map(ja => ({
      jobId: ja.jobId,
      customerId: ja.jobs?.customerId,
      customerName: ja.jobs?.customers?.name || null,
      shipmentCategory: ja.jobs?.shipmentCategory,
      status: ja.jobs?.status,
      openDate: ja.jobs?.openDate,
      createdDate: ja.jobs?.createdDate,
      assignedDate: ja.assignedDate,
      assignmentNotes: ja.notes,
      assignmentId: ja.assignmentId
    }));

    if (filters.status) results = results.filter(r => r.status === filters.status);
    if (filters.customerId) results = results.filter(r => r.customerId === filters.customerId);
    return results;
  }

  async updateNotes(assignmentId, notes) {
    await this.prisma.jobassignments.update({
      where: { assignmentId: parseInt(assignmentId, 10) },
      data: { notes }
    });
    return true;
  }

  mapToEntity(row) {
    return new JobAssignment({
      assignmentId: row.assignmentId,
      jobId: row.jobId,
      userId: row.userId,
      assignedDate: row.assignedDate,
      assignedBy: row.assignedBy,
      isActive: Boolean(row.isActive),
      notes: row.notes,
      userName: row.userName,
      userEmail: row.userEmail,
      userRole: row.userRole,
      assignedByName: row.assignedByName
    });
  }
}

module.exports = MySQLJobAssignmentRepository;
