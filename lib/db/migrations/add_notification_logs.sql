-- Migration: Add notification_logs table for delivery tracking
-- Run: psql $DATABASE_URL -f add_notification_logs.sql

CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  channel VARCHAR(32) NOT NULL,       -- "in_app" | "push" | "sms" | "telegram"
  status VARCHAR(32) NOT NULL,        -- "sent" | "delivered" | "failed" | "read"
  error TEXT,
  metadata TEXT,                       -- JSON string for extra context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_log_biz_idx ON notification_logs (business_id);
CREATE INDEX IF NOT EXISTS notif_log_notif_idx ON notification_logs (notification_id);
