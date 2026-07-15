-- Run this in Supabase SQL Editor
-- Creates the notifications + push_subscriptions tables
-- Safe to run even if other tables don't exist yet

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL,
  "owner_user_id" integer NOT NULL,
  "type" varchar(64) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "entity_type" varchar(64),
  "entity_id" varchar(128),
  "actor_name" varchar(128),
  "amount" numeric(12, 2),
  "read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "business_id" integer NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "notif_biz_owner_idx" ON "notifications" USING btree ("business_id","owner_user_id","created_at");
CREATE INDEX IF NOT EXISTS "notif_unread_idx" ON "notifications" USING btree ("business_id","owner_user_id","read");
CREATE UNIQUE INDEX IF NOT EXISTS "push_sub_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");
CREATE INDEX IF NOT EXISTS "push_sub_user_idx" ON "push_subscriptions" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "push_sub_biz_idx" ON "push_subscriptions" USING btree ("business_id");
