import { pgTable, serial, integer, text, varchar, timestamp, jsonb, unique, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { z } from "zod";

export const staffEvents = pgTable("staff_events", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  clientEventId: varchar("client_event_id", { length: 128 }).notNull(),
  recordId: varchar("record_id", { length: 128 }),
  actorNameSnapshot: text("actor_name_snapshot"),
  actorRoleAtEvent: varchar("actor_role_at_event", { length: 32 }),
  eventType: varchar("event_type", { length: 32 }).notNull(),
  occurredAtDevice: timestamp("occurred_at_device", { withTimezone: true }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  unique("staff_events_client_idempotency").on(t.businessId, t.clientEventId),
  index("staff_events_business_idx").on(t.businessId),
  index("staff_events_created_idx").on(t.createdAt),
]);

export const insertStaffEventSchema = z.object({
  businessId: z.number(),
  userId: z.number(),
  clientEventId: z.string().max(128),
  recordId: z.string().max(128).nullable().optional(),
  actorNameSnapshot: z.string().nullable().optional(),
  actorRoleAtEvent: z.string().max(32).nullable().optional(),
  eventType: z.enum(["sale", "customer_payment", "customer_credit", "note"]),
  occurredAtDevice: z.date(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type InsertStaffEvent = z.infer<typeof insertStaffEventSchema>;
export type StaffEvent = typeof staffEvents.$inferSelect;
