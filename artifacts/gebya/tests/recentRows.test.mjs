import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { RECENCY_LIMIT, recent } from '../src/utils/recentRows.js';

function makeDb() {
  const db = new Dexie('recency-test-' + Math.random().toString(36).slice(2));
  db.version(1).stores({ transactions: '++id' });
  return db;
}

test('recent() keeps the newest inserts and drops only the oldest rows', async () => {
  const db = makeDb();
  try {
    await db.open();
    const TOTAL = RECENCY_LIMIT + 20;
    const seed = [];
    for (let i = 1; i <= TOTAL; i++) {
      // Insert sequentially → auto-increment ids grow with recency,
      // exactly like real writes into gebya's tables.
      seed.push({ amount: i, created_at: Date.now() + i });
    }
    await db.transactions.bulkAdd(seed);

    const rows = await recent(db.transactions).toArray();

    assert.equal(rows.length, RECENCY_LIMIT);
    const ids = rows.map(r => r.id);
    // The freshest record must survive the cap (this is THE regression:
    // the old limit(500)-first-page behavior dropped this row).
    assert.ok(ids.includes(TOTAL), 'freshest record must be present');
    // Only the oldest rows may be excluded.
    assert.equal(Math.min(...ids), TOTAL - RECENCY_LIMIT + 1);
    // And ordering comes back newest-first.
    for (let i = 1; i < ids.length; i++) assert.ok(ids[i - 1] > ids[i], 'rows must be newest-first');
  } finally {
    await db.delete();
  }
});

test('recent() degrades safely when table or collection API is unavailable', async () => {
  assert.deepEqual(await recent(undefined).toArray(), []);
  assert.deepEqual(await recent({}).toArray(), []);
});
