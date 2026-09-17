/**
 * setupReadiness — Gate D tests.
 *
 * Locks down three things:
 *   1. The checklist is EXACTLY the five ReadinessHero checks, and each one
 *      flips independently (R2-PLAN: "the metric's definition = the checklist's
 *      definition; they must never diverge").
 *   2. `setup_completed_at` semantics: write-if-null, immutable, and
 *      backfill-on-encounter.
 *   3. The Gate D quota display policy: the staff row is hidden on the free
 *      plan UNCONDITIONALLY (staffCount=2 must not render "2/3" any more than
 *      "0/3" — displaying an unenforced limit is a trust bug), while the
 *      enforced tx row stays visible.
 *
 * Mocks db.settings (Dexie) the same way tests/permissions-store.spec.ts does.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/db', () => ({
  db: {
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { db } from '../src/db';
import {
  SETUP_COMPLETED_AT_KEY,
  SETUP_CHECK_COUNT,
  computeSetupChecklist,
  isSetupComplete,
  countSetupDone,
  stampSetupCompletedAtIfComplete,
} from '../src/utils/setupReadiness';
import { shouldShowStaffQuota } from '../src/utils/entitlements';

const ALL_DONE = {
  shopProfile: { name: 'Merkato Shop', phone: '0911223344' },
  paymentChannels: [{ enabled: true, phone: '0911223344' }],
  catalogEntries: [{ name: 'Sugar', active: true }],
  recurring: [{ label: 'Rent' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  (db.settings.get as any).mockResolvedValue(undefined);
});

describe('computeSetupChecklist — exactly the 5 ReadinessHero checks', () => {
  it('has exactly five checks in checklist order', () => {
    expect(SETUP_CHECK_COUNT).toBe(5);
    expect(computeSetupChecklist(ALL_DONE).map((c) => c.key)).toEqual([
      'profile', 'profile', 'channels', 'items', 'recurring',
    ]);
  });

  it('reports 5/5 for a fully set-up shop', () => {
    expect(computeSetupChecklist(ALL_DONE).every((c) => c.done)).toBe(true);
    expect(countSetupDone(ALL_DONE)).toBe(5);
    expect(isSetupComplete(ALL_DONE)).toBe(true);
  });

  it('is 0/5 for an empty shop and never throws', () => {
    expect(countSetupDone({})).toBe(0);
    expect(isSetupComplete({})).toBe(false);
    expect(() => computeSetupChecklist()).not.toThrow();
    expect(isSetupComplete()).toBe(false);
  });

  it('requires BOTH the shop name and the shop phone', () => {
    expect(countSetupDone({ ...ALL_DONE, shopProfile: { name: 'X' } })).toBe(4);
    expect(countSetupDone({ ...ALL_DONE, shopProfile: { phone: '0911' } })).toBe(4);
    expect(countSetupDone({ ...ALL_DONE, shopProfile: {} })).toBe(3);
  });

  it('requires an ENABLED payment channel that has an identifier', () => {
    expect(countSetupDone({ ...ALL_DONE, paymentChannels: [{ enabled: false, phone: '0911' }] })).toBe(4);
    expect(countSetupDone({ ...ALL_DONE, paymentChannels: [{ enabled: true }] })).toBe(4);
    // usePhoneFromShop counts as an identifier (no literal phone needed)
    expect(countSetupDone({ ...ALL_DONE, paymentChannels: [{ enabled: true, usePhoneFromShop: true }] })).toBe(5);
    expect(countSetupDone({ ...ALL_DONE, paymentChannels: [] })).toBe(4);
  });

  it('counts only ACTIVE catalog entries', () => {
    expect(countSetupDone({ ...ALL_DONE, catalogEntries: [{ name: 'Sugar', active: false }] })).toBe(4);
    expect(countSetupDone({ ...ALL_DONE, catalogEntries: [{ name: 'Sugar' }] })).toBe(5);
    expect(countSetupDone({ ...ALL_DONE, catalogEntries: [] })).toBe(4);
  });

  it('requires at least one recurring expense', () => {
    expect(countSetupDone({ ...ALL_DONE, recurring: [] })).toBe(4);
  });
});

describe('setup_completed_at — write-if-null + immutable', () => {
  it('writes nothing while the shop is not 5/5', async () => {
    const result = await stampSetupCompletedAtIfComplete({ shopProfile: { name: 'X' } });
    expect(result).toBe('incomplete');
    expect(db.settings.put).not.toHaveBeenCalled();
  });

  it('stamps the completion time on first encounter (backfill-on-encounter)', async () => {
    const now = new Date('2026-09-17T10:00:00.000Z');
    const result = await stampSetupCompletedAtIfComplete(ALL_DONE, now);

    expect(result).toBe('stamped');
    expect(db.settings.put).toHaveBeenCalledTimes(1);
    expect(db.settings.put).toHaveBeenCalledWith({
      key: SETUP_COMPLETED_AT_KEY,
      value: '2026-09-17T10:00:00.000Z',
    });
    expect(SETUP_COMPLETED_AT_KEY).toBe('setup_completed_at');
  });

  it('is IMMUTABLE: an existing stamp is never overwritten', async () => {
    const original = '2025-01-01T00:00:00.000Z';
    (db.settings.get as any).mockResolvedValue({ key: SETUP_COMPLETED_AT_KEY, value: original });

    const result = await stampSetupCompletedAtIfComplete(ALL_DONE, new Date('2026-09-17T10:00:00.000Z'));

    expect(result).toBe('already-stamped');
    expect(db.settings.put).not.toHaveBeenCalled();
    const row = await db.settings.get(SETUP_COMPLETED_AT_KEY);
    expect(row.value).toBe(original);
  });

  it('restore-safety: an old backup stamp wins over the current encounter', async () => {
    // A restored backup re-inserts settings rows; the older, real timestamp
    // must survive so the metric never gets younger on restore.
    const fromBackup = '2024-06-01T00:00:00.000Z';
    (db.settings.get as any).mockResolvedValue({ key: SETUP_COMPLETED_AT_KEY, value: fromBackup });

    await stampSetupCompletedAtIfComplete(ALL_DONE, new Date('2026-09-17T10:00:00.000Z'));

    expect(db.settings.put).not.toHaveBeenCalled();
  });

  it('is idempotent across repeated encounters', async () => {
    expect(await stampSetupCompletedAtIfComplete(ALL_DONE)).toBe('stamped');
    (db.settings.get as any).mockResolvedValue({ key: SETUP_COMPLETED_AT_KEY, value: 'x' });
    expect(await stampSetupCompletedAtIfComplete(ALL_DONE)).toBe('already-stamped');
    expect(db.settings.put).toHaveBeenCalledTimes(1);
  });
});

describe('shouldShowStaffQuota — Gate D quota display policy (owner-ruled)', () => {
  it('hides the staff row at 0 staff (day-one trust bug)', () => {
    expect(shouldShowStaffQuota({ max_staff: 3 }, 0)).toBe(false);
    expect(shouldShowStaffQuota({ max_staff: 3 }, undefined)).toBe(false);
    expect(shouldShowStaffQuota({ max_staff: 3 }, null)).toBe(false);
  });

  it('hides the staff row EVEN WITH a populated team — the ruling is unconditional', () => {
    // "2/3" displays an unenforced limit exactly like "0/3" does; the owner
    // cannot act on either until staff enforcement ships.
    expect(shouldShowStaffQuota({ max_staff: 3 }, 2)).toBe(false);
    expect(shouldShowStaffQuota({ max_staff: 3 }, 3)).toBe(false);
  });

  it('shows the row only on unlimited (Plus) entitlements', () => {
    expect(shouldShowStaffQuota({ max_staff: Infinity }, 0)).toBe(true);
    expect(shouldShowStaffQuota({ max_staff: Infinity }, 5)).toBe(true);
  });

  it('never throws on a missing entitlements object', () => {
    expect(() => shouldShowStaffQuota(undefined, 2)).not.toThrow();
    expect(shouldShowStaffQuota(undefined, 2)).toBe(false);
  });
});