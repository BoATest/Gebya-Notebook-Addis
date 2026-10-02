/**
 * Money validation helpers for the numeric(12,2) migration (MIGRATION_PLAN §2, Amendment 1).
 *
 * The 2dp check MUST be epsilon-based: IEEE-754 makes e.g. 1.1 * 100 === 110.00000000000001,
 * so exact equality (`Math.round(v*100) === v*100`) rejects perfectly valid 2dp values.
 * see money-epsilon.test.ts for the required cases.
 */

/** Round to 2 decimal places, half-away-from-zero (mirrors PG ROUND(numeric,2)). */
export function roundMoney(v: number | string | null | undefined): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (n == null || !Number.isFinite(n)) return 0;
  // Normalize the scaled value through toFixed: at magnitudes above ~100 the
  // Number.EPSILON nudge is far below double spacing and does nothing, so
  // 10.155 * 100 === 1015.4999999999999 would round down. toFixed(6) re-anchors
  // the intended half-cent. Sign applied after rounding for symmetric behavior.
  const scaled = Number((n * 100).toFixed(6));
  return (Math.sign(scaled) || 1) * Math.round(Math.abs(scaled)) / 100;
}

/**
 * True when v carries at most 2 decimal places (within float epsilon).
 * Accepts the client's JSON numbers and numeric strings ("150.50").
 * Empty/whitespace strings are REJECTED (Number("") === 0 is a silent trap).
 */
export function isMoney2dp(v: number | string): boolean {
  let n: number;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return false;
    n = Number(s);
  } else {
    n = v;
  }
  if (!Number.isFinite(n)) return false;
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

/**
 * Coerce any incoming money value (number, numeric-as-string, null) to a safe
 * 2dp-rounded JS number — the single conversion used at every server boundary.
 */
export function toMoneyNumber(v: number | string | null | undefined): number {
  return roundMoney(v);
}
