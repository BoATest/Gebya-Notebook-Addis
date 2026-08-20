-- Gebya platform-admin toolkit migration
-- Support tickets + messages, admin shop logs, owner Telegram link token.
-- Cleaned for the Supabase SQL editor (no drizzle breakpoint comments; idempotent).

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL,
  "owner_user_id" integer NOT NULL,
  "subject" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "priority" varchar(16) DEFAULT 'normal' NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "resolved_at" timestamptz,
  "resolved_by_user_id" integer
);

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_id" integer NOT NULL,
  "sender_user_id" integer NOT NULL,
  "sender_role" varchar(32) NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "admin_shop_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL,
  "admin_phone" varchar(32),
  "type" varchar(32) NOT NULL,
  "channel" varchar(32),
  "title" varchar(200),
  "body" text,
  "status" varchar(32),
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_link_token" text;

CREATE INDEX IF NOT EXISTS "support_tickets_business_idx" ON "support_tickets" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" USING btree ("status");
CREATE INDEX IF NOT EXISTS "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id");
CREATE INDEX IF NOT EXISTS "admin_shop_logs_business_idx" ON "admin_shop_logs" USING btree ("business_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_messages_ticket_id_support_tickets_id_fk') THEN
    ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk"
      FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_business_id_businesses_id_fk') THEN
    ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_business_id_businesses_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_owner_user_id_users_id_fk') THEN
    ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_owner_user_id_users_id_fk"
      FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_shop_logs_business_id_businesses_id_fk') THEN
    ALTER TABLE "admin_shop_logs" ADD CONSTRAINT "admin_shop_logs_business_id_businesses_id_fk"
      FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
