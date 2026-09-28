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
    const ja = await this.prisma.jobassignments.findUnique({
      where: { assignmentId: id },
      include: { users: true }
    });
    if (!ja) return null;

    let assignedByName = null;
    if (ja.assignedBy) {
      const ab = await this.prisma.users.findUnique({ where: { userId: ja.assignedBy } });
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

  async findByJobId(jobId, activeOnly = true) {
    const where = { jobId };
    if (activeOnly) {
      where.isActive = true;
    }

    const rows = await this.prisma.jobassignments.findMany({
      where,
      include: { users: true },
      orderBy: { assignedDate: 'desc' }
    });

    return await Promise.all(rows.map(async ja => {
      let assignedByName = null;
      if (ja.assignedBy) {
        const ab = await this.prisma.users.findUnique({ where: { userId: ja.assignedBy } });
        assignedByName = ab?.fullName || null;
      }
      return this.mapToEntity({
        ...ja,
        userName: ja.users?.fullName,
        userEmail: ja.users?.email,
        userRole: ja.users?.role,
        assignedByName
      });
    }));
  }

  async findByUserId(userId, activeOnly = true) {
    const where = { userId };
    if (activeOnly) {
      where.isActive = true;
    }

    const rows = await this.prisma.jobassignments.findMany({
      where,
      include: { users: true },
      orderBy: { assignedDate: 'desc' }
    });

    return await Promise.all(rows.map(async ja => {
      let assignedByName = null;
      if (ja.assignedBy) {
        const ab = await this.prisma.users.findUnique({ where: { userId: ja.assignedBy } });
        assignedByName = ab?.fullName || null;
      }
      return this.mapToEntity({
        ...ja,
        userName: ja.users?.fullName,
        userEmail: ja.users?.email,
        userRole: ja.users?.role,
        assignedByName
      });
    }));
  }

  async assignUsersToJob(jobId, userIds, assignedBy, notes = null) {
    await this.prisma.jobassignments.updateMany({
      where: { jobId },
      data: { isActive: false }
    });

    for (const userId of userIds) {
      const existing = await this.prisma.jobassignments.findFirst({
        where: { jobId, userId },
        orderBy: { assignedDate: 'desc' }
      });

      if (existing) {
        await this.prisma.jobassignments.update({
          where: { assignmentId: existing.assignmentId },
          data: {
            isActive: true,
            assignedDate: new Date(),
            assignedBy,
            notes
          }
        });
      } else {
        await this.prisma.jobassignments.create({
          data: {
            jobId,
            userId,
            assignedBy,
            notes,
            isActive: true,
            assignedDate: new Date()
          }
        });
      }
    }

    await this.prisma.jobs.update({
      where: { jobId },
      data: { assignedTo: userIds[0] || null }
    });

    return userIds.length;
  }

  async removeUserFromJob(jobId, userId) {
    const res = await this.prisma.jobassignments.updateMany({
      where: { jobId, userId, isActive: true },
      data: { isActive: false }
    });
    return res.count > 0;
  }

  async removeAllAssignmentsForJob(jobId) {
    await this.prisma.jobassignments.deleteMany({
      where: { jobId }
    });
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

    const assignedUserIds = Array.from(userMap.keys()).join(', ');
    const assignedUserNames = Array.from(userMap.values()).join(', ');

    return {
      jobId,
      assignedUserCount: userMap.size,
      assignedUserNames,
      assignedUserIds,
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
      include: {
        jobs: {
          include: { customers: true }
        }
      },
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

    if (filters.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters.customerId) {
      results = results.filter(r => r.customerId === filters.customerId);
    }

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
