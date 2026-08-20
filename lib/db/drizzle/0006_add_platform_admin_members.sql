-- Gebya platform-admin team members (dynamic allowlist).
-- The server also auto-creates this table on boot via ensureSchema; this file
-- is provided for manual application (e.g., Supabase SQL editor) if needed.
-- Clean and idempotent.

CREATE TABLE IF NOT EXISTS "platform_admin_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "phone" text NOT NULL,
  "added_by_phone" text,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_admin_members_phone_unique" ON "platform_admin_members" USING btree ("phone");