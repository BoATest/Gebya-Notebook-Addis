import { pgTable, serial, text, integer, boolean, bigint, varchar, timestamp, unique, real } from "drizzle-orm/pg-core";
import { z } from "zod";

export const catalogEntries = pgTable("catalog_entries", {
  id: serial("id").primaryKey(),
  localId: bigint("local_id", { mode: "number" }),
  deviceId: varchar("device_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 128 }).notNull(),

  name: text("name").notNull(),
  kind: varchar("kind", { length: 32 }).notNull().default("item"),
  active: boolean("active").default(true),
  defaultPrice: real("default_price"),
  defaultCost: real("default_cost"),
  note: text("note"),

  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),

  schemaVersion: integer("schema_version").default(1),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("catalog_device_local").on(t.deviceId, t.localId),
  unique("catalog_device_txn").on(t.deviceId, t.transactionId),
]);

export const insertCatalogEntrySchema = z.object({
  localId: z.number().optional(),
  deviceId: z.string().max(128),
  transactionId: z.string().max(128),
  name: z.string(),
  kind: z.string().max(32).optional(),
  active: z.boolean().optional(),
  defaultPrice: z.number().nullable().optional(),
  defaultCost: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  schemaVersion: z.number().optional(),
});

export type InsertCatalogEntry = z.infer<typeof insertCatalogEntrySchema>;
export type CatalogEntry = typeof catalogEntries.$inferSelect;
