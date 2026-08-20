import { pgTable, serial, integer, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";
import { z } from "zod";

/**
 * Support tickets — structured shop → platform support requests.
 *
 * A shop member opens a ticket; platform admins reply via /admin surfaces.
 * Replies create an in-app notification for the shop owner so the answer
 * surfaces inside their app on the next sync/poll.
 */

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  ownerUserId: integer("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 32 }).notNull().default("open"), // open | replied | resolved | closed
  priority: varchar("priority", { length: 16 }).notNull().default("normal"), // low | normal | high | urgent
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedByUserId: integer("resolved_by_user_id"),
}, (t) => [
  index("support_tickets_business_idx").on(t.businessId),
  index("support_tickets_status_idx").on(t.status),
]);

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderUserId: integer("sender_user_id").notNull(),
  senderRole: varchar("sender_role", { length: 32 }).notNull(), // owner | admin
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("support_messages_ticket_idx").on(t.ticketId),
]);

export const insertSupportTicketSchema = z.object({
  businessId: z.number(),
  ownerUserId: z.number(),
  subject: z.string().max(255),
  description: z.string(),
  status: z.string().max(32).optional(),
  priority: z.string().max(16).optional(),
});

export const insertSupportMessageSchema = z.object({
  ticketId: z.number(),
  senderUserId: z.number(),
  senderRole: z.string().max(32),
  body: z.string(),
});

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;