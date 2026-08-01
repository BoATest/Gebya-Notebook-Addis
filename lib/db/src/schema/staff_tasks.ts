import { pgTable, serial, integer, varchar, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod";
import { businesses } from "./businesses";

export const staffTasks = pgTable("staff_tasks", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  staffId: integer("staff_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("staff_tasks_business_idx").on(t.businessId),
  index("staff_tasks_staff_idx").on(t.staffId),
  index("staff_tasks_status_idx").on(t.status),
]);

export const insertStaffTaskSchema = z.object({
  businessId: z.number(),
  staffId: z.number(),
  title: z.string().max(255),
  description: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  dueDate: z.date().nullable().optional(),
  createdBy: z.number(),
});

export type InsertStaffTask = z.infer<typeof insertStaffTaskSchema>;
export type StaffTask = typeof staffTasks.$inferSelect;