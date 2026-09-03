// Pure draft-persistence helpers extracted from ItemizedSaleView.jsx
export const MAX_PHOTOS = 3;
export const DRAFT_KEY = 'gebya_sale_draft';
// Separate key for the Today-tab inline strip so the strip and the
// full-screen workspace never clobber each other's in-progress sale.
export const STRIP_DRAFT_KEY = 'gebya_sale_strip_draft';

export function loadDraft(key = DRAFT_KEY) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch { return null; }
}

export function saveDraft(data, key = DRAFT_KEY) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export function clearDraft(key = DRAFT_KEY) {
  try { localStorage.removeItem(key); } catch {}
}
