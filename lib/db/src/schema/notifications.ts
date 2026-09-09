import { pgTable, serial, integer, varchar, text, boolean, numeric, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod";
import { businesses } from "./businesses";
import { users } from "./users";

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entity_type", { length: 64 }),
  entityId: varchar("entity_id", { length: 128 }),
  actorName: varchar("actor_name", { length: 128 }),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  read: boolean("read").default(false).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  pushFailed: boolean("push_failed").default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("notif_biz_owner_idx").on(t.businessId, t.ownerUserId, t.createdAt),
  index("notif_unread_idx").on(t.businessId, t.ownerUserId, t.read),
  index("notif_expires_idx").on(t.expiresAt),
]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("push_sub_endpoint_idx").on(t.endpoint),
  index("push_sub_user_idx").on(t.userId),
  index("push_sub_biz_idx").on(t.businessId),
]);

export const insertNotificationSchema = z.object({
  businessId: z.number(),
  ownerUserId: z.number(),
  type: z.string().max(64),
  title: z.string().max(255),
  body: z.string(),
  entityType: z.string().max(64).nullable().optional(),
  entityId: z.string().max(128).nullable().optional(),
  actorName: z.string().max(128).nullable().optional(),
  amount: z.number().nullable().optional(),
  read: z.boolean().optional(),
  readAt: z.date().nullable().optional(),
  deliveredAt: z.date().nullable().optional(),
  pushFailed: z.boolean().optional(),
  expiresAt: z.date().nullable().optional(),
});

// ─── Notification Preferences ─────────────────────────────────────────────

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Per-type preferences stored as JSONB
  salePrefs: varchar("sale_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  creditPrefs: varchar("credit_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  paymentPrefs: varchar("payment_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  supplierPaymentPrefs: varchar("supplier_payment_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  supplierPurchasePrefs: varchar("supplier_purchase_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  expensePrefs: varchar("expense_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  staffJoinedPrefs: varchar("staff_joined_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  rbacViolationPrefs: varchar("rbac_violation_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  overdueAlertPrefs: varchar("overdue_alert_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  deviceApprovalPrefs: varchar("device_approval_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  announcementPrefs: varchar("announcement_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  supportReplyPrefs: varchar("support_reply_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  staffSubmittedCollectionPrefs: varchar("staff_submitted_collection_prefs", { length: 255 }).default('{"inApp":true,"push":true}'),
  // Quiet hours
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  uniqueIndex("notif_prefs_biz_user_idx").on(t.businessId, t.userId),
]);

export const insertPushSubscriptionSchema = z.object({
  userId: z.number(),
  businessId: z.number(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  userAgent: z.string().nullable().optional(),
});

export const notificationTypeKeys = [
  "sale", "credit", "payment", "supplier_payment", "supplier_purchase",
  "expense", "staff_joined", "rbac_violation", "overdue_alert",
  "device_approval", "announcement", "support_reply", "staff_submitted_collection",
] as const;

export type NotificationTypeKey = (typeof notificationTypeKeys)[number];

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
