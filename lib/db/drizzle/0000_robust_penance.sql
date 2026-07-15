CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"type" varchar(32) NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"item_name" text,
	"cost_price" real,
	"quantity" integer DEFAULT 1,
	"profit" real,
	"is_credit" boolean DEFAULT false,
	"customer_id" integer,
	"customer_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"ethiopian_date" text,
	"payment_type" varchar(64),
	"payment_provider" varchar(64),
	"source" varchar(32),
	"raw_transcript" text,
	"detected_total" real,
	"was_edited" boolean DEFAULT false,
	"transcription_provider" varchar(64),
	"parsing_confidence" real,
	"voice_note" text,
	"raw_audio_ref" text,
	"actor_role" varchar(32),
	"actor_staff_member_id" integer,
	"actor_name_snapshot" text,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "transactions_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "transactions_device_txn" UNIQUE("device_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"name" text,
	"phone" text,
	"email" text,
	"address" text,
	"active" boolean DEFAULT true,
	"credit_balance" integer DEFAULT 0,
	"total_purchases" integer DEFAULT 0,
	"last_purchase_at" bigint,
	"note" text,
	"telegram_chat_id" text,
	"telegram_link_requested_at" bigint,
	"display_name" text,
	"phone_number" text,
	"telegram_username" text,
	"telegram_notify_enabled" boolean DEFAULT false,
	"telegram_link_token" text,
	"telegram_linked_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "customers_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "customers_device_txn" UNIQUE("device_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "customer_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"customer_id" integer NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"type" varchar(32) DEFAULT 'payment' NOT NULL,
	"note" text,
	"item_note" text,
	"due_date" bigint,
	"reference_code" text,
	"telegram_delivery_state" varchar(32),
	"telegram_delivery_error" text,
	"telegram_delivery_attempted_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cust_txn_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "cust_txn_device_txn" UNIQUE("device_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"name" text NOT NULL,
	"kind" varchar(32) DEFAULT 'item' NOT NULL,
	"active" boolean DEFAULT true,
	"default_price" real,
	"default_cost" real,
	"note" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "catalog_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "catalog_device_txn" UNIQUE("device_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"display_name" text NOT NULL,
	"phone_number" text,
	"note" text,
	"active" boolean DEFAULT true,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "suppliers_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "suppliers_device_txn" UNIQUE("device_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"supplier_id" integer NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"type" varchar(32) DEFAULT 'payment' NOT NULL,
	"note" text,
	"item_name" text,
	"item_kind" varchar(32),
	"quantity" integer DEFAULT 1,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "supp_txn_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "supp_txn_device_txn" UNIQUE("device_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"display_name" text NOT NULL,
	"role" varchar(32) DEFAULT 'staff',
	"active" boolean DEFAULT true,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"deactivated_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "staff_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "staff_device_txn" UNIQUE("device_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "settings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"device_id" varchar(128) NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "settings_device_key" UNIQUE("device_id","key")
);
--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analytics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"device_id" varchar(128) NOT NULL,
	"key" varchar(128) NOT NULL,
	"value" text,
	"count" integer DEFAULT 0,
	"last_seen_at" bigint,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"business_id" integer,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "analytics_device_key" UNIQUE("device_id","key")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"device_id" varchar(128) NOT NULL,
	"token_hash" varchar(64),
	"shop_id" integer,
	"staff_id" integer,
	"name" text,
	"status" varchar(32) DEFAULT 'active',
	"last_seen_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "devices_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"active" boolean DEFAULT true,
	"preferred_lang" varchar(8) DEFAULT 'am',
	"telegram_chat_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 5,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"device_id" varchar(128) NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"size_bytes" integer,
	"tables" text NOT NULL,
	"record_count" integer DEFAULT 0,
	"checksum" varchar(64),
	"payload" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer NOT NULL,
	"name" text DEFAULT 'My Shop' NOT NULL,
	"slug" varchar(64),
	"preferred_lang" varchar(8) DEFAULT 'am',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(32) DEFAULT 'cashier' NOT NULL,
	"permissions" jsonb,
	"invited_by_user_id" integer,
	"joined_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "biz_members_user_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"staff_name" text,
	"role" varchar(32) DEFAULT 'cashier' NOT NULL,
	"token" varchar(128) NOT NULL,
	"notification_sent" boolean DEFAULT false,
	"notification_method" varchar(32),
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"actor_staff_member_id" integer,
	"actor_device_id" varchar(128),
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(64),
	"entity_id" varchar(128),
	"blocked_permission" varchar(64),
	"details" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
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
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_entries" ADD CONSTRAINT "catalog_entries_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_transactions" ADD CONSTRAINT "supplier_transactions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_business_idx" ON "transactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "customers_business_idx" ON "customers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "customer_transactions_business_idx" ON "customer_transactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "catalog_entries_business_idx" ON "catalog_entries" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "suppliers_business_idx" ON "suppliers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "supplier_transactions_business_idx" ON "supplier_transactions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_members_business_idx" ON "staff_members" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "settings_business_idx" ON "settings" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "analytics_business_idx" ON "analytics" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "snapshots_user_idx" ON "snapshots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "snapshots_device_idx" ON "snapshots" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "businesses_owner_idx" ON "businesses" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "biz_members_business_idx" ON "business_members" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "invites_business_idx" ON "invites" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "invites_token_idx" ON "invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "invites_phone_idx" ON "invites" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "audit_log_business_idx" ON "audit_log" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notif_biz_owner_idx" ON "notifications" USING btree ("business_id","owner_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notif_unread_idx" ON "notifications" USING btree ("business_id","owner_user_id","read");--> statement-breakpoint
CREATE UNIQUE INDEX "push_sub_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_sub_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_sub_biz_idx" ON "push_subscriptions" USING btree ("business_id");