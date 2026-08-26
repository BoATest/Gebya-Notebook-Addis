// Pure leaf helpers for the local Dexie store. No DB access; safe to extract.

export function toTimestamp(value, fallback = Date.now()) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeText(value) {
  const text = String(value || "").trim();
  return text || null;
}
