// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { notifications, businessMembers } from "@workspace/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { verifyJwt } from "./auth.js";

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
  const rows = await db
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);
  if (!rows.length) return null;
  return { businessId: rows[0].businessId, isOwner: rows[0].role === "owner" };
}

// GET /notifications — list owner's notifications (newest first)
router.get("/", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const rows = await db
    .select()
    .from(notifications)
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId)
    ))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId)
    ));

  res.json({ notifications: rows, total: totalRow?.total || 0 });
});

// GET /notifications/unread-count — count of unread notifications
router.get("/unread-count", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId),
      eq(notifications.read, false)
    ));

  res.json({ count: row?.total || 0 });
});

// POST /notifications/:id/read — mark a notification as read
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

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(
      eq(notifications.id, id),
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId)
    ));

  res.json({ ok: true });
});

// POST /notifications/read-all — mark all as read
router.post("/read-all", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(
      eq(notifications.businessId, owner.businessId),
      eq(notifications.ownerUserId, userId),
      eq(notifications.read, false)
    ));

  res.json({ ok: true });
});

// POST /notifications — create a notification (staff actions, system events)
router.post("/", async (req, res) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const { businessId, type, title, body, entityType, entityId, actorName, amount } = req.body;
  if (!businessId || !type || !title || !body) {
    res.status(400).json({ error: "businessId, type, title, body are required" }); return;
  }

  // Verify the actor belongs to this business
  const actorMember = await db
    .select({ role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);

  if (!actorMember.length) {
    res.status(403).json({ error: "Not a member of this business" }); return;
  }

  // Find the owner(s) of this business to notify
  const owners = await db
    .select({ userId: businessMembers.userId })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.role, "owner"), eq(businessMembers.active, true)));

  if (!owners.length) {
    res.status(404).json({ error: "No owner found for this business" }); return;
  }

  const inserted = await db.insert(notifications).values(
    owners.map(owner => ({
      businessId: Number(businessId),
      ownerUserId: owner.userId,
      type: String(type),
      title: String(title),
      body: String(body),
      entityType: entityType || null,
      entityId: entityId || null,
      actorName: actorName || null,
      amount: amount != null ? Number(amount) : null,
      read: false,
    }))
  ).returning();

  res.json({ notifications: inserted });
});

export default router;
