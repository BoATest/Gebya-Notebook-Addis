import { Router, type Request, type Response } from "express";
import { requireDb } from "@workspace/db";
import { notifications, businessMembers, notificationPreferences } from "@workspace/db/schema";
import { eq, and, or, desc, count, isNull, gt } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { broadcastNotification, registerClient, removeClient } from "./notificationStream.js";
import { createNotification } from "../services/notificationCreator.js";
import { cleanupExpiredNotifications, getExpiredCount } from "../services/notificationCleanup.js";
import { safeEqual } from "../lib/secure.js";
import { notificationTypeKeys, type NotificationTypeKey } from "@workspace/db/schema";

const router = Router();

// ─── Auth helpers ──────────────────────────────────────────────────────────

function getUserIdFromRequest(req: any): number | null {
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const decoded = verifyJwt(token);
  return decoded?.userId || null;
}

async function getOwnerBusiness(userId: number): Promise<{ businessId: number; isOwner: boolean } | null> {
  const rows = await requireDb()
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);
  if (!rows.length) return null;
  return { businessId: rows[0].businessId, isOwner: rows[0].role === "owner" };
}

// ─── Core Notification Routes ──────────────────────────────────────────────

// GET / — list owner's notifications (newest first)
router.get("/", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const rows = await requireDb()
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId),
      or(isNull(notifications.expiresAt), gt(notifications.expiresAt, new Date()))
    ))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalRow] = await requireDb()
    .select({ total: count() })
    .from(notifications)
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId),
      or(isNull(notifications.expiresAt), gt(notifications.expiresAt, new Date()))
    ));

  res.json({ notifications: rows, total: totalRow?.total || 0 });
});

// GET /unread-count — count of unread notifications
router.get("/unread-count", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const [row] = await requireDb()
    .select({ total: count() })
    .from(notifications)
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId),
      eq(notifications.read, false)
    ));

  res.json({ count: row?.total || 0 });
});

// POST /:id/read — mark a notification as read
router.post("/:id/read", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid notification id" }); return;
  }

  await requireDb()
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(notifications.id, id),
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId)
    ));

  res.json({ ok: true });
});

// POST /read-all — mark all as read
router.post("/read-all", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  await requireDb()
    .update(notifications)
    .set({ read: true, readAt: new Date() })
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId),
      eq(notifications.read, false)
    ));

  res.json({ ok: true });
});

// POST / — create a notification (staff actions, system events)
router.post("/", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const { businessId, type, title, body, entityType, entityId, actorName, amount } = req.body;
  if (!businessId || !type || !title || !body) {
    res.status(400).json({ error: "businessId, type, title, body are required" }); return;
  }

  const actorMember = await requireDb()
    .select({ role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);

  if (!actorMember.length) {
    res.status(403).json({ error: "Not a member of this business" }); return;
  }

  const result = await createNotification({
    businessId: Number(businessId),
    type: String(type),
    title: String(title),
    body: String(body),
    entityType,
    entityId,
    actorName,
    amount,
  });

  res.json({ ok: result.inserted });
});

// ─── Cleanup Cron Route ────────────────────────────────────────────────────

