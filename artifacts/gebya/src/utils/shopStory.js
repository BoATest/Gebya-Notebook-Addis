// shopStory.js — The brain that tells the owner what's happening.
//
// Every function answers ONE question:
//   computeShopStory    → "Is my shop okay?"
//   computeMoneySummary → "Where is my money?"
//   computeSalesSummary → "What did we sell?"
//   computeCreditSummary → "Who owes me?"
//   computeStaffSummary → "How is everyone doing?"
//   computeAttentionItems → "What needs me?"
//   computeTimeline     → "What happened today?"
//   computeShopDiary    → "What should I remember?"
//
// All functions are pure — no side effects, no database calls.
// Input: pre-computed rows and metrics from reportSelectors.js.
// Output: structured objects ready for rendering.

import { amountOf, isTransferPayment, actorName } from './reportSelectors';

const DAY_MS = 86400000;

// ─── SHOP STORY ──────────────────────────────────────────────
// "Is my shop okay?"

export function computeShopStory({
  metrics,
  priorMetrics = null,
  overdueCount = 0,
  overdueRatio = 0,
  closingDone = false,
  cashVariance = 0,
  lang = 'en',
}) {
  const hasOverdue = overdueCount > 0;
  const cashMismatch = closingDone && Math.abs(cashVariance) > (metrics.cashExpected || 1) * 0.05;
  const salesCrash = priorMetrics && priorMetrics.totalSold > 0 && metrics.totalSold < priorMetrics.totalSold * 0.5;

  // Build observations — plain sentences, no judgments
  const observations = [];

  // Sales count
  const salesCount = metrics.saleRows?.length || 0;
  if (salesCount === 0) {
    observations.push(
      lang === 'am' ? 'ዛሬ ምንም ሽያጅ አልተመዘገበም' : 'No sales recorded today'
    );
  }

  // Credit
  if (hasOverdue) {
    observations.push(
      lang === 'am'
        ? `${overdueCount} ደንበኛ ዕዳ አለባቸው`
        : `${overdueCount} customer${overdueCount !== 1 ? 's' : ''} still owe`
    );
  }

  // Cash
  if (closingDone) {
    if (cashMismatch) {
      observations.push(
        lang === 'am' ? 'ገንዘብ ከመዝገብ ጋር አይጣጣምም' : 'Cash does not match records'
      );
    } else {
      observations.push(
        lang === 'am' ? 'ገንዘብ ከመዝገብ ጋር ይጣጣማል' : 'Cash matches records'
      );
    }
  }

  return { observations };
}

// ─── MONEY SUMMARY ───────────────────────────────────────────
// "Where is my money?"

export function computeMoneySummary(metrics, lang = 'en') {
  const cashExpected = metrics.cashExpected || 0;
  const transferRecorded = metrics.transferRecorded || 0;
  const creditExtended = metrics.newDubie || 0;
  const creditCollected = metrics.creditCollected || 0;
  const expenses = metrics.spentToday || 0;
  const sales = metrics.totalSold || 0;

  return {
    sales,
    expenses,
    cashExpected,
    transferRecorded,
    creditExtended,
    creditCollected,
  };
}

// ─── SALES SUMMARY ───────────────────────────────────────────
// "What did we sell?"

export function computeSalesSummary(metrics, lang = 'en') {
  const saleRows = metrics.saleRows || [];
  const totalSales = saleRows.length;
  const totalAmount = metrics.totalSold || 0;
  const averageSale = totalSales > 0 ? Math.round(totalAmount / totalSales) : 0;

  // Top items by revenue
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

  // Payment breakdown
  let cashCount = 0;
  let transferCount = 0;
  let creditCount = 0;
  for (const row of saleRows) {
    if (row.report_kind === 'credit' || String(row.payment_type || '').toLowerCase() === 'credit') {
      creditCount++;
    } else if (isTransferPayment(row)) {
      transferCount++;
    } else {
      cashCount++;
    }
  }

  return {
    totalSales,
    totalAmount,
    averageSale,
    topItems,
    paymentBreakdown: { cash: cashCount, transfer: transferCount, credit: creditCount },
  };
}

// ─── CREDIT SUMMARY ──────────────────────────────────────────
// "Who owes me?"

