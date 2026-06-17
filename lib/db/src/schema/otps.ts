import { pgTable, serial, integer, text, varchar, boolean, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const otps = pgTable("otps", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  // hashed OTP (never store plain text)
  codeHash: text("code_hash").notNull(),
  // number of failed attempts
  attempts: integer("attempts").default(0),
  // max 5 attempts
  maxAttempts: integer("max_attempts").default(5),
  // expires after 10 minutes
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  // consumed after successful verification
  consumed: boolean("consumed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertOtpSchema = createInsertSchema(otps)
  .omit({ id: true, createdAt: true });
export type InsertOtp = z.infer<typeof insertOtpSchema>;
export type Otp = typeof otps.$inferSelect;
