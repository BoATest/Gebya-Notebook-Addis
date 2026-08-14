CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"transaction_id" varchar(128) NOT NULL,
	"type" varchar(32) NOT NULL,
	"amount" real DEFAULT 0 NOT NULL,
	"item_name" text NOT NULL,
	"cost_price" real,
	"quantity" integer DEFAULT 1 NOT NULL,
	"profit" real,
	"is_credit" boolean DEFAULT false,
	"customer_id" integer,
	"customer_name" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"ethiopian_date" text,
	"payment_type" varchar(64),
	"payment_provider" varchar(64),
	"sale_settlement_mode" varchar(32),
	"paid_amount" real,
	"remaining_amount" real,
	"settlement_due_date" bigint,
	"source" varchar(32),
	"was_edited" boolean DEFAULT false,
	"actor_role" varchar(32),
	"actor_staff_member_id" integer,
	"actor_name_snapshot" text,
	"deleted_at" bigint,
	"business_id" integer NOT NULL,
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
	"name" text NOT NULL,
	"email" text,
	"address" text,
	"active" boolean DEFAULT true,
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
	"business_id" integer NOT NULL,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "customers_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "customers_device_txn" UNIQUE("device_id","transaction_id"),
	CONSTRAINT "customers_phone_format" CHECK ("customers"."phone_number" IS NULL OR "customers"."phone_number" ~ '^\+251[79]\d{8}$')
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
	"business_id" integer NOT NULL,
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
	"business_id" integer NOT NULL,
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
	"deleted_at" bigint,
	"business_id" integer NOT NULL,
	"schema_version" integer DEFAULT 1,
	"sync_version" integer DEFAULT 1,
	"synced_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "suppliers_device_local" UNIQUE("device_id","local_id"),
	CONSTRAINT "suppliers_device_txn" UNIQUE("device_id","transaction_id"),
	CONSTRAINT "suppliers_phone_format" CHECK ("suppliers"."phone_number" IS NULL OR "suppliers"."phone_number" ~ '^\+251[79]\d{8}$')
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
	"item_name" text NOT NULL,
	"item_kind" varchar(32),
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"deleted_at" bigint,
	"business_id" integer NOT NULL,
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
	"phone_snapshot" varchar(32),
	"business_id" integer NOT NULL,
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
	"business_id" integer NOT NULL,
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
	"business_id" integer NOT NULL,
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
	"phone_required" boolean DEFAULT false,
	"approval_required" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "businesses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" text,
	"role" varchar(32) DEFAULT 'cashier' NOT NULL,
	"permissions" jsonb,
	"invited_by_user_id" integer,
	"joined_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "biz_members_user_business_unique" UNIQUE("user_id","business_id")
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
CREATE TABLE "staff_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"client_event_id" varchar(128) NOT NULL,
	"record_id" varchar(128),
	"actor_name_snapshot" text,
	"actor_role_at_event" varchar(32),
	"event_type" varchar(32) NOT NULL,
	"occurred_at_device" timestamp with time zone NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "staff_events_client_idempotency" UNIQUE("business_id","client_event_id")
);
--> statement-breakpoint
CREATE TABLE "staff_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"clock_in" timestamp with time zone NOT NULL,
	"clock_out" timestamp with time zone,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_data_shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"bank_name" varchar(128) NOT NULL,
	"bank_user_id" integer,
	"share_sales_data" boolean DEFAULT true,
	"share_credit_data" boolean DEFAULT true,
	"share_customer_data" boolean DEFAULT false,
	"status" varchar(32) DEFAULT 'active',
	"consent_given_at" timestamp with time zone DEFAULT now(),
	"consent_revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "bank_data_shares_business_bank" UNIQUE("business_id","bank_name")
);
--> statement-breakpoint
CREATE TABLE "bank_report_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"bank_data_share_id" integer,
	"report_version" integer DEFAULT 1,
	"payload" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bank_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"display_name" text,
	"bank_name" varchar(128) NOT NULL,
	"bank_role" varchar(32) DEFAULT 'officer',
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "bank_users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" bigint PRIMARY KEY NOT NULL,
	"local_id" bigint,
	"device_id" varchar(128) NOT NULL,
	"settlement_id" varchar(128) NOT NULL,
	"business_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"period_start" bigint NOT NULL,
	"period_end" bigint NOT NULL,
	"expected_cash" integer DEFAULT 0 NOT NULL,
	"actual_cash" integer DEFAULT 0 NOT NULL,
	"cash_variance" integer DEFAULT 0 NOT NULL,
	"expected_transfer" integer DEFAULT 0 NOT NULL,
	"actual_transfer" integer DEFAULT 0 NOT NULL,
	"transfer_variance" integer DEFAULT 0 NOT NULL,
	"expected_total" integer DEFAULT 0 NOT NULL,
	"actual_total" integer DEFAULT 0 NOT NULL,
	"total_variance" integer DEFAULT 0 NOT NULL,
	"adjustments" jsonb DEFAULT '[]'::jsonb,
	"final_expected_cash" integer DEFAULT 0 NOT NULL,
	"final_expected_total" integer DEFAULT 0 NOT NULL,
	"final_variance" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'checked' NOT NULL,
	"notes" varchar(500),
	"settled_at" bigint NOT NULL,
	"settled_by" integer NOT NULL,
	"reconciled_at" bigint,
	"reconciled_by" integer,
	"reconciliation_note" varchar(500),
	"reconciliation_status" varchar(32) DEFAULT 'checked' NOT NULL,
	"staff_reported_cash" integer,
	"staff_reported_transfer" integer,
	"staff_submitted_at" bigint,
	"staff_note" varchar(500),
	"owner_confirmed_cash" integer,
	"owner_confirmed_transfer" integer,
	"owner_note" varchar(500),
	"reconciliation_log" jsonb DEFAULT '[]'::jsonb,
	"carry_forward" integer,
	"created_at" bigint NOT NULL,
	"updated_at" bigint,
	"sync_version" integer DEFAULT 1 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL
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
ALTER TABLE "staff_events" ADD CONSTRAINT "staff_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_data_shares" ADD CONSTRAINT "bank_data_shares_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_data_shares" ADD CONSTRAINT "bank_data_shares_bank_user_id_bank_users_id_fk" FOREIGN KEY ("bank_user_id") REFERENCES "public"."bank_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_report_snapshots" ADD CONSTRAINT "bank_report_snapshots_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_report_snapshots" ADD CONSTRAINT "bank_report_snapshots_bank_data_share_id_bank_data_shares_id_fk" FOREIGN KEY ("bank_data_share_id") REFERENCES "public"."bank_data_shares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "push_sub_biz_idx" ON "push_subscriptions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_events_business_idx" ON "staff_events" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_events_created_idx" ON "staff_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "staff_tasks_business_idx" ON "staff_tasks" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_tasks_staff_idx" ON "staff_tasks" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_tasks_status_idx" ON "staff_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "staff_attendance_business_idx" ON "staff_attendance" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "staff_attendance_staff_idx" ON "staff_attendance" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "staff_attendance_clock_in_idx" ON "staff_attendance" USING btree ("clock_in");--> statement-breakpoint
CREATE INDEX "bank_data_shares_business_idx" ON "bank_data_shares" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "bank_data_shares_bank_idx" ON "bank_data_shares" USING btree ("bank_name");--> statement-breakpoint
CREATE INDEX "bank_report_snapshots_business_idx" ON "bank_report_snapshots" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "bank_report_snapshots_share_idx" ON "bank_report_snapshots" USING btree ("bank_data_share_id");--> statement-breakpoint
CREATE INDEX "bank_users_bank_idx" ON "bank_users" USING btree ("bank_name");