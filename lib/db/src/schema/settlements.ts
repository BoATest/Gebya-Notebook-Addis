import { pgTable, integer, numeric, jsonb, varchar, bigint } from "drizzle-orm/pg-core";

export const settlements = pgTable("settlements", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  settlementId: varchar("settlement_id", { length: 128 }).notNull(),
  businessId: integer("business_id").notNull(),
  staffId: integer("staff_id").notNull(),

  periodStart: bigint("period_start", { mode: "number" }).notNull(),
  periodEnd: bigint("period_end", { mode: "number" }).notNull(),

  // Money columns (migration 0007): birr units, previously integer (which silently
  // truncated fractional birr). numeric(12,2) preserves units and adds cents.
  // NOTE: drizzle returns numeric as STRING on select — server boundaries convert
  // (see routes/sync.ts pull guard). Client pushes stay plain JSON numbers.
  expectedCash: numeric("expected_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  actualCash: numeric("actual_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  cashVariance: numeric("cash_variance", { precision: 12, scale: 2 }).notNull().default("0"),

  expectedTransfer: numeric("expected_transfer", { precision: 12, scale: 2 }).notNull().default("0"),
  actualTransfer: numeric("actual_transfer", { precision: 12, scale: 2 }).notNull().default("0"),
  transferVariance: numeric("transfer_variance", { precision: 12, scale: 2 }).notNull().default("0"),

  expectedTotal: numeric("expected_total", { precision: 12, scale: 2 }).notNull().default("0"),
  actualTotal: numeric("actual_total", { precision: 12, scale: 2 }).notNull().default("0"),
  totalVariance: numeric("total_variance", { precision: 12, scale: 2 }).notNull().default("0"),

  adjustments: jsonb("adjustments").$type<{
    type: "expense" | "credit_to_owner" | "sale" | "other";
    amount: number;
    note: string;
    addedBy: string;
    addedAt: string;
  }[]>().default([]),

  finalExpectedCash: numeric("final_expected_cash", { precision: 12, scale: 2 }).notNull().default("0"),
  finalExpectedTotal: numeric("final_expected_total", { precision: 12, scale: 2 }).notNull().default("0"),
  finalVariance: numeric("final_variance", { precision: 12, scale: 2 }).notNull().default("0"),

  status: varchar("status", { length: 20 }).notNull().default("checked"),
  notes: varchar("notes", { length: 500 }),

  settledAt: bigint("settled_at", { mode: "number" }).notNull(),
  settledBy: integer("settled_by").notNull(),

  reconciledAt: bigint("reconciled_at", { mode: "number" }),
  reconciledBy: integer("reconciled_by"),
  reconciliationNote: varchar("reconciliation_note", { length: 500 }),

  reconciliationStatus: varchar("reconciliation_status", { length: 32 }).notNull().default("checked"),
  staffReportedCash: numeric("staff_reported_cash", { precision: 12, scale: 2 }),
  staffReportedTransfer: numeric("staff_reported_transfer", { precision: 12, scale: 2 }),
  staffSubmittedAt: bigint("staff_submitted_at", { mode: "number" }),
  staffNote: varchar("staff_note", { length: 500 }),
  ownerConfirmedCash: numeric("owner_confirmed_cash", { precision: 12, scale: 2 }),
  ownerConfirmedTransfer: numeric("owner_confirmed_transfer", { precision: 12, scale: 2 }),
  ownerNote: varchar("owner_note", { length: 500 }),
  reconciliationLog: jsonb("reconciliation_log").$type<{ stage: string; actor: string; at: number; note: string }[]>().default([]),
  carryForward: numeric("carry_forward", { precision: 12, scale: 2 }),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
  syncVersion: integer("sync_version").notNull().default(1),
  schemaVersion: integer("schema_version").notNull().default(1),
});

export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;
