-- ============================================================
-- Migration: 0010_display_name.sql
-- Add display_name column to business_members so each member
-- can have a human-readable name within a business context.
-- ============================================================

BEGIN;

ALTER TABLE business_members ADD COLUMN IF NOT EXISTS display_name text;

COMMIT;
