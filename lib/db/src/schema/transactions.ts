import { pgTable, serial, text, integer, real, numeric, boolean, bigint, varchar, timestamp, unique, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { z } from "zod";

/**
 * Money column type (migration 0007): numeric(12,2) with 2-decimal-place guard.
 * Epsilon comparison is mandatory: `Math.round(v*100) === v*100` rejects valid
 * values because IEEE-754 makes 0.1*100 === 10.000000000000002.
 * Accepts JS numbers (the client's JSON contract) and numeric strings (what a
 * numeric column returns on a pull round-trip).
 */
export const money2 = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? Number(v.trim() === "" ? Number.NaN : v) : v))
  .refine((v) => Number.isFinite(v) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
    message: "money value must be finite with at most 2 decimal places",
  });

const nullableMoney2 = () => money2.nullable().optional();

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  type: varchar("type", { length: 32 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  itemName: text("item_name").notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  quantity: integer("quantity").notNull().default(1),
  profit: numeric("profit", { precision: 12, scale: 2 }),
  isCredit: boolean("is_credit").default(false),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),

   createdAt: bigint("created_at", { mode: "number" }).notNull(),
   updatedAt: bigint("updated_at", { mode: "number" }),
   ethiopianDate: text("ethiopian_date"),
   labelCode: varchar("label_code", { length: 64 }),

   paymentType: varchar("payment_type", { length: 64 }),
   paymentProvider: varchar("payment_provider", { length: 64 }),

  saleSettlementMode: varchar("sale_settlement_mode", { length: 32 }),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }),
  remainingAmount: numeric("remaining_amount", { precision: 12, scale: 2 }),
  settlementDueDate: bigint("settlement_due_date", { mode: "number" }),

  source: varchar("source", { length: 32 }),
  wasEdited: boolean("was_edited").default(false),

  actorRole: varchar("actor_role", { length: 32 }),
  actorStaffMemberId: integer("actor_staff_member_id"),
  actorNameSnapshot: text("actor_name_snapshot"),

  deletedAt: bigint("deleted_at", { mode: "number" }),

  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "restrict" }),
  schemaVersion: integer("schema_version").default(1),
  syncVersion: integer("sync_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("transactions_device_local").on(t.deviceId, t.localId),
  unique("transactions_device_txn").on(t.deviceId, t.transactionId),
  index("transactions_business_idx").on(t.businessId),
]);

export const insertTransactionSchema = z.object({
  localId: z.number().optional(),
  deviceId: z.string().max(128),
  transactionId: z.string().max(128),
  type: z.string().max(32),
  amount: money2.optional(),
  itemName: z.string().nullable().optional(),
  costPrice: nullableMoney2(),
  quantity: z.number().optional(),
  profit: nullableMoney2(),
  isCredit: z.boolean().optional(),
  customerId: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
   createdAt: z.number(),
   updatedAt: z.number().optional(),
   ethiopianDate: z.string().nullable().optional(),
   labelCode: z.string().max(64).nullable().optional(),
   paymentType: z.string().max(64).nullable().optional(),
   paymentProvider: z.string().max(64).nullable().optional(),
   saleSettlementMode: z.string().max(32).nullable().optional(),
  paidAmount: nullableMoney2(),
  remainingAmount: nullableMoney2(),
  settlementDueDate: z.number().nullable().optional(),
  source: z.string().max(32).nullable().optional(),
  wasEdited: z.boolean().optional(),
  actorRole: z.string().max(32).nullable().optional(),
  actorStaffMemberId: z.number().nullable().optional(),
  actorNameSnapshot: z.string().nullable().optional(),
  deletedAt: z.number().nullable().optional(),
  schemaVersion: z.number().optional(),
  syncVersion: z.number().optional(),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
