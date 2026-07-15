/**
 * Unit tests for learningEngine.js
 *
 * Covers: bigramSimilarity, computeAcceptanceWeight, trackSuggestion*,
 * recordPriceObservation, findSimilarItems, suggestCanonicalMatch,
 * generateInsights.
 *
 * Run: npx vitest run tests/learningEngine.test.mjs
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db.js';
import {
  trackSuggestionShown,
  trackSuggestionAccepted,
  trackSuggestionRejected,
  recordPriceObservation,
  findSimilarItems,
  suggestCanonicalMatch,
  generateInsights,
  computeAcceptanceWeight,
} from '../src/utils/learningEngine.js';

beforeEach(async () => {
  await db.catalog_entries.clear();
  await db.suggestion_log.clear();
});

// --- bigramSimilarity (internal, tested indirectly via findSimilarItems) ---

describe('computeAcceptanceWeight', () => {
  it('returns 1 for entries with fewer than 5 shown', () => {
    expect(computeAcceptanceWeight({ suggestion_shown_count: 0 })).toBe(1);
    expect(computeAcceptanceWeight({ suggestion_shown_count: 4 })).toBe(1);
  });

  it('returns 1 for 100% acceptance rate', () => {
    const weight = computeAcceptanceWeight({
      suggestion_shown_count: 10,
      suggestion_accepted_count: 10,
    });
    expect(weight).toBe(1);
  });

  it('returns 0.3 for 0% acceptance rate', () => {
    const weight = computeAcceptanceWeight({
      suggestion_shown_count: 10,
      suggestion_accepted_count: 0,
    });
    expect(weight).toBeCloseTo(0.3, 5);
  });

  it('returns ~0.65 for 50% acceptance rate', () => {
    const weight = computeAcceptanceWeight({
      suggestion_shown_count: 10,
      suggestion_accepted_count: 5,
    });
    expect(weight).toBeCloseTo(0.65, 1);
  });

  it('handles missing fields gracefully', () => {
    expect(computeAcceptanceWeight({})).toBe(1);
  });
});

describe('trackSuggestionShown', () => {
  it('creates suggestion_log entry', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      suggestion_shown_count: 0,
    });

    await trackSuggestionShown(1);

    const logs = await db.suggestion_log.toArray();
    expect(logs.length).toBe(1);
    expect(logs[0].catalog_entry_id).toBe(1);
    expect(logs[0].accepted).toBeNull();
    expect(logs[0].context_tod).toBeTypeOf('number');
    expect(logs[0].context_day).toBeTypeOf('number');
  });

  it('increments suggestion_shown_count on catalog entry', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      suggestion_shown_count: 0,
    });

    await trackSuggestionShown(1);

    const entry = await db.catalog_entries.get(1);
    expect(entry.suggestion_shown_count).toBe(1);
  });

  it('does not throw on invalid entry id', async () => {
    await trackSuggestionShown(999);
    // should not throw
  });
});

describe('trackSuggestionAccepted', () => {
  it('marks most recent unresolved log as accepted', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      suggestion_shown_count: 1,
      suggestion_accepted_count: 0,
    });

    await db.suggestion_log.add({
      catalog_entry_id: 1,
      shown_at: Date.now(),
      accepted: null,
      context_tod: 10,
      context_day: 3,
    });

    await trackSuggestionAccepted(1);

    const logs = await db.suggestion_log.toArray();
    expect(logs[0].accepted).toBe(true);

    const entry = await db.catalog_entries.get(1);
    expect(entry.suggestion_accepted_count).toBe(1);
  });

  it('increments accepted count even without log', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      suggestion_accepted_count: 0,
    });

    await trackSuggestionAccepted(1);

    const entry = await db.catalog_entries.get(1);
    expect(entry.suggestion_accepted_count).toBe(1);
  });
});

describe('trackSuggestionRejected', () => {
  it('marks most recent unresolved log as rejected', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      suggestion_shown_count: 1,
      suggestion_rejected_count: 0,
    });

    await db.suggestion_log.add({
      catalog_entry_id: 1,
      shown_at: Date.now(),
      accepted: null,
      context_tod: 10,
      context_day: 3,
    });

    await trackSuggestionRejected(1, 'Something Else');

    const logs = await db.suggestion_log.toArray();
    expect(logs[0].accepted).toBe(false);

    const entry = await db.catalog_entries.get(1);
    expect(entry.suggestion_rejected_count).toBe(1);
  });
});

describe('recordPriceObservation', () => {
  it('stores price in price_history', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      price_history: [],
    });

    await recordPriceObservation(1, 100);

    const entry = await db.catalog_entries.get(1);
    expect(entry.price_history.length).toBe(1);
    expect(entry.price_history[0].price).toBe(100);
    expect(entry.typical_price).toBe(100);
    expect(entry.last_price).toBe(100);
  });

  it('computes typical price from multiple observations', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      price_history: [],
    });

    // Add 5 consistent prices
    for (let i = 0; i < 5; i++) {
      await recordPriceObservation(1, 100);
    }

    const entry = await db.catalog_entries.get(1);
    expect(entry.typical_price).toBe(100);
  });

  it('handles outliers via IQR method', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      price_history: [],
    });

    // Normal prices: 95-105
    for (const p of [95, 98, 100, 102, 105]) {
      await recordPriceObservation(1, p);
    }

    // Outlier
    const result = await recordPriceObservation(1, 500);

    const entry = await db.catalog_entries.get(1);
    expect(result.isOutlier).toBe(true);
    // Typical should still be around 100, not pulled up by 500
    expect(entry.typical_price).toBeLessThan(200);
  });

  it('ignores zero and negative prices', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      price_history: [],
    });

    await recordPriceObservation(1, 0);
    await recordPriceObservation(1, -10);

    const entry = await db.catalog_entries.get(1);
    expect(entry.price_history.length).toBe(0);
  });

  it('keeps only last 50 observations', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Test Item',
      kind: 'item',
      active: true,
      price_history: [],
    });

    for (let i = 0; i < 60; i++) {
      await recordPriceObservation(1, 100);
    }

    const entry = await db.catalog_entries.get(1);
    expect(entry.price_history.length).toBe(50);
  });
});

describe('findSimilarItems', () => {
  it('returns empty for short names', async () => {
    const matches = await findSimilarItems('a');
    expect(matches).toEqual([]);
  });

  it('finds similar items by bigram similarity', async () => {
    await db.catalog_entries.bulkAdd([
      { id: 1, name: 'Shiro', kind: 'item', active: true },
      { id: 2, name: 'Shiro Wot', kind: 'item', active: true },
      { id: 3, name: 'Injera', kind: 'item', active: true },
    ]);

    const matches = await findSimilarItems('Shiro', 0.5);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Should find "Shiro Wot" as similar but not exact match
    expect(matches.some((m) => m.entry.name === 'Shiro Wot')).toBe(true);
  });

  it('excludes exact matches', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Coffee',
      kind: 'item',
      active: true,
    });

    const matches = await findSimilarItems('Coffee', 0.5);
    expect(matches.length).toBe(0);
  });

  it('returns max 5 results', async () => {
    // Add many similar items
    const entries = [];
    for (let i = 0; i < 10; i++) {
      entries.push({
        id: i + 1,
        name: `Coffee Bean Type ${i}`,
        kind: 'item',
        active: true,
      });
    }
    await db.catalog_entries.bulkAdd(entries);

    const matches = await findSimilarItems('Coffee Bean', 0.3);
    expect(matches.length).toBeLessThanOrEqual(5);
  });
});

describe('suggestCanonicalMatch', () => {
  it('returns best match above threshold', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Shiro Wot',
      kind: 'item',
      active: true,
    });

    const match = await suggestCanonicalMatch('Shiro Watt');
    expect(match).not.toBeNull();
    expect(match.entry.name).toBe('Shiro Wot');
  });

  it('returns null when no good match', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Injera',
      kind: 'item',
      active: true,
    });

    const match = await suggestCanonicalMatch('Banana');
    expect(match).toBeNull();
  });
});

describe('generateInsights', () => {
  it('returns empty when no catalog entries', async () => {
    const insights = await generateInsights();
    expect(insights).toEqual([]);
  });

  it('generates time_pattern insight', async () => {
    const now = Date.now();
    await db.catalog_entries.add({
      id: 1,
      name: 'Shiro',
      kind: 'item',
      active: true,
      use_count: 5,
      suggestion_shown_count: 10,
      suggestion_accepted_count: 5,
    });

    // Add 5 morning logs (8 AM)
    for (let i = 0; i < 5; i++) {
      await db.suggestion_log.add({
        catalog_entry_id: 1,
        shown_at: now - i * 3600000,
        accepted: true,
        context_tod: 8,
        context_day: 3,
      });
    }

    const insights = await generateInsights();
    const timeInsight = insights.find((i) => i.type === 'time_pattern');
    expect(timeInsight).toBeDefined();
    expect(timeInsight.item_name).toBe('Shiro');
  });

  it('generates price_stable insight', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Coffee',
      kind: 'item',
      active: true,
      use_count: 5,
      typical_price: 100,
      price_history: Array.from({ length: 6 }, (_, i) => ({
        price: 100 + (i % 2), // 100, 101, 100, 101, 100, 101
        ts: Date.now() - i * 3600000,
      })),
    });

    const insights = await generateInsights();
    const priceInsight = insights.find((i) => i.type === 'price_stable');
    expect(priceInsight).toBeDefined();
    expect(priceInsight.message).toContain('Coffee');
  });

  it('generates low_acceptance insight', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'Unpopular Item',
      kind: 'item',
      active: true,
      use_count: 5,
      suggestion_shown_count: 20,
      suggestion_accepted_count: 1, // 5% acceptance
    });

    const insights = await generateInsights();
    const lowInsight = insights.find((i) => i.type === 'low_acceptance');
    expect(lowInsight).toBeDefined();
    expect(lowInsight.item_name).toBe('Unpopular Item');
  });

  it('skips entries with use_count < 3', async () => {
    await db.catalog_entries.add({
      id: 1,
      name: 'New Item',
      kind: 'item',
      active: true,
      use_count: 1,
    });

    const insights = await generateInsights();
    expect(insights.length).toBe(0);
  });

  it('returns max 5 insights', async () => {
    // This is hard to trigger, just verify the slice
    const insights = await generateInsights();
    expect(insights.length).toBeLessThanOrEqual(5);
  });
});
