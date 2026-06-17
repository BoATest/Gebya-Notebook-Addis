import { pgTable, serial, text, integer, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  displayName: text("display_name").notNull(),
  note: text("note"),
  phoneNumber: text("phone_number"),
  telegramUsername: text("telegram_username"),
  telegramChatId: text("telegram_chat_id"),
  telegramNotifyEnabled: boolean("telegram_notify_enabled").default(false),
  telegramLinkToken: text("telegram_link_token"),
  telegramLinkedAt: bigint("telegram_linked_at", { mode: "number" }),
  telegramLinkRequestedAt: bigint("telegram_link_requested_at", { mode: "number" }),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("customers_device_local").on(t.deviceId, t.localId),
  unique("customers_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertCustomerSchema = createInsertSchema(customers)
  .omit({ id: true, syncedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
