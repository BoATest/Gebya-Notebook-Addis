/**
 * Learning Engine — the brain behind "the app learns your business."
 *
 * Handles:
 * 1. Suggestion acceptance/rejection tracking
 * 2. Price clustering with outlier detection
 * 3. Cross-spelling normalization within a shop
 * 4. Surfaced insight generation ("You sell X every morning")
 */
import { db } from '../db';

// --- Similarity ---

/**
 * Character bigram similarity (Dice coefficient). Fast enough for <=1000 catalog entries.
 * Returns 0..1 where 1 = identical.
 */
function bigramSimilarity(a, b) {
  if (!a || !b) return 0;
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\u1200-\u137f\u1380-\u139f\u2d80-\u2ddf\uab00-\uab2f]/gu, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigrams = (s) => {
    const set = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.substring(i, i + 2);
      set.set(bg, (set.get(bg) || 0) + 1);
    }
    return set;
  };

  const aBi = bigrams(na);
  const bBi = bigrams(nb);
  let intersection = 0;
  for (const [bg, count] of aBi) {
    if (bBi.has(bg)) intersection += Math.min(count, bBi.get(bg));
  }
  return (2 * intersection) / (na.length - 1 + (nb.length - 1));
}

// --- Suggestion tracking ---

/**
 * Record that a suggestion was shown to the user.
 */
export async function trackSuggestionShown(catalogEntryId, context = {}) {
  try {
    const now = Date.now();
    const hour = new Date(now).getHours();
    const day = new Date(now).getDay();
    await db.suggestion_log.add({
      catalog_entry_id: catalogEntryId,
      shown_at: now,
      accepted: null, // will be updated
      context_tod: hour,
      context_day: day,
    });
    await db.catalog_entries.update(catalogEntryId, {
      suggestion_shown_count: (await db.catalog_entries.get(catalogEntryId))?.suggestion_shown_count || 0 + 1,
    });
  } catch (_) {
    // non-critical — never block the user
  }
}

/**
 * Record that a suggestion was accepted (user picked it).
 */
export async function trackSuggestionAccepted(catalogEntryId) {
  try {
    const now = Date.now();
    // Find the most recent shown-but-unresolved log for this entry
    const recentLog = await db.suggestion_log
      .where('catalog_entry_id').equals(catalogEntryId)
      .last();
    if (recentLog && recentLog.accepted === null) {
      await db.suggestion_log.update(recentLog.id, { accepted: true });
    }
    await db.catalog_entries.update(catalogEntryId, {
      suggestion_accepted_count: ((await db.catalog_entries.get(catalogEntryId))?.suggestion_accepted_count || 0) + 1,
    });
  } catch (_) {}
}

/**
 * Record that a suggestion was rejected (user typed something else).
 * `rejectedEntryId` is the suggestion that was ignored.
 * `acceptedName` is what the user actually typed.
 */
export async function trackSuggestionRejected(rejectedEntryId, acceptedName) {
  try {
    const now = Date.now();
    const recentLog = await db.suggestion_log
      .where('catalog_entry_id').equals(rejectedEntryId)
      .last();
    if (recentLog && recentLog.accepted === null) {
      await db.suggestion_log.update(recentLog.id, { accepted: false });
    }
    await db.catalog_entries.update(rejectedEntryId, {
      suggestion_rejected_count: ((await db.catalog_entries.get(rejectedEntryId))?.suggestion_rejected_count || 0) + 1,
    });
  } catch (_) {}
}

// --- Price clustering ---

/**
 * Add a price observation to a catalog entry's price history.
 * Detects outliers using IQR method. If the new price is an outlier
 * relative to recent history, it's still stored but flagged so it
 * doesn't override the typical price.
 */
