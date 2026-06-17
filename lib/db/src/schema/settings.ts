import { pgTable, serial, text, integer, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  key: text("key").notNull(),
  value: text("value"),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),

  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("settings_device_key").on(t.deviceId, t.key),
]);

export const insertSettingSchema = createInsertSchema(settings)
  .omit({ id: true, syncedAt: true });
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
