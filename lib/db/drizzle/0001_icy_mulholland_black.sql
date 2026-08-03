ALTER TABLE "businesses" ADD COLUMN "phone_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "approval_required" boolean DEFAULT false NOT NULL;