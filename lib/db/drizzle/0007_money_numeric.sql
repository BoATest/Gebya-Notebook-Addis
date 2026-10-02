-- 0007_money_numeric.sql — money real -> numeric(12,2); value-preserving (ROUND before cast).
-- Part of MIGRATION_PLAN_NUMERIC_MONEY.md. DO NOT RUN against production without
-- completing §8 preconditions (snapshot, pre-flight listing, SYNC_MAINTENANCE gate).
--
-- Amendment 2: lock_timeout + statement_timeout inside the transaction so a
-- long-running query can never queue the ALTER behind it and block all syncs.
-- Amendment 4: pre-flight — run the information_schema listing from the plan (§3)
-- and confirm the settlements column list against the DO block below BEFORE running.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- transactions -------------------------------------------------------------
ALTER TABLE transactions
  ALTER COLUMN amount            TYPE numeric(12,2) USING ROUND(amount::numeric, 2),
  ALTER COLUMN cost_price        TYPE numeric(12,2) USING ROUND(cost_price::numeric, 2),
  ALTER COLUMN profit            TYPE numeric(12,2) USING ROUND(profit::numeric, 2),
  ALTER COLUMN paid_amount       TYPE numeric(12,2) USING ROUND(paid_amount::numeric, 2),
  ALTER COLUMN remaining_amount  TYPE numeric(12,2) USING ROUND(remaining_amount::numeric, 2);

-- customer_transactions / supplier_transactions / catalog_entries ----------
ALTER TABLE customer_transactions
  ALTER COLUMN amount TYPE numeric(12,2) USING ROUND(amount::numeric, 2);
ALTER TABLE supplier_transactions
  ALTER COLUMN amount TYPE numeric(12,2) USING ROUND(amount::numeric, 2);
ALTER TABLE catalog_entries
  ALTER COLUMN default_price TYPE numeric(12,2) USING ROUND(default_price::numeric, 2),
  ALTER COLUMN default_cost  TYPE numeric(12,2) USING ROUND(default_cost::numeric, 2);

-- settlements: int -> numeric, guarded per-column (converge-script environments
-- may already be numeric; birr units preserved, no rescaling).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'settlements'
      AND column_name IN ('expected_cash','actual_cash','cash_variance',
        'expected_transfer','actual_transfer','transfer_variance',
        'expected_total','actual_total','total_variance',
        'final_expected_cash','final_expected_total','final_variance',
        'staff_reported_cash','staff_reported_transfer','carry_forward')
      AND data_type = 'integer'
  LOOP
    EXECUTE format('ALTER TABLE settlements ALTER COLUMN %I TYPE numeric(12,2)', r.column_name);
  END LOOP;
END $$;

COMMIT;

-- Post-run sanity (run separately, read-only):
--   SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name IN ('transactions','customer_transactions','supplier_transactions',
--                         'catalog_entries','settlements')
--      AND (data_type = 'real' OR (data_type='integer' AND table_name='settlements'
--           AND column_name LIKE '%cash%'));
--   → expect zero rows.
