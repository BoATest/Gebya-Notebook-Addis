// Pure draft-persistence helpers extracted from ItemizedSaleView.jsx
export const MAX_PHOTOS = 3;
export const DRAFT_KEY = 'gebya_sale_draft';

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch { return null; }
}

export function saveDraft(data) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}
