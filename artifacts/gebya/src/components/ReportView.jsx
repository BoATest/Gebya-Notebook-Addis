import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { getCurrentEthiopianDate } from '../utils/ethiopianCalendar';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import {
  ALL_SCOPE,
  amountOf,
  buildReportRows,
  buildStaffReportRows,
  computeReportMetrics,
  startOfLocalDay,
} from '../utils/reportSelectors';
import {
  computeShopStory,
  computeMoneySummary,
  computeSalesSummary,
  computeCreditSummary,
  computeStaffSummary,
  computeAttentionItems,
  computeTimeline,
  computeShopDiary,
} from '../utils/shopStory';

import ShopPulse from './ShopPulse';
import TodaySales from './TodaySales';
import KnowledgeSection from './KnowledgeSection';
import DiaryCard from './DiaryCard';
import ErrorBoundary from './report/ErrorBoundary';

const DAY_MS = 86400000;

function startOfWeek(ms = Date.now()) {
  const d = new Date(ms);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfMonth(ms = Date.now()) {
  const d = new Date(ms);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfMonth(ms = Date.now()) {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function computeExpenseBreakdown(rows = []) {
  const byCategory = new Map();
  for (const row of rows) {
    if (row.report_kind !== 'expense') continue;
    const category = row.item_note || row.item_name || row.note || 'Other';
    const existing = byCategory.get(category) || { category, total: 0 };
    existing.total += amountOf(row);
    byCategory.set(category, existing);
  }
  return Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
}

export default function ReportView({
  transactions = [],
  ledgerTransactions = [],
  enrichedCustomerSummaries = [],
  customers = [],
  suppliers = [],
  shopProfile,
  onEdit,
  onChaseOverdue,
  ownerAlerts = [],
  staffMembers = [],
  activeStaffMemberId = null,
  lang = 'en',
  todayStaffSalesRows = [],
  ownerAlertSettings = {},
  scope = ALL_SCOPE,
  catalogEntries = [],
}) {
  const { hidden, toggle: togglePrivacy } = usePrivacy();
  const [timeRange, _setTimeRange] = useState(() => {
    try { return localStorage.getItem('gebya_report_time_range') || 'today'; } catch { return 'today'; }
  });
  const setTimeRange = (value) => {
    _setTimeRange(value);
    try { localStorage.setItem('gebya_report_time_range', value); } catch {}
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [closingState, setClosingState] = useState({ done: false, cashVariance: 0 });

  const now = Date.now();
  const todayStart = startOfLocalDay(now);
  const isStaffView = Boolean(activeStaffMemberId);
  const viewerStaffId = isStaffView ? activeStaffMemberId : null;
  const { period, greeting } = useTimeOfDay();

  const rangeBounds = useMemo(() => {
    if (timeRange === 'week') return [startOfWeek(now), startOfWeek(now) + 7 * DAY_MS];
    if (timeRange === 'month') return [startOfMonth(now), endOfMonth(now)];
    if (timeRange === 'custom') {
      const start = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : todayStart;
      const endDate = customTo ? new Date(`${customTo}T00:00:00`) : new Date(todayStart);
      endDate.setDate(endDate.getDate() + 1);
      return [start, endDate.getTime()];
    }
    return [todayStart, todayStart + DAY_MS];
  }, [timeRange, customFrom, customTo]);

  const [from, to] = rangeBounds;

  const reportRows = useMemo(
    () => buildReportRows({ transactions, ledgerTransactions, customers, from, to, scope, viewerStaffId, filters: {} }),
    [transactions, ledgerTransactions, customers, from, to, scope, viewerStaffId]
  );

  const metrics = useMemo(() => computeReportMetrics(reportRows), [reportRows]);

  const staffRows = useMemo(() => buildStaffReportRows(reportRows), [reportRows]);
  const staffSummary = useMemo(() => computeStaffSummary(staffRows, lang), [staffRows, lang]);

  const creditSummary = useMemo(
    () => computeCreditSummary(enrichedCustomerSummaries, lang),
    [enrichedCustomerSummaries, lang]
  );

  const expenseBreakdown = useMemo(() => computeExpenseBreakdown(reportRows), [reportRows]);

  const priorMetrics = useMemo(() => {
    if (timeRange !== 'today') return null;
    const yesterdayStart = todayStart - DAY_MS;
    const priorRows = buildReportRows({
      transactions, ledgerTransactions, customers,
      from: yesterdayStart, to: todayStart,
      scope, viewerStaffId, filters: {},
    });
    return computeReportMetrics(priorRows);
  }, [transactions, ledgerTransactions, customers, todayStart, scope, viewerStaffId, timeRange]);

  const { avgSalesCount, avgExpenses } = useMemo(() => {
    if (timeRange !== 'today') return { avgSalesCount: 0, avgExpenses: 0 };

    const dayStart7 = todayStart - (7 * DAY_MS);
    const salesByDay = new Map();
    const expensesByDay = new Map();

    for (const tx of transactions || []) {
      const ts = tx.created_at || 0;
      if (ts < dayStart7 || ts >= todayStart) continue;
      if (tx.type !== 'sale' && tx.type !== 'expense') continue;
      const dayKey = Math.floor(ts / DAY_MS);
      if (tx.type === 'sale') {
        salesByDay.set(dayKey, (salesByDay.get(dayKey) || 0) + 1);
      } else {
        expensesByDay.set(dayKey, (expensesByDay.get(dayKey) || 0) + (Number(tx.amount) || 0));
      }
    }

    const totalSales = Array.from(salesByDay.values()).reduce((s, v) => s + v, 0);
    const totalExpenses = Array.from(expensesByDay.values()).reduce((s, v) => s + v, 0);

    return {
      avgSalesCount: Math.round(totalSales / 7),
      avgExpenses: Math.round(totalExpenses / 7),
    };
  }, [transactions, ledgerTransactions, todayStart, timeRange]);

  const story = useMemo(() => {
    const overdueRatio = creditSummary.totalCount > 0 ? creditSummary.overdueCount / creditSummary.totalCount : 0;
    return computeShopStory({
      metrics,
      priorMetrics,
      overdueCount: creditSummary.overdueCount,
      overdueRatio,
      closingDone: closingState.done,
      cashVariance: closingState.cashVariance,
      lang,
    });
  }, [metrics, priorMetrics, creditSummary, closingState, lang]);

  const money = useMemo(() => computeMoneySummary(metrics, lang), [metrics, lang]);
  const sales = useMemo(() => computeSalesSummary(metrics, lang), [metrics, lang]);

  const attentionItems = useMemo(() => {
    const largestOverdueDays = creditSummary.overdue.length > 0 ? (creditSummary.overdue[0].overdue_days || 0) : 0;
    return computeAttentionItems({
      closingDone: closingState.done,
      cashExpected: metrics.cashExpected,
      cashVariance: closingState.cashVariance,
      overdueCount: creditSummary.overdueCount,
      overdueAmount: creditSummary.overdueAmount,
      largestOverdueDays,
      salesCount: metrics.saleRows?.length || 0,
      avgSalesCount,
      expenses: metrics.spentToday,
      avgExpenses,
      lang,
    });
  }, [metrics, creditSummary, closingState, avgSalesCount, avgExpenses, lang]);

  const timeline = useMemo(() => computeTimeline(reportRows, lang), [reportRows, lang]);

  const diary = useMemo(() => {
    const topItem = sales.topItems?.length > 0 ? sales.topItems[0] : null;
    return computeShopDiary({
      metrics,
      topItem,
      overdueCount: creditSummary.overdueCount,
      closingDone: closingState.done,
      cashMismatch: closingState.done && Math.abs(closingState.cashVariance) > (metrics.cashExpected || 1) * 0.05,
      staffSummary,
      lang,
    });
  }, [metrics, sales, creditSummary, staffSummary, closingState, lang]);

  const isEmpty = reportRows.length === 0 && (ledgerTransactions || []).length === 0 && timeRange === 'today';

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return reportRows;
    const q = searchQuery.toLowerCase();
    return reportRows.filter(row =>
      (row.title || '').toLowerCase().includes(q) ||
      (row.item_name || '').toLowerCase().includes(q) ||
      (row.customer_name || '').toLowerCase().includes(q) ||
      String(row.amount || '').includes(q)
    );
  }, [reportRows, searchQuery]);

  const handleExport = () => {
    const header = ['date', 'type', 'amount', 'item_or_person', 'payment', 'status'];
    const csvEscape = (v) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filteredTransactions.map(row => [
      row.created_at ? new Date(row.created_at).toISOString() : '',
      row.report_kind || row.type,
      row.amount || 0,
      csvEscape(row.title || row.item_name || row.customer_name || ''),
      csvEscape(row.payment_type || 'Cash'),
      csvEscape(row.status || 'recorded'),
    ].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gebya-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Build focus items from attentionItems + time-of-day awareness
  const focusItems = useMemo(() => {
    const items = [];
    if (!closingState.done && period === 'evening' || period === 'night') {
      items.push({ icon: '💰', label: lang === 'am' ? 'ገንዘብ ቆጠራ' : 'Count cash', action: 'count_cash' });
    }
    for (const attn of attentionItems) {
      if (attn.type === 'cash_pending') {
        items.push({ icon: '💰', label: attn.action || 'Count cash', action: 'count_cash' });
      } else if (attn.type === 'overdue_customers') {
        items.push({ icon: '🔔', label: lang === 'am' ? 'ዕዳ አስታውስ' : 'Remind debtors', action: 'overdue' });
      }
    }
    if (metrics.saleRows?.length === 0 && timeRange === 'today') {
      items.push({ icon: '🛒', label: lang === 'am' ? 'ሽያጭ መዝግብ' : 'Record a sale', action: 'sale' });
    }
    return items.slice(0, 3);
  }, [attentionItems, closingState, period, metrics, timeRange, lang]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      padding: '0 12px 120px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '4px 4px 12px',
      }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 950, color: '#1B4332', lineHeight: 1.05 }}>
            {lang === 'am' ? 'ሪፖርት' : 'Report'}
          </h1>
          <p style={{ fontSize: 12, color: '#6b7280', fontWeight: 650, marginTop: 3 }}>
            {shopProfile?.name || (lang === 'am' ? 'በዚህ ስልክ' : 'Your shop')} · {getCurrentEthiopianDate()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={togglePrivacy}
            aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 36,
              padding: '7px 10px',
              borderRadius: 999,
              border: hidden ? '1px solid #fde68a' : '1px solid #e5e7eb',
              background: hidden ? 'rgba(196,136,58,0.10)' : '#fff',
              color: hidden ? '#92400e' : '#6b7280',
              fontSize: 12,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hidden ? (lang === 'am' ? 'አሳይ' : 'Show') : (lang === 'am' ? 'ደብቅ' : 'Hide')}
          </button>
        </div>
      </div>

      {/* Time Range */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: '#fafaf5',
        paddingTop: 4,
        paddingBottom: 8,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 4,
          background: 'rgba(27,67,50,0.08)',
          borderRadius: 12,
          padding: 4,
        }}>
          {[
            ['today', lang === 'am' ? 'ዛሬ' : 'Today'],
            ['week', lang === 'am' ? 'ሳምንት' : 'Week'],
            ['month', lang === 'am' ? 'ወር' : 'Month'],
            ['custom', lang === 'am' ? 'Custom' : 'Custom'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTimeRange(id)}
              style={{
                minHeight: 34,
                border: 'none',
                borderRadius: 9,
                background: timeRange === id ? '#1B4332' : 'transparent',
                color: timeRange === id ? '#fff' : '#6b7280',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {timeRange === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6b7280' }}>
              {lang === 'am' ? 'ከ' : 'From'}
            </span>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              style={{ minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 9, padding: '6px 8px', fontSize: 13 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6b7280' }}>
              {lang === 'am' ? 'ወደ' : 'To'}
            </span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              style={{ minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 9, padding: '6px 8px', fontSize: 13 }}
            />
          </label>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTIONS                                        */}
      {/* ═══════════════════════════════════════════════════ */}

      {/* Empty state */}
      {isEmpty && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: 16,
          padding: 24,
          marginTop: 8,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📒</div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1B4332', marginBottom: 8 }}>
            {lang === 'am' ? 'ወደ ሱቅ ታሪክ እንኳን በደህና መጡ' : 'Welcome to your shop'}
          </h2>
          <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>
            {lang === 'am'
              ? 'ዝግጁ ሲሆን ሽያጭ ወይም ወጪ መዝግብ። ሱቅዎ ሁኔታ ይሄ በፈጣን ይዘርጋል።'
              : 'Record a sale or expense to get started. Your report will appear here.'
            }
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('gebya:open-form', { detail: { type: 'sale' } }))}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: '#1B4332',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {lang === 'am' ? '🛒 ሽያጭ መዝግብ' : 'Record a Sale'}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('gebya:open-form', { detail: { type: 'expense' } }))}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: '1px solid #1B4332',
                background: '#fff',
                color: '#1B4332',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {lang === 'am' ? '📤 ወጪ መዝግብ' : 'Record Expense'}
            </button>
          </div>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* 1. Shop Pulse — conversational greeting */}
          <ErrorBoundary>
            <ShopPulse
              shopName={shopProfile?.name}
              period={period}
              greeting={greeting}
              observations={story.observations || []}
              focusItems={focusItems}
            />
          </ErrorBoundary>

          <div style={{ height: 10 }} />

          {/* 2. Today's Sales — the key number */}
          <ErrorBoundary>
            <TodaySales
              salesTotal={metrics.totalSold}
              cashTotal={metrics.cashExpected}
              digitalTotal={metrics.transferRecorded}
              entryCount={metrics.saleRows?.length || 0}
            />
          </ErrorBoundary>

          <div style={{ height: 10 }} />

          {/* 3. Knowledge sections — all collapsed by default */}
          {/* Who owes me? — Credit */}
          {!isStaffView && (
            <ErrorBoundary>
              <KnowledgeSection
                title={lang === 'am' ? 'ማን ዕዳ አለበት?' : 'Who owes me?'}
                subtitle={
                  creditSummary.totalOwed > 0
                    ? `${creditSummary.overdueCount} overdue · ${creditSummary.totalOwed.toLocaleString()} ETB`
                    : lang === 'am' ? 'ሁሉም ተከፍሏል' : 'All paid up'
                }
                badge={creditSummary.overdueCount > 0 ? { text: String(creditSummary.overdueCount), color: '#dc2626' } : undefined}
              >
                <div style={{ padding: '8px 0' }}>
                  {creditSummary.customers?.slice(0, 10).map((c, i) => (
                    <div
                      key={c.customer_id || i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: i < Math.min(creditSummary.customers.length, 10) - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                        {c.display_name || c.name || 'Customer'}
                        {c.has_overdue && <span style={{ color: '#dc2626', marginLeft: 4 }}>⚠</span>}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: c.has_overdue ? '#dc2626' : '#d97706' }}>
                        {hidden ? '••••' : `${Number(c.balance || 0).toLocaleString()} ETB`}
                      </span>
                    </div>
                  ))}
                  {creditSummary.totalCount > 10 && (
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
                      +{creditSummary.totalCount - 10} {lang === 'am' ? 'ተጨማሪ' : 'more'}
                    </p>
                  )}
                </div>
              </KnowledgeSection>
            </ErrorBoundary>
          )}

          {/* What sold today? — Sales summary */}
          {sales.totalSales > 0 && (
            <ErrorBoundary>
              <KnowledgeSection
                title={lang === 'am' ? 'ምን ተሽጧል?' : 'What sold?'}
                subtitle={`${sales.totalSales} ${lang === 'am' ? 'ሽያጮች' : 'sales'} · ${sales.averageSale.toLocaleString()} ETB ${lang === 'am' ? 'አማካይ' : 'avg'}`}
              >
                <div style={{ padding: '8px 0' }}>
                  {sales.topItems.slice(0, 5).map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: i < Math.min(sales.topItems.length, 5) - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 900, color: '#1B4332' }}>
                        {hidden ? '••••' : `${item.revenue.toLocaleString()} ETB`}
                      </span>
                    </div>
                  ))}
                </div>
              </KnowledgeSection>
            </ErrorBoundary>
          )}

          {/* Staff — How is everyone doing? */}
          {!isStaffView && staffSummary && staffSummary.count > 0 && (
            <ErrorBoundary>
              <KnowledgeSection
                title={lang === 'am' ? 'ሰራተኞች' : 'Staff'}
                subtitle={`${staffSummary.count} ${lang === 'am' ? 'ሰራተኞች' : 'staff'} · ${staffSummary.total.toLocaleString()} ETB`}
              >
                <div style={{ padding: '8px 0' }}>
                  {staffSummary.staff.slice(0, 5).map((s, i) => (
                    <div
                      key={s.id || i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: i < Math.min(staffSummary.staff.length, 5) - 1 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#1B4332' }}>
                        {hidden ? '••••' : `${s.sold.toLocaleString()} ETB`}
                      </span>
                    </div>
                  ))}
                </div>
              </KnowledgeSection>
            </ErrorBoundary>
          )}

          {/* Can I close? — Closing section */}
          <ErrorBoundary>
            <KnowledgeSection
              sectionId="closing"
              title={lang === 'am' ? 'መዝጋት እችላለሁ?' : 'Can I close?'}
              subtitle={
                closingState.done
                  ? lang === 'am' ? 'ተዘግቷል' : 'Closed'
                  : lang === 'am' ? 'ገና አልተዘጋም' : 'Not yet closed'
              }
            >
              <div style={{ padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {lang === 'am' ? 'የሚጠበቅ ጥሬ ገንዘብ' : 'Expected cash'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#16a34a' }}>
                    {hidden ? '••••' : `${metrics.cashExpected.toLocaleString()} ETB`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {lang === 'am' ? 'የሚጠበቅ ዲጂታል' : 'Expected digital'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#d97706' }}>
                    {hidden ? '••••' : `${metrics.transferRecorded.toLocaleString()} ETB`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {lang === 'am' ? 'ወጪ' : 'Expenses'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#dc2626' }}>
                    {hidden ? '••••' : `${metrics.spentToday.toLocaleString()} ETB`}
                  </span>
                </div>
                {!closingState.done && (
                  <button
                    type="button"
                    onClick={() => setClosingState({ done: true, cashVariance: 0 })}
                    style={{
                      width: '100%',
                      marginTop: 12,
                      padding: '10px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#1B4332',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {lang === 'am' ? '✅ ዛሬን ዝጋ' : 'Close today'}
                  </button>
                )}
                {closingState.done && (
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', textAlign: 'center', marginTop: 12 }}>
                    {lang === 'am' ? '✅ ዛሬ ተዘግቷል' : 'Today is closed'}
                  </p>
                )}
              </div>
            </KnowledgeSection>
          </ErrorBoundary>

          <div style={{ height: 6 }} />

          {/* Attention items — only if there are any */}
          {!isStaffView && attentionItems.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              {attentionItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 10,
                    marginBottom: 4,
                    background: item.severity === 'urgent' ? '#fef2f2' : '#fffbeb',
                    border: `1px solid ${item.severity === 'urgent' ? '#fecaca' : '#fde68a'}`,
                    cursor: item.actionType ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (item.type === 'cash_pending') {
                      const el = document.querySelector('[data-section="closing"]');
                      if (el) { el.scrollIntoView({ behavior: 'smooth' }); }
                    } else if (item.type === 'overdue_customers') {
                      window.dispatchEvent(new CustomEvent('gebya:navigate', { detail: { tab: 'credit' } }));
                    }
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {item.severity === 'urgent' ? '🔴' : '⚠️'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#1f2937' }}>
                      {item.message}
                    </p>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginTop: 1 }}>
                      {item.detail}
                    </p>
                  </div>
                  {item.action && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#1B4332', flexShrink: 0 }}>
                      {item.action} →
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Timeline — the notebook (main content) */}
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #ece6d6',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <h3 style={{ fontSize: 13, fontWeight: 900, color: '#1f2937' }}>
                {lang === 'am' ? 'የዛሬ እንቅስቃሴ' : 'Today\'s entries'}
              </h3>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={lang === 'am' ? 'ፈልግ...' : 'Search entries...'}
                  style={{
                    flex: 1,
                    minHeight: 34,
                    padding: '4px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none',
                    background: '#fafaf8',
                  }}
                />
                <button
                  type="button"
                  onClick={handleExport}
                  style={{
                    minHeight: 34,
                    padding: '4px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'am' ? 'አውርድ' : 'Export'}
                </button>
              </div>
            </div>
            <div>
              {filteredTransactions.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: '24px 16px', fontWeight: 600 }}>
                  {searchQuery ? (lang === 'am' ? 'ምንም አልተገኘም' : 'No matching entries') : (lang === 'am' ? 'ምንም እንቅስቃሴ የለም' : 'No entries yet')}
                </p>
              ) : (
                filteredTransactions.slice(0, 50).map((row, i) => (
                  <div
                    key={row.report_id || i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: i < Math.min(filteredTransactions.length, 50) - 1 ? '1px solid #f3f4f6' : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => onEdit?.(row)}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>
                          {row.report_kind === 'expense' ? '📤' : '🛒'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.title || row.item_name || (lang === 'am' ? 'መዝገብ' : 'Record')}
                        </span>
                      </div>
                      <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, marginLeft: 22 }}>
                        {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {row.customer_name ? ` · ${row.customer_name}` : ''}
                        {row.payment_type ? ` · ${row.payment_type}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, color: row.report_kind === 'expense' ? '#dc2626' : '#16a34a', flexShrink: 0, marginLeft: 8 }}>
                      {hidden ? '••••' : `${Number(row.amount || 0).toLocaleString()}`}
                    </span>
                  </div>
                ))
              )}
              {filteredTransactions.length > 50 && (
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textAlign: 'center', padding: '12px' }}>
                  +{filteredTransactions.length - 50} {lang === 'am' ? 'ተጨማሪ' : 'more'}
                </p>
              )}
            </div>
          </div>

          <div style={{ height: 10 }} />

          {/* Diary — auto-generated */}
          {!isStaffView && timeRange === 'today' && diary && (
            <ErrorBoundary>
              <DiaryCard diary={diary} lang={lang} />
            </ErrorBoundary>
          )}
        </>
      )}

    </div>
  );
}
