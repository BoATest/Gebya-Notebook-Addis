-- Phase 2: Premium tier gating for automated reminders
-- Adds a `plan` column to businesses to distinguish free vs premium shops.
-- Automated (cron-triggered) reminders are gated behind plan = 'premium'.
-- On-demand (manual) reminders work for all plans.

ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "plan" varchar(32) NOT NULL DEFAULT 'free';
