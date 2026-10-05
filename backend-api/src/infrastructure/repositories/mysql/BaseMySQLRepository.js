const prisma = require('../../../config/prisma');

/**
 * Base MySQL / Prisma Repository
 * Provides shared Prisma client and helper methods for all repositories.
 */
class BaseMySQLRepository {
  constructor(dbConnection) {
    this.db = dbConnection;
    this.prisma = prisma;
  }

  /**
   * Helper to generate sequentially formatted IDs using Prisma (e.g. CUST0001, JOB0001, USER0001)
   */
  async generateNextFormattedId(tableNameOrModel, idColumn, prefix, padLength = 4) {
    const model = tableNameOrModel.toLowerCase();
    const rows = await this.prisma[model].findMany({
      where: {
        [idColumn]: {
          startsWith: prefix
        }
      },
      select: { [idColumn]: true }
    });

    let maxNum = 0;
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    for (const row of rows) {
      if (!row || !row[idColumn]) continue;
      const match = String(row[idColumn]).match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(padLength, '0')}`;
  }
}

module.exports = BaseMySQLRepository;