export async function recordPriceObservation(catalogEntryId, price) {
  if (!price || price <= 0) return;
  try {
    const entry = await db.catalog_entries.get(catalogEntryId);
    if (!entry) return;

    const history = Array.isArray(entry.price_history) ? [...entry.price_history] : [];
    history.push({ price, ts: Date.now() });

    // Keep last 50 observations max
    const trimmed = history.slice(-50);

    // Compute typical price using IQR outlier exclusion
    const prices = trimmed.map((h) => h.price).sort((a, b) => a - b);
    let typicalPrice = prices[0];
    if (prices.length >= 4) {
      const q1 = prices[Math.floor(prices.length * 0.25)];
      const q3 = prices[Math.floor(prices.length * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      const inliers = prices.filter((p) => p >= lower && p <= upper);
      typicalPrice = inliers.length > 0
        ? Math.round(inliers.reduce((s, p) => s + p, 0) / inliers.length)
        : prices[Math.floor(prices.length / 2)];
    } else {
      typicalPrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    }

    const isOutlier = prices.length >= 4
      ? (() => {
          const q1 = prices[Math.floor(prices.length * 0.25)];
          const q3 = prices[Math.floor(prices.length * 0.75)];
          const iqr = q3 - q1;
          return price < q1 - 1.5 * iqr || price > q3 + 1.5 * iqr;
        })()
      : false;

    await db.catalog_entries.update(catalogEntryId, {
      price_history: trimmed,
      typical_price: typicalPrice,
      last_price: price,
      last_unit_price: price,
      default_price: typicalPrice, // default_price now shows the typical, not the last
      updated_at: Date.now(),
    });

    return { typicalPrice, isOutlier };
  } catch (_) {}
}

// --- Cross-spelling normalization ---

/**
 * Find similar item names within the shop's catalog.
 * Returns matches sorted by similarity, filtered by threshold.
 */
export async function findSimilarItems(name, threshold = 0.6) {
  if (!name || name.length < 2) return [];
  try {
    const entries = await db.catalog_entries.where('active').equals(1).toArray();
    // Also try without index filter in case active is boolean
    const allEntries = entries.length > 0 ? entries : await db.catalog_entries.toArray();

    const matches = [];
    for (const entry of allEntries) {
      if (!entry.name) continue;
      const sim = bigramSimilarity(name, entry.name);
      if (sim >= threshold && sim < 1) {
        matches.push({ entry, similarity: sim });
      }
    }
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  } catch (_) {
    return [];
  }
}

/**
 * Suggest a canonical match for a new item name.
 * Returns the best match or null.
 */
export async function suggestCanonicalMatch(newName) {
  const matches = await findSimilarItems(newName, 0.65);
  return matches.length > 0 ? matches[0] : null;
}

// --- Surfaced insights ---

/**
 * Generate surfaced insights from catalog learning data.
 * Returns an array of insight objects for display in the UI.
 */
export async function generateInsights() {
  const insights = [];
  try {
    const entries = await db.catalog_entries.toArray();
    const now = Date.now();
    const currentHour = new Date().getHours();
    const morningRange = [6, 10];
    const afternoonRange = [11, 15];
    const eveningRange = [16, 21];

    for (const entry of entries) {
      if (!entry.name || (entry.use_count || 0) < 3) continue;

      // Insight: "You sell X every morning"
      const logs = await db.suggestion_log
        .where('catalog_entry_id').equals(entry.id)
        .toArray();

      if (logs.length >= 3) {
        const todCounts = { morning: 0, afternoon: 0, evening: 0 };
        for (const log of logs) {
          const h = log.context_tod ?? new Date(log.shown_at).getHours();
          if (h >= morningRange[0] && h <= morningRange[1]) todCounts.morning++;
          else if (h >= afternoonRange[0] && h <= afternoonRange[1]) todCounts.afternoon++;
          else if (h >= eveningRange[0] && h <= eveningRange[1]) todCounts.evening++;
        }
        const dominant = Object.entries(todCounts).sort((a, b) => b[1] - a[1])[0];
        const ratio = dominant[1] / logs.length;
        if (ratio >= 0.6 && dominant[1] >= 3) {
          const timeLabel = dominant[0] === 'morning' ? 'morning'
            : dominant[0] === 'afternoon' ? 'afternoon' : 'evening';
          insights.push({
            type: 'time_pattern',
            catalog_entry_id: entry.id,
            item_name: entry.name,
            message: `You sell ${entry.name} mostly in the ${timeLabel}`,
            detail: `${dominant[1]} of ${logs.length} sales were in the ${timeLabel}`,
          });
        }
      }

      // Insight: "Price for X has been stable at Y birr"
      const history = Array.isArray(entry.price_history) ? entry.price_history : [];
      if (history.length >= 5 && entry.typical_price) {
        const recentPrices = history.slice(-10).map((h) => h.price);
        const min = Math.min(...recentPrices);
        const max = Math.max(...recentPrices);
        const range = max - min;
        if (range <= entry.typical_price * 0.15) {
          insights.push({
            type: 'price_stable',
            catalog_entry_id: entry.id,
            item_name: entry.name,
            message: `Price for ${entry.name} is stable at ~${entry.typical_price} birr`,
            detail: `Last ${recentPrices.length} sales: ${min}-${max} birr range`,
          });
        }
      }

      // Insight: Low acceptance rate — item is being ignored
      const shown = entry.suggestion_shown_count || 0;
      const accepted = entry.suggestion_accepted_count || 0;
      if (shown >= 10) {
        const rate = accepted / shown;
        if (rate < 0.2) {
          insights.push({
            type: 'low_acceptance',
            catalog_entry_id: entry.id,
            item_name: entry.name,
            message: `"${entry.name}" is rarely selected when suggested`,
            detail: `Selected ${accepted} of ${shown} times (${Math.round(rate * 100)}%)`,
          });
        }
      }
    }

    return insights.slice(0, 5); // max 5 insights at a time
  } catch (_) {
    return [];
  }
}

// --- Ranking with acceptance-adjusted scoring ---

/**
 * Compute the acceptance-adjusted score for a catalog entry.
 * Items that are frequently shown but rarely accepted get downweighted.
 */
export function computeAcceptanceWeight(entry) {
  const shown = entry.suggestion_shown_count || 0;
  const accepted = entry.suggestion_accepted_count || 0;
  if (shown < 5) return 1; // not enough data — neutral
  const rate = accepted / shown;
  // Linear scale: 100% acceptance = 1.0 weight, 0% = 0.3 weight (never fully zero)
  return 0.3 + 0.7 * rate;
}