export function computeCreditSummary(enrichedCustomerSummaries = [], lang = 'en') {
  const customersWithDebt = enrichedCustomerSummaries
    .filter(c => Number(c.balance || 0) > 0)
    .sort((a, b) => {
      // Overdue first, then by amount
      if (a.has_overdue && !b.has_overdue) return -1;
      if (!a.has_overdue && b.has_overdue) return 1;
      return Number(b.balance || 0) - Number(a.balance || 0);
    });

  const overdue = customersWithDebt.filter(c => c.has_overdue);
  const dueToday = customersWithDebt.filter(c => !c.has_overdue);
  const totalOwed = customersWithDebt.reduce((sum, c) => sum + Number(c.balance || 0), 0);
  const overdueAmount = overdue.reduce((sum, c) => sum + Number(c.overdue_amount || c.balance || 0), 0);
  const largestDebt = customersWithDebt.length > 0 ? customersWithDebt[0] : null;

  return {
    customers: customersWithDebt,
    overdue,
    dueToday,
    totalOwed,
    overdueAmount,
    overdueCount: overdue.length,
    largestDebt,
    totalCount: customersWithDebt.length,
  };
}

// ─── STAFF SUMMARY ───────────────────────────────────────────
// "How is everyone doing?"

export function computeStaffSummary(staffRows = [], lang = 'en') {
  if (staffRows.length === 0) return null;

  const total = staffRows.reduce((sum, s) => sum + s.sold, 0);
  const topSeller = staffRows.length > 0 ? staffRows[0] : null;

  return {
    staff: staffRows,
    count: staffRows.length,
    total,
    topSeller,
  };
}

// ─── ATTENTION ITEMS ─────────────────────────────────────────
// "What needs me?"

export function computeAttentionItems({
  closingDone = false,
  cashExpected = 0,
  cashVariance = 0,
  overdueCount = 0,
  overdueAmount = 0,
  largestOverdueDays = 0,
  salesCount = 0,
  avgSalesCount = 0,
  expenses = 0,
  avgExpenses = 0,
  lang = 'en',
}) {
  const items = [];

  // Cash not counted
  if (!closingDone) {
    items.push({
      type: 'cash_pending',
      severity: 'urgent',
      message: lang === 'am' ? 'ገንዘብ ገና አልተጠቀሰም' : 'Cash not counted yet',
      detail: lang === 'am'
        ? `የሚጠበቅ: ${fmt(cashExpected)} ETB`
        : `Expected: ${fmt(cashExpected)} ETB`,
      action: lang === 'am' ? 'ገንዘብ ቅጠል' : 'Count Cash',
      actionType: 'primary',
    });
  }

  // Cash mismatch
  if (closingDone && Math.abs(cashVariance) > cashExpected * 0.05) {
    const direction = cashVariance > 0 ? (lang === 'am' ? 'በዚህ ብዛት ተጨማሪ ነው' : 'more than expected') : (lang === 'am' ? 'በዚህ ብዛት ያነሰ ነው' : 'less than expected');
    items.push({
      type: 'cash_mismatch',
      severity: 'urgent',
      message: lang === 'am' ? 'ገንዘብ አይዛመድም' : 'Cash does not match',
      detail: `${fmt(Math.abs(cashVariance))} ETB ${direction}`,
      action: lang === 'am' ? '_firestore' : 'Review',
      actionType: 'secondary',
    });
  }

  // Overdue customers
  if (overdueCount > 0) {
    items.push({
      type: 'overdue_customers',
      severity: 'warning',
      message: lang === 'am'
        ? `${overdueCount} ደንበኛ ይሄዳቸዋል`
        : `${overdueCount} customer${overdueCount !== 1 ? 's' : ''} owe you`,
      detail: lang === 'am'
        ? `ጠቅላላ: ${fmt(overdueAmount)} ETB`
        : `Total: ${fmt(overdueAmount)} ETB · Oldest: ${largestOverdueDays} days`,
      action: lang === 'am' ? 'ያስታውሱ' : 'Remind',
      actionType: 'secondary',
    });
  }

  // Low sales (compared to average)
  if (avgSalesCount > 0 && salesCount < avgSalesCount * 0.5 && salesCount > 0) {
    items.push({
      type: 'low_sales',
      severity: 'warning',
      message: lang === 'am' ? 'ሽያጭ ከመደበኛው ዝቅተኛ ነው' : 'Sales are lower than usual',
      detail: lang === 'am'
        ? `በአጠቃላይ ${avgSalesCount} ሽያጭ ይሆናል · ${salesCount} ብቻ`
        : `Usually ${avgSalesCount} sales by now · Only ${salesCount} today`,
      action: null,
      actionType: null,
    });
  }

  // High expenses
  if (avgExpenses > 0 && expenses > avgExpenses * 1.5) {
    items.push({
      type: 'high_expenses',
      severity: 'warning',
      message: lang === 'am' ? 'ወጪ ከመደበኛው ከፍተኛ ነው' : 'Expenses are higher than usual',
      detail: lang === 'am'
        ? `በአጠቃላይ ${fmt(avgExpenses)} ETB · ዛሬ ${fmt(expenses)} ETB`
        : `Usually ${fmt(avgExpenses)} ETB · Today ${fmt(expenses)} ETB`,
      action: null,
      actionType: null,
    });
  }

  return items;
}

