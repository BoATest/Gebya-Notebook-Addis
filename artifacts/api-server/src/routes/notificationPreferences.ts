/**
 * Notification Preferences — API Routes
 *
 * Endpoints:
 *   GET  /preferences       — Get owner's notification preferences
 *   PUT  /preferences       — Update owner's notification preferences
 *   POST /preferences/reset — Reset to defaults
 */
import { Router, type Request, type Response } from "express";
import { requireDb } from "@workspace/db";
import { notificationPreferences, businessMembers } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyJwt } from "./auth.js";
import { notificationTypeKeys, type NotificationTypeKey } from "@workspace/db/schema";

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
  const rows = await requireDb()
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);
  if (!rows.length) return null;
  return { businessId: rows[0].businessId, isOwner: rows[0].role === "owner" };
}

// ─── Default preferences ──────────────────────────────────────────────────

const DEFAULT_PREFS: Record<string, { inApp: boolean; push: boolean }> = {};
for (const key of notificationTypeKeys) {
  DEFAULT_PREFS[key] = { inApp: true, push: true };
}
// Suppress push for expenses by default (owner can re-enable)
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

// Map from API preference key to database column name
const PREF_KEY_TO_COLUMN: Record<NotificationTypeKey, string> = {
  sale: "salePrefs",
  credit: "creditPrefs",
  payment: "paymentPrefs",
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
};

// ─── GET /preferences — get owner's preferences ───────────────────────────

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
    // Return defaults if no preferences exist yet
    const preferences: Record<string, { inApp: boolean; push: boolean }> = {};
    for (const key of notificationTypeKeys) {
      preferences[key] = DEFAULT_PREFS[key] || { inApp: true, push: true };
    }
    res.json({
      preferences,
      quietHoursStart: null,
      quietHoursEnd: null,
    });
    return;
  }

  // Parse stored preferences
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

// ─── PUT /preferences — update owner's preferences ────────────────────────

router.put("/preferences", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) { res.status(401).json({ error: "Authorization required" }); return; }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" }); return;
  }

  const { preferences, quietHoursStart, quietHoursEnd } = req.body;

  // Build update object
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

  // Upsert preferences
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

// ─── POST /preferences/reset — reset to defaults ──────────────────────────

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

export default router;
