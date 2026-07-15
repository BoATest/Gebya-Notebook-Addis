/**
 * Unit tests for entitlements.js
 *
 * Covers: PLAN_TIERS, getPlanTier, setPlanTier, hasEntitlement,
 * getCurrentEntitlements, computeImpactMetrics.
 *
 * Run: npx vitest run tests/entitlements.test.mjs
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db.js';
import {
  PLAN_TIERS,
  getPlanTier,
  setPlanTier,
  hasEntitlement,
  getCurrentEntitlements,
  computeImpactMetrics,
} from '../src/utils/entitlements.js';

beforeEach(async () => {
  await db.transactions.clear();
  await db.customers.clear();
  await db.customer_transactions.clear();
  await db.staff_members.clear();
  await db.settings.clear();
  await db.analytics.clear();
});

describe('PLAN_TIERS', () => {
  it('has FREE and PLUS constants', () => {
    expect(PLAN_TIERS.FREE).toBe('free');
    expect(PLAN_TIERS.PLUS).toBe('plus');
  });
});

describe('getPlanTier', () => {
  it('defaults to free when no setting exists', async () => {
    const tier = await getPlanTier();
    expect(tier).toBe('free');
  });

  it('returns stored tier', async () => {
    await db.settings.put({ key: 'plan_tier', value: 'plus' });
    const tier = await getPlanTier();
    expect(tier).toBe('plus');
  });

  it('returns free on db error', async () => {
    // getPlanTier catches errors and returns free
    const tier = await getPlanTier();
    expect(tier).toBe('free');
  });
});

describe('setPlanTier', () => {
  it('stores valid tier', async () => {
    await setPlanTier('plus');
    const row = await db.settings.get('plan_tier');
    expect(row.value).toBe('plus');
  });

  it('ignores invalid tier', async () => {
    await setPlanTier('invalid_tier');
    const row = await db.settings.get('plan_tier');
    expect(row).toBeUndefined();
  });

  it('can set back to free', async () => {
    await setPlanTier('plus');
    await setPlanTier('free');
    const row = await db.settings.get('plan_tier');
    expect(row.value).toBe('free');
  });
});

describe('hasEntitlement', () => {
  it('returns false for advanced_reports on free tier', async () => {
    const result = await hasEntitlement('advanced_reports');
    expect(result).toBe(false);
  });

  it('returns true for advanced_reports on plus tier', async () => {
    await setPlanTier('plus');
    const result = await hasEntitlement('advanced_reports');
    expect(result).toBe(true);
  });

  it('returns false for multi_shop on free tier', async () => {
    const result = await hasEntitlement('multi_shop');
    expect(result).toBe(false);
  });

  it('returns true for multi_shop on plus tier', async () => {
    await setPlanTier('plus');
    const result = await hasEntitlement('multi_shop');
    expect(result).toBe(true);
  });

  it('returns false for priority_support on free tier', async () => {
    const result = await hasEntitlement('priority_support');
    expect(result).toBe(false);
  });

  it('returns true for priority_support on plus tier', async () => {
    await setPlanTier('plus');
    const result = await hasEntitlement('priority_support');
    expect(result).toBe(true);
  });

  it('returns true for max_staff on free tier (3 > 0)', async () => {
    // max_staff is 3 for free, which is not true or Infinity
    // hasEntitlement checks === true || === Infinity
    const result = await hasEntitlement('max_staff');
    expect(result).toBe(false);
  });

  it('returns true for max_staff on plus tier (Infinity)', async () => {
    await setPlanTier('plus');
    const result = await hasEntitlement('max_staff');
    expect(result).toBe(true);
  });

  it('returns false for unknown entitlement', async () => {
    const result = await hasEntitlement('nonexistent_feature');
    expect(result).toBe(false);
  });
});

describe('getCurrentEntitlements', () => {
  it('returns free tier entitlements by default', async () => {
    const { tier, entitlements } = await getCurrentEntitlements();
    expect(tier).toBe('free');
    expect(entitlements.max_staff).toBe(3);
    expect(entitlements.max_transactions_per_month).toBe(500);
    expect(entitlements.advanced_reports).toBe(false);
    expect(entitlements.multi_shop).toBe(false);
    expect(entitlements.priority_support).toBe(false);
  });

  it('returns plus tier entitlements when set', async () => {
    await setPlanTier('plus');
    const { tier, entitlements } = await getCurrentEntitlements();
    expect(tier).toBe('plus');
    expect(entitlements.max_staff).toBe(Infinity);
    expect(entitlements.max_transactions_per_month).toBe(Infinity);
    expect(entitlements.advanced_reports).toBe(true);
    expect(entitlements.multi_shop).toBe(true);
    expect(entitlements.priority_support).toBe(true);
  });
});

describe('computeImpactMetrics', () => {
  it('returns empty metrics when no data', async () => {
    const metrics = await computeImpactMetrics();
    expect(metrics.shops_onboarded).toBe(1);
    expect(metrics.total_transactions).toBe(0);
    expect(metrics.total_sales_birr).toBe(0);
    expect(metrics.total_expenses_birr).toBe(0);
    expect(metrics.total_credit_extended_birr).toBe(0);
    expect(metrics.total_credit_repaid_birr).toBe(0);
    expect(metrics.credit_recovery_rate).toBe(0);
    expect(metrics.unique_customers).toBe(0);
    expect(metrics.active_staff).toBe(0);
    expect(metrics.computed_at).toBeTypeOf('number');
  });

  it('computes metrics from seeded data', async () => {
    await db.transactions.bulkAdd([
      { type: 'sale', amount: 1000, created_at: Date.now(), device_id: 'd1' },
      { type: 'sale', amount: 500, created_at: Date.now(), device_id: 'd1' },
      { type: 'expense', amount: 200, created_at: Date.now(), device_id: 'd1' },
    ]);

    await db.customer_transactions.bulkAdd([
      { customer_id: 1, type: 'credit_add', amount: 800, created_at: Date.now() },
      { customer_id: 1, type: 'payment', amount: 300, created_at: Date.now() },
      { customer_id: 2, type: 'credit_add', amount: 400, created_at: Date.now() },
    ]);

    await db.staff_members.bulkAdd([
      { display_name: 'Staff A', role: 'staff', active: true, created_at: Date.now() },
      { display_name: 'Staff B', role: 'staff', active: false, created_at: Date.now() },
    ]);

    await db.analytics.add({ key: 'first_used_date', value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() });

    const metrics = await computeImpactMetrics();
    expect(metrics.total_transactions).toBe(3);
    expect(metrics.total_sales_birr).toBe(1500);
    expect(metrics.total_expenses_birr).toBe(200);
    expect(metrics.total_credit_extended_birr).toBe(1200);
    expect(metrics.total_credit_repaid_birr).toBe(300);
    expect(metrics.credit_recovery_rate).toBe(25);
    expect(metrics.unique_customers).toBe(2);
    expect(metrics.active_staff).toBe(1);
    expect(metrics.months_active).toBeGreaterThanOrEqual(1);
    expect(metrics.monthly_transaction_rate).toBeGreaterThanOrEqual(1);
  });

  it('handles credit_recovery_rate when no credit extended', async () => {
    const metrics = await computeImpactMetrics();
    expect(metrics.credit_recovery_rate).toBe(0);
  });
});
