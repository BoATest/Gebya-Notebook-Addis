import { useMemo, useState, useRef, useEffect } from 'react';
import { useLang } from '../../context/LangContext';
import { fmt } from '../../utils/numformat';
import { computeAcceptanceWeight } from '../../utils/learningEngine';

/*
 * ── Merchant Memory Parameters ──────────────────────────────────────
 * All ranking weights and thresholds are exposed here as tunable
 * constants.  Before changing any value, validate the effect against
 * real Merkato usage timing (not arbitrary intuition):
 *
 *   METRIC TO TRACK:  time from "tap item field" → "price entered"
 *   TARGET:           reduce by 15%+ over 4 weeks without increasing errors
 *
 * Validation protocol:
 *   1. Ship with default values
 *   2. Measure baseline for 1 week (mean ± std dev of field-to-field time)
 *   3. Change ONE parameter
 *   4. Measure for 1 more week
 *   5. Revert if no improvement or if error rate rises
 */

const MEMORY_PARAMS = {
  // ── Recency half-life ──────────────────────────────────────────
  // Hours after which an item's recency score decays by 50%.
  //   Lower = recent items dominate faster (good for fast-moving goods)
  //   Higher = older history stays relevant (good for slow inventory)
  //   Validate: test 48 vs 96 in split-week A/B
  HALF_LIFE_HOURS: 72,

  // ── Memory score weights ───────────────────────────────────────
  // recency * RECENCY_WEIGHT + frequency * FREQUENCY_WEIGHT
  // Must sum to 1.0.
  RECENCY_WEIGHT: 0.7,
  FREQUENCY_WEIGHT: 0.3,

  // ── Frequency saturation ───────────────────────────────────────
  // use_count / (use_count + FREQ_SATURATION)
  //   Lower = each use matters more (good for new items to rise fast)
  //   Higher = needs many uses to matter (stable ranking for old items)
  //   Validate: test 5 vs 20 in same split-week
  FREQ_SATURATION: 10,

  // ── Session recency boost ──────────────────────────────────────
  // Items sold earlier in this session get their total score
  // multiplied by this factor.
  //   Current value: 1.5  (raised to 3 previously, reverted pending validation)
  //   Validate: test 1.5 vs 2.0 — does a higher boost cause merchants
  //   to select the wrong item more often under time pressure?
  //   Measure: autocomplete selection accuracy in the first 3 seconds
  SESSION_RECENCY_BOOST: 1.5,

  // ── Bigram fuzzy threshold ─────────────────────────────────────
  // Minimum Dice coefficient for a spelling-variant match.
  //   0.4 = lenient (catches "sukar" → "sugar")
  //   0.6 = strict (fewer false positives)
  //   Validate: survey merchants for "did we suggest what you meant?"
  BIGRAM_THRESHOLD: 0.4,

  // ── Result limits ──────────────────────────────────────────────
  MAX_SUGGESTIONS: 5,        // Catalog items shown when query typed
  MAX_QUICK_REPEAT: 5,       // Items shown in "LAST SALE" section

  // ── Match scores ───────────────────────────────────────────────
  PREFIX_SCORE: 1.0,         // name/code starts with query
  CONTAINS_SCORE: 0.8,       // query appears anywhere in name/code
};

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

function memoryScore(entry, now) {
  const P = MEMORY_PARAMS;
  const freq = Number(entry.use_count || 0);
  const lastUsed = Number(entry.last_used_at || entry.updated_at || 0);
  const ageHours = lastUsed ? (now - lastUsed) / (1000 * 60 * 60) : 9999;
  const recency = Math.exp(-ageHours / P.HALF_LIFE_HOURS);
  const acceptWeight = computeAcceptanceWeight(entry);
  return (recency * P.RECENCY_WEIGHT + (freq / Math.max(freq + P.FREQ_SATURATION, 1)) * P.FREQUENCY_WEIGHT) * acceptWeight;
}

