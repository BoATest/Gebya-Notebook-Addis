import { pgTable, integer, jsonb, varchar, bigint } from "drizzle-orm/pg-core";

export const settlements = pgTable("settlements", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  settlementId: varchar("settlement_id", { length: 128 }).notNull(),
  businessId: integer("business_id").notNull(),
  staffId: integer("staff_id").notNull(),

  periodStart: bigint("period_start", { mode: "number" }).notNull(),
  periodEnd: bigint("period_end", { mode: "number" }).notNull(),

  expectedCash: integer("expected_cash").notNull().default(0),
  actualCash: integer("actual_cash").notNull().default(0),
  cashVariance: integer("cash_variance").notNull().default(0),

  expectedTransfer: integer("expected_transfer").notNull().default(0),
  actualTransfer: integer("actual_transfer").notNull().default(0),
  transferVariance: integer("transfer_variance").notNull().default(0),

  expectedTotal: integer("expected_total").notNull().default(0),
  actualTotal: integer("actual_total").notNull().default(0),
  totalVariance: integer("total_variance").notNull().default(0),

  adjustments: jsonb("adjustments").$type<{
    type: "expense" | "credit_to_owner" | "sale" | "other";
    amount: number;
    note: string;
    addedBy: string;
    addedAt: string;
  }[]>().default([]),

  finalExpectedCash: integer("final_expected_cash").notNull().default(0),
  finalExpectedTotal: integer("final_expected_total").notNull().default(0),
  finalVariance: integer("final_variance").notNull().default(0),

  status: varchar("status", { length: 20 }).notNull().default("checked"),
  notes: varchar("notes", { length: 500 }),

  settledAt: bigint("settled_at", { mode: "number" }).notNull(),
  settledBy: integer("settled_by").notNull(),

  reconciledAt: bigint("reconciled_at", { mode: "number" }),
  reconciledBy: integer("reconciled_by"),
  reconciliationNote: varchar("reconciliation_note", { length: 500 }),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
  syncVersion: integer("sync_version").notNull().default(1),
  schemaVersion: integer("schema_version").notNull().default(1),
});

export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;
