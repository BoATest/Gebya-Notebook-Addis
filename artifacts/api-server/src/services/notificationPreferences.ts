/**
 * Notification Preferences Checker
 *
 * Checks owner's notification preferences before delivering notifications.
 * Used by push sender and notification creation routes to respect user choices.
 *
 * Usage:
 *   const prefs = await getPreferencesForBusiness(businessId);
 *   if (!shouldNotify(prefs, "sale", "push")) return; // skip push
 *   if (!shouldNotify(prefs, "sale", "inApp")) return; // skip in-app
 */
import { requireDb } from "@workspace/db";
import { notificationPreferences } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import type { NotificationTypeKey } from "@workspace/db/schema";

interface ChannelPrefs {
  inApp: boolean;
  push: boolean;
}

interface OwnerPreferences {
  businessId: number;
  userId: number;
  preferences: Record<string, ChannelPrefs>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

const DEFAULT_PREFS: ChannelPrefs = { inApp: true, push: true };

const PREF_KEY_TO_COLUMN: Record<string, string> = {
  sale: "salePrefs",
  credit: "creditPrefs",
  payment: "paymentPrefs",
  payment_confirmed: "paymentPrefs", // Shares column with payment
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

function parsePrefs(raw: string | null): ChannelPrefs {
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const parsed = JSON.parse(raw);
    return { inApp: !!parsed.inApp, push: !!parsed.push };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Get all notification preferences for a business owner.
 * Returns cached-like results since this is called per-notification.
 */
export async function getPreferencesForBusiness(
  businessId: number,
  userId?: number
): Promise<OwnerPreferences | null> {
  const db = requireDb();

  // If userId not provided, find the owner
  let ownerId = userId;
  if (!ownerId) {
    const { businessMembers } = await import("@workspace/db/schema");
    const [owner] = await db
      .select({ userId: businessMembers.userId })
      .from(businessMembers)
      .where(and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.role, "owner"),
        eq(businessMembers.active, true)
      ))
      .limit(1);
    if (!owner) return null;
    ownerId = owner.userId;
  }

  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(and(
      eq(notificationPreferences.businessId, businessId),
      eq(notificationPreferences.userId, ownerId)
    ))
    .limit(1);

  if (!row) {
    // Return defaults
    const preferences: Record<string, ChannelPrefs> = {};
    for (const key of Object.keys(PREF_KEY_TO_COLUMN)) {
      preferences[key] = { ...DEFAULT_PREFS };
    }
    return {
      businessId,
      userId: ownerId,
      preferences,
      quietHoursStart: null,
      quietHoursEnd: null,
    };
  }

  const preferences: Record<string, ChannelPrefs> = {};
  for (const [key, columnName] of Object.entries(PREF_KEY_TO_COLUMN)) {
    const raw = (row as any)[columnName] || null;
    preferences[key] = parsePrefs(raw);
  }

  return {
    businessId,
    userId: ownerId,
    preferences,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
  };
}

/**
 * Check if a notification should be sent on a specific channel.
 * @param prefs - Owner preferences from getPreferencesForBusiness
 * @param notificationType - The notification type (e.g., "sale", "credit")
 * @param channel - "inApp" or "push"
 */
export function shouldNotify(
  prefs: OwnerPreferences | null,
  notificationType: string,
  channel: "inApp" | "push"
): boolean {
  if (!prefs) return true; // No preferences = allow all (safe default)

  const typePrefs = prefs.preferences[notificationType];
  if (!typePrefs) return true; // Unknown type = allow

  return typePrefs[channel];
}

/**
 * Check if we're currently in quiet hours.
 * @param prefs - Owner preferences
 * @returns true if current time is within quiet hours (should NOT send push)
 */
export function isInQuietHours(prefs: OwnerPreferences | null): boolean {
  if (!prefs || !prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same day range (e.g., 22:00 - 06:00 is actually cross-midnight)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Cross-midnight range (e.g., 22:00 - 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}
