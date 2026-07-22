-- Create settlements table for per-staff settlement system.
CREATE TABLE IF NOT EXISTS settlements (
  id bigserial PRIMARY KEY,
  local_id bigint,
  device_id varchar(128) NOT NULL,
  settlement_id varchar(128) NOT NULL,
  business_id integer NOT NULL REFERENCES businesses(id),
  staff_id integer NOT NULL,

  period_start bigint NOT NULL,
  period_end bigint NOT NULL,

  expected_cash integer NOT NULL DEFAULT 0,
  actual_cash integer NOT NULL DEFAULT 0,
  cash_variance integer NOT NULL DEFAULT 0,

  expected_transfer integer NOT NULL DEFAULT 0,
  actual_transfer integer NOT NULL DEFAULT 0,
  transfer_variance integer NOT NULL DEFAULT 0,

  expected_total integer NOT NULL DEFAULT 0,
  actual_total integer NOT NULL DEFAULT 0,
  total_variance integer NOT NULL DEFAULT 0,

  adjustments jsonb DEFAULT '[]'::jsonb,

  final_expected_cash integer NOT NULL DEFAULT 0,
  final_expected_total integer NOT NULL DEFAULT 0,
  final_variance integer NOT NULL DEFAULT 0,

  status varchar(20) NOT NULL DEFAULT 'checked',
  notes varchar(500),

  settled_at bigint NOT NULL,
  settled_by integer NOT NULL,

  reconciled_at bigint,
  reconciled_by integer,
  reconciliation_note varchar(500),

  created_at bigint NOT NULL,
  updated_at bigint,
  sync_version integer NOT NULL DEFAULT 1,
  schema_version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS settlements_business_idx ON settlements(business_id);
CREATE INDEX IF NOT EXISTS settlements_staff_idx ON settlements(staff_id);
CREATE INDEX IF NOT EXISTS settlements_device_idx ON settlements(device_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS settlements_device_local_unique ON settlements(device_id, local_id);
