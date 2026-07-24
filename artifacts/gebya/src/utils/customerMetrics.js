// customerMetrics.js — credit lifecycle analytics + monthly stats + streak.
//
// Built so the Credit page hero card has TRUSTWORTHY, factual numbers.
// Locked definitions (per design spec):
//
//   - Collected this month  = sum of customer_transactions of type 'payment'
//                              where created_at is in current calendar month
//   - +X% vs last month     = (thisMonth - lastMonth) / lastMonth * 100;
//                              null if last month was zero (no division by zero)
//   - On-time %              = of credit_add transactions WITH a due_date that
//                              have been fully settled (FIFO allocation),
//                              percent paid on or before the due date.
//                              Credits without due_date are EXCLUDED.
//   - Streak                = consecutive days (counting today) with at least
//                              one transaction recorded. Resets on skip day.
//   - Top customer           = customer with most on-time settlements this
//                              month. Ties broken by total amount paid.
//   - Overdue amount         = sum of unpaid balance from credits where
//                              due_date < today. (FIFO-aware.)
//
// All numbers are derived from the shop's own data — no AI, no predictions,
// no comparisons to other shops.

import { CUSTOMER_TRANSACTION_TYPES } from './customerTransactionTypes';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * FIFO allocate payments against credits chronologically.
 * Returns enriched credit records with settlement info.
 */
function analyzeCreditLifecycle(transactions = []) {
  // Defensive: copy + sort chronologically
  const sorted = [...transactions].sort(
    (a, b) => (a.created_at || 0) - (b.created_at || 0)
  );

  const credits = []; // { id, amount, due_date, created_at, outstanding, settled_at, on_time }
  let prepay = 0; // payments that arrive before the credit they'd cover

  for (const tx of sorted) {
    const type = tx?.type;
    const amount = Number(tx?.amount) || 0;
    if (amount <= 0) continue;

    if (type === CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD) {
      let outstanding = amount;
      if (prepay > 0) {
        const used = Math.min(outstanding, prepay);
        outstanding -= used;
        prepay -= used;
      }
      credits.push({
        id: tx.id,
        amount,
        due_date: tx.due_date || null,
        created_at: tx.created_at,
        outstanding,
        settled_at: outstanding === 0 ? tx.created_at : null,
        on_time: null,
      });
    } else if (type === CUSTOMER_TRANSACTION_TYPES.PAYMENT) {
      let remaining = amount;
      // FIFO: oldest unsettled credit first
      for (const c of credits) {
        if (remaining <= 0) break;
        if (c.outstanding <= 0) continue;
        const used = Math.min(c.outstanding, remaining);
        c.outstanding -= used;
        remaining -= used;
        if (c.outstanding === 0) c.settled_at = tx.created_at;
      }
      if (remaining > 0) prepay += remaining; // overpayment becomes credit on file
    }
  }

  // Compute on-time flag for credits that have a due_date AND have settled
  for (const c of credits) {
    if (c.due_date && c.settled_at !== null) {
      c.on_time = c.settled_at <= c.due_date;
    }
  }
  return credits;
}

/**
 * Enrich a single customer summary with credit-lifecycle metrics.
 * Adds: on_time_count, on_time_eligible, on_time_rate (per-customer),
 *       avg_pay_days, has_overdue, overdue_days, overdue_amount,
 *       oldest_overdue_due_date.
 */
export function enrichCustomerWithMetrics(customer) {
  const credits = analyzeCreditLifecycle(customer.transactions || []);
  const now = Date.now();

  let onTimeCount = 0;
  let onTimeEligible = 0;
  let payDaysSum = 0;
  let payDaysCount = 0;
  let overdueAmount = 0;
  let oldestOverdueDue = null;

  for (const c of credits) {
    if (c.due_date) {
      // Settled credits with due_date are eligible for on-time stat
      if (c.settled_at !== null) {
        onTimeEligible++;
        if (c.on_time) onTimeCount++;
      }
      // Overdue if still has outstanding AND due_date is past
      if (c.outstanding > 0 && c.due_date < now) {
        overdueAmount += c.outstanding;
        if (oldestOverdueDue === null || c.due_date < oldestOverdueDue) {
          oldestOverdueDue = c.due_date;
        }
      }
    }
    // Average days from credit-creation to settlement
    if (c.settled_at !== null && c.created_at) {
      payDaysSum += (c.settled_at - c.created_at) / DAY_MS;
      payDaysCount++;
    }
  }

  const hasOverdue = overdueAmount > 0;
  const overdueDays = hasOverdue && oldestOverdueDue
    ? Math.floor((now - oldestOverdueDue) / DAY_MS)
    : 0;
  const onTimeRate = onTimeEligible > 0
    ? Math.round((onTimeCount / onTimeEligible) * 100)
    : null;
  const avgPayDays = payDaysCount > 0
    ? Math.round(payDaysSum / payDaysCount)
    : null;

  return {
    ...customer,
    on_time_count: onTimeCount,
    on_time_eligible: onTimeEligible,
    on_time_rate: onTimeRate,            // null if no eligible credits
    avg_pay_days: avgPayDays,            // null if nothing settled
    has_overdue: hasOverdue,
    overdue_amount: overdueAmount,
    overdue_days: overdueDays,
    oldest_overdue_due_date: oldestOverdueDue,
  };
}