// POST /cleanup — Vercel cron triggers this daily to delete expired notifications
router.post("/cleanup", async (req: Request, res: Response) => {
  try {
    // Verify Vercel cron signature
    if (req.headers?.["x-vercel-cron"] === "1") {
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

// ─── Preferences Routes ────────────────────────────────────────────────────

const DEFAULT_PREFS: Record<string, { inApp: boolean; push: boolean }> = {};
for (const key of notificationTypeKeys) {
  DEFAULT_PREFS[key] = { inApp: true, push: true };
}
DEFAULT_PREFS.expense = { inApp: true, push: false };

function parsePrefs(raw: string | null): { inApp: boolean; push: boolean } {
  if (!raw) return { inApp: true, push: true };
  try {
    const parsed = JSON.parse(raw);
    return { inApp: !!parsed.inApp, push: !!parsed.push };
  } catch {
    return { inApp: true, push: true };
  }
}

function serializePrefs(prefs: { inApp: boolean; push: boolean }): string {
  return JSON.stringify({ inApp: prefs.inApp, push: prefs.push });
}

const PREF_KEY_TO_COLUMN: Record<NotificationTypeKey, string> = {
  sale: "salePrefs",
  credit: "creditPrefs",
  payment: "paymentPrefs",
  payment_confirmed: "paymentPrefs",
  supplier_payment: "supplierPaymentPrefs",
  supplier_purchase: "supplierPurchasePrefs",
  expense: "expensePrefs",
  staff_joined: "staffJoinedPrefs",
  rbac_violation: "rbacViolationPrefs",
  overdue_alert: "overdueAlertPrefs",
  device_approval: "deviceApprovalPrefs",
  announcement: "announcementPrefs",
  support_reply: "supportReplyPrefs",
  staff_submitted_collection: "staffSubmittedCollectionPrefs",
  test: "announcementPrefs",
};

// GET /preferences — get owner's preferences
router.get("/preferences", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const [row] = await requireDb()
    .select()
    .from(notificationPreferences)
    .where(and(
      eq(notificationPreferences.businessId, owner.businessId),
      eq(notificationPreferences.userId, userId)
    ))
    .limit(1);

  if (!row) {
    const preferences: Record<string, { inApp: boolean; push: boolean }> = {};
    for (const key of notificationTypeKeys) {
      preferences[key] = DEFAULT_PREFS[key] || { inApp: true, push: true };
    }
    res.json({ preferences, quietHoursStart: null, quietHoursEnd: null });
    return;
  }

  const preferences: Record<string, { inApp: boolean; push: boolean }> = {};
  for (const key of notificationTypeKeys) {
    const columnName = PREF_KEY_TO_COLUMN[key];
    const raw = (row as any)[columnName] || null;
    preferences[key] = parsePrefs(raw);
  }

  res.json({
    preferences,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
  });
});

// PUT /preferences — update owner's preferences
router.put("/preferences", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const { preferences, quietHoursStart, quietHoursEnd } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (preferences && typeof preferences === "object") {
    for (const key of notificationTypeKeys) {
      if (preferences[key] && typeof preferences[key] === "object") {
        const columnName = PREF_KEY_TO_COLUMN[key];
        updates[columnName] = serializePrefs({
          inApp: !!preferences[key].inApp,
          push: !!preferences[key].push,
        });
      }
    }
  }

  if (quietHoursStart !== undefined) updates.quietHoursStart = quietHoursStart || null;
  if (quietHoursEnd !== undefined) updates.quietHoursEnd = quietHoursEnd || null;

  const [existing] = await requireDb()
    .select({ id: notificationPreferences.id })
    .from(notificationPreferences)
    .where(and(
      eq(notificationPreferences.businessId, owner.businessId),
      eq(notificationPreferences.userId, userId)
    ))
    .limit(1);

  if (existing) {
    await requireDb()
      .update(notificationPreferences)
      .set(updates)
      .where(eq(notificationPreferences.id, existing.id));
  } else {
    await requireDb().insert(notificationPreferences).values({
      businessId: owner.businessId,
      userId,
      ...updates,
    });
  }

  res.json({ ok: true });
});

// POST /preferences/reset — reset to defaults
router.post("/preferences/reset", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const [existing] = await requireDb()
    .select({ id: notificationPreferences.id })
    .from(notificationPreferences)
    .where(and(
      eq(notificationPreferences.businessId, owner.businessId),
      eq(notificationPreferences.userId, userId)
    ))
    .limit(1);

  if (existing) {
    await requireDb()
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.id, existing.id));
  }

  res.json({ ok: true });
});

// ─── SSE Real-time Stream ──────────────────────────────────────────────────

// GET /stream — SSE endpoint for real-time notification count
router.get("/stream", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`data: ${JSON.stringify({ type: "connected", ts: Date.now() })}\n\n`);

  registerClient(owner.businessId, userId, res);

  const heartbeat = setInterval(() => {
    try { res.write(`:heartbeat ${Date.now()}\n\n`); } catch { /* ignore */ }
  }, 30_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(owner.businessId, userId, res);
  });
});

export default router;
