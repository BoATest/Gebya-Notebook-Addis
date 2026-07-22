# Plan: Unified Credit/Dubie + Partial UX Across Itemized and Simplified Sales

## Goal
Make the itemized and simplified sale pages behave/ look the same for Credit/Dubie and Partial, with the improved credit UI from the itemized page.

## Files to change
1. `artifacts/gebya/src/components/smartSale/ItemizedSaleView.jsx`
2. `artifacts/gebya/src/components/TransactionForm.jsx`
3. `artifacts/gebya/src/components/PaymentTypeChips.jsx`
4. `artifacts/gebya/src/context/LangContext.jsx`

## Exact changes

### 1. `ItemizedSaleView.jsx`
- Replace phone field in `(isCredit || isPartial)` block with previous balance display
  - existing customer → show `customer.balance` from credit data
  - new/unknown → show `0` or “No balance”
- Swap current due-date UI to use the same Ethiopian calendar pattern used on the credit page
  - keep presets: Today, Tomorrow, Next week, Custom
  - use shared calendar component/approach, not a separate variant
- Keep customer search, inline add (`onAddCustomerInline`), scrollable results, selected-customer summary
- No other visual changes to the otherwise-liked credit UI

### 2. `TransactionForm.jsx` (simplified sales record)
- Change “Credit” chip label to **“Dubie”**
- Replace simplified-credit block UI with the same customer search + inline add + previous balance + due-date presets + Ethiopian calendar pattern from itemized page
- Keep same validation/save logic as itemized:
  - Credit/Dubie: needs customer
  - Partial: needs customer + partial amount in range
- Include same settlement fields in save payload (`sale_settlement_mode`, `paid_amount`, `remaining_amount`, `settlement_due_date`)

### 3. `PaymentTypeChips.jsx`
- Ensure Credit/Dubie chip uses `t.credit` or explicit `Dubie` label consistently
- Keep Partial chip

### 4. `LangContext.jsx`
- Confirm `credit` is `Dubie`
- Confirm `partialPayment` exists
- Add any missing labels used by the new unified UI if absent

## Consistency rules
- Credit/Dubie on both pages = same fields in same order:
  1. Customer search / select / inline add
  2. Previous balance display
  3. Due date presets + custom Ethiopian calendar
- Partial on both pages = Credit/Dubie fields + Amount Received on top
- Save gating identical on both pages

## Out of scope
- Backend schema/migration already done; no DB changes here
- Multi-debt selection, overpayment dialog, SupplierTransactionSheet conditional chips already committed separately
