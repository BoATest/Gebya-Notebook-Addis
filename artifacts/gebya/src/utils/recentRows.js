// recentRows.js — guarantees the app's in-memory dataset holds the MOST
// RECENTLY RECORDED rows, not the oldest ones.
//
// BUG THIS REPLACES: the loader previously called db.<table>.limit(500).
// Without ordering, Dexie returns the FIRST 500 rows by primary key — i.e.
// the OLDEST 500 records ever inserted. Once a shop crossed 500 lifetime
// records, every newly added transaction/customer/catalog/staff row was
// silently dropped before it could reach any view (report Today/Week/Month,
// credit ledger, search), while appearing only during the live session
// (the save path prepends to state) and vanishing after reload.
//
// FIX: toCollection().reverse() walks the auto-increment primary key from
// newest insertion backwards, so the cap keeps the freshest N inserts.
// Backdated business dates are irrelevant here — what matters for freshness
// is WHEN THE ROW WAS WRITTEN, which matches the owner's mental model of
// "my latest records" (they backdate via forms, not by re-writing old rows).

export const RECENCY_LIMIT = 500;

const EMPTY_COLLECTION = { toArray: async () => [] };

/**
 * Cap any Dexie table to its most recently inserted rows.
 *
 * Usage:
 *   import { recent } from '../utils/recentRows';
 *   await recent(db.transactions).toArray()
 *
 * Defensive: if the table (or Dexie collection API) is unavailable at
 * runtime — e.g. an older DB version lacking the store — degrades to an
 * empty result instead of throwing inside Promise.all().
 */
export function recent(table) {
  try {
    if (table && typeof table.toCollection === 'function') {
      return table.toCollection().reverse().limit(RECENCY_LIMIT);
    }
  } catch {
    /* fall through to empty */
  }
  return EMPTY_COLLECTION;
}
