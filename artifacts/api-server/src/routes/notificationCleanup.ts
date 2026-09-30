/**
 * Notification Cleanup — Cron Route
 *
 * DELETE /notifications/cleanup — removes expired notifications (past TTL).
 * Called by Vercel Cron Jobs or manual trigger.
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET> (sent automatically by Vercel Cron)
 */
import { Router, type Request, type Response } from "express";
import { safeEqual } from "../lib/secure.js";
import { cleanupExpiredNotifications, getExpiredCount } from "../services/notificationCleanup.js";

const router = Router();

router.all("/cleanup", async (req: Request, res: Response) => {
  try {
    // Authentication is required for EVERY caller (Vercel Cron sends CRON_SECRET as
    // `Authorization: Bearer <secret>`). The old code only checked when x-vercel-cron was
    // present, so a request that omitted that header skipped authentication entirely.
    const bearerToken = (req.headers["authorization"] as string | undefined)?.replace(/^Bearer\s+/i, "");
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (!cronSecret) {
      console.error("[security] CRON_SECRET is not set - rejecting cleanup request");
      return res.status(500).json({ error: "Cron secret not configured" });
    }
    if (!safeEqual(bearerToken, cronSecret)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const expiredCount = await getExpiredCount();
    if (expiredCount === 0) {
      return res.json({ ok: true, deleted: 0, message: "No expired notifications" });
    }

    const result = await cleanupExpiredNotifications();
    console.log(`[NotificationCleanup] Deleted ${result.deleted} expired notifications`);
    return res.json({ ok: true, deleted: result.deleted });
  } catch (err) {
    console.error("[NotificationCleanup] Failed:", err);
    return res.status(500).json({ error: "Cleanup failed" });
  }
});

export default router;