/** Enrich an array of customer summaries. */
export function enrichCustomerSummaries(summaries = []) {
  return summaries.map(enrichCustomerWithMetrics);
}

/**
 * Compute total collected (sum of payment-type customer_transactions)
 * for the calendar month containing `referenceMs`.
 */
export function computeMonthlyCollected(customerTransactions = [], referenceMs = Date.now()) {
  const ref = new Date(referenceMs);
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
  const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).getTime();
  return customerTransactions
    .filter((tx) =>
      tx?.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT
      && Number(tx.amount) > 0
      && tx.created_at >= monthStart
      && tx.created_at < monthEnd
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
}

/**
 * % delta this month vs last month. Returns null if last month was zero.
 */
export function computeMonthlyDelta(customerTransactions = [], referenceMs = Date.now()) {
  const ref = new Date(referenceMs);
  const lastMonthRef = new Date(ref.getFullYear(), ref.getMonth() - 1, 15).getTime();
  const thisMonth = computeMonthlyCollected(customerTransactions, referenceMs);
  const lastMonth = computeMonthlyCollected(customerTransactions, lastMonthRef);
  if (lastMonth === 0) return { thisMonth, lastMonth: 0, percent: null };
  return {
    thisMonth,
    lastMonth,
    percent: Math.round(((thisMonth - lastMonth) / lastMonth) * 100),
  };
}

/**
 * Streak = consecutive days (counting today) where at least one timestamp
 * in `allTimestamps` falls on that local day. Resets on skipped day.
 * Pass all transactions of any type — sales, expenses, customer/supplier txns.
 */
