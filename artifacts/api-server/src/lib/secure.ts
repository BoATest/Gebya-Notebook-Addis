import crypto from "crypto";

/**
 * Constant-time string comparison for secrets (cron tokens, warmup secret,
 * Vercel cron signatures). Returns false if either side is missing.
 * Avoids `===` so a timing side-channel cannot be used to brute-force secrets.
 */
export function safeEqual(
  a: string | string[] | null | undefined,
  b: string | string[] | null | undefined,
): boolean {
  const norm = (v: string | string[] | null | undefined): string | null =>
    v == null ? null : Array.isArray(v) ? (v[0] ?? null) : v;
  const av = norm(a);
  const bv = norm(b);
  if (!av || !bv) return false;
  const ab = Buffer.from(av);
  const bb = Buffer.from(bv);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const SENSITIVE_KEY_RE = /(secret|token|password|passwd|apikey|api_key|authorization|otp)/i;

/**
 * Strips secret-bearing query parameters from a URL before logging, so request
 * logs never persist credentials (e.g. ?secret=... or ?token=...).
 */
export function scrubUrl(url: string): string {
  if (!url || !url.includes("?")) return url;
  try {
    const qIndex = url.indexOf("?");
    const path = url.slice(0, qIndex);
    const query = url.slice(qIndex + 1);
    const cleaned = query.replace(/([^?&=]+)=([^&]*)/g, (_m, k: string, v: string) =>
      SENSITIVE_KEY_RE.test(k) ? `${k}=[redacted]` : `${k}=${v}`,
    );
    return `${path}?${cleaned}`;
  } catch {
    return url;
  }
}
