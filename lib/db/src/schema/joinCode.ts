// Join code generation, normalization, and validation.
//
// Used by both the server (creating and matching codes) and the
// client (parsing the staff's input). The same algorithm must run
// on both sides for the join to work.
//
// Format: 8 chars total, formatted as XXXX-XXXX, using uppercase
// letters (excluding ambiguous: 0/O, 1/I) and digits (excluding
// 0 and 1 to keep the visual identity of letters vs digits clean).
//
// Reference: spec section F.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no 0/1/O/I

/**
 * Generate a fresh join code, formatted as XXXX-XXXX.
 * Uses Math.random — fine for codes that are not security
 * tokens. The code's entropy is 32^8 ≈ 1.1e12, which is
 * enough to make accidental guessing infeasible.
 */
export function generateJoinCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) out += "-";
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Normalize a user-typed join code. Accepts lowercase, mixed
 * case, missing dash, extra whitespace, the lot. Returns the
 * canonical XXXX-XXXX form, or null if the code is invalid.
 *
 * The normalization is conservative: it strips, uppercases,
 * removes spaces and dashes, then re-formats with a dash at
 * position 4. If the cleaned code is not 8 chars in
 * ALPHABET, returns null.
 */
export function normalizeJoinCode(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
  if (cleaned.length !== 8) return null;
  for (const ch of cleaned) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}

/**
 * Compare two join codes ignoring the dash. Used by the server
 * to match user input against the stored code even if the
 * stored code was re-formatted differently.
 */
export function joinCodesEqual(a: string, b: string): boolean {
  const na = normalizeJoinCode(a);
  const nb = normalizeJoinCode(b);
  if (!na || !nb) return false;
  return na === nb;
}