export function computeStreak(allTimestamps = [], referenceMs = Date.now()) {
  if (!allTimestamps.length) return 0;
  const days = new Set();
  for (const ts of allTimestamps) {
    if (!ts) continue;
    days.add(new Date(ts).toDateString());
  }
  let streak = 0;
  const today = new Date(referenceMs);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Sort enriched customers for the "Top customers" filter:
 * highest on-time count first, ties broken by total paid.
 * Excludes customers with no eligible (due-dated, settled) credits.
 */
export function topCustomers(enrichedSummaries = []) {
  return enrichedSummaries
    .filter((c) => c.on_time_eligible > 0)
    .sort((a, b) => {
      if (b.on_time_count !== a.on_time_count) return b.on_time_count - a.on_time_count;
      // Tie: prefer higher on-time rate
      const ar = a.on_time_rate || 0;
      const br = b.on_time_rate || 0;
      return br - ar;
    });
}

/**
 * Single shop-wide on-time rate across all customers.
 * Sum of on_time_count / sum of on_time_eligible.
 */
export function shopOnTimeRate(enrichedSummaries = []) {
  let count = 0;
  let eligible = 0;
  for (const c of enrichedSummaries) {
    count += c.on_time_count || 0;
    eligible += c.on_time_eligible || 0;
  }
  if (eligible === 0) return null;
  return Math.round((count / eligible) * 100);
}

/**
 * Total overdue amount across all customers.
 */
export function shopOverdueAmount(enrichedSummaries = []) {
  return enrichedSummaries.reduce((sum, c) => sum + (c.overdue_amount || 0), 0);
}

/**
 * Number of customers with at least one overdue credit.
 */
export function countOverdueCustomers(enrichedSummaries = []) {
  return enrichedSummaries.filter((c) => c.has_overdue).length;
}

/**
 * Top customer (single best). For the "👑 Abebe always on time" callout
 * in the hero card. Returns null if no eligible customers.
 */
export function topCustomer(enrichedSummaries = []) {
  const top = topCustomers(enrichedSummaries);
  return top[0] || null;
}

/**
 * Build a single composite credit-page metrics object.
 * Pass all customer_transactions + a global list of timestamps for streak.
 */
export function buildCreditMetrics({
  enrichedSummaries = [],
  customerTransactions = [],
  globalTimestamps = [],
  referenceMs = Date.now(),
}) {
  const monthly = computeMonthlyDelta(customerTransactions, referenceMs);
  return {
    totalOwed: enrichedSummaries.reduce((s, c) => s + (Number(c.balance) || 0), 0),
    overdueAmount: shopOverdueAmount(enrichedSummaries),
    overdueCount: countOverdueCustomers(enrichedSummaries),
    onTimeRate: shopOnTimeRate(enrichedSummaries),
    monthlyCollected: monthly.thisMonth,
    monthlyDelta: monthly.percent,           // null if last month was zero
    streak: computeStreak(globalTimestamps, referenceMs),
    topCustomer: topCustomer(enrichedSummaries),
  };
}

/**
 * Build a credit report JSON suitable for export/sharing.
 * Returns a structured object with shop info, metrics, and customer details.
 */
export function buildCreditReport({
  shopName = 'Shop',
  shopPhone = '',
  enrichedSummaries = [],
  customerTransactions = [],
  referenceMs = Date.now(),
}) {
  const metrics = buildCreditMetrics({
    enrichedSummaries,
    customerTransactions,
    globalTimestamps: customerTransactions.map((t) => t.created_at),
    referenceMs,
  });

  const customers = enrichedSummaries
    .filter((c) => (Number(c.balance) || 0) > 0 || c.has_overdue)
    .map((c) => ({
      id: c.id,
      name: c.display_name,
      phone: c.phone_number || null,
      outstanding_birr: Number(c.balance) || 0,
      on_time_rate: c.on_time_rate,
      overdue_days: c.overdue_days || 0,
      overdue_amount: c.overdue_amount || 0,
      avg_pay_days: c.avg_pay_days,
    }))
    .sort((a, b) => b.outstanding_birr - a.outstanding_birr);

  return {
    report_type: 'credit_report',
    generated_at: new Date(referenceMs).toISOString(),
    shop: {
      name: shopName,
      phone: shopPhone || null,
    },
    summary: {
      total_owed_birr: metrics.totalOwed,
      overdue_amount_birr: metrics.overdueAmount,
      overdue_customers: metrics.overdueCount,
      on_time_rate_percent: metrics.onTimeRate,
      monthly_collected_birr: metrics.monthlyCollected,
      monthly_delta_percent: metrics.monthlyDelta,
      top_customer: metrics.topCustomer?.display_name || null,
    },
    customers,
  };
}

/**
 * Trigger a download or share of the credit report.
 * Uses Web Share API if available, otherwise falls back to file download.
 */
export async function exportCreditReport(report, filename = 'credit-report') {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const ts = new Date().toISOString().split('T')[0];
  const file = `${filename}-${ts}.json`;

  if (navigator.share && navigator.canShare) {
    const fileObj = new File([blob], file, { type: 'application/json' });
    if (navigator.canShare({ files: [fileObj] })) {
      await navigator.share({
        title: `Credit Report - ${report.shop?.name || 'Shop'}`,
        text: `Credit report for ${report.shop?.name || 'Shop'} generated on ${ts}`,
        files: [fileObj],
      });
      return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

function fmtCsvTimestamp(ts) {
  if (!ts) return ['', ''];
  const d = new Date(Number(ts));
  if (isNaN(d.getTime())) return ['', ''];
  const date = d.toISOString().split('T')[0];
  const time = d.toTimeString().split(' ')[0];
  return [date, time];
}

function fmtCsvType(raw) {
  if (raw === 'credit_add') return 'Credit';
  if (raw === 'payment') return 'Payment';
  if (raw === 'reversal') return 'Reversal';
  return raw || '';
}

function escapeCsv(val) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportCreditReportCsv(report, customerTransactions = [], filename = 'credit-report') {
  const lines = [];
  lines.push('\uFEFFCredit Report');
  lines.push(`Shop,${escapeCsv(report.shop?.name)}`);
  if (report.shop?.phone) lines.push(`Phone,${escapeCsv(report.shop.phone)}`);
  lines.push(`Generated,${report.generated_at || ''}`);
  lines.push('');

  const s = report.summary || {};
  lines.push('=== Summary ===');
  lines.push(`Total Outstanding (birr),${s.total_owed_birr ?? 0}`);
  lines.push(`Overdue Amount (birr),${s.overdue_amount_birr ?? 0}`);
  lines.push(`Overdue Customers,${s.overdue_customers ?? 0}`);
  lines.push(`On-Time Rate (%),${s.on_time_rate_percent ?? '—'}`);
  lines.push(`Monthly Collected (birr),${s.monthly_collected_birr ?? 0}`);
  lines.push(`Monthly Delta (%),${s.monthly_delta_percent != null ? s.monthly_delta_percent : '—'}`);
  lines.push(`Top Customer,${escapeCsv(s.top_customer)}`);
  lines.push('');

  if (report.customers && report.customers.length > 0) {
    const customerMap = {};
    for (const c of report.customers) {
      if (c.id != null) customerMap[c.id] = c.name;
    }

    const customerTxns = customerTransactions.filter(t => t.customer_id != null && customerMap[t.customer_id]);
    customerTxns.sort((a, b) => {
      if ((a.customer_id || 0) !== (b.customer_id || 0)) return (a.customer_id || 0) - (b.customer_id || 0);
      return (a.created_at || 0) - (b.created_at || 0);
    });

    if (customerTxns.length > 0) {
      lines.push('=== Transaction History ===');
      lines.push('Customer,Date,Time,Type,Item,Amount (birr),Running Balance (birr)');

      let lastCustomerId = null;
      let runningBalance = 0;

      for (const tx of customerTxns) {
        if (tx.customer_id !== lastCustomerId) {
          runningBalance = 0;
          lastCustomerId = tx.customer_id;
        }

        const [date, time] = fmtCsvTimestamp(tx.created_at);
        const type = fmtCsvType(tx.type);
        const amount = Number(tx.amount) || 0;
        const signedAmount = type === 'Credit' ? amount : -amount;
        runningBalance += signedAmount;

        const itemNote = tx.item_note || tx.note || '';

        lines.push([
          escapeCsv(customerMap[tx.customer_id]),
          date,
          time,
          type,
          escapeCsv(itemNote),
          signedAmount,
          runningBalance,
        ].join(','));
      }
    }
  }

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const ts = new Date().toISOString().split('T')[0];
  const file = `${filename}-${ts}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}

// --- Credit Score Badge ---

/**
 * Compute a simple credit score grade (A/B/C/D) from report metrics.
 */
export function computeCreditGrade(report) {
  const s = report?.summary || {};
  const totalOwed = s.total_owed_birr || 0;
  const overdue = s.overdue_amount_birr || 0;
  const onTimeRate = s.on_time_rate_percent ?? 100;

  if (totalOwed === 0) return { grade: 'A', label: 'Excellent', labelAm: 'ተሻшли', color: '#16a34a' };

  let score = 100;
  if (onTimeRate < 50) score -= 30;
  else if (onTimeRate < 75) score -= 15;
  else if (onTimeRate < 90) score -= 5;

  if (overdue > 0 && totalOwed > 0) {
    const overdueRatio = overdue / totalOwed;
    if (overdueRatio > 0.5) score -= 30;
    else if (overdueRatio > 0.25) score -= 15;
    else if (overdueRatio > 0.1) score -= 5;
  }

  if (score >= 85) return { grade: 'A', label: 'Excellent', labelAm: 'ተሻшли', color: '#16a34a' };
  if (score >= 65) return { grade: 'B', label: 'Good', labelAm: 'ጥሩ', color: '#2563eb' };
  if (score >= 40) return { grade: 'C', label: 'Fair', labelAm: 'መካከለኛ', color: '#d97706' };
  return { grade: 'D', label: 'Poor', labelAm: 'እንከስ', color: '#dc2626' };
}

// --- PDF Export ---

/**
 * Export credit report as a printable PDF.
 * Opens styled HTML and triggers browser print dialog.
 */
export function exportCreditReportPdf(report, lang = 'en') {
  const s = report?.summary || {};
  const customers = report?.customers || [];
  const shop = report?.shop || {};
  const score = computeCreditGrade(report);
  const ts = report?.generated_at ? new Date(report.generated_at).toLocaleDateString() : new Date().toLocaleDateString();
  const isAm = lang === 'am';

  const html = `<!DOCTYPE html>
<html lang="${isAm ? 'am' : 'en'}">
<head>
<meta charset="UTF-8">
<title>${isAm ? 'የክፍያ ሪፖርት' : 'Credit Report'} - ${shop.name || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
  .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #1B4332; padding-bottom: 20px; }
  .shop-name { font-size: 24px; font-weight: 800; color: #1B4332; }
  .shop-phone { font-size: 14px; color: #6b7280; margin-top: 4px; }
  .report-date { font-size: 12px; color: #9ca3af; margin-top: 8px; }
  .title { font-size: 18px; font-weight: 700; color: #374151; margin-bottom: 20px; text-align: center; }
  .score-section { text-align: center; margin: 24px 0; }
  .score-badge { display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: ${score.color}; color: #fff; font-size: 36px; font-weight: 900; line-height: 80px; text-align: center; }
  .score-label { font-size: 14px; color: ${score.color}; font-weight: 700; margin-top: 8px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
  .summary-card { padding: 16px; border-radius: 10px; background: #f9fafb; border: 1px solid #e5e7eb; }
  .summary-card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-card .value { font-size: 20px; font-weight: 800; color: #374151; margin-top: 4px; }
  .summary-card .value.red { color: #dc2626; }
  .summary-card .value.green { color: #16a34a; }
  .section-title { font-size: 14px; font-weight: 700; color: #374151; margin: 24px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
  td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
  .text-right { text-align: right; }
  .text-red { color: #dc2626; font-weight: 700; }
  .text-green { color: #16a34a; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
  @media print { body { padding: 20px; } .score-badge, .summary-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="header">
  <div class="shop-name">${shop.name || 'Shop'}</div>
  ${shop.phone ? `<div class="shop-phone">${shop.phone}</div>` : ''}
  <div class="report-date">${isAm ? 'የተዘረዘረበት ቀን' : 'Generated'}: ${ts}</div>
</div>
<div class="score-section">
  <div class="score-badge">${score.grade}</div>
  <div class="score-label">${isAm ? score.labelAm : score.label}</div>
</div>
<div class="title">${isAm ? 'የክፍያ ሪፖርት' : 'Credit Report'}</div>
<div class="summary-grid">
  <div class="summary-card">
    <div class="label">${isAm ? 'ጠቅላላ የተገዛ' : 'Total Owed'}</div>
    <div class="value">${fmtBirr(s.total_owed_birr || 0)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${isAm ? 'የሚታገዝ' : 'Collected'}</div>
    <div class="value green">${fmtBirr(s.monthly_collected_birr || 0)}</div>
  </div>
  <div class="summary-card">
    <div class="label">${isAm ? 'የጊዜ ተeming' : 'On-Time Rate'}</div>
    <div class="value">${s.on_time_rate_percent ?? 0}%</div>
  </div>
  <div class="summary-card">
    <div class="label">${isAm ? 'በ孙悟 የሚገኝ' : 'Overdue'}</div>
    <div class="value ${s.overdue_amount_birr > 0 ? 'red' : ''}">${fmtBirr(s.overdue_amount_birr || 0)}</div>
  </div>
</div>
${customers.length > 0 ? `
<div class="section-title">${isAm ? 'የደንበኛ መረጃ' : 'Customer Details'} (${customers.length})</div>
<table>
  <thead><tr>
    <th>${isAm ? 'ስም' : 'Name'}</th>
    <th class="text-right">${isAm ? 'የተገዛ' : 'Outstanding'}</th>
    <th class="text-right">${isAm ? 'ጊዜ ተeming' : 'On-Time'}</th>
    <th class="text-right">${isAm ? '孙悟 ቀን' : 'Overdue Days'}</th>
  </tr></thead>
  <tbody>${customers.map(c => `
    <tr>
      <td>${c.name || 'Customer'}</td>
      <td class="text-right ${c.outstanding_birr > 0 ? 'text-red' : 'text-green'}">${fmtBirr(c.outstanding_birr || 0)}</td>
      <td class="text-right">${c.on_time_rate ?? 0}%</td>
      <td class="text-right">${c.overdue_days || 0}</td>
    </tr>`).join('')}
  </tbody>
</table>` : `<p style="text-align:center;color:#9ca3af;margin-top:24px;">${isAm ? 'ምንም የክፍያ መረጃ የለም' : 'No credit data'}</p>`}
<div class="footer">
  <div>Gebya - ${isAm ? 'የንግድ ታሪክ' : 'Business Notebook'}</div>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return 'blocked';
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
  return 'opened';
}

function fmtBirr(n) {
  return 'birr ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
