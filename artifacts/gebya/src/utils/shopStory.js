import { amountOf, isTransferPayment, actorName } from './reportSelectors';

const DAY_MS = 86400000;

export function computeShopStory({
  metrics,
  priorMetrics = null,
  overdueCount = 0,
  overdueRatio = 0,
  closingDone = false,
  cashVariance = 0,
  lang = 'en',
}) {
  const observations = [];
  const salesCount = metrics.saleRows?.length || 0;
  const net = metrics.totalSold - metrics.spentToday;
  const cashMismatch = closingDone && Math.abs(cashVariance) > (metrics.cashExpected || 1) * 0.05;
  const salesCrash = priorMetrics && priorMetrics.totalSold > 0 && metrics.totalSold < priorMetrics.totalSold * 0.5;

  if (salesCount > 0) {
    observations.push(`${salesCount} sale${salesCount !== 1 ? 's' : ''} recorded`);
  } else {
    observations.push('No sales recorded today');
  }

  if (overdueCount > 0) {
    observations.push(`${overdueCount} customer${overdueCount !== 1 ? 's' : ''} still owe you`);
  }

  if (closingDone) {
    if (cashMismatch) {
      observations.push('Cash does not match records');
    } else {
      observations.push('Cash matches your records');
    }
  }

  if (salesCrash) {
    observations.push('Sales are lower than yesterday');
  }

  const attentionItems = [];
  if (!closingDone && salesCount > 0) {
    attentionItems.push({ type: 'cash_pending', message: 'Cash not counted yet' });
  }
  if (overdueCount > 0) {
    attentionItems.push({ type: 'overdue', message: `${overdueCount} customer${overdueCount !== 1 ? 's' : ''} need follow-up` });
  }
  if (cashMismatch) {
    attentionItems.push({ type: 'cash_mismatch', message: 'Cash does not match' });
  }

  return { observations, attentionItems, net, salesCount };
}

export function computeMoneySummary(metrics, lang = 'en') {
  const cashExpected = metrics.cashExpected || 0;
  const transferRecorded = metrics.transferRecorded || 0;
  const creditExtended = metrics.newDubie || 0;
  const creditCollected = metrics.creditCollected || 0;
  const expenses = metrics.spentToday || 0;
  const sales = metrics.totalSold || 0;

  const saleRows = metrics.saleRows || [];
  const hasCostData = saleRows.some(row => Number(row.cost_price) > 0 && Number(row.quantity) > 0);
  const totalProfit = hasCostData
    ? saleRows.reduce((sum, row) => sum + (Number(row.profit) || 0), 0)
    : null;

  return { sales, expenses, cashExpected, transferRecorded, creditExtended, creditCollected, totalProfit, hasCostData };
}

