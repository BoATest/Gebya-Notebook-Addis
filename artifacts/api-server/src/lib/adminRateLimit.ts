// In-memory sliding-window rate limiter for privileged admin mutations
// (broadcast, push-all, nudge, resend-reminders, reset-sms-quota). Per-instance
// only (serverless instances are independent), which is sufficient to throttle
// accidental/abusive bulk sends from a single admin session. For cross-instance
// enforcement, back this with Redis/Upstash later.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkAdminRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= t) {
    buckets.set(key, { count: 1, resetAt: t + windowMs });
    return { ok: true };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - t) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}
