// creditPerformance.ts — per-customer credit performance for the platform Admin
// shop deep-dive ("Payment behavior" panel).
//
// Server-side port of the client's credit-lifecycle analytics
// (artifacts/gebya/src/utils/customerMetrics.js) so the Admin console can show
// per-customer On-time % without changing the shop owner's UI:
//
//   - Credits are settled FIFO (oldest unsettled credit first).
//   - A settled credit with a due_date counts as on-time when it was fully
//     settled on or before its due date. Credits without due_date are excluded.
//   - avg_pay_days = average days from credit creation to settlement
//     (rounded), over fully settled credits — matches the client metric.
//   - outstanding = credits − payments − reversals (mirrors the shop stats).
//   - overdue = unsettled credit from credits whose due_date has passed.
//
// Pure function over plain rows — no DB access, unit-testable.

import type { CustomerTransaction, Customer } from "@workspace/db/schema";

export interface CustomerCreditPerformance {
  customer_id: number;
  display_name: string | null;
  on_time_count: number;
  on_time_eligible: number;
  on_time_rate_percent: number | null;
  avg_pay_days: number | null;
  outstanding_birr: number;
  overdue_amount_birr: number;
  overdue_days: number;
  transaction_count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface TxnLike {
  customerId: number | null;
  type: string;
  amount: number;
  dueDate?: number | null;
  createdAt: number;
}

interface CustomerLike {
  id: number;
  displayName?: string | null;
  name?: string | null;
}

interface CreditRecord {
  amount: number;
  dueDate: number | null;
  createdAt: number;
  outstanding: number;
  settledAt: number | null;
  onTime: boolean | null;
}

/** FIFO allocate payments against credits chronologically (client parity). */
function analyzeLifecycle(sorted: TxnLike[]): CreditRecord[] {
  const credits: CreditRecord[] = [];
  let prepay = 0; // payments that arrive before the credit they'd cover

  for (const tx of sorted) {
    const amount = Number(tx?.amount) || 0;
    if (amount <= 0) continue;

    if (tx.type === "credit_add") {
      let outstanding = amount;
      if (prepay > 0) {
        const used = Math.min(outstanding, prepay);
        outstanding -= used;
        prepay -= used;
      }
      credits.push({
        amount,
        dueDate: tx.dueDate ?? null,
        createdAt: tx.createdAt,
        outstanding,
        settledAt: outstanding === 0 ? tx.createdAt : null,
        onTime: null,
      });
    } else if (tx.type === "payment") {
      let remaining = amount;
      for (const c of credits) {
        if (remaining <= 0) break;
        if (c.outstanding <= 0) continue;
        const used = Math.min(c.outstanding, remaining);
        c.outstanding -= used;
        remaining -= used;
        if (c.outstanding === 0) c.settledAt = tx.createdAt;
      }
      if (remaining > 0) prepay += remaining;
    }
  }

  for (const c of credits) {
    if (c.dueDate != null && c.settledAt !== null) {
      c.onTime = c.settledAt <= c.dueDate;
    }
  }
  return credits;
}

/**
 * Compute per-customer credit performance from a shop's customer_transactions.
 * Returns customers sorted by outstanding balance (desc).
 */
export function computeCustomerCreditPerformance(
  custTxns: Array<Pick<CustomerTransaction, "customerId" | "type" | "amount" | "dueDate" | "createdAt">>,
  customers: Array<Pick<Customer, "id" | "displayName" | "name">>,
  now: number = Date.now(),
): CustomerCreditPerformance[] {
  const byCustomer = new Map<number, TxnLike[]>();
  for (const t of custTxns || []) {
    if (!t || t.customerId == null) continue;
    let list = byCustomer.get(t.customerId);
    if (!list) {
      list = [];
      byCustomer.set(t.customerId, list);
    }
    list.push(t);
  }

  const nameOf = new Map<number, string | null>(
    (customers || []).map((c) => [c.id, c.displayName || c.name || null]),
  );

  const result: CustomerCreditPerformance[] = [];

  for (const [customerId, txns] of byCustomer) {
    // Lifecycle analysis ignores reversals (client parity) — a reversal is a
    // ledger correction, not a payment event.
    const lifecycle = analyzeLifecycle(
      txns
        .filter((t) => t.type === "credit_add" || t.type === "payment")
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    );

    let onTimeCount = 0;
    let onTimeEligible = 0;
    let payDaysSum = 0;
    let payDaysCount = 0;
    let overdueAmount = 0;
    let oldestOverdue: number | null = null;

    for (const c of lifecycle) {
      if (c.dueDate != null) {
        if (c.settledAt !== null) {
          onTimeEligible++;
          if (c.onTime) onTimeCount++;
        }
        if (c.outstanding > 0 && c.dueDate < now) {
          overdueAmount += c.outstanding;
          if (oldestOverdue === null || c.dueDate < oldestOverdue) {
            oldestOverdue = c.dueDate;
          }
        }
      }
      if (c.settledAt !== null && c.createdAt) {
        payDaysSum += (c.settledAt - c.createdAt) / DAY_MS;
        payDaysCount++;
      }
    }

    const creditSum = txns
      .filter((t) => t.type === "credit_add")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const paidSum = txns
      .filter((t) => t.type === "payment")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const reversedSum = txns
      .filter((t) => t.type === "reversal")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    result.push({
      customer_id: customerId,
      display_name: nameOf.get(customerId) ?? null,
      on_time_count: onTimeCount,
      on_time_eligible: onTimeEligible,
      on_time_rate_percent:
        onTimeEligible > 0 ? Math.round((onTimeCount / onTimeEligible) * 100) : null,
      avg_pay_days: payDaysCount > 0 ? Math.round(payDaysSum / payDaysCount) : null,
      outstanding_birr: creditSum - paidSum - reversedSum,
      overdue_amount_birr: overdueAmount,
      overdue_days:
        overdueAmount > 0 && oldestOverdue !== null
          ? Math.floor((now - oldestOverdue) / DAY_MS)
          : 0,
      transaction_count: txns.length,
    });
  }

  result.sort((a, b) => b.outstanding_birr - a.outstanding_birr);
  return result;
}

