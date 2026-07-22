-- Create staff_events table for Postgres-backed activity feed.
-- Replaces the in-memory store used by events.ts (Phase 1B).
CREATE TABLE IF NOT EXISTS staff_events (
  id                SERIAL PRIMARY KEY,
  business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id           INTEGER NOT NULL,
  client_event_id   VARCHAR(128) NOT NULL,
  record_id         VARCHAR(128),
  actor_name_snapshot TEXT,
  actor_role_at_event VARCHAR(32),
  event_type        VARCHAR(32) NOT NULL,
  occurred_at_device TIMESTAMPTZ NOT NULL,
  payload           JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_events_client_idempotency
  ON staff_events(business_id, client_event_id);

CREATE INDEX IF NOT EXISTS staff_events_business_idx
  ON staff_events(business_id);

CREATE INDEX IF NOT EXISTS staff_events_created_idx
  ON staff_events(created_at);
