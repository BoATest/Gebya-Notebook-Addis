# Migration Plan: Money Columns `real` → `numeric(12,2)` (Option B)

**Status: DRAFT — awaiting explicit approval. Nothing has been executed against any database.**
**Date:** 2026-09-30 · **Scope:** Gebya production DB (Neon), `lib/db` schema, api-server, frontend guards.

---

## 1. Scope

### 1.1 Columns migrating from `real` (4-byte float) → `numeric(12, 2)`

| Table | Columns |
|---|---|
| `transactions` | `amount`, `cost_price`, `profit`, `paid_amount`, `remaining_amount` |
| `customer_transactions` | `amount` |
| `supplier_transactions` | `amount` |
| `catalog_entries` | `default_price`, `default_cost` |

**Excluded (already correct):** `notifications.amount` (already `numeric(12,2)`), `bank_report_snapshots.payload` (jsonb).

### 1.2 Settlements reconciliation — VERDICT: they store whole BIRR, not santimi

Evidence chain (verified file-by-file this session):
- Client input is decimal birr as typed: `SettlementSheet.jsx:467-468` (birr-labeled input), `:116-118` plain `Number()`, `:227-249` pushes `actual_cash` unchanged. Staff path: `staffStore.js:295-329` + `settlementSelectors.js:22-67` sum raw decimal-birr `tx.amount`.
- No ×100/÷100 anywhere: repo-wide grep for `*100`/`/100` near settlements returns only percentage math; server `mapSettlement` (`syncHelpers.ts:160-177`) is a pure field rename.
- Readers prove the unit: `SettlementSheet.jsx:59-60` loads the stored value straight back into a birr entry field — santimi would visibly show "15050".
- Schema: 17 integer money columns (`settlements.ts:13-34,48-53`), canonical DDL `0000_baseline_current_schema.sql:421-459`.

**Conclusion:** integer columns hold **birr rounded/truncated to whole units** — fractional birr (150.50) is being silently lost at the integer boundary today. Reconciling them to `numeric(12,2)` is unit-consistent (no rescaling) and *fixes* an existing data-loss bug. All 17 money columns migrate:

`expected_cash, actual_cash, cash_variance, expected_transfer, actual_transfer, transfer_variance, expected_total, actual_total, total_variance, final_expected_cash, final_expected_total, final_variance, staff_reported_cash, staff_reported_transfer` (+ `carry_forward` and any remaining money column confirmed by the pre-flight `information_schema` query).

⚠️ **Environment drift warning:** one-off repair script `lib/db/converge-settlements.cjs:5-27` declares these columns as `NUMERIC(12,2)` (and `staff_id TEXT`). Environments where that script ran may already be numeric. **Pre-flight MUST query `information_schema.columns` and generate the ALTER set per environment** — do not assume the baseline.

---

## 2. Drizzle schema updates

**Files:**
- `lib/db/src/schema/transactions.ts` — 5 columns → `numeric("amount", { precision: 12, scale: 2 })` etc.
- `lib/db/src/schema/customer_transactions.ts` — 1 column
- `lib/db/src/schema/supplier_transactions.ts` — 1 column
- `lib/db/src/schema/catalog_entries.ts` — 2 columns
- `lib/db/src/schema/settlements.ts` — 17 columns
- `lib/db/src/schema/index.ts` — no change (re-exports)
- `artifacts/api-server/src/bootstrap.ts` (ensureSchema block, ~:650-687) — currently hard-codes `integer` for settlement money columns in `ADD COLUMN IF NOT EXISTS`; must be updated to numeric **and** given type-repair statements for drifted deployments.

**Zod insert schemas** (`insertTransactionSchema` etc., same files): money fields change from `z.number()` to `z.union([z.number(), z.string()]).transform(v => typeof v === "string" ? Number(v) : v).refine(v => Number.isFinite(v) && Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "max 2 decimal places")` — accepts the client's JSON numbers (today's contract) AND numeric strings, rejects >2dp. **Epsilon form is mandatory:** `Math.round(v*100) === v*100` is WRONG — IEEE-754 makes `0.1*100 === 10.000000000000002`, so plain equality rejects valid values like 0.1, 1.1, 10.15, 99.99. The epsilon comparison (`Math.abs(v*100 - Math.round(v*100)) < 1e-6`) accepts them. Unit test required: 0.1, 1.1, 10.15, 99.99 must PASS; 10.155 must FAIL. Drizzle accepts JS numbers for numeric columns and stringifies them itself, so the client payload contract is unchanged.

