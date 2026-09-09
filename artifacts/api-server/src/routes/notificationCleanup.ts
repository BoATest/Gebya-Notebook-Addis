/**
 * Notification Cleanup — Cron Route
 *
 * DELETE /notifications/cleanup — removes expired notifications (past TTL).
 * Called by Vercel Cron Jobs or manual trigger.
 *
 * Headers:
 *   x-vercel-cron: "1" (from Vercel Cron)
 *   x-vercel-signature: HMAC signature (verified against VERCEL_CRON_SIGNING_SECRET)
 */
import { Router, type Request, type Response } from "express";
import { safeEqual } from "../lib/secure.js";
import { cleanupExpiredNotifications, getExpiredCount } from "../services/notificationCleanup.js";

const router = Router();

router.all("/cleanup", async (req: Request, res: Response) => {
  try {
    // Verify Vercel cron signature
    const isVercelCron = req.headers?.["x-vercel-cron"] === "1";
    if (isVercelCron) {
      const signingSecret = process.env.VERCEL_CRON_SIGNING_SECRET?.trim();
      if (!signingSecret) {
        return res.status(500).json({ error: "Cron signing secret not configured" });
      }
      const signature = req.headers["x-vercel-signature"] as string | undefined;
      if (!safeEqual(signature, signingSecret)) {
        return res.status(401).json({ error: "unauthorized" });
      }
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
