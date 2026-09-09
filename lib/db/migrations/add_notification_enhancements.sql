-- Migration: Add notification lifecycle tracking + preferences
-- Run: psql $DATABASE_URL -f add_notification_enhancements.sql

-- ─── Notification schema enhancements ─────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS push_failed BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Index for cleanup cron (delete expired notifications)
CREATE INDEX IF NOT EXISTS notif_expires_idx ON notifications (expires_at);

-- Backfill expires_at for existing notifications (90 days from creation)
UPDATE notifications SET expires_at = created_at + INTERVAL '90 days' WHERE expires_at IS NULL;

-- ─── Notification Preferences table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Per-type preferences (JSON: {"inApp":true,"push":true})
  sale_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  credit_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  payment_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  supplier_payment_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  supplier_purchase_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  expense_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  staff_joined_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  rbac_violation_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  overdue_alert_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  device_approval_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  announcement_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  support_reply_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',
  staff_submitted_collection_prefs VARCHAR(255) DEFAULT '{"inApp":true,"push":true}',

  -- Quiet hours (HH:MM format, null = disabled)
  quiet_hours_start VARCHAR(5),
  quiet_hours_end VARCHAR(5),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One preferences record per business+user
CREATE UNIQUE INDEX IF NOT EXISTS notif_prefs_biz_user_idx ON notification_preferences (business_id, user_id);
