const IPasswordResetRepository = require('../../../domain/repositories/IPasswordResetRepository');
const PasswordResetRequest = require('../../../domain/entities/PasswordResetRequest');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLPasswordResetRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async create(passwordResetRequest) {
    const data = {
      requestId: passwordResetRequest.requestId,
      userId: passwordResetRequest.userId,
      requestedBy: passwordResetRequest.requestedBy,
      requestDate: passwordResetRequest.requestDate || new Date(),
      status: passwordResetRequest.status || 'Pending',
      notes: passwordResetRequest.notes || null
    };

    await this.prisma.passwordresetrequests.create({ data });
    return passwordResetRequest;
  }

  async _attachResolvedNames(records) {
    if (!records || records.length === 0) return records;
    const resolvedByIds = [...new Set(records.map(r => r.resolvedBy).filter(Boolean))];
    let resolvedMap = {};
    if (resolvedByIds.length > 0) {
      const users = await this.prisma.users.findMany({
        where: { userId: { in: resolvedByIds } },
        select: { userId: true, fullName: true }
      });
      resolvedMap = users.reduce((acc, u) => {
        acc[u.userId] = u.fullName;
        return acc;
      }, {});
    }

    return records.map(r => this.mapToEntity(r, resolvedMap[r.resolvedBy] || null));
  }

  async findById(requestId) {
    const row = await this.prisma.passwordresetrequests.findUnique({
      where: { requestId },
      include: {
        users_passwordresetrequests_userIdTousers: true,
        users_passwordresetrequests_requestedByTousers: true
      }
    });
    if (!row) return null;

    let resolvedByName = null;
    if (row.resolvedBy) {
      const resolvedUser = await this.prisma.users.findUnique({
        where: { userId: row.resolvedBy },
        select: { fullName: true }
      });
      resolvedByName = resolvedUser?.fullName || null;
    }

    return this.mapToEntity(row, resolvedByName);
  }

  async findByUserId(userId) {
    const rows = await this.prisma.passwordresetrequests.findMany({
      where: { userId },
      include: {
        users_passwordresetrequests_userIdTousers: true,
        users_passwordresetrequests_requestedByTousers: true
      },
      orderBy: { requestDate: 'desc' }
    });
    return this._attachResolvedNames(rows);
  }

  async findPendingRequests() {
    const rows = await this.prisma.passwordresetrequests.findMany({
      where: { status: 'Pending' },
      include: {
        users_passwordresetrequests_userIdTousers: true,
        users_passwordresetrequests_requestedByTousers: true
      },
      orderBy: { requestDate: 'asc' }
    });
    return this._attachResolvedNames(rows);
  }

  async findAll() {
    const rows = await this.prisma.passwordresetrequests.findMany({
      include: {
        users_passwordresetrequests_userIdTousers: true,
        users_passwordresetrequests_requestedByTousers: true
      },
      orderBy: { requestDate: 'desc' }
    });
    return this._attachResolvedNames(rows);
  }

  async updateStatus(requestId, status, resolvedBy, notes = null) {
    await this.prisma.passwordresetrequests.update({
      where: { requestId },
      data: {
        status,
        resolvedBy,
        resolvedDate: new Date(),
        notes: notes || null
      }
    });
  }

  async delete(requestId) {
    await this.prisma.passwordresetrequests.delete({
      where: { requestId }
    }).catch(() => null);
  }

  mapToEntity(row, resolvedByName = null) {
    const targetUser = row.users_passwordresetrequests_userIdTousers;
    const requestedByUser = row.users_passwordresetrequests_requestedByTousers;

    return new PasswordResetRequest({
      requestId: row.requestId,
      userId: row.userId,
      userName: targetUser ? targetUser.username : (row.userName || null),
      userFullName: targetUser ? targetUser.fullName : (row.userFullName || null),
      requestedBy: row.requestedBy,
      requestedByName: requestedByUser ? requestedByUser.fullName : (row.requestedByName || null),
      requestDate: row.requestDate,
      status: row.status,
      resolvedBy: row.resolvedBy,
      resolvedByName: resolvedByName || row.resolvedByName || null,
      resolvedDate: row.resolvedDate,
      notes: row.notes
    });
  }
}

module.exports = MySQLPasswordResetRepository;
