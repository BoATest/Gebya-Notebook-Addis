import { pgTable, serial, integer, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { z } from "zod";
import { businesses } from "./businesses";

export const staffAttendance = pgTable("staff_attendance", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  staffId: integer("staff_id").notNull(),
  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),
  clockOut: timestamp("clock_out", { withTimezone: true }),
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("staff_attendance_business_idx").on(t.businessId),
  index("staff_attendance_staff_idx").on(t.staffId),
  index("staff_attendance_clock_in_idx").on(t.clockIn),
]);

export const insertStaffAttendanceSchema = z.object({
  businessId: z.number(),
  staffId: z.number(),
  clockIn: z.date(),
  clockOut: z.date().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type InsertStaffAttendance = z.infer<typeof insertStaffAttendanceSchema>;
export type StaffAttendance = typeof staffAttendance.$inferSelect;