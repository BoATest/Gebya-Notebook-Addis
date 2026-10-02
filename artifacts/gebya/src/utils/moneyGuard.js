// moneyGuard.js — money-field normalization for the numeric(12,2) migration.
// Client-side mirror of the server pull-guard (MIGRATION_PLAN §6).
//
// Why: after the server migrates money columns to numeric(12,2), drizzle returns
// STRINGS ("150.50"). Unconverted, they would (a) string-poison bare accumulators
// like getCustomerBalance and (b) fail the sync engine's strict-type _deepEqual
// forever, manufacturing fake conflicts and version churn on every sync.
// This module converts + rounds at ONE choke point: every row pulled from the
// server passes through normalizePulledRow before it enters Dexie.

// Money fields per sync table (snake_case, matching server pull payloads).
const PULL_MONEY_FIELDS = {
  transactions: ['amount', 'cost_price', 'profit', 'paid_amount', 'remaining_amount'],
  customer_transactions: ['amount', 'paid_amount'],
  supplier_transactions: ['amount'],
  catalog_entries: ['default_price', 'default_cost'],
  settlements: ['expected_cash', 'actual_cash', 'cash_variance', 'expected_transfer',
    'actual_transfer', 'transfer_variance', 'expected_total', 'actual_total',
    'total_variance', 'final_expected_cash', 'final_expected_total', 'final_variance',
    'staff_reported_cash', 'staff_reported_transfer', 'carry_forward'],
};

/** Round to 2dp half-away-from-zero; non-finite → 0. Mirrors server roundMoney. */
export function roundMoney2dp(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const scaled = Number((n * 100).toFixed(6));
  return (Math.sign(scaled) || 1) * Math.round(Math.abs(scaled)) / 100;
}

/** Normalize all known money fields of a pulled row (mutates + returns the row). */
export function normalizePulledRow(tableKey, row) {
  if (!row || typeof row !== 'object') return row;
  const fields = PULL_MONEY_FIELDS[tableKey];
  if (fields) {
    for (const f of fields) {
      if (row[f] == null) continue;
      row[f] = roundMoney2dp(row[f]);
    }
  }
  // Nested money: transaction items and payment allocations.
  if (tableKey === 'transactions' && Array.isArray(row.items)) {
    row.items = row.items.map((it) => ({
      ...it,
      ...(it.unit_price != null ? { unit_price: roundMoney2dp(it.unit_price) } : {}),
      ...(it.line_total != null ? { line_total: roundMoney2dp(it.line_total) } : {}),
    }));
  }
  if (tableKey === 'customer_transactions' && Array.isArray(row.allocation)) {
    row.allocation = row.allocation.map((a) => ({
      ...a,
      ...(a.amount != null ? { amount: roundMoney2dp(a.amount) } : {}),
    }));
  }
  return row;
}

// Push-side field sets (same tables; the client's local values are already birr
// floats — this strips accumulated float noise before it reaches the DB).
const PUSH_MONEY_FIELDS = PULL_MONEY_FIELDS;

/** Round money fields of a row about to be pushed to the server. */
export function normalizePushedRow(tableKey, row) {
  return normalizePulledRow(tableKey, row);
}
