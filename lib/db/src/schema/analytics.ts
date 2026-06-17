import { pgTable, serial, text, integer, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  key: text("key").notNull(),
  value: text("value"),
  numericValue: integer("numeric_value"),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),

  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("analytics_device_key").on(t.deviceId, t.key),
]);

export const insertAnalyticsSchema = createInsertSchema(analytics)
  .omit({ id: true, syncedAt: true });
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Analytics = typeof analytics.$inferSelect;
