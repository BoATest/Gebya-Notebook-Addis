import { pgTable, serial, integer, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod";

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull(),
  actorStaffMemberId: integer("actor_staff_member_id"),
  actorDeviceId: varchar("actor_device_id", { length: 128 }),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }),
  entityId: varchar("entity_id", { length: 128 }),
  blockedPermission: varchar("blocked_permission", { length: 64 }),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("audit_log_business_idx").on(t.businessId),
  index("audit_log_created_idx").on(t.createdAt),
  index("audit_log_entity_idx").on(t.entityType, t.entityId),
]);

export const insertAuditLogSchema = z.object({
  businessId: z.number(),
  actorStaffMemberId: z.number().nullable().optional(),
  actorDeviceId: z.string().max(128).nullable().optional(),
  action: z.string().max(64),
  entityType: z.string().max(64).nullable().optional(),
  entityId: z.string().max(128).nullable().optional(),
  blockedPermission: z.string().max(64).nullable().optional(),
  details: z.string().nullable().optional(),
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;