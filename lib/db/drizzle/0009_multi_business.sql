-- ============================================================
-- Migration: 0009_multi_business.sql
-- Drop single-user unique constraint on business_members and
-- replace with compound unique (user_id, business_id) so one
-- user can own/manage multiple businesses.
-- ============================================================

BEGIN;

ALTER TABLE business_members DROP CONSTRAINT IF EXISTS biz_members_user_unique;
ALTER TABLE business_members ADD CONSTRAINT biz_members_user_business_unique UNIQUE (user_id, business_id);

COMMIT;
