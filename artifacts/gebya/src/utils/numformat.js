export function fmt(n) {
  return Number(n ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTransactionAmount(amount, type) {
  const formattedAmount = fmt(Math.abs(Number(amount || 0)));
  const sign = type === 'payment' ? '−' : '+';
  return `${sign}${formattedAmount}`;
}

export function fmtInput(str) {
  if (str === '' || str === null || str === undefined) return '';
  const s = String(str);
  const [int, dec] = s.split('.');
  const intFormatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${intFormatted}.${dec}` : intFormatted;
}

export function parseInput(str) {
  return String(str ?? '').replace(/,/g, '').replace(/^-/, '');
}

// ─── Live-typing sanitizers ──────────────────────────────────────────────────
//
// Both return STRINGS, never Numbers: a value that round-trips through
// parseFloat loses a decimal point the merchant is still typing ("2." becomes
// 2, "1.5" re-renders as a different string). Callers keep the raw string in
// state and only coerce at the point of calculation/submission.

/** Collapses everything after the first separator into a single decimal point. */
function collapseToSingleDecimalPoint(raw, { commaIsDecimalMark }) {
  let cleaned = commaIsDecimalMark ? raw.replace(/,/g, '.') : raw.replace(/,/g, '');
  cleaned = cleaned.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
}

/**
 * Quantities: digits + ONE decimal point.
 *
 * On a comma-locale keypad the ',' key IS the decimal mark the merchant aimed
 * for, so "1,5" means one and a half. The legacy digits-only filter deleted it
 * and silently produced 15 — a 10x quantity error.
 */
export function sanitizeQtyInput(raw) {
  return collapseToSingleDecimalPoint(String(raw ?? ''), { commaIsDecimalMark: true });
}

/**
 * Money amounts: digits + ONE decimal point, with the thousands separators
 * that fmtInput() inserts stripped back out so the value stays editable.
 *
 * Here ',' is a grouping separator, not a decimal mark — "1,000.25" must
 * survive a keystroke as "1000.25", not become "1.000.25".
 */
export function sanitizeAmountInput(raw) {
  return collapseToSingleDecimalPoint(String(raw ?? ''), { commaIsDecimalMark: false });
}
