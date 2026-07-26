-- ============================================================
-- Migration: 0011_invites_columns.sql
-- Add missing columns to invites table that Drizzle schema
-- defines but were never created by the original migration.
-- ============================================================

BEGIN;

ALTER TABLE invites ADD COLUMN IF NOT EXISTS staff_name            TEXT;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS notification_sent      BOOLEAN DEFAULT FALSE;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS notification_method    VARCHAR(32);
ALTER TABLE invites ADD COLUMN IF NOT EXISTS declined_at            TIMESTAMP WITH TIME ZONE;

COMMIT;
