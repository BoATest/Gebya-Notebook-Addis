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
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("notif_biz_owner_idx").on(t.businessId, t.ownerUserId, t.createdAt),
  index("notif_unread_idx").on(t.businessId, t.ownerUserId, t.read),
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
});

export const insertPushSubscriptionSchema = z.object({
  userId: z.number(),
  businessId: z.number(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  userAgent: z.string().nullable().optional(),
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