// ─── TIMELINE ────────────────────────────────────────────────
// "What happened today?"

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

// ─── SHOP DIARY ──────────────────────────────────────────────
// "What should I remember?"

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

  if (lang === 'am') {
    const parts = [];

    if (salesCount === 0) {
      parts.push('ዛሬ ምንም ሽያጭ አልተከናወነም');
    } else if (salesCount <= 5) {
      parts.push('ዛሬ ጥቂት ሽያጮች ተመዝግበዋል');
    } else if (salesCount <= 15) {
      parts.push('ዛሬ መጠነኛ ሥራ ነበር');
    } else {
      parts.push('ዛሬ ሥራ የበዛበት ቀን ነበር');
    }

    if (topItem) {
      parts.push(`${topItem.name} በብዛት ተሽጧል`);
    }

    if (closingDone && !cashMismatch) {
      parts.push('ገንዘብ በትክክል ተጣጥሟል');
    } else if (closingDone && cashMismatch) {
      parts.push('ገንዘብ አልተጣጣመም');
    }

    if (overdueCount > 0) {
      parts.push(`${overdueCount} ደንበኞች ዕዳ አለባቸው`);
    }

    return parts.join('። ') + '።';
  }

  // English diary
  const parts = [];

  if (salesCount === 0) {
    parts.push('Quiet day — no sales recorded');
  } else if (salesCount <= 5) {
    parts.push('Slow day');
  } else if (salesCount <= 15) {
    parts.push('Busy day');
  } else {
    parts.push('Very strong day');
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
    parts.push(`${overdueCount} customer${overdueCount !== 1 ? 's' : ''} still owe`);
  }

  if (staffSummary && staffSummary.count > 0) {
    parts.push(`${staffSummary.count} staff member${staffSummary.count !== 1 ? 's' : ''} on duty`);
  }

  return parts.join('. ') + '.';
}

