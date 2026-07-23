// @ts-nocheck
// @ts-ignore
import rateLimit from "express-rate-limit";

let syncRateLimiter: any = (_req: any, _res: any, next: any) => next();
let inviteRateLimiter: any = (_req: any, _res: any, next: any) => next();
try {
  const rl = (rateLimit as any)?.default ?? rateLimit;
  if (typeof rl === "function") {
    syncRateLimiter = rl({ windowMs: 5 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: "Sync rate limit exceeded. Slow down." } });
    inviteRateLimiter = rl({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Invite rate limit exceeded. Max 10 invites per 15 minutes." } });
  }
} catch (e) {
  console.error("RateLimit init failed:", e);
}

export { syncRateLimiter, inviteRateLimiter };