export default function MerchantMemoryAutocomplete({
  query,
  catalogEntries = [],
  onSelect,
  onRemember,
  sessionRecentIds = new Set(),
  lastSaleItems = [],
  className = '',
}) {
  const { lang, t } = useLang();
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef(null);
  const P = MEMORY_PARAMS;

  const now = Date.now();
  const trimmedQuery = (query || '').trim();

  // Last-sale name index (preserved as-typed — no normalization)
  const lastSaleNames = useMemo(() => {
    const s = new Set();
    for (const n of lastSaleItems) s.add(n);
    return s;
  }, [lastSaleItems]);

  // Quick Repeat: shown when input is empty, from last completed sale
  const quickRepeatItems = useMemo(() => {
    if (trimmedQuery.length > 0 || lastSaleItems.length === 0) return [];
    const seen = new Set();
    const items = [];
    for (const name of lastSaleItems) {
      if (seen.has(name)) continue;
      seen.add(name);
      const match = catalogEntries.find(e => e.name === name);
      if (match) {
        items.push({ entry: match, similarity: 1, isQuickRepeat: true });
      } else {
        items.push({ entry: { name, id: null, kind: 'item' }, similarity: 1, isQuickRepeat: true, isUnknown: true });
      }
    }
    return items.slice(0, P.MAX_QUICK_REPEAT);
  }, [trimmedQuery, lastSaleItems, catalogEntries, P.MAX_QUICK_REPEAT]);

  // Search-based suggestions — matches catalog entries against what the
  // merchant is typing.  Matching is case-insensitive but display keeps
  // the catalog's stored name (which is the merchant's original text).
  const suggestions = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q || q.length < 1) return [];

    const prefixMatches = [];
    const fuzzyMatches = [];
    const containsMatches = [];

    for (const entry of catalogEntries) {
      if (!entry || entry.active === false || !entry.name) continue;
      const name = entry.name.toLowerCase();
      const code = (entry.code || entry.sku || entry.item_code || '').toLowerCase();

      if (name.startsWith(q) || code.startsWith(q)) {
        prefixMatches.push({ entry, similarity: P.PREFIX_SCORE });
      } else if (name.includes(q) || code.includes(q)) {
        containsMatches.push({ entry, similarity: P.CONTAINS_SCORE });
      } else {
        const sim = bigramSimilarity(q, name);
        if (sim >= P.BIGRAM_THRESHOLD) {
          fuzzyMatches.push({ entry, similarity: sim });
        }
      }
    }

    const all = [...prefixMatches, ...containsMatches, ...fuzzyMatches];
    all.sort((a, b) => {
      let scoreA = memoryScore(a.entry, now) * a.similarity;
      let scoreB = memoryScore(b.entry, now) * b.similarity;
      if (sessionRecentIds.has(a.entry.id)) scoreA *= P.SESSION_RECENCY_BOOST;
      if (sessionRecentIds.has(b.entry.id)) scoreB *= P.SESSION_RECENCY_BOOST;
      return scoreB - scoreA;
    });

    const seen = new Set();
    return all.filter(({ entry }) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }).slice(0, P.MAX_SUGGESTIONS);
  }, [trimmedQuery, catalogEntries, now, sessionRecentIds, P]);

  const showRemember = !trimmedQuery.startsWith(' ') && trimmedQuery.length >= 2 &&
    !suggestions.some(s => s.entry.name.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !quickRepeatItems.some(q => q.entry.name === trimmedQuery);

  const totalItems = quickRepeatItems.length + suggestions.length;
  const totalOptions = totalItems + (showRemember ? 1 : 0);

  useEffect(() => { setHighlightIndex(-1); }, [trimmedQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < quickRepeatItems.length) {
        const item = quickRepeatItems[highlightIndex];
        if (item.isUnknown && !item.entry.id) {
          onRemember(item.entry.name);
        } else {
          onSelect(item.entry);
        }
      } else if (highlightIndex >= quickRepeatItems.length && highlightIndex < totalItems) {
        onSelect(suggestions[highlightIndex - quickRepeatItems.length].entry);
      } else if (showRemember && highlightIndex === totalItems) {
        onRemember(trimmedQuery);
      }
    } else if (e.key === 'Escape') {
      setHighlightIndex(-1);
    }
  };

  if (quickRepeatItems.length === 0 && suggestions.length === 0 && !showRemember) return null;

  return (
    <div
      ref={listRef}
      className={`border overflow-hidden ${className}`}
      style={{ borderColor: '#edeae5', borderRadius: 'var(--radius-sm)', background: '#fff' }}
      role="listbox"
    >
      {/* Quick Repeat — last completed sale's items, names preserved exactly */}
      {quickRepeatItems.length > 0 && (
        <>
          <div className="px-2 py-1 text-[8px] font-bold uppercase tracking-widest" style={{ color: '#bbb0a0', background: '#faf9f7' }}>
            {lang === 'am' ? 'የመጨረሻ ሽያጭ' : 'LAST SALE'}
          </div>
          {quickRepeatItems.map((item, idx) => {
            const isHighlighted = idx === highlightIndex;
            return (
              <button
                key={item.entry.id || `qr-${item.entry.name}`}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                onClick={() => {
                  if (item.isUnknown && !item.entry.id) {
                    onRemember(item.entry.name);
                  } else {
                    onSelect(item.entry);
                  }
                }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className="w-full px-2 py-1.5 text-left flex items-center justify-between gap-2"
                style={{
                  background: isHighlighted ? '#f0fdf4' : '#fff',
                  minHeight: '32px',
                  borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span className="text-[11px] font-bold truncate" style={{ color: '#111827' }}>
                  {item.isUnknown && <span className="mr-1">+</span>}
                  {item.entry.name}
                </span>
                {item.entry.last_price > 0 && (
                  <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#9ca3af' }}>
                    {fmt(item.entry.last_price)}
                  </span>
                )}
              </button>
            );
          })}
        </>
      )}

      {/* Search-based suggestions — displayed in catalog's stored name (merchant's own text) */}
      {suggestions.map(({ entry, similarity }, idx) => {
        const listIdx = quickRepeatItems.length + idx;
        const lastPrice = entry.last_price || entry.last_unit_price || entry.default_price;
        const isHighlighted = listIdx === highlightIndex;
        const isSessionRecent = sessionRecentIds.has(entry.id);
        const wasInLastSale = lastSaleNames.has(entry.name);
        return (
          <button
            key={entry.id}
            type="button"
            role="option"
            aria-selected={isHighlighted}
            onClick={() => onSelect(entry)}
            onMouseEnter={() => setHighlightIndex(listIdx)}
            className="w-full px-2 py-1.5 text-left flex items-center justify-between gap-2"
            style={{
              background: isHighlighted ? '#f0fdf4' : '#fff',
              minHeight: '32px',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold truncate" style={{ color: '#111827' }}>
                {isSessionRecent && <span className="mr-0.5 text-[10px]">🕒</span>}
                {wasInLastSale && <span className="mr-0.5 text-[10px]">↩</span>}
                {entry.name}
              </span>
              {(entry.code || entry.sku || entry.item_code) && (
                <span className="block text-[9px] truncate" style={{ color: '#9ca3af' }}>
                  {entry.code || entry.sku || entry.item_code}
                </span>
              )}
            </span>
            {lastPrice > 0 && (
              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#9ca3af' }}>
                {fmt(lastPrice)}
              </span>
            )}
          </button>
        );
      })}
      {showRemember && (
        <button
          type="button"
          role="option"
          aria-selected={highlightIndex === totalItems}
          onClick={() => onRemember(trimmedQuery)}
          onMouseEnter={() => setHighlightIndex(totalItems)}
          className="w-full px-2 py-1.5 text-left flex items-center gap-2"
          style={{
            background: highlightIndex === totalItems ? '#f0fdf4' : '#faf9f7',
            minHeight: '32px',
          }}
        >
          <span className="text-[11px]">+</span>
          <span className="text-[11px] font-bold" style={{ color: '#1B4332' }}>
            {lang === 'am' ? `አስታውስ "${query}"` : `Remember "${query}"`}
          </span>
        </button>
      )}
    </div>
  );
}

export { bigramSimilarity, memoryScore, MEMORY_PARAMS };