**Decision recorded:** default Drizzle numeric mode (returns `string` on select). We do NOT use `mode: "number"` — strings avoid silent float re-introduction server-side; boundaries convert explicitly (§6/§7).

---

## 3. SQL migration + verification

`0007_money_numeric.sql` (journal entry added properly this time — see audit finding F3):

```sql
-- 0007: money real -> numeric(12,2); value-preserving (ROUND before cast).
BEGIN;

-- Guard rails: a long-running query must not queue behind/with the ALTER and
-- stall every sync client. Fail fast instead.
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

-- settlements: int -> numeric (no USING needed; birr units preserved).
-- Guard with DO block: skip if already numeric (converge-script environments).
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
```

Notes: `real::numeric` is exact (decimal literal of the float), so `ROUND(...,2)` before/at cast is value-preserving for all values the client ever wrote (client already rounds to 2dp at `useSmartSaleRows.js:51`); int→numeric is always lossless. `numeric(12,2)` caps at 9,999,999,999.99 birr — pre-flight asserts `max(amount) < 1e10` per table.

**Pre-verification (capture to a report table or log, same transaction snapshot):**

```sql
-- Per business, money sums at full precision BEFORE (run on a Neon branch copy first)
SELECT business_id,
       SUM(amount::numeric)::text            AS sum_amount_exact,
       ROUND(SUM(amount::numeric),2)::text   AS sum_amount_2dp,
       COUNT(*)                              AS n
FROM transactions WHERE deleted_at IS NULL GROUP BY business_id
ORDER BY business_id;
-- Repeat shape for customer_transactions, supplier_transactions (amount), settlements (actual_total).
-- Also: SELECT max(amount) FROM transactions;  → must be < 1e10 (numeric(12,2) headroom)
-- Also: SELECT count(*) FROM transactions WHERE amount::numeric <> ROUND(amount::numeric,2);
--       → rows with >2dp (drift already stored); expect 0; if >0 they will be rounded — count is the acceptance baseline.
```

**Pre-flight (AMENDMENT 4): list ALL settlements columns from information_schema and confirm the full list matches the DO block before the migration runs.**

```sql
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'settlements'
ORDER BY ordinal_position;
```

The owner reviews this full listing against the DO-block column list and signs off before the run. Money columns must appear as `integer` (or already `numeric(12,2)` where the converge script ran); all non-money columns (ids, timestamps, status, notes, adjustments) must be untouched.

**Post-verification (AFTER migration, must match BEFORE to 2dp exactly):**

```sql
SELECT business_id,
       SUM(amount)::text AS sum_amount_post   -- numeric SUM is exact decimal
FROM transactions WHERE deleted_at IS NULL GROUP BY business_id ORDER BY business_id;
-- Compare per business: sum_amount_post == sum_amount_2dp  → PASS
-- Drift detector (should now be structurally impossible):
SELECT count(*) FROM transactions WHERE amount <> ROUND(amount,2);  -- → 0
-- Row-count sanity: counts identical before/after per table.
```

**Verification acceptance rule (AMENDMENT 5, explicit):**
- If the pre-flight `>2dp` row count is **0** for a table: per-business before/after sums must match **EXACTLY** (string equality at 2dp). Any difference = FAIL → rollback per §4.
- If the count is **>0** for a table (drift rows exist): the expected per-business difference is **bounded and predetermined**: `|before − after| ≤ (count of >2dp rows for that business) × 0.005` birr (each rounded row moves the sum by at most half a cent). Record actual deltas against this bound; exceeding it = FAIL → rollback per §4.

---

## 4. Rollback plan

