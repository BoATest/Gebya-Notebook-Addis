import { pgTable, serial, text, integer, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { z } from "zod";

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  active: boolean("active").default(true),
  creditBalance: integer("credit_balance").default(0),
  totalPurchases: integer("total_purchases").default(0),
  lastPurchaseAt: bigint("last_purchase_at", { mode: "number" }),
  note: text("note"),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("suppliers_device_local").on(t.deviceId, t.localId),
  unique("suppliers_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertSupplierSchema = z.object({
  localId: z.number().optional(),
  deviceId: z.string().max(128),
  transactionId: z.string().max(128),
  name: z.string(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  active: z.boolean().optional(),
  creditBalance: z.number().optional(),
  totalPurchases: z.number().optional(),
  lastPurchaseAt: z.number().optional(),
  note: z.string().nullable().optional(),
  schemaVersion: z.number().optional(),
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;
