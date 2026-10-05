const IUserRepository = require('../../../domain/repositories/IUserRepository');
const User = require('../../../domain/entities/User');
const BaseMySQLRepository = require('./BaseMySQLRepository');
const bcrypt = require('bcryptjs');

class MySQLUserRepository extends BaseMySQLRepository {
  constructor(dbConnection) {
    super(dbConnection);
  }

  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
  }

  async create(user) {
    await this.prisma.users.create({
      data: {
        userId: user.userId,
        username: user.username,
        password: user.password,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        createdDate: user.createdDate ? new Date(user.createdDate) : new Date(),
        isActive: user.isActive !== undefined ? Boolean(user.isActive) : true
      }
    });
    this.clearCache();
    return user;
  }

  async findById(userId) {
    const row = await this.prisma.users.findFirst({ where: { userId, isActive: true } });
    return row ? this.mapToEntity(row) : null;
  }

  async findByUsername(username) {
    const row = await this.prisma.users.findFirst({ where: { username, isActive: true } });
    return row ? this.mapToEntity(row) : null;
  }

  async findAll() {
    const now = Date.now();
    if (this._cache && (now - this._cacheTime < 60000)) return this._cache;

    const rows = await this.prisma.users.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' }
    });
    const result = rows.map(row => this.mapToEntity(row));
    this._cache = result;
    this._cacheTime = now;
    return result;
  }

  async update(userId, user) {
    await this.prisma.users.update({
      where: { userId },
      data: {
        fullName: user.fullName,
        role: user.role,
        email: user.email
      }
    });
    this.clearCache();
    return user;
  }

  async delete(userId) {
    await this.prisma.users.update({
      where: { userId },
      data: { isActive: false }
    });
    this.clearCache();
    return true;
  }

  async authenticate(username, password) {
    const row = await this.prisma.users.findFirst({ where: { username, isActive: true } });
    if (!row) return null;

    const user = this.mapToEntity(row);
    const isHashed = user.password && user.password.startsWith('$2');
    let isValid = false;

    if (isHashed) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = (password === user.password);
      if (isValid) {
        // Silently migrate plain-text password to bcrypt
        bcrypt.hash(password, 10)
          .then(hashed => this.updatePassword(user.userId, hashed, false, false))
          .catch(() => {});
      }
    }

    return isValid ? user : null;
  }

  async generateNextId() {
    return this.generateNextFormattedId('users', 'userId', 'USER', 4);
  }

  async updatePassword(userId, hashedPassword, isTemporaryPassword = false, passwordResetRequired = false) {
    await this.prisma.users.update({
      where: { userId },
      data: {
        password: hashedPassword,
        isTemporaryPassword: isTemporaryPassword ? '1' : '0',
        passwordResetRequired: passwordResetRequired ? '1' : '0',
        lastPasswordChange: new Date()
      }
    });
  }

  mapToEntity(row) {
    return new User({
      userId: row.userId,
      username: row.username,
      password: row.password,
      fullName: row.fullName,
      role: row.role,
      email: row.email,
      createdDate: row.createdDate,
      isActive: Boolean(row.isActive),
      isTemporaryPassword: row.isTemporaryPassword === '1' || row.isTemporaryPassword === true || row.isTemporaryPassword === 'true',
      passwordResetRequired: row.passwordResetRequired === '1' || row.passwordResetRequired === true || row.passwordResetRequired === 'true',
      lastPasswordChange: row.lastPasswordChange
    });
  }
}

module.exports = MySQLUserRepository;
