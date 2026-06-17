import { pgTable, serial, text, integer, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  displayName: text("display_name").notNull(),
  phoneNumber: text("phone_number"),
  note: text("note"),
  active: boolean("active").default(true),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("suppliers_device_local").on(t.deviceId, t.localId),
  unique("suppliers_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertSupplierSchema = createInsertSchema(suppliers)
  .omit({ id: true, syncedAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;
