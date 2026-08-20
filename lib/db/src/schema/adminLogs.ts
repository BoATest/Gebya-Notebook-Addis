import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { businesses } from "./businesses.js";

// Admin-facing log for a shop: private notes, outreach messages sent by the
// platform team, and administrative actions (e.g. SMS quota resets). All rows
// are scoped to a businessId and attributed to the admin's phone number.
export const adminShopLogs = pgTable("admin_shop_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  adminPhone: varchar("admin_phone", { length: 32 }),
  // 'note' | 'message' | 'action'
  type: varchar("type", { length: 32 }).notNull(),
  // 'telegram' | 'sms' | 'inapp' | 'manual' | 'system'
  channel: varchar("channel", { length: 32 }),
  title: varchar("title", { length: 200 }),
  body: text("body"),
  // 'ok' | 'failed' | 'pending'
  status: varchar("status", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminShopLogSchema = createInsertSchema(adminShopLogs);
export type AdminShopLog = typeof adminShopLogs.$inferSelect;
