import { pgTable, serial, text, integer, real, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const supplierTransactions = pgTable("supplier_transactions", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  supplierId: integer("supplier_id").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  catalogEntryId: integer("catalog_entry_id"),
  itemName: text("item_name"),
  itemKind: varchar("item_kind", { length: 32 }),
  quantity: integer("quantity"),
  amount: real("amount").notNull().default(0),
  note: text("note"),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),

  actorRole: varchar("actor_role", { length: 32 }),
  actorStaffMemberId: integer("actor_staff_member_id"),
  actorNameSnapshot: text("actor_name_snapshot"),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("supplier_tx_device_local").on(t.deviceId, t.localId),
  unique("supplier_tx_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertSupplierTransactionSchema = createInsertSchema(supplierTransactions)
  .omit({ id: true, syncedAt: true });
export type InsertSupplierTransaction = z.infer<typeof insertSupplierTransactionSchema>;
export type SupplierTransaction = typeof supplierTransactions.$inferSelect;
