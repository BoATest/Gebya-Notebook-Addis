import { pgTable, serial, text, integer, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod";

export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  name: text("name").notNull(),
  role: varchar("role", { length: 32 }).notNull().default("staff"),
  active: boolean("active").default(true),
  phone: text("phone"),
  note: text("note"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("staff_device_local").on(t.deviceId, t.localId),
  unique("staff_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertStaffMemberSchema = z.object({
  localId: z.number().optional(),
  deviceId: z.string().max(128),
  transactionId: z.string().max(128),
  name: z.string(),
  role: z.string().max(32).optional(),
  active: z.boolean().optional(),
  phone: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.number(),
  schemaVersion: z.number().optional(),
});

export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type StaffMember = typeof staffMembers.$inferSelect;
