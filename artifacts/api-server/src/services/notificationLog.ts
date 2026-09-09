/**
 * Notification Log Service
 *
 * Tracks notification delivery attempts for debugging and basic analytics.
 * Simple append-only log — no complex querying needed at this stage.
 *
 * Usage:
 *   await logNotificationDelivery({
 *     notificationId: 123,
 *     businessId: 1,
 *     channel: 'push',
 *     status: 'sent',
 *   });
 */
import { pgTable, serial, integer, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { requireDb } from "@workspace/db";
import { businesses } from "@workspace/db/schema";

// ─── Schema ────────────────────────────────────────────────────────────────

export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id"),
  businessId: integer("business_id").references(() => businesses.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 32 }).notNull(), // "in_app" | "push" | "sms" | "telegram"
  status: varchar("status", { length: 32 }).notNull(), // "sent" | "delivered" | "failed" | "read"
  error: text("error"),
  metadata: text("metadata"), // JSON string for extra context
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("notif_log_biz_idx").on(t.businessId),
  index("notif_log_notif_idx").on(t.notificationId),
]);

// ─── Log entry type ────────────────────────────────────────────────────────

export interface NotificationLogEntry {
  notificationId?: number;
  businessId?: number;
  channel: "in_app" | "push" | "sms" | "telegram";
  status: "sent" | "delivered" | "failed" | "read";
  error?: string;
  metadata?: Record<string, unknown>;
}

// ─── Logging function ──────────────────────────────────────────────────────

export async function logNotificationDelivery(entry: NotificationLogEntry): Promise<void> {
  try {
    const db = requireDb();
    await db.insert(notificationLogs).values({
      notificationId: entry.notificationId || null,
      businessId: entry.businessId || null,
      channel: entry.channel,
      status: entry.status,
      error: entry.error || null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (err) {
    // Non-critical: logging should never break the main flow
    console.error("[NotificationLog] Failed to write log:", err);
  }
}

// ─── Query helpers (for manual debugging) ──────────────────────────────────

export async function getRecentLogs(
  businessId: number,
  limit = 50
): Promise<any[]> {
  const db = requireDb();
  const { desc, eq } = await import("drizzle-orm");
  return db
    .select()
    .from(notificationLogs)
    .where(eq(notificationLogs.businessId, businessId))
    .orderBy(desc(notificationLogs.createdAt))
    .limit(limit);
}

export async function getDeliveryStats(
  businessId: number,
  since?: Date
): Promise<{ channel: string; status: string; count: number }[]> {
  const db = requireDb();
  const { eq, and, gte, sql } = await import("drizzle-orm");
  const where = since
    ? and(eq(notificationLogs.businessId, businessId), gte(notificationLogs.createdAt, since))
    : eq(notificationLogs.businessId, businessId);

  return db
    .select({
      channel: notificationLogs.channel,
      status: notificationLogs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(notificationLogs)
    .where(where)
    .groupBy(notificationLogs.channel, notificationLogs.status);
}
