/**
 * Centralized Notification Creation
 *
 * Single entry point for creating notifications with preferences checking.
 * Respects owner's notification preferences (per-type inApp/push toggles)
 * and quiet hours before delivery.
 *
 * Usage:
 *   await createNotification({ businessId, type: "sale", title: "...", body: "..." });
 */
import { requireDb } from "@workspace/db";
import { notifications, businessMembers } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { getPreferencesForBusiness, shouldNotify, isInQuietHours } from "./notificationPreferences.js";
import { sendPushToOwner } from "./pushNotificationSender.js";
import { broadcastNotification } from "./notificationStream.js";
import { logNotificationDelivery } from "./notificationLog.js";

interface CreateNotificationOpts {
  businessId: number;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  actorName?: string;
  amount?: number | string;
  /** Skip preferences check (for system-critical notifications like rbac_violation) */
  skipPreferences?: boolean;
  /** Skip push delivery (in-app only) */
  skipPush?: boolean;
}

/**
 * Create a notification with preferences checking.
 * - Checks inApp preference before inserting into DB
 * - Checks push preference + quiet hours before sending push
 * - Broadcasts SSE for real-time badge updates
 * - Falls back gracefully if preferences check fails (allows notification)
 */
export async function createNotification(opts: CreateNotificationOpts): Promise<{ inserted: boolean; pushResult?: { sent: number; failed: number } }> {
  const db = requireDb();
  const {
    businessId,
    type,
    title,
    body,
    entityType,
    entityId,
    actorName,
    amount,
    skipPreferences = false,
    skipPush = false,
  } = opts;

  // Find owner(s) of this business
  const owners = await db
    .select({ userId: businessMembers.userId })
    .from(businessMembers)
    .where(and(
      eq(businessMembers.businessId, businessId),
      eq(businessMembers.role, "owner"),
      eq(businessMembers.active, true)
    ));

  if (!owners.length) return { inserted: false };

  // Check preferences for each owner
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const rowsToInsert: any[] = [];
  const ownersToNotify: { userId: number; pushAllowed: boolean }[] = [];

  for (const owner of owners) {
    let pushAllowed = true;
    let inAppAllowed = true;

    if (!skipPreferences) {
      try {
        const prefs = await getPreferencesForBusiness(businessId, owner.userId);
        inAppAllowed = shouldNotify(prefs, type, "inApp");
        pushAllowed = shouldNotify(prefs, type, "push");

        // Quiet hours suppress push
        if (pushAllowed && isInQuietHours(prefs)) {
          pushAllowed = false;
        }
      } catch {
        // Preferences check failed — allow by default (safe fallback)
      }
    }

    if (inAppAllowed) {
      rowsToInsert.push({
        businessId,
        ownerUserId: owner.userId,
        type,
        title,
        body,
        entityType: entityType || null,
        entityId: entityId || null,
        actorName: actorName || null,
        amount: amount != null ? String(amount) : null,
        read: false,
        expiresAt,
      });
    }

    ownersToNotify.push({ userId: owner.userId, pushAllowed });
  }

  // Insert in-app notifications
  let inserted = false;
  if (rowsToInsert.length > 0) {
    const result = await db.insert(notifications).values(rowsToInsert).returning();
    inserted = result.length > 0;

    // Broadcast SSE for each owner
    for (const owner of ownersToNotify) {
      broadcastNotification(businessId, owner.userId);
    }
  }

  // Send push notifications (respecting preferences)
  if (!skipPush && inserted) {
    let totalSent = 0;
    let totalFailed = 0;

    for (const notif of (rowsToInsert.length > 0 ? await db.select().from(notifications).where(and(
      eq(notifications.businessId, businessId),
      eq(notifications.type, type)
    )).orderBy(notifications.id.desc()).limit(owners.length) : [])) {
      const ownerNotify = ownersToNotify.find(o => o.userId === notif.ownerUserId);
      if (!ownerNotify?.pushAllowed) continue;

      try {
        const result = await sendPushToOwner(businessId, {
          title: notif.title,
          body: notif.body,
          type: notif.type,
          id: notif.id,
          entityType: notif.entityType || undefined,
          entityId: notif.entityId || undefined,
        });
        totalSent += result.sent;
        totalFailed += result.failed;
      } catch {
        // Push delivery failure is non-critical
      }
    }

    return { inserted, pushResult: { sent: totalSent, failed: totalFailed } };
  }

  return { inserted };
}
