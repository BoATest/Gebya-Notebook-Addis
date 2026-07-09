import { useMemo, useState, useRef, useEffect } from 'react';
import { useLang } from '../../context/LangContext';
import { fmt } from '../../utils/numformat';
import { computeAcceptanceWeight } from '../../utils/learningEngine';

/**
 * Character bigram similarity (Dice coefficient).
 * Reuses the algorithm from learningEngine.js for consistency.
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

/**
 * Compute Merchant Memory Score for a catalog entry.
 * ~70% recency (exponential decay, 72h half-life) + ~30% frequency.
 * Weighted by acceptance rate.
 */
function memoryScore(entry, now) {
  const freq = Number(entry.use_count || 0);
  const lastUsed = Number(entry.last_used_at || entry.updated_at || 0);
  const ageHours = lastUsed ? (now - lastUsed) / (1000 * 60 * 60) : 9999;
  const HALF_LIFE = 72;
  const recency = Math.exp(-ageHours / HALF_LIFE);
  const acceptWeight = computeAcceptanceWeight(entry);
  return (recency * 0.7 + (freq / Math.max(freq + 10, 1)) * 0.3) * acceptWeight;
}

export default function MerchantMemoryAutocomplete({
  query,
  catalogEntries = [],
  onSelect,
  onRemember,
  className = '',
}) {
  const { lang, t } = useLang();
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef(null);

  const now = Date.now();
  const trimmedQuery = (query || '').trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!trimmedQuery || trimmedQuery.length < 1) return [];

    // 1. Exact prefix matches (highest priority)
    const prefixMatches = [];
    // 2. Fuzzy matches
    const fuzzyMatches = [];
    // 3. Contains matches
    const containsMatches = [];

    for (const entry of catalogEntries) {
      if (!entry || entry.active === false || !entry.name) continue;
      const name = entry.name.toLowerCase();
      const code = (entry.code || entry.sku || entry.item_code || '').toLowerCase();

      if (name.startsWith(trimmedQuery) || code.startsWith(trimmedQuery)) {
        prefixMatches.push({ entry, similarity: 1 });
      } else if (name.includes(trimmedQuery) || code.includes(trimmedQuery)) {
        containsMatches.push({ entry, similarity: 0.8 });
      } else {
        const sim = bigramSimilarity(trimmedQuery, name);
        if (sim >= 0.4) {
          fuzzyMatches.push({ entry, similarity: sim });
        }
      }
    }

    // Combine: prefix first, then contains, then fuzzy, all sorted by memory score
    const all = [...prefixMatches, ...containsMatches, ...fuzzyMatches];
    all.sort((a, b) => {
      const scoreA = memoryScore(a.entry, now) * a.similarity;
      const scoreB = memoryScore(b.entry, now) * b.similarity;
      return scoreB - scoreA;
    });

    // Deduplicate by entry.id
    const seen = new Set();
    return all.filter(({ entry }) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }).slice(0, 5);
  }, [trimmedQuery, catalogEntries, now]);

  const showRemember = trimmedQuery.length >= 2 &&
    !suggestions.some(s => s.entry.name.toLowerCase() === trimmedQuery);

  useEffect(() => { setHighlightIndex(-1); }, [trimmedQuery]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1 + (showRemember ? 1 : 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        onSelect(suggestions[highlightIndex].entry);
      } else if (showRemember && highlightIndex === suggestions.length) {
        onRemember(trimmedQuery);
      }
    } else if (e.key === 'Escape') {
      setHighlightIndex(-1);
    }
  };

  if (!trimmedQuery || (suggestions.length === 0 && !showRemember)) return null;

  return (
    <div
      ref={listRef}
      className={`border overflow-hidden ${className}`}
      style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-sm)', background: '#fff' }}
      role="listbox"
    >
      {suggestions.map(({ entry, similarity }, idx) => {
        const lastPrice = entry.last_price || entry.last_unit_price || entry.default_price;
        const isHighlighted = idx === highlightIndex;
        return (
          <button
            key={entry.id}
            type="button"
            role="option"
            aria-selected={isHighlighted}
            onClick={() => onSelect(entry)}
            onMouseEnter={() => setHighlightIndex(idx)}
            className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-2 border-b last:border-b-0"
            style={{
              borderColor: '#f3f4f6',
              background: isHighlighted ? '#f0fdf4' : '#fff',
              minHeight: '44px',
            }}
          >
            <span className="min-w-0">
              <span className="block text-sm font-bold truncate" style={{ color: '#111827' }}>
                {entry.name}
              </span>
              {(entry.code || entry.sku || entry.item_code) && (
                <span className="block text-xs truncate" style={{ color: '#6b7280' }}>
                  {entry.code || entry.sku || entry.item_code}
                </span>
              )}
            </span>
            {lastPrice > 0 && (
              <span className="text-xs font-bold flex-shrink-0" style={{ color: '#14532d' }}>
                {fmt(lastPrice)} ETB
              </span>
            )}
          </button>
        );
      })}
      {showRemember && (
        <button
          type="button"
          role="option"
          aria-selected={highlightIndex === suggestions.length}
          onClick={() => onRemember(trimmedQuery)}
          onMouseEnter={() => setHighlightIndex(suggestions.length)}
          className="w-full px-3 py-2.5 text-left flex items-center gap-2 border-b last:border-b-0"
          style={{
            borderColor: '#f3f4f6',
            background: highlightIndex === suggestions.length ? '#f0fdf4' : '#faf9f7',
            minHeight: '44px',
          }}
        >
          <span className="text-base">✓</span>
          <span className="text-sm font-bold" style={{ color: '#1B4332' }}>
            {lang === 'am' ? `አስታውስ "${query}"` : `Remember "${query}"`}
          </span>
        </button>
      )}
    </div>
  );
}

export { bigramSimilarity, memoryScore };
