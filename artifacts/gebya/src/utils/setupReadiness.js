import { db } from '../db';

/**
 * setupReadiness.js — the ONE definition of "this shop finished setting up".
 *
 * Gate D, Ruling 1 (owner): `setup_completed_at` makes the R2 success metric
 * (setup completion / Ready-%) measurable BEFORE the redesign ships.
 *
 * The definition lives here, and ONLY here. `ReadinessHero.jsx` consumes
 * `computeSetupChecklist()` instead of computing `done` inline, because
 * R2-PLAN is explicit: "The metric's definition = the checklist's definition;
 * they must never diverge." If the checklist changes, the metric changes with
 * it in the same edit — there is no second copy to forget.
 *
 * FROZEN for R2 (Ruling A): never change a metric definition before measuring
 * it once. Any future change documents its date so metric eras stay clean.
 */

export const SETUP_COMPLETED_AT_KEY = 'setup_completed_at';

/**
 * The five checks, in checklist order. `key` is also the navigation target
 * used by ReadinessHero's CTA (`onAction(key, tab)` → `openCard(key)`), so the
 * two `profile` entries are deliberate: they must keep opening the same
 * "Shop Profile" card they always have.
 */
const CHECKS = [
  { key: 'profile', isDone: (s) => !!s.shopProfile?.name },
  { key: 'profile', isDone: (s) => !!s.shopProfile?.phone },
  {
    key: 'channels',
    isDone: (s) => (s.paymentChannels || []).some(
      (c) => c.enabled && (c.usePhoneFromShop || c.phone || c.account),
    ),
  },
  { key: 'items', isDone: (s) => (s.catalogEntries || []).filter((e) => e.active !== false).length > 0 },
  { key: 'recurring', isDone: (s) => (s.recurring || []).length > 0 },
];

/** Total number of checks — the "5" in 5/5. */
export const SETUP_CHECK_COUNT = CHECKS.length;

/**
 * Evaluate the checklist. Returns `[{ key, done }]` in checklist order.
 * Pure: no DB, no side effects, safe to call during render.
 */
export function computeSetupChecklist({ shopProfile, paymentChannels, catalogEntries, recurring } = {}) {
  const input = { shopProfile, paymentChannels, catalogEntries, recurring };
  return CHECKS.map(({ key, isDone }) => ({ key, done: isDone(input) }));
}

/** True only at exactly 5/5. */
export function isSetupComplete(input) {
  return computeSetupChecklist(input).every((c) => c.done);
}

/** Current done-count, for the "N of 5 set up" line. */
export function countSetupDone(input) {
  return computeSetupChecklist(input).filter((c) => c.done).length;
}

/**
 * Backfill-on-encounter stamp (Gate D, Ruling 1).
 *
 * Called every time the readiness checklist is computed. Existing completed
 * shops are captured the next time their owner opens Settings — immutability
 * alone would have undercounted everyone who finished before Gate D shipped.
 *
 * @returns 'incomplete'      — not 5/5; nothing written
 *          'already-stamped' — a timestamp exists; left untouched
 *          'stamped'         — this call wrote the first timestamp
 */
export async function stampSetupCompletedAtIfComplete(input, now = new Date()) {
  if (!isSetupComplete(input)) return 'incomplete';

  // Write-if-null. IMMUTABLE: first stamp wins. A restored old backup carries
  // its own `settings` rows, so without this read a restore could clobber a
  // real timestamp with an older one (restore-safety, Ruling 1).
  const existing = await db.settings.get(SETUP_COMPLETED_AT_KEY);
  if (existing?.value != null) return 'already-stamped';

  await db.settings.put({ key: SETUP_COMPLETED_AT_KEY, value: now.toISOString() });
  return 'stamped';
}