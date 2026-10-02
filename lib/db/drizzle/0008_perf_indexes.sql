-- 0008_perf_indexes.sql — hot-path indexes (C2, ships in the Session B window
-- together with 0007; both run inside the SYNC_MAINTENANCE gate).
--
-- Rationale:
--  - transactions/customer_transactions: per-customer credit lookup + balance
--    aggregation previously scanned the whole business partition
--    (only transactions_business_idx existed).
--  - transactions.created_at: every date-range report filters on the client
--    epoch-millis column.
--  - settlements: had NO indexes at all; every settlement list/reconcile scans.
--
-- CREATE INDEX IF NOT EXISTS + CONCURRENTLY is not allowed inside a transaction;
-- these run in the SYNC_MAINTENANCE window where pushes are gated, so plain
-- CREATE INDEX inside the transaction is safe and atomic. Table sizes are small
-- (thousands of rows) — index build time is milliseconds.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

CREATE INDEX IF NOT EXISTS transactions_business_customer_idx
  ON transactions (business_id, customer_id);
CREATE INDEX IF NOT EXISTS transactions_business_created_idx
  ON transactions (business_id, created_at);
CREATE INDEX IF NOT EXISTS customer_transactions_business_customer_idx
  ON customer_transactions (business_id, customer_id);
CREATE INDEX IF NOT EXISTS settlements_business_idx
  ON settlements (business_id);

COMMIT;

-- Post-run sanity:
--   SELECT indexname FROM pg_indexes
--    WHERE indexname IN ('transactions_business_customer_idx',
--                        'transactions_business_created_idx',
--                        'customer_transactions_business_customer_idx',
--                        'settlements_business_idx');
--   → expect exactly 4 rows.
