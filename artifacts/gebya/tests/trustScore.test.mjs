/**
 * Unit tests for trustScore.js
 *
 * Covers: computeAndStoreTrustScores, getTrustScores,
 * data_integrity_score computation, business_health_score computation,
 * getOverdueCustomerFlags.
 *
 * Run: npx vitest run tests/trustScore.test.mjs
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db.js';
import {
  computeAndStoreTrustScores,
  getTrustScores,
  getOverdueCustomerFlags,
} from '../src/utils/trustScore.js';

beforeEach(async () => {
  await db.transactions.clear();
  await db.customers.clear();
  await db.customer_transactions.clear();
  await db.settings.clear();
  await db.analytics.clear();
});

describe('getTrustScores', () => {
  it('returns null when no scores exist', async () => {
    const scores = await getTrustScores('shop_001');
    expect(scores).toBeNull();
  });

  it('returns stored scores', async () => {
    const record = {
      shop_id: 'shop_001',
      computed_at: Date.now(),
      score_version: 1,
      data_integrity_score: 85,
      business_health_score: 72,
    };
    await db.settings.put({ key: 'trust_score_shop_001', value: record });
    const scores = await getTrustScores('shop_001');
    expect(scores.data_integrity_score).toBe(85);
    expect(scores.business_health_score).toBe(72);
  });
});

describe('computeAndStoreTrustScores', () => {
  it('returns zero scores with no data', async () => {
    const result = await computeAndStoreTrustScores('shop_001');
    expect(result.data_integrity_score).toBe(0);
    expect(result.business_health_score).toBe(0);
    expect(result.score_version).toBe(1);
    expect(result.shop_id).toBe('shop_001');
    expect(result.computed_at).toBeTypeOf('number');
  });

  it('stores scores in settings table', async () => {
    await computeAndStoreTrustScores('shop_001');
    const row = await db.settings.get('trust_score_shop_001');
    expect(row).toBeDefined();
    expect(row.value.data_integrity_score).toBe(0);
  });

  it('computes data_integrity_score from transactions', async () => {
    // Add transactions with device_id and actor (high integrity)
    for (let i = 0; i < 10; i++) {
      await db.transactions.add({
        type: 'sale',
        amount: 100,
        device_id: 'device_1',
        actor_staff_member_id: 'staff_1',
        was_edited: false,
        created_at: Date.now(),
      });
    }

    const result = await computeAndStoreTrustScores('shop_001');
    expect(result.data_integrity_score).toBeGreaterThan(0);
    expect(result.data_integrity_factors.device_consistency).toBe(1);
    expect(result.data_integrity_factors.edit_frequency).toBe(1);
    expect(result.data_integrity_factors.actor_clarity).toBe(1);
  });

  it('reduces data_integrity_score for missing device_id', async () => {
    for (let i = 0; i < 10; i++) {
      await db.transactions.add({
        type: 'sale',
        amount: 100,
        device_id: null,
        actor_staff_member_id: 'staff_1',
        was_edited: false,
        created_at: Date.now(),
      });
    }

    const result = await computeAndStoreTrustScores('shop_001');
    expect(result.data_integrity_factors.device_consistency).toBe(0);
  });

  it('reduces data_integrity_score for edited transactions', async () => {
    for (let i = 0; i < 10; i++) {
      await db.transactions.add({
        type: 'sale',
        amount: 100,
        device_id: 'device_1',
        actor_staff_member_id: 'staff_1',
        was_edited: i < 5, // 50% edited
        created_at: Date.now(),
      });
    }

    const result = await computeAndStoreTrustScores('shop_001');
    // 50% edit ratio → editFrequency = max(0, 1 - 0.5*2) = 0
    expect(result.data_integrity_factors.edit_frequency).toBe(0);
  });

  it('computes business_health_score from customer transactions', async () => {
    // Customer with good repayment
    await db.customer_transactions.bulkAdd([
      { customer_id: 1, type: 'credit_add', amount: 1000, created_at: Date.now() },
      { customer_id: 1, type: 'payment', amount: 800, created_at: Date.now() },
    ]);

    const result = await computeAndStoreTrustScores('shop_001');
    expect(result.business_health_score).toBeGreaterThan(0);
    expect(result.business_health_factors.repayment_consistency).toBe(1);
    expect(result.business_health_factors.credit_health).toBeCloseTo(0.8, 1);
  });

  it('returns zero business_health_score with no customer transactions', async () => {
    const result = await computeAndStoreTrustScores('shop_001');
    expect(result.business_health_score).toBe(0);
  });

  it('scores are clamped to 0-100 range', async () => {
    const result = await computeAndStoreTrustScores('shop_001');
    expect(result.data_integrity_score).toBeGreaterThanOrEqual(0);
    expect(result.data_integrity_score).toBeLessThanOrEqual(100);
    expect(result.business_health_score).toBeGreaterThanOrEqual(0);
    expect(result.business_health_score).toBeLessThanOrEqual(100);
  });
});

describe('getOverdueCustomerFlags', () => {
  it('returns empty when no overdue customers', async () => {
    const flags = await getOverdueCustomerFlags();
    expect(flags).toEqual([]);
  });

  it('flags customer with 60+ days overdue', async () => {
    const sixtyOneDaysAgo = Date.now() - 61 * 24 * 60 * 60 * 1000;

    await db.customers.add({
      id: 1,
      display_name: 'Overdue Customer',
      created_at: new Date(sixtyOneDaysAgo).toISOString(),
    });

    await db.customer_transactions.add({
      customer_id: 1,
      type: 'credit_add',
      amount: 1000,
      created_at: sixtyOneDaysAgo,
    });

    const flags = await getOverdueCustomerFlags();
    expect(flags.length).toBe(1);
    expect(flags[0].customer_id).toBe(1);
    expect(flags[0].display_name).toBe('Overdue Customer');
    expect(flags[0].outstanding_amount).toBe(1000);
    expect(flags[0].oldest_unpaid_days).toBeGreaterThanOrEqual(60);
    expect(flags[0].risk_level).toBe('high');
  });

  it('does not flag customer who has repaid', async () => {
    const sixtyOneDaysAgo = Date.now() - 61 * 24 * 60 * 60 * 1000;

    await db.customers.add({
      id: 1,
      display_name: 'Good Customer',
      created_at: new Date(sixtyOneDaysAgo).toISOString(),
    });

    await db.customer_transactions.bulkAdd([
      { customer_id: 1, type: 'credit_add', amount: 1000, created_at: sixtyOneDaysAgo },
      { customer_id: 1, type: 'payment', amount: 1000, created_at: Date.now() },
    ]);

    const flags = await getOverdueCustomerFlags();
    expect(flags.length).toBe(0);
  });

  it('flags partially paid customer as medium risk if recent payment', async () => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    await db.customers.add({
      id: 1,
      display_name: 'Partial Customer',
      created_at: new Date(ninetyDaysAgo).toISOString(),
    });

    await db.customer_transactions.bulkAdd([
      { customer_id: 1, type: 'credit_add', amount: 1000, created_at: ninetyDaysAgo },
      { customer_id: 1, type: 'payment', amount: 300, created_at: thirtyDaysAgo },
    ]);

    const flags = await getOverdueCustomerFlags();
    expect(flags.length).toBe(1);
    expect(flags[0].outstanding_amount).toBe(700);
    expect(flags[0].has_recent_payment).toBe(true);
    expect(flags[0].risk_level).toBe('medium');
  });

  it('sorts by outstanding amount descending', async () => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    await db.customers.bulkAdd([
      { id: 1, display_name: 'Small', created_at: new Date(ninetyDaysAgo).toISOString() },
      { id: 2, display_name: 'Large', created_at: new Date(ninetyDaysAgo).toISOString() },
    ]);

    await db.customer_transactions.bulkAdd([
      { customer_id: 1, type: 'credit_add', amount: 200, created_at: ninetyDaysAgo },
      { customer_id: 2, type: 'credit_add', amount: 5000, created_at: ninetyDaysAgo },
    ]);

    const flags = await getOverdueCustomerFlags();
    expect(flags.length).toBe(2);
    expect(flags[0].customer_id).toBe(2);
    expect(flags[1].customer_id).toBe(1);
  });
});