// Helper: format number (inline to avoid circular dependency)
function fmt(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── HERO STATUS ──────────────────────────────────────────────
// "Am I okay?" — single sentence + one CTA button

export function computeHeroStatus({
  metrics,
  closingDone = false,
  cashVariance = 0,
  overdueCount = 0,
  staffRows = [],
  period = 'day',
  lang = 'en',
}) {
  const salesCount = metrics.saleRows?.length || 0;
  const cashExpected = metrics.cashExpected || 0;
  const hasOverdue = overdueCount > 0;
  const unconfirmedStaff = staffRows.filter(s => !s.confirmed);
  const cashMismatch = closingDone && Math.abs(cashVariance) > (cashExpected || 1) * 0.05;

  if (!closingDone && (period === 'evening' || period === 'night')) {
    return {
      sentence: lang === 'am'
        ? 'አንድ ቀሪ ሥራ፦ ገንዘብህን ቆጥር'
        : 'One thing left: Count your cash.',
      cta: lang === 'am' ? '💰 ገንዘብ ቆጠራ' : '💰 Count Cash →',
      actionType: 'count_cash',
    };
  }
  if (!closingDone) {
    return {
      sentence: lang === 'am'
        ? 'ዛሬ የሱቅህ ቀን አሁንም አልተዘጋም'
        : 'Your day isn\'t closed yet.',
      cta: lang === 'am' ? '💰 ገንዘብ ቆጠራ' : '💰 Count Cash →',
      actionType: 'count_cash',
    };
  }
  if (cashMismatch) {
    return {
      sentence: lang === 'am'
        ? `ገንዘብ አይዛመድም፦ ልዩነቱ ${fmt(Math.abs(cashVariance))} ETB`
        : `Cash doesn\'t match — off by ${fmt(Math.abs(cashVariance))} ETB.`,
      cta: lang === 'am' ? '📋 መረምር' : '📋 Review',
      actionType: 'review',
    };
  }
  if (unconfirmedStaff.length > 0) {
    return {
      sentence: lang === 'am'
        ? `${unconfirmedStaff.length} ሰራተኛ ገንዘብ አላስረከበም`
        : `${unconfirmedStaff.length} staff haven\'t reported cash.`,
      cta: lang === 'am' ? '👥 ሰብስብ' : '👥 Collect →',
      actionType: 'collect_staff',
    };
  }
  if (hasOverdue) {
    return {
      sentence: lang === 'am'
        ? `${overdueCount} ደንበኛ ዕዳ አለባቸው`
        : `${overdueCount} customer${overdueCount !== 1 ? 's' : ''} still owe you.`,
      cta: lang === 'am' ? '🔔 አስታውስ' : '🔔 Remind →',
      actionType: 'overdue',
    };
  }
  if (salesCount === 0) {
    return {
      sentence: lang === 'am'
        ? 'ዛሬ ገና ምንም ሽያጭ የለም'
        : 'No sales yet today.',
      cta: lang === 'am' ? '🛒 ሽያጭ መዝግብ' : '🛒 Record Sale →',
      actionType: 'sale',
    };
  }
  return {
    sentence: lang === 'am'
      ? `ሁሉም ደህና ነው፦ ${salesCount} ሽያጮች፣ ${fmt(cashExpected)} ETB ጥሬ ገንዘብ`
      : `All good — ${salesCount} sale${salesCount !== 1 ? 's' : ''}, ${fmt(cashExpected)} ETB cash.`,
    cta: lang === 'am' ? '📒 ዝርዝር ይመልከቱ' : '📒 View Details',
    actionType: 'view_details',
  };
}

// ─── TODAY'S STORY ────────────────────────────────────────────
// "What should I remember?" — narrative paragraph (3-5 sentences)

export function computeTodayStory({
  metrics,
  staffSummary = null,
  overdueCount = 0,
  overdueAmount = 0,
  closingDone = false,
  cashVariance = 0,
  creditCollected = 0,
  expenseCount = 0,
  lang = 'en',
}) {
  const salesCount = metrics.saleRows?.length || 0;
  const totalSold = metrics.totalSold || 0;
  const cashExpected = metrics.cashExpected || 0;
  const cashMismatch = closingDone && Math.abs(cashVariance) > (cashExpected || 1) * 0.05;

  const parts = [];

  if (lang === 'am') {
    if (salesCount === 0) {
      parts.push('ዛሬ ምንም ሽያጭ አልተከናወነም');
    } else if (salesCount <= 5) {
      parts.push(`ዛሬ ${salesCount} ሽያጮች ተመዝግበዋል፣ ${fmt(totalSold)} ETB`);
    } else {
      parts.push(`ዛሬ ${salesCount} ሽያጮች፣ ${fmt(totalSold)} ETB`);
    }

    if (staffSummary?.staff?.length > 0) {
      const names = staffSummary.staff.map(s => s.name).join('፣ ');
      parts.push(`${names} ሸጠዋል`);
    }

    if (creditCollected > 0) {
      parts.push(`${fmt(creditCollected)} ETB ዕዳ ተሰብስቧል`);
    }

    if (closingDone && !cashMismatch) {
      parts.push('ገንዘብ በትክክል ተጣጥሟል');
    } else if (closingDone && cashMismatch) {
      parts.push(`ገንዘብ አልተጣጣመም፦ ልዩነቱ ${fmt(Math.abs(cashVariance))} ETB`);
    }

    if (expenseCount > 0) {
      parts.push(`${fmt(metrics.spentToday || 0)} ETB ወጪ ተደርጓል`);
    }

    return parts.join('። ') + '።';
  }

  if (salesCount === 0) {
    parts.push('You opened but no sales were recorded today.');
  } else if (salesCount <= 5) {
    parts.push(`You recorded ${salesCount} sale${salesCount !== 1 ? 's' : ''} worth ${fmt(totalSold)} ETB today.`);
  } else {
    parts.push(`${salesCount} sale${salesCount !== 1 ? 's' : ''} today totalling ${fmt(totalSold)} ETB.`);
  }

  if (staffSummary?.staff?.length > 0) {
    const names = staffSummary.staff.map(s => s.name).join(', ');
    parts.push(`${names} handled sales.`);
  }

  if (creditCollected > 0) {
    parts.push(`${fmt(creditCollected)} ETB in old debts was collected.`);
  }

  if (closingDone && !cashMismatch) {
    parts.push('Cash balanced perfectly at closing.');
  } else if (closingDone && cashMismatch) {
    parts.push(`Cash was off by ${fmt(Math.abs(cashVariance))} ETB at closing.`);
  }

  if (overdueCount > 0) {
    parts.push(`${overdueCount} customer${overdueCount !== 1 ? 's' : ''} still owe ${fmt(overdueAmount)} ETB.`);
  }

  if (expenseCount > 0) {
    parts.push(`${fmt(metrics.spentToday || 0)} ETB in expenses.`);
  }

  return parts.join(' ') + (parts.length > 0 ? '' : 'A quiet day with nothing recorded.');
}

// ─── RECOMMENDATIONS ──────────────────────────────────────────
// "What should I know?" — 4 insight sentences

export function computeRecommendations({
  metrics,
  priorMetrics = null,
  staffSummary = null,
  overdueCount = 0,
  closingDone = false,
  creditCollected = 0,
  lang = 'en',
}) {
  const recs = [];
  const totalSold = metrics.totalSold || 0;

  // Sales trend
  if (priorMetrics && priorMetrics.totalSold > 0) {
    const diff = totalSold - priorMetrics.totalSold;
    const pct = Math.round((diff / priorMetrics.totalSold) * 100);
    if (pct > 20) {
      recs.push(lang === 'am'
        ? `ሽያጭ ከትናንት ${pct}% ጨምሯል`
        : `Sales are ${pct}% higher than yesterday.`);
    } else if (pct < -20) {
      recs.push(lang === 'am'
        ? `ሽያጭ ከትናንት ${Math.abs(pct)}% ቀንሷል`
        : `Sales are ${Math.abs(pct)}% lower than yesterday.`);
    } else {
      recs.push(lang === 'am'
        ? `ሽያጭ ከትናንት ጋር ሲነጻጸር የተረጋጋ ነው`
        : `Sales are stable compared to yesterday.`);
    }
  }

  // Top selling item
  const saleRows = metrics.saleRows || [];
  const byItem = new Map();
  for (const row of saleRows) {
    const name = row.item_name || row.item_note || 'Other';
    byItem.set(name, (byItem.get(name) || 0) + amountOf(row));
  }
  const topItems = Array.from(byItem.entries()).sort((a, b) => b[1] - a[1]);
  if (topItems.length > 0) {
    const [topName, topAmount] = topItems[0];
    recs.push(lang === 'am'
      ? `${topName} በብዛት ተሽጧል፦ ${fmt(topAmount)} ETB`
      : `${topName} sold the most: ${fmt(topAmount)} ETB.`);
  }

  // Staff insight
  if (staffSummary?.staff?.length > 1) {
    const top = staffSummary.staff[0];
    recs.push(lang === 'am'
      ? `${top.name} ${top.sold} ETB ሸጠዋል — ከፍተኛ ሻጭ`
      : `${top.name} sold ${fmt(top.sold)} ETB — top seller today.`);
  }

  // Debt collection insight
  if (creditCollected > 0) {
    recs.push(lang === 'am'
      ? `${fmt(creditCollected)} ETB ዕዳ ሰብስበሃል`
      : `You collected ${fmt(creditCollected)} ETB in old debts. Good job!`);
  } else if (overdueCount > 0) {
    recs.push(lang === 'am'
      ? `${overdueCount} ደንበኛ ዕዳ አለባቸው — ማስታወስ ያስፈልጋል`
      : `${overdueCount} customer${overdueCount !== 1 ? 's' : ''} still owe — send reminders.`);
  }

  // Pad to at least 2
  if (recs.length === 0) {
    recs.push(lang === 'am'
      ? 'ዛሬ ምንም ልዩ ነገር አልተስተዋለም'
      : 'Nothing unusual to report today.');
  }

  return recs.slice(0, 4);
}

// ─── STAFF RECONCILIATION ────────────────────────────────────
// Per-staff cash expected for multi-staff reconciliation

export function computeStaffReconciliation(staffRows = [], closingState = {}) {
  return staffRows.map(s => ({
    id: s.id,
    name: s.name,
    records: s.records || 0,
    cashExpected: s.cash || 0,
    digitalExpected: s.transfer || 0,
    sold: s.sold || 0,
    cashReceived: closingState.staffReports?.[s.id]?.cashReceived ?? null,
    digitalReceived: closingState.staffReports?.[s.id]?.digitalReceived ?? null,
    confirmed: Boolean(closingState.staffReports?.[s.id]?.confirmed),
  }));
}
