// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptions, notifications } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { sendPushToOwner, getVapidPublicKey, isPushConfigured } from "../services/pushNotificationSender.js";

const router = Router();

function getUserIdFromRequest(req: any): number | null {
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = verifyJwt(token);
  return decoded?.userId || null;
}

async function getOwnerBusiness(userId: number): Promise<{ businessId: number; isOwner: boolean } | null> {
  const { businessMembers } = await import("@workspace/db/schema");
  const rows = await db
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);
  if (!rows.length) return null;
  return { businessId: rows[0].businessId, isOwner: rows[0].role === "owner" };
}

// GET /push/vapid-key — returns the VAPID public key for the client
router.get("/vapid-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: "Push notifications not configured" }); return;
  }
  res.json({ publicKey: key });
});

// POST /push/subscribe — owner saves their push subscription
router.post("/subscribe", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const { endpoint, p256dh, auth } = req.body;
  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "Missing subscription keys" }); return;
  }

  // Upsert by endpoint (one subscription per browser)
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ p256dh, auth, userId })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      userId,
      businessId: owner.businessId,
      endpoint,
      p256dh,
      auth,
      userAgent: req.headers["user-agent"] || null,
    });
  }

  res.json({ ok: true });
});

// POST /push/unsubscribe — owner removes a subscription
router.post("/unsubscribe", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: "Missing endpoint" }); return;
  }

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  res.json({ ok: true });
});

// POST /push/test — owner sends themselves a test notification
router.post("/test", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  if (!isPushConfigured()) {
    res.status(503).json({ error: "Push notifications not configured on server" }); return;
  }

  // Insert a test notification
  const [notif] = await db
    .insert(notifications)
    .values({
      businessId: owner.businessId,
      ownerUserId: userId,
      type: "test",
      title: "Test notification",
      body: "Push notifications are working! You will receive alerts here when staff record activity.",
      read: false,
    })
    .returning({ id: notifications.id });

  const result = await sendPushToOwner(owner.businessId, {
    title: "Test notification",
    body: "Push notifications are working!",
    type: "test",
    id: notif.id,
  });

  res.json({ ok: true, ...result });
});

export default router;
