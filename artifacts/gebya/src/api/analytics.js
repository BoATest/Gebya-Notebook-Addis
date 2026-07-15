/**
 * Bank-facing analytics API client.
 *
 * Provides structured data exports for NBE/DFI/bank conversations.
 * Uses the same base URL pattern as identity.js.
 *
 * Backend endpoints (to be implemented):
 *   POST /api/analytics/bank-report   — submit shop analytics for bank review
 *   GET  /api/analytics/bank-report   — retrieve aggregated analytics (admin only)
 */
import { db } from '../db';
import { computeImpactMetrics } from '../utils/entitlements';

const BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = options.token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Build a structured bank report payload from local Dexie data.
 * This is the data a bank/NBE would see when reviewing a shop's creditworthiness.
 */
export async function buildBankReportPayload(shopProfile = {}) {
  const [impactMetrics, transactions, customerTransactions, customers] = await Promise.all([
    computeImpactMetrics(),
    db.transactions.toArray(),
    db.customer_transactions.toArray(),
    db.customers.toArray(),
  ]);

  // Per-customer credit summary
  const customerSummaries = [];
  const customerIds = new Set(customerTransactions.map((t) => t.customer_id));

  for (const cid of customerIds) {
    const credits = customerTransactions.filter(
      (t) => t.customer_id === cid && t.type === 'credit_add'
    );
    const payments = customerTransactions.filter(
      (t) => t.customer_id === cid && t.type === 'payment'
    );

    const totalCredit = credits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalPaid = payments.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const outstanding = totalCredit - totalPaid;

    if (totalCredit <= 0) continue;

    const oldestCredit = credits.sort(
      (a, b) => (a.created_at || 0) - (b.created_at || 0)
    )[0];
    const newestCredit = credits.sort(
      (a, b) => (b.created_at || 0) - (a.created_at || 0)
    )[0];

    const customer = customers.find((c) => c.id === cid);
    const daysSinceOldest = oldestCredit
      ? Math.floor((Date.now() - oldestCredit.created_at) / (24 * 60 * 60 * 1000))
      : 0;

    customerSummaries.push({
      customer_id: cid,
      display_name: customer?.display_name || `Customer ${cid}`,
      total_credit_extended: totalCredit,
      total_repaid: totalPaid,
      outstanding_balance: outstanding,
      repayment_rate: totalCredit > 0 ? Math.round((totalPaid / totalCredit) * 100) : 0,
      credit_count: credits.length,
      payment_count: payments.length,
      oldest_credit_days: daysSinceOldest,
      most_recent_credit_at: newestCredit?.created_at || null,
    });
  }

  // Sort by outstanding balance descending
  customerSummaries.sort((a, b) => b.outstanding_balance - a.outstanding_balance);

  // Monthly transaction summary (last 6 months)
  const monthlySummary = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = monthDate.getTime();
    const monthEnd = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).getTime();

    const monthTxs = transactions.filter(
      (t) => t.created_at >= monthStart && t.created_at <= monthEnd
    );
    const monthSales = monthTxs
      .filter((t) => t.type === 'sale')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthExpenses = monthTxs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const monthCredit = customerTransactions
      .filter(
        (t) =>
          t.type === 'credit_add' &&
          t.created_at >= monthStart &&
          t.created_at <= monthEnd
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const monthPayments = customerTransactions
      .filter(
        (t) =>
          t.type === 'payment' &&
          t.created_at >= monthStart &&
          t.created_at <= monthEnd
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    monthlySummary.push({
      month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
      total_sales_birr: monthSales,
      total_expenses_birr: monthExpenses,
      net_birr: monthSales - monthExpenses,
      credit_extended_birr: monthCredit,
      credit_repaid_birr: monthPayments,
      transaction_count: monthTxs.length,
    });
  }

  return {
    report_version: 1,
    generated_at: new Date().toISOString(),
    shop: {
      shop_id: shopProfile.shop_id || shopProfile.id || null,
      name: shopProfile.name || 'Unknown',
      phone: shopProfile.phone || null,
    },
    impact_metrics: impactMetrics,
    monthly_summary: monthlySummary,
    customer_summaries: customerSummaries,
    summary: {
      total_customers_with_credit: customerSummaries.length,
      total_outstanding_birr: customerSummaries.reduce(
        (s, c) => s + c.outstanding_balance,
        0
      ),
      average_repayment_rate:
        customerSummaries.length > 0
          ? Math.round(
              customerSummaries.reduce((s, c) => s + c.repayment_rate, 0) /
                customerSummaries.length
            )
          : 0,
      months_of_history: monthlySummary.filter((m) => m.transaction_count > 0).length,
    },
  };
}

/**
 * Submit shop analytics to the bank-facing API.
 * Backend endpoint: POST /api/analytics/bank-report
 */
export async function submitBankReport(shopProfile = {}, token) {
  const payload = await buildBankReportPayload(shopProfile);
  return request('/analytics/bank-report', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieve aggregated bank analytics (admin/bank-facing only).
 * Backend endpoint: GET /api/analytics/bank-report
 */
export async function getBankReport(token) {
  return request('/analytics/bank-report', { method: 'GET', token });
}

export default {
  buildBankReportPayload,
  submitBankReport,
  getBankReport,
};
