import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Dynamically-managed platform admin allowlist.
 *
 * The static PLATFORM_ADMIN_PHONES env var remains as the bootstrap allowlist;
 * additional team members can be added/removed at runtime through the Command
 * Center (/admin) and are persisted here. isPlatformAdminPhone checks env OR
 * this table.
 */
export const platformAdminMembers = pgTable("platform_admin_members", {
  id: serial("id").primaryKey(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  addedByPhone: text("added_by_phone"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});