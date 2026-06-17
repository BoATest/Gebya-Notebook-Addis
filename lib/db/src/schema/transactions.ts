import { pgTable, serial, text, integer, real, boolean, bigint, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  type: varchar("type", { length: 32 }).notNull(),
  amount: real("amount").notNull().default(0),
  itemName: text("item_name"),
  costPrice: real("cost_price"),
  quantity: integer("quantity").default(1),
  profit: real("profit"),
  isCredit: boolean("is_credit").default(false),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
  ethiopianDate: text("ethiopian_date"),

  paymentType: varchar("payment_type", { length: 64 }),
  paymentProvider: varchar("payment_provider", { length: 64 }),

  source: varchar("source", { length: 32 }),
  rawTranscript: text("raw_transcript"),
  detectedTotal: real("detected_total"),
  wasEdited: boolean("was_edited").default(false),
  transcriptionProvider: varchar("transcription_provider", { length: 64 }),
  parsingConfidence: real("parsing_confidence"),
  voiceNote: text("voice_note"),
  rawAudioRef: text("raw_audio_ref"),

  actorRole: varchar("actor_role", { length: 32 }),
  actorStaffMemberId: integer("actor_staff_member_id"),
  actorNameSnapshot: text("actor_name_snapshot"),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("transactions_device_local").on(t.deviceId, t.localId),
  unique("transactions_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({ id: true, syncedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