export function computeSalesSummary(metrics, lang = 'en') {
  const saleRows = metrics.saleRows || [];
  const totalSales = saleRows.length;
  const totalAmount = metrics.totalSold || 0;
  const averageSale = totalSales > 0 ? Math.round(totalAmount / totalSales) : 0;

  const byItem = new Map();
  for (const row of saleRows) {
    const name = row.item_name || row.item_note || (lang === 'am' ? 'ልዩ' : 'Other');
    const existing = byItem.get(name) || { name, revenue: 0, quantity: 0, count: 0 };
    existing.revenue += amountOf(row);
    existing.quantity += Number(row.quantity) || 0;
    existing.count += 1;
    byItem.set(name, existing);
  }
  const topItems = Array.from(byItem.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  let cashCount = 0, transferCount = 0, creditCount = 0;
  for (const row of saleRows) {
    if (row.report_kind === 'credit' || String(row.payment_type || '').toLowerCase() === 'credit') {
      creditCount++;
    } else if (isTransferPayment(row)) {
      transferCount++;
    } else {
      cashCount++;
    }
  }

  return { totalSales, totalAmount, averageSale, topItems, paymentBreakdown: { cash: cashCount, transfer: transferCount, credit: creditCount } };
}

export function computeCreditSummary(enrichedCustomerSummaries = [], lang = 'en') {
  const customersWithDebt = enrichedCustomerSummaries
    .filter(c => Number(c.balance || 0) > 0)
    .sort((a, b) => {
      if (a.has_overdue && !b.has_overdue) return -1;
      if (!a.has_overdue && b.has_overdue) return 1;
      return Number(b.balance || 0) - Number(a.balance || 0);
    });

  const overdue = customersWithDebt.filter(c => c.has_overdue);
  const dueToday = customersWithDebt.filter(c => !c.has_overdue);
  const totalOwed = customersWithDebt.reduce((sum, c) => sum + Number(c.balance || 0), 0);
  const overdueAmount = overdue.reduce((sum, c) => sum + Number(c.overdue_amount || c.balance || 0), 0);
  const largestDebt = customersWithDebt.length > 0 ? customersWithDebt[0] : null;

  return { customers: customersWithDebt, overdue, dueToday, totalOwed, overdueAmount, overdueCount: overdue.length, largestDebt, totalCount: customersWithDebt.length };
}

export function computeStaffSummary(staffRows = [], lang = 'en') {
  if (staffRows.length === 0) return null;
  const total = staffRows.reduce((sum, s) => sum + s.sold, 0);
  const topSeller = staffRows.length > 0 ? staffRows[0] : null;
  return { staff: staffRows, count: staffRows.length, total, topSeller };
}

export function computeAttentionItems({
  closingDone = false, cashExpected = 0, cashVariance = 0, overdueCount = 0,
  overdueAmount = 0, largestOverdueDays = 0, salesCount = 0, avgSalesCount = 0,
  expenses = 0, avgExpenses = 0, lang = 'en',
}) {
  const items = [];

  if (!closingDone) {
    items.push({
      type: 'cash_pending', severity: 'urgent',
      message: lang === 'am' ? 'ገንዘብ ገና አልተጠቀሰም' : 'Cash not counted yet',
      detail: `${fmt(cashExpected)} ETB`,
      action: lang === 'am' ? 'ገንዘብ ቅጠል' : 'Count Cash',
      actionType: 'primary',
    });
  }

  if (closingDone && Math.abs(cashVariance) > cashExpected * 0.05) {
    const direction = cashVariance > 0 ? 'more than expected' : 'less than expected';
    items.push({
      type: 'cash_mismatch', severity: 'urgent',
      message: lang === 'am' ? 'ገንዘብ አይዛመድም' : 'Cash does not match',
      detail: `${Math.abs(cashVariance).toLocaleString()} ETB ${direction}`,
      action: lang === 'am' ? 'ያረጋግጡ' : 'Review',
      actionType: 'secondary',
    });
  }

  if (overdueCount > 0) {
    items.push({
      type: 'overdue_customers', severity: 'warning',
      message: `${overdueCount} customer${overdueCount !== 1 ? 's' : ''} owe you`,
      detail: `Total: ${fmt(overdueAmount)} ETB`,
      action: lang === 'am' ? 'ያስታውሱ' : 'Remind',
      actionType: 'secondary',
    });
  }

  if (avgSalesCount > 0 && salesCount < avgSalesCount * 0.5 && salesCount > 0) {
    items.push({
      type: 'low_sales', severity: 'warning',
      message: lang === 'am' ? 'ሽያጭ ከመደበኛው ዝቅተኛ ነው' : 'Sales are lower than usual',
      detail: `Usually ${avgSalesCount} sales · Only ${salesCount} today`,
      action: null, actionType: null,
    });
  }

  return items;
}

export function computeTimeline(rows = [], lang = 'en') {
  return rows.slice(0, 20).map(row => ({
    id: row.report_id || row.id,
    time: row.created_at,
    label: row.title || row.item_name || row.customer_name || (lang === 'am' ? 'መዝገብ' : 'Record'),
    amount: amountOf(row),
    kind: row.report_kind || row.type,
    payment: isTransferPayment(row) ? 'transfer' : 'cash',
    staff: actorName(row),
  }));
}

export function computeShopDiary({
  metrics,
  topItem = null,
  overdueCount = 0,
  closingDone = false,
  cashMismatch = false,
  staffSummary = null,
  lang = 'en',
}) {
  const salesCount = metrics.saleRows?.length || 0;
  const totalSold = metrics.totalSold || 0;
  const totalSpent = metrics.spentToday || 0;
  const net = totalSold - totalSpent;

  const parts = [];

  if (salesCount === 0) {
    parts.push('Quiet day — no sales recorded');
  } else if (salesCount <= 3) {
    parts.push('Slow day with just a few sales');
  } else if (salesCount <= 10) {
    parts.push('Busy day with steady sales');
  } else {
    parts.push('Very busy day');
  }

  if (totalSold > 0) {
    parts.push(`Total sales were ${fmt(totalSold)} ETB`);
  }

  if (topItem) {
    parts.push(`${topItem.name} sold the most`);
  }

  if (closingDone && !cashMismatch) {
    parts.push('Cash matched perfectly');
  } else if (closingDone && cashMismatch) {
    parts.push('Cash did not match — needs review');
  }

  if (overdueCount > 0) {
    parts.push(`${overdueCount} customer${overdueCount !== 1 ? 's' : ''} still owe money`);
  }

  if (totalSpent > 0) {
    parts.push(`Spent ${fmt(totalSpent)} ETB on expenses`);
  }

  if (staffSummary && staffSummary.count > 0) {
    parts.push(`${staffSummary.count} staff members worked today`);
  }

  return parts.join('. ') + '.';
}

function fmt(n) {
  return Number(n || 0).toLocaleString();
}
