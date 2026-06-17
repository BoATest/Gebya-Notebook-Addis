import { pgTable, text, integer, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod";

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  key: varchar("key", { length: 128 }).notNull(),
  value: text("value"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("settings_device_key").on(t.deviceId, t.key),
]);

export const insertSettingSchema = z.object({
  deviceId: z.string().max(128),
  key: z.string().max(128),
  value: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  schemaVersion: z.number().optional(),
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
