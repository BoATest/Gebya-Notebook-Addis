# Report Page Comprehensive Technical Update

## Current State & Root Cause
- `ReportView` computes `reportRows` and `metrics` internally from `transactions`/`ledgerTransactions`, so `recentTransactions` updates immediately after a recording.
- KPI cards in the same component rely on `selectedStats`, `selectedCollected`, `selectedFlow` props that fall back to zero values. The parent `App.jsx` does not pass these props at all.
- `RecordRow` already maps `expense` → `tone="bad"` (red). `HistoryView` also maps expenses to red. Therefore the current inconsistency is either in a different renderer or already resolved. Action: standardize centrally.

## Implementation Plan

### 1. Fix State Synchronization bug
**File:** `artifacts/gebya/src/components/ReportView.jsx`
- Remove `selectedStats`, `selectedCollected`, `selectedFlow` from component props.
- Compute them from internal `metrics`:
  - `selectedStats = { sales: metrics.totalSold, expenses: metrics.spentToday }`
  - `selectedCollected = metrics.creditCollected`
  - `selectedFlow = { cash: metrics.cashExpected, transfer: metrics.transferRecorded }`
- Keep `metrics` as the single source of truth derived from `reportRows`.

### 2. Standardize expense red tone everywhere
**Files:** `ReportView.jsx`, `HistoryView.jsx`, `TxRow.jsx`, `reportSelectors.js`
- Export a shared constant `EXPENSE_AMOUNT_COLOR = '#dc2626'`.
- Replace all inline hardcoded expense red values (both `#dc2626` and conditional `'bad'` tone) with the constant.

### 3. Optimize Owner/Staff logic
**File:** `artifacts/gebya/src/utils/reportSelectors.js`
- Clean up `matchesScope` logic:
  - Keep current behavior: `viewerStaffId` overrides scope filtering.
  - When `viewerStaffId` is null:
    - `scope === OWNER_SCOPE` → `!row.actor_staff_member_id`
    - `scope === ALL_SCOPE or ''` → show all
    - other scope values → match `actor_staff_member_id`
- Confirm `buildStaffReportRows` correctly skips owner transactions (already done).

### 4. Add Total Loan Given summary
**Files:** `artifacts/gebya/src/utils/reportSelectors.js`, `ReportView.jsx`
- Add `loanGivenLoans: sum(creditRows)` and `loanGivenManual: sum(manualCreditRows)` to `computeReportMetrics` return value.
- In `ReportView`, add a sixth `SummaryCard` labeled `Total Loan Given` with value from `metrics.loanGivenTotal`.
- Ensure `ReportView` date range selection (`today`, `week`, `month`, `custom`) governs the filter.

### 5. Daily Closing & Reconciliation Sheet
**New file:** `artifacts/gebya/src/components/DailyClosingSheet.jsx`
- New bottom sheet component that shows for the current selected date range:
  - **Recorded totals:** sold, spent, collected, cash expected, transfer expected, loan given
  - **Actual inputs:** cash-on-hand, transfer-on-hand (editable number fields)
  - **Variance:** computed difference (actual − expected) for each total
  - **Status:** under / balanced / over with color coding
- **Actions:**
  - Save closing record (persist to local `db`)
  - Lock the day (mark closing as finalized)
- Render a `Close Day` button in `ReportView.jsx` accessible to both owner and staff.
- Persist closing records; support viewing past closings.

## Testing
- Run existing `artifacts/gebya/src/__tests__/reportSelectors.test.js`.
- Add new unit tests in `reportSelectors.test.js` for loan summary.
- Playwright integration test in `artifacts/gebya/tests/` for new Reconciliation flow.

## Risks & Notes
- `selectedStats`/`selectedFlow` props might still be passed by `HistoryTab.jsx`; check and remove once `ReportView` owns them internally.
- `scope` prop defaults to `'all'` which is handled, but verify `matchesScope('all')` returns `true` for all rows.
- Reconciliation requires local DB schema additions.
