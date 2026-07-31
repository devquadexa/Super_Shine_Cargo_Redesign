/**
 * Minimal, dependency-light SQL migration runner for SQL Server (mssql).
 *
 * Two kinds of migration:
 *   - versioned  : applied exactly once, in the given order, tracked by name.
 *   - repeatable : re-applied whenever the file content (checksum) changes
 *                  (used for stored procedures, which are idempotent DROP/CREATE).
 *
 * State is tracked in a `SchemaMigrations` table created in each target DB.
 * The pure planning logic (`planMigrations`) is separated from IO so it can be
 * unit-tested without a database.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIGRATIONS_TABLE = 'SchemaMigrations';

function checksum(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Split a script into executable batches on `GO` separators and drop standalone
 * `USE [db]` statements — the runner has already connected to the correct
 * database, and a stray USE would be meaningless (and dangerous in a
 * multi-tenant, database-per-tenant setup).
 */
function splitBatches(sql) {
  return sql
    .split(/^\s*GO\s*$/gim)
    // Remove standalone `USE [db]` lines within each batch.
    .map(b => b.replace(/^\s*USE\s+\[?[^\];\r\n]+\]?\s*;?\s*$/gim, ''))
    .map(b => b.trim())
    .filter(Boolean);
}

/**
 * Pure planning: decide which migrations to apply.
 * @param {Array<{name,kind,checksum}>} discovered  ordered list
 * @param {Map<string,string>} appliedVersioned     name -> checksum
 * @param {Map<string,string>} appliedRepeatable    name -> checksum
 * @returns {{toApply: Array, skipped: Array}}
 */
function planMigrations(discovered, appliedVersioned, appliedRepeatable) {
  const toApply = [];
  const skipped = [];
  for (const m of discovered) {
    if (m.kind === 'versioned') {
      if (appliedVersioned.has(m.name)) {
        skipped.push({ ...m, reason: 'already-applied' });
      } else {
        toApply.push(m);
      }
    } else { // repeatable
      const prev = appliedRepeatable.get(m.name);
      if (prev === m.checksum) {
        skipped.push({ ...m, reason: 'unchanged' });
      } else {
        toApply.push(m);
      }
    }
  }
  return { toApply, skipped };
}

function describe(files, kind) {
  return files.map(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    return {
      name: path.basename(filePath),
      kind,
      path: filePath,
      checksum: checksum(content),
      content,
    };
  });
}

async function ensureMigrationsTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('${MIGRATIONS_TABLE}', 'U') IS NULL
    CREATE TABLE ${MIGRATIONS_TABLE} (
      Name       VARCHAR(255) NOT NULL PRIMARY KEY,
      Kind       VARCHAR(20)  NOT NULL,
      Checksum   VARCHAR(64)  NOT NULL,
      AppliedAt  DATETIME     NOT NULL DEFAULT GETDATE()
    );
  `);
}

async function loadApplied(pool) {
  const result = await pool.request().query(`SELECT Name, Kind, Checksum FROM ${MIGRATIONS_TABLE}`);
  const versioned = new Map();
  const repeatable = new Map();
  for (const row of result.recordset) {
    (row.Kind === 'repeatable' ? repeatable : versioned).set(row.Name, row.Checksum);
  }
  return { versioned, repeatable };
}

async function recordApplied(pool, m) {
  const sql = require('mssql');
  await pool.request()
    .input('Name', sql.VarChar(255), m.name)
    .input('Kind', sql.VarChar(20), m.kind)
    .input('Checksum', sql.VarChar(64), m.checksum)
    .query(`
      MERGE ${MIGRATIONS_TABLE} AS t
      USING (SELECT @Name AS Name) AS s ON t.Name = s.Name
      WHEN MATCHED THEN UPDATE SET Kind = @Kind, Checksum = @Checksum, AppliedAt = GETDATE()
      WHEN NOT MATCHED THEN INSERT (Name, Kind, Checksum) VALUES (@Name, @Kind, @Checksum);
    `);
}

async function applyMigration(pool, m) {
  const batches = splitBatches(m.content);
  for (const batch of batches) {
    await pool.request().batch(batch);
  }
  await recordApplied(pool, m);
}

/**
 * Run migrations against a single already-connected pool.
 * @param {ConnectionPool} pool
 * @param {{versioned?: string[], repeatable?: string[], label?: string}} sources
 */
async function run(pool, { versioned = [], repeatable = [], label = 'database' }) {
  await ensureMigrationsTable(pool);
  const applied = await loadApplied(pool);

  const discovered = [
    ...describe(versioned, 'versioned'),
    ...describe(repeatable, 'repeatable'),
  ];
  const { toApply, skipped } = planMigrations(discovered, applied.versioned, applied.repeatable);

  console.log(`\n[${label}] ${toApply.length} to apply, ${skipped.length} up-to-date`);
  for (const m of toApply) {
    process.stdout.write(`  applying ${m.kind} ${m.name} ... `);
    await applyMigration(pool, m);
    console.log('done');
  }
  return { applied: toApply.map(m => m.name), skipped: skipped.map(m => m.name) };
}

module.exports = {
  MIGRATIONS_TABLE,
  checksum,
  splitBatches,
  planMigrations,
  describe,
  ensureMigrationsTable,
  loadApplied,
  applyMigration,
  run,
};
