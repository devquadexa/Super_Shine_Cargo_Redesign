/**
 * Standalone tests for the migration runner's pure logic (no DB required).
 * Run: node scripts/lib/migrationRunner.test.js
 */
const assert = require('assert');
const fs = require('fs');
const runner = require('./migrationRunner');
const manifest = require('../migrationManifest');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok - ${name}`);
}

// splitBatches: splits on GO and strips standalone USE statements.
test('splitBatches splits on GO and drops USE', () => {
  const sql = `USE [SuperShineCargoDb]\nGO\nCREATE TABLE A (id int)\nGO\nUSE SomeDb;\nGO\nSELECT 1`;
  const batches = runner.splitBatches(sql);
  assert.deepStrictEqual(batches, ['CREATE TABLE A (id int)', 'SELECT 1']);
});

test('splitBatches keeps USE-prefixed multiline batch body minus the USE line', () => {
  const sql = `USE [db]\nSELECT 2`;
  assert.deepStrictEqual(runner.splitBatches(sql), ['SELECT 2']);
});

// planMigrations: versioned applied once, repeatable on checksum change.
test('planMigrations applies new versioned, skips applied', () => {
  const discovered = [
    { name: 'V001.sql', kind: 'versioned', checksum: 'a' },
    { name: 'V002.sql', kind: 'versioned', checksum: 'b' },
  ];
  const applied = new Map([['V001.sql', 'a']]);
  const { toApply, skipped } = runner.planMigrations(discovered, applied, new Map());
  assert.deepStrictEqual(toApply.map(m => m.name), ['V002.sql']);
  assert.deepStrictEqual(skipped.map(m => m.name), ['V001.sql']);
});

test('planMigrations re-applies repeatable only when checksum changes', () => {
  const discovered = [
    { name: 'R_proc1.sql', kind: 'repeatable', checksum: 'x' },
    { name: 'R_proc2.sql', kind: 'repeatable', checksum: 'y2' },
  ];
  const appliedRepeatable = new Map([['R_proc1.sql', 'x'], ['R_proc2.sql', 'y1']]);
  const { toApply, skipped } = runner.planMigrations(discovered, new Map(), appliedRepeatable);
  assert.deepStrictEqual(toApply.map(m => m.name), ['R_proc2.sql']); // changed only
  assert.deepStrictEqual(skipped.map(m => m.name), ['R_proc1.sql']); // unchanged
});

test('planMigrations preserves versioned order', () => {
  const discovered = [
    { name: 'V002.sql', kind: 'versioned', checksum: 'b' },
    { name: 'V001.sql', kind: 'versioned', checksum: 'a' },
  ];
  const { toApply } = runner.planMigrations(discovered, new Map(), new Map());
  assert.deepStrictEqual(toApply.map(m => m.name), ['V002.sql', 'V001.sql']);
});

// Manifest integrity: every referenced file must exist on disk.
test('manifest: all referenced files exist', () => {
  const all = [
    ...manifest.catalogVersioned,
    ...manifest.tenantVersioned,
    ...manifest.tenantRepeatable,
  ];
  const missing = all.filter(f => !fs.existsSync(f));
  assert.deepStrictEqual(missing, [], `missing files: ${missing.join(', ')}`);
});

test('manifest: baseline is first tenant migration and procs are discovered', () => {
  assert.ok(manifest.tenantVersioned[0].endsWith('V001__baseline_schema.sql'));
  assert.ok(manifest.tenantRepeatable.length >= 15, 'expected the usp_*.sql procedures');
});

// describe() computes stable checksums from real files.
test('describe computes checksums for real files', () => {
  const described = runner.describe(manifest.catalogVersioned, 'versioned');
  assert.strictEqual(described.length, 1);
  assert.match(described[0].checksum, /^[0-9a-f]{64}$/);
  assert.strictEqual(described[0].kind, 'versioned');
});

console.log(`\n${passed} tests passed.`);
