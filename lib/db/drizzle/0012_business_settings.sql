-- ============================================================
-- Migration: 0012_business_settings.sql
-- Add shop-level settings columns to businesses table.
-- ============================================================

BEGIN;

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_required     BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS approval_required  BOOLEAN DEFAULT FALSE;

COMMIT;
