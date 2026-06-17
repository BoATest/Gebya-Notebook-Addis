import { pgTable, serial, text, integer, real, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customerTransactions = pgTable("customer_transactions", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  customerId: integer("customer_id").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  amount: real("amount").notNull().default(0),
  itemNote: text("item_note"),
  dueDate: bigint("due_date", { mode: "number" }),
  referenceCode: text("reference_code"),
  telegramDeliveryState: text("telegram_delivery_state"),
  telegramDeliveryError: text("telegram_delivery_error"),
  telegramDeliveryAttemptedAt: bigint("telegram_delivery_attempted_at", { mode: "number" }),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),

  actorRole: varchar("actor_role", { length: 32 }),
  actorStaffMemberId: integer("actor_staff_member_id"),
  actorNameSnapshot: text("actor_name_snapshot"),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("customer_tx_device_local").on(t.deviceId, t.localId),
  unique("customer_tx_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertCustomerTransactionSchema = createInsertSchema(customerTransactions)
  .omit({ id: true, syncedAt: true });
export type InsertCustomerTransaction = z.infer<typeof insertCustomerTransactionSchema>;
export type CustomerTransaction = typeof customerTransactions.$inferSelect;