1. **Snapshot BEFORE anything:** `pg_dump` the Neon production DB (`backup-supabase.yml`-style job or manual `pg_dump $DATABASE_URL > pre_money_migration_$(date).sql`), **plus** a Neon branch/point-in-time snapshot of prod (Neon console → Branch → create from Production; retains until sign-off). Record the LSN/restore point.
2. **The migration is transaction-wrapped** (`BEGIN/COMMIT` above) — any error mid-flight rolls back automatically; there is no partial state on failure.
3. **If a problem is discovered AFTER commit:**
   - Preferred: restore the **Neon branch** (instant, no dump replay): point a staging connection at the pre-migration branch, verify, then swap the `DATABASE_URL` (or use Neon's restore-to-branch).
   - Fallback: `pg_restore`/psql-replay the dump into a fresh DB and swap `DATABASE_URL` (same variable, one Vercel env change + redeploy; RPO = dump time).
4. **Code rollback and DB rollback are ONE UNIT:** restore the Neon branch AND `git revert` the migration commit together. **Pre-migration code is NOT safe against a numeric DB** — unguarded arithmetic on numeric-as-string poisons the balance utils (string concatenation, e.g. `getCustomerBalance`) and breaks the sync `_deepEqual` type check. Never run old server code against a migrated database except transiently during a coordinated rollback window.
5. **Window:** run inside a declared maintenance minute (see §5); rollback decision point = post-verification queries, executed immediately after COMMIT.

---

## 5. Sync safety during the migration window (offline-first outbox)

**Chosen procedure: short maintenance window — no dual-read shim.** Rationale: the DB is *not* the source of truth (Dexie is); clients buffer writes in a local outbox and retry; server availability gaps are a normal, already-handled condition (the app is built for intermittent 3G). A maintenance window is just another outage to the client.

Timeline (total ~2–3 minutes of server unavailability):
1. **T-10 min:** freeze deploys; confirm latest `dist/index.mjs` already deployed and green (post-fix bundle from Fix #1/#2 work).
2. **T-2 min:** snapshot + branch (§4.1). Run pre-verification queries; record results.
   **Mandatory pre-flight — integer column audit:** run
   `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'settlements' AND data_type IN ('integer','bigint','numeric') ORDER BY column_name;`
   and display the FULL list. The owner must confirm every integer money column on that list matches the DO block's column list (and that no OTHER money column is missing from it — e.g. carry_forward) before 0007 runs. Also confirm the real columns' current types: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('transactions','customer_transactions','supplier_transactions','catalog_entries') AND column_name IN ('amount','cost_price','profit','paid_amount','remaining_amount','default_price','default_cost') ORDER BY 1,2;`
3. **T-0:** briefly block sync ingestion so no push lands mid-DDL: simplest safe method = set env var `SYNC_MAINTENANCE=1` and (one-time, pre-shipped in the same code change) have `POST /api/sync/push` return `503 { error: "maintenance", retry_after: 60 }` when set. Clients retry their outbox automatically — verify the client honors 5xx with backoff (it does: sync failures stay queued; `OnboardingScreen`/sync error paths treat failures as retryable).
4. **T+0..T+2:** run `0007` (psql against Neon prod). COMMIT. Run post-verification; compare sums per business to 2dp.
5. **T+2:** unset `SYNC_MAINTENANCE`, redeploy the updated server (new schema + pull-guard) — order matters: code deploy AFTER column types changed, since the new code expects numeric. In-flight pushes queued during the window flush automatically; no payload conversion needed (JSON numbers were always accepted; numeric insert stringifies).
6. **T+30 min:** monitor: sync error rate, `/api/healthz`, reminder scheduler logs, a spot round-trip test (create → push → pull → render on a staging device pointed at prod).

Why no shim: a dual-read shim would add a third value domain (string|number) across every route for weeks. The pull-guard (§6) makes the server's output type uniform from the first post-migration response, and the client guard normalizes on ingestion — there is no mixed-type window visible to business logic beyond the already-shipped client update cycle. The one true mixed window (old clients pulling numeric strings before the client update ships) is handled entirely by the pull-guard converting to numbers server-side — so **old clients never see strings** if the guard ships in the same deploy as the migration.

---

## 6. Client guards (NO Dexie schema or unit changes)

**New helper `roundMoney(v)` = `Math.round((Number(v) || 0) * 100) / 100`** in `src/utils/numformat.js` (next to `fmt`).

**Push boundaries (client → server):**
1. `syncEngine.js:654-658` (`_pushAll` row assembly) — wrap money fields per table before payload: transactions (`amount, cost_price, profit, paid_amount, remaining_amount, credit_amount, cash_received, entered_total` + nested `items[].unit_price/line_total`), customer_transactions (`amount, paid_amount` + `allocation[].amount`), supplier_transactions (`amount`), catalog_entries (`default_price, default_cost`), settlements (`actual_total` + the settlement money fields pushed).
2. **Legacy bypass** `components/SyncStatusIndicator.jsx:78-87` — posts raw outbox rows directly, skipping `_pushAll`. Apply the same guard there (or better: change the button to call `getSyncEngine().sync()` — the bypass also sends outbox rows as if they were transaction records, an existing defect worth removing; decision at implementation).

**Pull boundary (server → Dexie) — the single most important guard:**
3. `syncEngineHelpers.js:8-17` `mapPullRow` — after key-case mapping, `Number()`+round every money field. This one site prevents (a) numeric strings entering Dexie and (b) the sync self-heal breakage: `_deepEqual` (`syncEngine.js:54-72`) is strict on `typeof`, so string `"150.50"` vs number `150.5` would flag every money field as changed forever, generating fake conflicts and version churn on every sync.

**Arithmetic hardening (string-poisoning fixes, no unit change):**
4. `customerLedger.js:21-30` `getCustomerBalance` — wrap accumulator in `Number(...)` (currently bare `sum + (item.amount || 0)` → string concatenation if a string ever arrives). This is the authoritative customer-outstanding calculation.
5. `supplierLedger.js:141-147` `getSupplierBalance` — same.
6. Display: `numformat.js fmt()` already does `Number(n ?? 0)` — safe as-is; no change required (rounding to 2dp for display is inherent to its `toLocaleString` options).

**Explicitly NOT changed:** Dexie schema v28/v26 stores, units (birr floats), `useSmartSaleRows.js` rounding (already 2dp-correct), any UI.

---

## 7. TypeScript paths needing updates (numeric → string at rest)

**Rule:** anywhere the server SELECTs these columns, drizzle now returns `"150.50"` (string). Verified sites:

| Path | Usage kind | Change |
|---|---|---|
| `lib/db/src/schema/*.ts` (§2) | definitions | `numeric(12,2)`; insert zod per §2 |
| `artifacts/api-server/src/routes/syncHelpers.ts` (`mapTx`, `mapCustomerTx`, `mapSupplierTx`, `mapCatalog`, `mapSettlement`) | push write (client JSON numbers) | unchanged for push; **pull** output types change (next row) |
| `artifacts/api-server/src/routes/sync.ts:363,370` (pull response) | read → API | rows go out as-is → **must convert money fields to rounded numbers server-side** (mirror of client pull-guard, protects old clients) |
| `lib/db/src/utils/customerBalance.ts` + `balance.ts` | aggregate/arithmetic | wrap in `Number()`; if drizzle `sum()` is used, it returns string for numeric — convert |
| `artifacts/api-server/src/routes/analyticsHelpers.ts` (`buildReportPayload`) | arithmetic | already `Number(t.amount)` — verify each reduce (audit confirmed wrapped); keep |
| `artifacts/api-server/src/routes/admin.ts` (`/admin/shops/:id` detail, `/admin/export-shops` CSV) | read → response/CSV | wrap money fields in `Number()`; CSV formatting gets exact 2dp |
| `artifacts/api-server/src/routes/reminders.ts` + `services/reminderScheduler.ts` + `services/reminderMessageBuilder.ts` | arithmetic + message formatting | `Number()` around balances; message builder uses `Intl.NumberFormat` (accepts strings, but make explicit) |
| `artifacts/api-server/src/routes/notifications.ts` (`amount: numeric(12,2)` — already numeric) | existing string behavior | confirm how it currently handles string `amount` and align |
| `artifacts/api-server/src/routes/support.ts` / any route joining transactions (grep `\.amount` at implementation) | TBD | full grep pass during implementation (see §8 note) |
| `lib/db/dist/schema/*.d.ts` + `dist/schema/index.js` | build output | regenerate (`pnpm --filter db build` / tsc) |
| Frontend (JS, no types) | — | §6 guards only |

**Implementation gate:** the failed enumeration subagent left ~20% of route files unclassified. Step 0 of implementation = `rg "\.(amount|costPrice|profit|paidAmount|remainingAmount|defaultPrice|defaultCost)\b" artifacts/api-server/src` full pass, producing the final file:line table; nothing ships until that table is empty of unwrapped arithmetic.

---

## 8. Step-by-step safe-run procedure (Neon production)

**Preconditions (all must be true):**
- [ ] Fix #1 (takeover) + Fix #2 (cron) merged, `dist/index.mjs` rebuilt + deployed, CI green.
- [ ] `SYNC_MAINTENANCE` flag code deployed (503 on push when set) — one small route change.
- [ ] Server pull-guard (§7 sync.ts) implemented + unit-tested (insert → push → pull → render round-trip test in `sync.test.ts`).
- [ ] Client guards (§6) implemented + unit tests green; frontend deploy can follow independently.
- [ ] Full `rg` arithmetic pass complete; every site either wrapped or verified safe.
- [ ] Staging rehearsal done end-to-end on a Neon branch (branch of prod): schema change → verification → sync round-trip → reminder dry-run → admin export.

**Runbook:**
1. Announce window (2–3 min); pause any scheduled job that might push (crons are read-only for these tables; they can stay).
2. `pg_dump` + Neon branch snapshot. Verify dump opens (`pg_restore --list`).
3. Run pre-verification SQL; save output (sums per business, max(amount) < 1e10, >2dp row count baseline).

**Acceptance rule (explicit):**
- If the pre-flight >2dp row count is **0** (expected): per-business sums after MUST equal before EXACTLY (string equality of the 2dp figures). Any difference = FAIL → rollback.
- If the pre-flight >2dp row count is **> 0**: per-business sums after MAY differ from before by at most `Σ |row_amount − ROUND(row_amount,2)|` over that business's >2dp rows (bounded by `0.005 × n_bad_rows`). Document the count of rounded rows per business in the runbook BEFORE migrating; the post-sums must match the BEFORE sums **plus exactly that expected correction**, and any other difference = FAIL → rollback.
- Row counts per table must be identical before/after, always.
4. Set `SYNC_MAINTENANCE=1` (Vercel env) → redeploy takes ~30s; or set as an immediate env update. Confirm push returns 503.
5. Run `0007_money_numeric.sql` (transaction-wrapped) against prod via `psql $DATABASE_URL -f 0007...`. On any error: it self-rolls back; diagnose; nothing to restore.
6. Run post-verification SQL; diff against step 3 per business to 2dp. **Any mismatch → rollback per §4.3** (branch restore), stop, investigate.
7. Unset `SYNC_MAINTENANCE` and deploy the new server code (schema + guards) — or deploy first, then unset (code expects numeric).
8. Watch 30 min: healthz, sync error/latency, reminder run logs, conflicts rate in sync responses, admin export CSV spot check (2dp exact), a real device round-trip.
9. Sign-off: close the pre-migration branch after 72h; delete `VERCEL_CRON_SIGNING_SECRET`-style leftovers; update `docs/` + re-baseline drizzle journal (fold 0007 into journal; also fixes audit finding F3 partially).

**Estimated total DB touch time:** < 60 s (DDL on these table sizes is metadata-only for type widening real→numeric in PG ≥ 9.2 for most cases; even with rewrite, these tables are small — thousands of rows, not millions).

---

## Out of scope / follow-ups
- `converge-settlements.cjs` and the other stray `lib/db/*.cjs` scripts: delete (audit §4.9).
- Drizzle journal repair (0002–0006 entries) — separate change, do not mix into this migration.
- Client SyncStatusIndicator legacy bypass removal — recommended, needs a UI decision.
