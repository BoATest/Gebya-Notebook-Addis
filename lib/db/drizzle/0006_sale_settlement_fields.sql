-- Add sale settlement fields to transactions table.
-- These fields support partial payments and pay-later sales.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS sale_settlement_mode varchar(32),
  ADD COLUMN IF NOT EXISTS paid_amount real,
  ADD COLUMN IF NOT EXISTS remaining_amount real,
  ADD COLUMN IF NOT EXISTS settlement_due_date bigint;
