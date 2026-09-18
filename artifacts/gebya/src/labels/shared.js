/**
 * shared labels — labels reused across multiple feature forms.
 *
 * Extracted because TransactionForm uses 'ብር'/'birr' in 6 places and other
 * forms (TodayTab, etc.) use the same pair. Centralizing prevents drift.
 *
 * Depth 3 cap respected (shared → currency → entry).
 * Strings copied verbatim from TransactionForm.jsx (lines L310, 534, 539, 549,
 * 726, 757) — provenance `05fa092` (file untouched since `974292b`).
 * NOTE (zero term decisions): 'ብር' (AM) vs 'birr' (EN) inconsistency preserved
 * as-found; normalization to 'ETB' is queued for post-R2.1 labels PR.
 */
export const shared = {
  currency: {
    // 'ብር' is used in AM, 'birr' (lowercase) in EN — locked as-found.
    sign: { en: 'birr', am: 'ብር' },
  },
};
