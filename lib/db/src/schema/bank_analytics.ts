/**
 * Bank data-sharing schema.
 *
 * - bank_users: bank officers who can view shop analytics
 * - bank_data_shares: merchant consent to share data with a specific bank
 * - bank_report_snapshots: cached report payloads for fast retrieval
 */
import { pgTable, serial, text, integer, varchar, timestamp, boolean, jsonb, index, unique } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";
import { z } from "zod";

// --- Bank officers (separate from merchant users) ---

export const bankUsers = pgTable("bank_users", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  displayName: text("display_name"),
  bankName: varchar("bank_name", { length: 128 }).notNull(),
  bankRole: varchar("bank_role", { length: 32 }).default("officer"), // officer | manager | admin
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("bank_users_bank_idx").on(t.bankName),
]);

export const insertBankUserSchema = z.object({
  phoneNumber: z.string(),
  displayName: z.string().nullable().optional(),
  bankName: z.string().max(128),
  bankRole: z.string().max(32).optional(),
});

export type InsertBankUser = z.infer<typeof insertBankUserSchema>;
export type BankUser = typeof bankUsers.$inferSelect;

// --- Merchant consent to share data with a bank ---

export const bankDataShares = pgTable("bank_data_shares", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  bankName: varchar("bank_name", { length: 128 }).notNull(),
  bankUserId: integer("bank_user_id").references(() => bankUsers.id, { onDelete: "set null" }),

  // Consent scope
  shareSalesData: boolean("share_sales_data").default(true),
  shareCreditData: boolean("share_credit_data").default(true),
  shareCustomerData: boolean("share_customer_data").default(false), // PII — opt-in only

  // Status
  status: varchar("status", { length: 32 }).default("active"), // active | revoked | expired
  consentGivenAt: timestamp("consent_given_at", { withTimezone: true }).defaultNow(),
  consentRevokedAt: timestamp("consent_revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("bank_data_shares_business_bank").on(t.businessId, t.bankName),
  index("bank_data_shares_business_idx").on(t.businessId),
  index("bank_data_shares_bank_idx").on(t.bankName),
]);

export const insertBankDataShareSchema = z.object({
  businessId: z.number(),
  bankName: z.string().max(128),
  bankUserId: z.number().nullable().optional(),
  shareSalesData: z.boolean().optional(),
  shareCreditData: z.boolean().optional(),
  shareCustomerData: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
});

export type InsertBankDataShare = z.infer<typeof insertBankDataShareSchema>;
export type BankDataShare = typeof bankDataShares.$inferSelect;

// --- Cached report snapshots ---

export const bankReportSnapshots = pgTable("bank_report_snapshots", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  bankDataShareId: integer("bank_data_share_id").references(() => bankDataShares.id, { onDelete: "cascade" }),

  reportVersion: integer("report_version").default(1),
  payload: jsonb("payload").notNull(), // the full report JSON

  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (t) => [
  index("bank_report_snapshots_business_idx").on(t.businessId),
  index("bank_report_snapshots_share_idx").on(t.bankDataShareId),
]);

export const insertBankReportSnapshotSchema = z.object({
  businessId: z.number(),
  bankDataShareId: z.number(),
  reportVersion: z.number().optional(),
  payload: z.any(),
  expiresAt: z.date().nullable().optional(),
});

export type InsertBankReportSnapshot = z.infer<typeof insertBankReportSnapshotSchema>;
export type BankReportSnapshot = typeof bankReportSnapshots.$inferSelect;
