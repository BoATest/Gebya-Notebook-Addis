import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeSalesSummary,
  computePeriodVerdict,
  computeHeroStatus,
  computeAttentionItems,
  computeRecommendations,
  computeCreditSummary,
  computeStaffSummary,
} from '../src/utils/shopStory.js';
import { buildReportRows, computeReportMetrics } from '../src/utils/reportSelectors.js';

const DAY = 86400000;
const T0 = new Date('2026-06-15T08:00:00').getTime();

function saleTx(overrides = {}) {
  return {
    type: 'sale',
    amount: 1000,
    item_name: 'Bread',
    payment_type: 'cash',
    cash_received: 1000,
    actor_name_snapshot: 'Owner',
    created_at: T0,
    updated_at: T0,
    ...overrides,
  };
}

describe('computeSalesSummary', () => {
  it('totals sales, averages, and ranks top items', () => {
    const rows = [
      { ...saleTx(), report_kind: 'sale', amount: 500, cash_received: 500 },
      { ...saleTx(), report_kind: 'sale', amount: 1500, cash_received: 1500, item_name: 'Sugar' },
      { ...saleTx(), report_kind: 'sale', amount: 500, cash_received: 500 },
    ];
    const summary = computeSalesSummary({ saleRows: rows, totalSold: 2500 });
    assert.equal(summary.totalSales, 3);
    assert.equal(summary.totalAmount, 2500);
    assert.equal(summary.averageSale, 833);
    // Single big sale beats two small ones of the same item
    assert.equal(summary.topItems[0].name, 'Sugar');
    assert.equal(summary.topItems[0].revenue, 1500);
    assert.equal(summary.topItems[1].name, 'Bread');
    assert.equal(summary.topItems[1].revenue, 1000);
  });
});

describe('computePeriodVerdict', () => {
  it('reports growth when current beats previous by >10%', () => {
    const v = computePeriodVerdict({
      current: { totalSold: 1200 },
      previous: { totalSold: 1000 },
      lang: 'en',
    });
    assert.equal(v.tone, 'positive');
    assert.match(v.text, /20% more/);
  });

  it('reports decline as warning when below previous by >10%', () => {
    const v = computePeriodVerdict({
      current: { totalSold: 700 },
      previous: { totalSold: 1000 },
      lang: 'en',
    });
    assert.equal(v.tone, 'warning');
    assert.match(v.text, /30% less/);
  });

  it('stays neutral within ±10%', () => {
    const v = computePeriodVerdict({
      current: { totalSold: 1050 },
      previous: { totalSold: 1000 },
      lang: 'en',
    });
    assert.equal(v.tone, 'neutral');
  });

  it('handles an empty previous period', () => {
    const v = computePeriodVerdict({ current: { totalSold: 300 }, previous: null, lang: 'en' });
    assert.ok(v.text.length > 0);
  });
});

describe('computeHeroStatus + computeAttentionItems (regression: _firestore bug)', () => {
  it('never shows the corrupted _firestore label', () => {
    const items = computeAttentionItems({
      closingDone: true,
      cashExpected: 1000,
      cashVariance: 500,
      lang: 'am',
    });
    const mismatch = items.find(i => i.type === 'cash_mismatch');
    assert.ok(mismatch, 'mismatch card should exist');
    assert.notEqual(mismatch.action, '_firestore');
    assert.doesNotMatch(mismatch.action, /firestore/);
  });

  it('flags uncounted cash as urgent before closing', () => {
    const items = computeAttentionItems({ closingDone: false, cashExpected: 800, lang: 'en' });
    assert.equal(items[0].type, 'cash_pending');
    assert.equal(items[0].severity, 'urgent');
  });

  it('gives a sentence and CTA for a healthy closed day', () => {
    const status = computeHeroStatus({
      metrics: { saleRows: [{}, {}], cashExpected: 900 },
      closingDone: true,
      cashVariance: 0,
      overdueCount: 0,
      staffRows: [],
      period: 'morning',
      lang: 'en',
    });
    assert.match(status.sentence, /All good/);
    assert.equal(status.actionType, 'view_details');
  });
});

describe('computeRecommendations tone contract', () => {
  it('returns {text, tone} objects with valid tones', () => {
    const recs = computeRecommendations({
      metrics: { totalSold: 100, saleRows: [] },
      priorMetrics: { totalSold: 50 },
      overdueCount: 2,
      lang: 'en',
    });
    assert.ok(recs.length >= 1);
    for (const rec of recs) {
      assert.ok(['positive', 'warning', 'neutral'].includes(rec.tone));
      assert.ok(typeof rec.text === 'string' && rec.text.length > 0);
    }
    // Sales doubled vs yesterday → first rec is positive
    assert.equal(recs[0].tone, 'positive');
  });
});

describe('buildReportRows + computeReportMetrics end-to-end sanity', () => {
  it('computes cash expected across sales, collections and expenses', () => {
    const rows = buildReportRows({
      transactions: [
        saleTx({ id: 1, amount: 2000, cash_received: 2000 }),
        saleTx({ id: 2, type: 'expense', amount: 500 }),
      ],
      ledgerTransactions: [],
      customers: [],
      from: T0 - DAY,
      to: T0 + DAY,
    });
    const m = computeReportMetrics(rows);
    assert.equal(m.totalSold, 2000);
    assert.equal(m.spentToday, 500);
    assert.equal(m.cashExpected, 1500);
  });

  it('respects scope filtering (RBAC foundation)', () => {
    const txs = [
      saleTx({ id: 1, actor_staff_member_id: 7, actor_name_snapshot: 'Abel' }),
      saleTx({ id: 2 }),
    ];
    const allRows = buildReportRows({ transactions: txs, from: 0, to: Date.now() + 1 });
    assert.equal(allRows.length, 2);
    const staffRowsOnly = buildReportRows({
      transactions: txs, from: 0, to: Date.now() + 1, scope: '__owner__',
    });
    assert.equal(staffRowsOnly.length, 1);
    assert.equal(staffRowsOnly[0].actor_staff_member_id, undefined);
  });
});

describe('computeCreditSummary / computeStaffSummary basics', () => {
  it('ranks overdue customers first and totals debt', () => {
    const summary = computeCreditSummary([
      { id: 1, balance: 300 },
      { id: 2, balance: 900, has_overdue: true, overdue_amount: 900 },
    ]);
    assert.equal(summary.overdueCount, 1);
    assert.equal(summary.customers[0].id, 2);
    assert.equal(summary.totalOwed, 1200);
  });

  it('returns null with no staff rows', () => {
    assert.equal(computeStaffSummary([]), null);
  });
});
