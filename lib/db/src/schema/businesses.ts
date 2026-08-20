import { pgTable, serial, text, integer, varchar, timestamp, index, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";
import { users } from "./users";

export const businesses = pgTable("businesses", {
  id:           serial("id").primaryKey(),
  ownerUserId:  integer("owner_user_id").notNull().references(() => users.id),
  name:         text("name").notNull().default("My Shop"),
  slug:         varchar("slug", { length: 64 }).unique(),
  preferredLang: varchar("preferred_lang", { length: 8 }).default("am"),
  phoneRequired: boolean("phone_required").notNull().default(false),
  approvalRequired: boolean("approval_required").notNull().default(false),
  plan:         varchar("plan", { length: 32 }).notNull().default("free"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("businesses_owner_idx").on(t.ownerUserId),
]);

export const insertBusinessSchema = z.object({
  ownerUserId:  z.number(),
  name:         z.string().default("My Shop"),
  slug:         z.string().max(64).nullable().optional(),
  preferredLang: z.string().max(8).optional(),
  plan:         z.string().max(32).default("free").optional(),
});

export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
