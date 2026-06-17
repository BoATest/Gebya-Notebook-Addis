import { pgTable, serial, integer, text, varchar, boolean, bigint, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  // hashed recovery key (optional, for users without Telegram)
  recoveryKeyHash: text("recovery_key_hash"),
  // Telegram chat_id if user linked via bot
  telegramChatId: text("telegram_chat_id"),
  // ISO 639-1 language code (am | en)
  preferredLang: varchar("preferred_lang", { length: 8 }).default("en"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  deviceId: varchar("device_id", { length: 128 }).notNull().unique(),
  // friendly name for the device (e.g. "Samsung A14")
  name: text("name"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devices)
  .omit({ id: true, createdAt: true, lastSeenAt: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;
