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
   * Generates sequentially formatted IDs (e.g. CUST0001, JOB0001) using a
   * single MAX() SQL query — avoids fetching full table rows.
   */
  async generateNextFormattedId(tableNameOrModel, idColumn, prefix, padLength = 4) {
    try {
      const mysqlDb = require('../../../config/mysqlDatabase');
      const table = tableNameOrModel.toLowerCase();
      const prefixLen = prefix.length + 1;
      const sql = `SELECT MAX(CAST(SUBSTRING(${idColumn}, ${prefixLen}) AS UNSIGNED)) AS maxNum FROM \`${table}\` WHERE ${idColumn} LIKE ?`;
      const rows = await mysqlDb.query(sql, [`${prefix}%`]);
      const maxNum = (rows && rows[0] && rows[0].maxNum) ? Number(rows[0].maxNum) : 0;
      return `${prefix}${String(maxNum + 1).padStart(padLength, '0')}`;
    } catch (e) {
      // Prisma fallback (e.g. if raw DB connection is unavailable)
      const model = tableNameOrModel.toLowerCase();
      const rows = await this.prisma[model].findMany({
        where: { [idColumn]: { startsWith: prefix } },
        select: { [idColumn]: true }
      });

      let maxNum = 0;
      const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
      for (const row of rows) {
        if (!row || !row[idColumn]) continue;
        const match = String(row[idColumn]).match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
      return `${prefix}${String(maxNum + 1).padStart(padLength, '0')}`;
    }
  }

  /**
   * Clears the in-memory cache. Subclasses may override for cascade clearing.
   */
  clearCache() {
    this._cache = null;
    this._cacheTime = 0;
  }
}

module.exports = BaseMySQLRepository;
