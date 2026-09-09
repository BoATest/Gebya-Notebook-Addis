import webPush from "web-push";
import { db } from "@workspace/db";
import { pushSubscriptions, notifications } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logNotificationDelivery } from "./notificationLog.js";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@gebya.app";

// Batch size limit to stay within Vercel's 60s function timeout.
// Each push send takes ~100-300ms. 20 subscriptions ≈ 2-6s.
const PUSH_BATCH_SIZE = 20;

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  try {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
    return true;
  } catch {
    return false;
  }
}

export function isPushConfigured() {
  return ensureVapid();
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

// ─── Deep-link URL builder ────────────────────────────────────────────────
// Maps notification type + entity to a client-side route for deep-linking.

function buildDeepLinkUrl(
  type: string,
  entityType?: string | null,
  entityId?: string | null
): string {
  switch (type) {
    case "sale":
    case "expense":
      return "/today";
    case "credit":
      return entityType === "customer_transactions" && entityId
        ? `/credit?customer=${entityId}`
        : "/credit";
    case "payment":
      return entityType === "customer_transactions" && entityId
        ? `/credit?customer=${entityId}`
        : "/credit";
    case "supplier_payment":
    case "supplier_purchase":
      return entityType === "supplier_transactions" && entityId
        ? `/credit?supplier=${entityId}`
        : "/credit";
    case "staff_joined":
    case "rbac_violation":
    case "device_approval":
      return "/settings";
    case "overdue_alert":
      return "/credit";
    case "announcement":
    case "support_reply":
      return "/";
    default:
      return "/";
  }
}

// ─── Notification priority mapping ────────────────────────────────────────
// Urgent types get louder vibration; informational types are silent.

type NotificationPriority = "high" | "normal" | "low";

const TYPE_PRIORITY: Record<string, NotificationPriority> = {
  rbac_violation: "high",
  device_approval: "high",
  overdue_alert: "high",
  sale: "normal",
  credit: "normal",
  payment: "normal",
  supplier_payment: "normal",
  supplier_purchase: "normal",
  expense: "normal",
  staff_joined: "normal",
  announcement: "low",
  support_reply: "low",
  test: "normal",
  staff_submitted_collection: "normal",
};

const VIBRATION_PATTERNS: Record<NotificationPriority, number[]> = {
  high: [200, 100, 200, 100, 200],
  normal: [100, 50, 100],
  low: [50],
};

export function getPriorityForType(type: string): NotificationPriority {
  return TYPE_PRIORITY[type] || "normal";
}

export function getVibrationForType(type: string): number[] {
  return VIBRATION_PATTERNS[getPriorityForType(type)];
}

// ─── Send push to owner ───────────────────────────────────────────────────

export async function sendPushToOwner(
  businessId: number,
  notification: {
    title: string;
    body: string;
    type: string;
    id: number;
    entityType?: string;
    entityId?: string;
  },
  preloadedSubscriptions?: { id: number; endpoint: string; p256dh: string; auth: string; businessId: number }[]
): Promise<{ sent: number; failed: number; remaining: number }> {
  if (!ensureVapid()) {
    console.warn("[push] VAPID not configured, skipping push delivery");
    return { sent: 0, failed: 0, remaining: 0 };
  }

  if (!db) throw new Error("Database not configured");
  const allSubscriptions = preloadedSubscriptions?.filter(s => s.businessId === businessId) ?? await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.businessId, businessId));

  if (allSubscriptions.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  // Build deep-link URL
  const deepLinkUrl = buildDeepLinkUrl(notification.type, notification.entityType, notification.entityId);
  const priority = getPriorityForType(notification.type);

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    type: notification.type,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: deepLinkUrl, notificationId: notification.id },
    tag: `gebya-${notification.type}`,
    renotify: true,
    priority,
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  });

  // Process in batches to stay within Vercel timeout
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < allSubscriptions.length; i += PUSH_BATCH_SIZE) {
    const batch = allSubscriptions.slice(i, i + PUSH_BATCH_SIZE);

    for (const sub of batch) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }
  }

  // Track delivery status on the notification record
  try {
    if (sent > 0) {
      await db
        .update(notifications)
        .set({ deliveredAt: new Date() })
        .where(eq(notifications.id, notification.id));
    }
    // Only mark as failed if ALL subscriptions failed (partial success is not a failure)
    if (failed > 0 && sent === 0) {
      await db
        .update(notifications)
        .set({ pushFailed: true })
        .where(eq(notifications.id, notification.id));
    }
  } catch {
    // Non-critical: don't fail the push operation over tracking
  }

  // Log delivery attempt
  logNotificationDelivery({
    notificationId: notification.id,
    businessId,
    channel: "push",
    status: sent > 0 ? "sent" : "failed",
    metadata: { sent, failed, remaining: allSubscriptions.length - sent - failed },
  }).catch(() => {});

  const remaining = Math.max(0, allSubscriptions.length - sent - failed);
  return { sent, failed, remaining };
}
