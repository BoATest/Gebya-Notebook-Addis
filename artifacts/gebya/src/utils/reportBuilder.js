import { fmt } from './numformat';
import { formatEthiopian } from './ethiopianCalendar';

export function buildReportSummary({
  shopName,
  cashTransactions,
  customerTransactions,
  periodLabel,
  dateLabel,
  t,
  topItemsLimit = 3,
}) {
  const sales = (cashTransactions || []).filter(tx => tx.type === 'sale');
  const expenses = (cashTransactions || []).filter(tx => tx.type === 'expense');
  const salesTotal = sales.reduce((s, tx) => s + (tx.amount || 0), 0);
  const expensesTotal = expenses.reduce((s, tx) => s + (tx.amount || 0), 0);

  const dubieGiven = (customerTransactions || []).filter(tx => tx.type === 'credit_add');
  const payments = (customerTransactions || []).filter(tx => tx.type === 'payment');
  const dubieGivenTotal = dubieGiven.reduce((s, tx) => s + (tx.amount || 0), 0);
  const paymentsTotal = payments.reduce((s, tx) => s + (tx.amount || 0), 0);

  const netReceived = salesTotal + paymentsTotal - expensesTotal;

  const counts = {};
  for (const tx of sales) {
    const name = tx.item_name || 'Unknown';
    counts[name] = (counts[name] || 0) + (tx.quantity || 1);
  }
  const topItems = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topItemsLimit)
    .map(([name, qty]) => ({ name, qty }));

  const topStr = topItems.length > 0
    ? topItems.map((p, i) => `  ${i + 1}. ${p.name} (x${p.qty})`).join('\n')
    : '  —';

  const lines = [
    `📊 ${shopName || 'Shop'} — ${periodLabel || t?.shareDailyReport || 'Report'}`,
    `📅 ${dateLabel || formatEthiopian(new Date())}`,
  ];

  lines.push(
    ``,
    `💰 ${t?.sales || 'Sales'}:              ${fmt(salesTotal)} ${t?.birr || 'birr'}`,
    `🛒 ${t?.spent || 'Expenses'}:          ${fmt(expensesTotal)} ${t?.birr || 'birr'}`,
    `📝 ${t?.dubieGiven || 'Dubie Given'}:       ${fmt(dubieGivenTotal)} ${t?.birr || 'birr'}`,
    `💳 ${t?.paymentsCollected || 'Payments Collected'}: ${fmt(paymentsTotal)} ${t?.birr || 'birr'}`,
    `📈 ${t?.netReceived || 'Net Received'}: ${fmt(netReceived)} ${t?.birr || 'birr'}`,
    ``,
    `🏆 ${t?.shareTopItems || 'Top Items Sold'}:`,
    topStr,
    ``,
    t?.shareSentVia || 'Sent via ገበያ (Gebya)',
  );

  return lines.join('\n');
}
