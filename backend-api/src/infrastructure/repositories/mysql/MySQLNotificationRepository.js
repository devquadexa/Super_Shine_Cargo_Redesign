const Notification = require('../../../domain/entities/Notification');
const BaseMySQLRepository = require('./BaseMySQLRepository');

class MySQLNotificationRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  async generateNextId() {
    return this.generateNextFormattedId('notifications', 'notificationId', 'NOTIF', 4);
  }

  async create(notification) {
    const data = {
      notificationId: notification.notificationId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedId: notification.relatedId || null,
      relatedType: notification.relatedType || null,
      isRead: Boolean(notification.isRead),
      readDate: notification.readDate || null,
      metadata: typeof notification.metadata === 'object' ? JSON.stringify(notification.metadata) : (notification.metadata || null),
      createdBy: notification.createdBy || null,
      createdDate: new Date()
    };

    await this.prisma.notifications.create({ data });
    return notification;
  }

  async findById(notificationId) {
    const row = await this.prisma.notifications.findUnique({
      where: { notificationId }
    });
    if (!row) return null;
    return this.mapToEntity(row);
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    const rows = await this.prisma.notifications.findMany({
      where: { userId },
      orderBy: { createdDate: 'desc' },
      take: parseInt(limit, 10) || 50,
      skip: parseInt(offset, 10) || 0
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findUnreadByUserId(userId, limit = 50, offset = 0) {
    const rows = await this.prisma.notifications.findMany({
      where: { userId, isRead: false },
      orderBy: { createdDate: 'desc' },
      take: parseInt(limit, 10) || 50,
      skip: parseInt(offset, 10) || 0
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async getUnreadCount(userId) {
    return this.prisma.notifications.count({
      where: { userId, isRead: false }
    });
  }

  async findByRelatedId(relatedId) {
    const rows = await this.prisma.notifications.findMany({
      where: { relatedId },
      orderBy: { createdDate: 'desc' }
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async findByType(type, limit = 50, offset = 0) {
    const rows = await this.prisma.notifications.findMany({
      where: { type },
      orderBy: { createdDate: 'desc' },
      take: parseInt(limit, 10) || 50,
      skip: parseInt(offset, 10) || 0
    });
    return rows.map(r => this.mapToEntity(r));
  }

  async markAsRead(notificationId) {
    const updated = await this.prisma.notifications.update({
      where: { notificationId },
      data: { isRead: true, readDate: new Date() }
    });
    return this.mapToEntity(updated);
  }

  async markAsUnread(notificationId) {
    const updated = await this.prisma.notifications.update({
      where: { notificationId },
      data: { isRead: false, readDate: null }
    });
    return this.mapToEntity(updated);
  }

  async markAllAsRead(userId) {
    await this.prisma.notifications.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readDate: new Date() }
    });
    return { success: true };
  }

  async delete(notificationId) {
    await this.prisma.notifications.delete({
      where: { notificationId }
    }).catch(() => null);
    return { success: true };
  }

  async deleteByUserId(userId) {
    await this.prisma.notifications.deleteMany({
      where: { userId }
    });
    return { success: true };
  }

  async deleteOldNotifications(daysOld = 30) {
    const cutoff = new Date(Date.now() - parseInt(daysOld, 10) * 24 * 60 * 60 * 1000);
    const result = await this.prisma.notifications.deleteMany({
      where: { createdDate: { lt: cutoff } }
    });
    return { deletedCount: result.count };
  }

  mapToEntity(row) {
    let metadata = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch (e) {}
    }

    return new Notification({
      notificationId: row.notificationId,
      userId: row.userId,
      type: row.type,
      title: row.title,
      message: row.message,
      relatedId: row.relatedId,
      relatedType: row.relatedType,
      isRead: Boolean(row.isRead),
      readDate: row.readDate,
      metadata,
      createdDate: row.createdDate,
      createdBy: row.createdBy
    });
  }
}

module.exports = MySQLNotificationRepository;
