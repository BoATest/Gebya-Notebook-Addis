-- SMS Quota Tracking Table
-- Tracks monthly SMS usage per shop for automated reminders.
-- MVP: Hard cap at 20 SMS/month per shop (configurable via env var).

CREATE TABLE IF NOT EXISTS sms_quota (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: "2026-01"
  sms_count INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,

  -- One record per shop per month
  UNIQUE(shop_id, month)
);

-- Index for fast lookups by shop and month
CREATE INDEX IF NOT EXISTS idx_sms_quota_shop_month ON sms_quota(shop_id, month);

-- Comment for clarity
COMMENT ON TABLE sms_quota IS 'Monthly SMS quota tracking for automated reminders';
COMMENT ON COLUMN sms_quota.month IS 'Month in YYYY-MM format';
COMMENT ON COLUMN sms_quota.sms_count IS 'Number of SMS sent in this month';
