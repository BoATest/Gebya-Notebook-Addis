import { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Eye, EyeOff, Search, Share2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { usePrivacy } from '../context/PrivacyContext';
import { getCurrentEthiopianDate, formatEthiopianShort } from '../utils/ethiopianCalendar';
import { useTimeOfDay } from '../hooks/useTimeOfDay';
import {
  ALL_SCOPE,
  OWNER_SCOPE,
  buildReportRows,
  buildStaffReportRows,
  computeReportMetrics,
  startOfLocalDay,
  amountOf,
  collectedAmount,
} from '../utils/reportSelectors';
import {
  computeCreditSummary,
  computeStaffSummary,
  computeSalesSummary,
  computePeriodVerdict,
} from '../utils/shopStory';
import { fmt } from '../utils/numformat';
import { fireToast } from './Toast';

import HeroStatus from './HeroStatus';
import TodayBusiness from './TodayBusiness';
import DoThisNext from './DoThisNext';
import WhatINoticed from './WhatINoticed';
import TodayStory from './TodayStory';
import TimelineView from './TimelineView';
import PeriodInsights from './PeriodInsights';
import HandoverStatus from './HandoverStatus';
import SearchSheet from './SearchSheet';
import ErrorBoundary from './report/ErrorBoundary';

const SettlementSheet = lazy(() => import('./report/SettlementSheet'));

const DAY_MS = 86400000;

const EMPTY_CLOSING = { done: false, cashVariance: 0, cashInHand: 0, staffReports: {} };

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

function SectionHeading({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginTop: 14, marginBottom: 6,
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-bg-disabled)' }} />
      <span style={{
        fontSize: 11, fontWeight: 900, color: 'var(--color-text-soft)',
        letterSpacing: '0.06em', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-bg-disabled)' }} />
    </div>
  );
}

export default function ReportView({
  transactions = [],
  ledgerTransactions = [],
  enrichedCustomerSummaries = [],
  customers = [],
  catalogEntries = [],
  shopProfile,
  onEdit,
  onShareReport,
  scope = ALL_SCOPE,
  staffMembers = [],
  canSwitchPeople = false,
  myStaffId = null,
}) {
  const { lang } = useLang();
  const { hidden, toggle: togglePrivacy } = usePrivacy();
  const [timeRange, _setTimeRange] = useState(() => {
    try { return localStorage.getItem('gebya_report_time_range') || 'today'; } catch { return 'today'; }
  });
  const setTimeRange = (value) => {
    _setTimeRange(value);
    try { localStorage.setItem('gebya_report_time_range', value); } catch {}
  };
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
  });
  const [showSearchSheet, setShowSearchSheet] = useState(false);

  // ── Surrender / handover (reuses the existing SettlementSheet flow) ──
  const [sheetTarget, setSheetTarget] = useState(null); // { staff, settlement|null }
  const [handoverRefresh, setHandoverRefresh] = useState(0);

  // ── Per-person day view ──────────────────────────────────────
  // RBAC: ONLY owner/manager (or explicitly permitted) devices may see
  // other people's records and switch between them. Everyone else is
  // locked to their own day — even if their device isn't linked yet
  // (they then see an empty report instead of shop-wide data).
  const UNLINKED_SCOPE = '__unlinked__';
  const isPersonalLocked = !canSwitchPeople;
  const [selectedPerson, setSelectedPerson] = useState(() => {
    if (!canSwitchPeople) return String(myStaffId ?? UNLINKED_SCOPE);
    try { return localStorage.getItem('gebya_report_person') || 'all'; } catch { return 'all'; }
  });
  const activePerson = isPersonalLocked ? String(myStaffId ?? UNLINKED_SCOPE) : selectedPerson;
  const selectPerson = useCallback((id) => {
    if (isPersonalLocked) return;
    setSelectedPerson(id);
    try { localStorage.setItem('gebya_report_person', id); } catch {}
  }, [isPersonalLocked]);
  const isPersonScoped = activePerson !== 'all';
  const effectiveScope = activePerson === 'all' ? scope : activePerson;

  const activePersonName = useMemo(() => {
    if (!isPersonScoped) return '';
    if (activePerson === OWNER_SCOPE) return lang === 'am' ? 'ባለቤት' : 'Owner';
    const member = (staffMembers || []).find(m => String(m.id) === String(activePerson));
    return member?.display_name || member?.name || '';
  }, [activePerson, isPersonScoped, staffMembers, lang]);

  const switchablePeople = useMemo(() => {
    if (!canSwitchPeople) return [];
    return (staffMembers || [])
      .filter(m => m && m.id != null)
      .map(m => ({ id: String(m.id), name: m.display_name || m.name || '?' }));
  }, [canSwitchPeople, staffMembers]);

  // The staff member being viewed in the personal day view (if any).
  const surrenderStaff = useMemo(() => {
    if (!isPersonScoped || activePerson === OWNER_SCOPE) return null;
    return (staffMembers || []).find(m => String(m.id) === String(activePerson)) || null;
  }, [isPersonScoped, activePerson, staffMembers]);

  const now = Date.now();
  const todayStart = startOfLocalDay(now);

  const { period } = useTimeOfDay();
  const isToday = timeRange === 'today';

  const rangeBounds = useMemo(() => {
    if (timeRange === 'week') return [startOfWeek(now), startOfWeek(now) + 7 * DAY_MS];
    if (timeRange === 'month') return [startOfMonth(now), endOfMonth(now)];
    if (timeRange === 'custom') {
      const fromMs = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : todayStart;
      const toMs = customTo
        ? new Date(`${customTo}T00:00:00`).getTime() + DAY_MS
        : todayStart + DAY_MS;
      // Guard against a reversed range (From after To) — swap instead of
      // silently rendering an empty report.
      if (fromMs > toMs) return [toMs - DAY_MS, fromMs + DAY_MS];
      return [fromMs, toMs];
    }
    return [todayStart, todayStart + DAY_MS];
  }, [timeRange, customFrom, customTo, todayStart, now]);

  // ── Closing / self-check record, scoped per period (+person) ──
  // The Everyone view closes the whole day; a person view keeps its own
  // separate self-check record ("does my counted cash match my records?").
  const closingKey = useMemo(
    () => `gebya_closing_${isToday ? todayStart : rangeBounds[0]}${isPersonScoped ? `_${activePerson}` : ''}`,
    [isToday, todayStart, rangeBounds, isPersonScoped, activePerson]
  );
  const [closing, setClosing] = useState({ key: null, data: EMPTY_CLOSING });

  // Load the record for the selected period (runs on period switch).
  useEffect(() => {
    let data = EMPTY_CLOSING;
    try {
      const saved = localStorage.getItem(closingKey);
      if (saved) data = JSON.parse(saved);
    } catch {}
    setClosing({ key: closingKey, data });
  }, [closingKey]);

  // Persist only when the in-memory state belongs to the current period,
  // so switching periods never writes stale data into the new key.
  useEffect(() => {
    if (closing.key !== closingKey) return;
    try { localStorage.setItem(closingKey, JSON.stringify(closing.data)); } catch {}
  }, [closing.key, closing.data, closingKey]);

  const closingState = closing.data || EMPTY_CLOSING;

  const [from, to] = rangeBounds;

  const reportRows = useMemo(
    () => buildReportRows({ transactions, ledgerTransactions, customers, from, to, scope: effectiveScope, viewerStaffId: null, filters: {} }),
    [transactions, ledgerTransactions, customers, from, to, effectiveScope]
  );

  const metrics = useMemo(() => computeReportMetrics(reportRows), [reportRows]);
  const creditSummary = useMemo(
    () => computeCreditSummary(enrichedCustomerSummaries, lang),
    [enrichedCustomerSummaries, lang]
  );

  const staffRows = useMemo(
    () => buildStaffReportRows(reportRows),
    [reportRows]
  );
  const staffSummary = useMemo(
    () => computeStaffSummary(staffRows, lang),
    [staffRows, lang]
  );

  const priorMetrics = useMemo(() => {
    if (!isToday || isPersonScoped) return null;
    const yesterdayStart = todayStart - DAY_MS;
    const priorRows = buildReportRows({
      transactions, ledgerTransactions, customers,
      from: yesterdayStart, to: todayStart,
      scope, viewerStaffId: null, filters: {},
    });
    return computeReportMetrics(priorRows);
  }, [transactions, ledgerTransactions, customers, todayStart, scope, isToday, isPersonScoped]);

  const isEmpty = reportRows.length === 0 && (ledgerTransactions || []).length === 0;
  // An established shop looking at a quiet period is different from a
  // brand-new shop — each needs its own message.
  const quietPeriod = isEmpty && ((transactions || []).length > 0 || (ledgerTransactions || []).length > 0);
  const unlinkedDevice = isPersonalLocked && !myStaffId;

  // ── Beyond-one-day insights (Week / Month / Custom views) ────
  // The immediately preceding period of equal length — for the verdict.
  const priorPeriodMetrics = useMemo(() => {
    if (isToday || isPersonScoped || isEmpty) return null;
    const len = to - from;
    const priorRows = buildReportRows({
      transactions, ledgerTransactions, customers,
      from: from - len, to: from,
      scope: effectiveScope, viewerStaffId: null, filters: {},
    });
    return computeReportMetrics(priorRows);
  }, [isToday, isPersonScoped, isEmpty, from, to, transactions, ledgerTransactions, customers, effectiveScope]);

  const periodVerdict = useMemo(
    () => computePeriodVerdict({ current: metrics, previous: priorPeriodMetrics, lang }),
    [metrics, priorPeriodMetrics, lang]
  );

  // Top sellers for the selected period (revived computeSalesSummary).
  const salesSummary = useMemo(
    () => computeSalesSummary(metrics, lang),
    [metrics, lang]
  );

  // Per-day money-in buckets for the Week view's day strip.
  const weekDays = useMemo(() => {
    if (timeRange !== 'week' || isPersonScoped || isEmpty) return [];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const ds = from + i * DAY_MS;
      const d = new Date(ds);
      days.push({
        start: ds,
        total: 0,
        label: d.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', { weekday: 'short' }),
        sub: formatEthiopianShort(ds),
        isToday: ds === todayStart,
      });
    }
    for (const row of reportRows) {
      const ts = Number(row.created_at || 0);
      const idx = Math.floor((ts - from) / DAY_MS);
      if (idx < 0 || idx >= 7) continue;
      // Net money-in per day: sales/collections count positive,
      // expenses subtract.
      days[idx].total += row.report_kind === 'expense'
        ? -amountOf(row)
        : collectedAmount(row);
    }
    return days;
  }, [timeRange, isPersonScoped, isEmpty, from, reportRows, lang, todayStart]);

  const handlePickDay = useCallback((dayStart) => {
    const d = new Date(dayStart - new Date(dayStart).getTimezoneOffset() * 60000);
    const iso = d.toISOString().slice(0, 10);
    setTimeRange('custom');
    setCustomFrom(iso);
    setCustomTo(iso);
  }, []);



  const { avgSalesCount, avgExpenses } = useMemo(() => {
    if (!isToday) return { avgSalesCount: 0, avgExpenses: 0 };
    const dayStart7 = todayStart - (7 * DAY_MS);
    const salesByDay = new Map();
    const expensesByDay = new Map();
    for (const tx of transactions || []) {
      const ts = tx.created_at || 0;
      if (ts < dayStart7 || ts >= todayStart) continue;
      if (tx.type !== 'sale' && tx.type !== 'expense') continue;
      const dayKey = Math.floor(ts / DAY_MS);
      if (tx.type === 'sale') salesByDay.set(dayKey, (salesByDay.get(dayKey) || 0) + 1);
      else expensesByDay.set(dayKey, (expensesByDay.get(dayKey) || 0) + (Number(tx.amount) || 0));
    }
    const totalSales = Array.from(salesByDay.values()).reduce((s, v) => s + v, 0);
    const totalExpenses = Array.from(expensesByDay.values()).reduce((s, v) => s + v, 0);
    return { avgSalesCount: Math.round(totalSales / 7), avgExpenses: Math.round(totalExpenses / 7) };
  }, [transactions, todayStart, isToday]);

  const handleExport = useCallback(() => {
    const header = ['date', 'type', 'amount', 'item_or_person', 'payment', 'status'];
    const csvEscape = (v) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = reportRows.map(row => [
      row.created_at ? new Date(row.created_at).toISOString() : '',
      row.report_kind || row.type,
      row.amount || 0,
      csvEscape(row.title || row.item_name || row.customer_name || ''),
      csvEscape(row.payment_type || 'Cash'),
      csvEscape(row.status || 'recorded'),
    ].join(','));
    const csv = [header.join(','), ...rows].join('\n');
    // BOM so Excel renders Amharic item names correctly.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gebya-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [reportRows]);

  const handleClose = useCallback(({ cashInHand, cashVariance }) => {
    setClosing(prev => ({
      key: closingKey,
      data: { ...(prev.key === closingKey ? prev.data : EMPTY_CLOSING), done: true, cashInHand, cashVariance },
    }));
  }, [closingKey]);

  const handleAction = useCallback((actionType) => {
    if (actionType === 'count_cash') {
      const el = document.getElementById('today-business');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (actionType === 'retro_close') {
      const cashYouShouldHave = (metrics.cashExpected || 0) + (metrics.creditCollected || 0) - (metrics.spentToday || 0);
      handleClose({ cashInHand: cashYouShouldHave, cashVariance: 0 });
    } else if (actionType === 'overdue') {
      window.dispatchEvent(new CustomEvent('gebya:navigate', { detail: { tab: 'credit' } }));
    } else if (actionType === 'collect_staff') {
      // Open the settlement sheet inline so the owner can review
      // staff handovers directly from the report, without leaving.
      // HandoverStatus already tracks each staff's latest settlement live;
      // passing null lets the sheet load and pull expected amounts.
      if (staffMembers.length > 0) {
        setSheetTarget({ staff: staffMembers[0], settlement: null });
      }
    } else if (actionType === 'sale') {
      window.dispatchEvent(new CustomEvent('gebya:open-form', { detail: { type: 'sale' } }));
    } else if (actionType === 'view_details' || actionType === 'review') {
      document.getElementById('today-business')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [metrics, handleClose]);

  const timeRangeLabel = isToday
    ? (lang === 'am' ? 'ዛሬ' : 'Today')
    : timeRange === 'week'
      ? (lang === 'am' ? 'ሳምንት' : 'This Week')
      : timeRange === 'month'
        ? (lang === 'am' ? 'ወር' : 'This Month')
        : (lang === 'am' ? 'ብጁ ክልል' : 'Custom Range');

  // Share summary — plain text for Telegram/WhatsApp via the existing
  // ShareModal flow. Privacy mode masks every amount.
  const buildShareText = useCallback(() => {
    const H = (v) => (hidden ? '••••' : fmt(v || 0));
    const shopName = shopProfile?.name || (lang === 'am' ? 'ሱቅ' : 'My shop');
    const lines = lang === 'am'
      ? [
          `📒 ${shopName} · ${timeRangeLabel}`,
          `🛒 ጠቅላላ ሽያጭ: ${H(metrics.totalSold)} ETB`,
          `📤 ወጪ: ${H(metrics.spentToday)} ETB`,
          `💰 የዕዳ መሰብሰብ: ${H(metrics.creditCollected)} ETB`,
          `📝 አዲስ ዱቤ: ${H(metrics.newDubie)} ETB`,
          `💵 የሚጠበቅ ጥሬ ገንዘብ: ${H(metrics.cashExpected)} ETB`,
        ]
      : [
          `📒 ${shopName} · ${timeRangeLabel}`,
          `🛒 Total sales: ${H(metrics.totalSold)} ETB`,
          `📤 Expenses: ${H(metrics.spentToday)} ETB`,
          `💰 Debt collected: ${H(metrics.creditCollected)} ETB`,
          `📝 New credit given: ${H(metrics.newDubie)} ETB`,
          `💵 Cash expected: ${H(metrics.cashExpected)} ETB`,
        ];
    const top = salesSummary?.topItems?.[0];
    if (top) {
      lines.push(lang === 'am'
        ? `🏅 ብዙ የተሸጠ: ${top.name} · ${H(top.revenue)} ETB`
        : `🏅 Top seller: ${top.name} · ${H(top.revenue)} ETB`);
    }
    return lines.join('\n');
  }, [hidden, lang, shopProfile, timeRangeLabel, metrics, salesSummary]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 0,
      padding: '0 12px 120px',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '4px 4px 10px',
      }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 950, color: 'var(--color-primary)', lineHeight: 1.05 }}>
            📒 {lang === 'am' ? 'ማስታወሻ ደብተር' : 'Notebook'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 650, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{getCurrentEthiopianDate()} · {shopProfile?.name || (lang === 'am' ? 'ሱቅህ' : 'Your shop')}</span>
            {isToday && (
              <span style={{
                fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 999,
                background: 'var(--color-primary)', color: 'var(--color-bg-white)', lineHeight: '16px',
              }}>
                {lang === 'am' ? 'ዛሬ' : 'TODAY'}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={togglePrivacy}
          aria-label={hidden ? 'Show amounts' : 'Hide amounts'}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 36, minWidth: 36, borderRadius: 999,
            border: hidden ? '1px solid var(--color-warning-border)' : '1px solid var(--color-bg-disabled)',
            background: hidden ? 'rgba(196,136,58,0.10)' : 'var(--color-surface)',
            color: hidden ? 'var(--color-warning)' : 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Search + Share ── */}
      <div style={{ paddingBottom: 8, display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => setShowSearchSheet(true)}
          aria-label={lang === 'am' ? 'ፈልግ' : 'Search notebook'}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
            border: '1px solid var(--color-bg-disabled)', borderRadius: 10, padding: '6px 10px',
            minHeight: 38, background: 'var(--color-surface)', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-soft)',
            textAlign: 'left',
          }}
        >
          <Search className="w-4 h-4" style={{ color: 'var(--color-text-soft)', flexShrink: 0 }} />
          <span>{lang === 'am' ? 'ፈልግ... (/)' : 'Search notebook... (/)'}</span>
        </button>
        {onShareReport && (
          <button
            type="button"
            onClick={() => onShareReport(buildShareText())}
            aria-label={lang === 'am' ? 'አጋራ' : 'Share report summary'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              minHeight: 38, padding: '6px 14px', flexShrink: 0,
              border: '1px solid var(--color-primary)', borderRadius: 10,
              background: 'var(--color-primary)', color: 'var(--color-bg-white)',
              fontSize: 12, fontWeight: 800, cursor: 'pointer',
            }}
          >
            <Share2 className="w-4 h-4" />
            <span>{lang === 'am' ? 'አጋራ' : 'Share'}</span>
          </button>
        )}
      </div>

      {showSearchSheet && (
        <SearchSheet
          transactions={transactions}
          ledgerTransactions={ledgerTransactions}
          customers={customers}
          catalogEntries={catalogEntries}
          lang={lang}
          onClose={() => setShowSearchSheet(false)}
        />
      )}

      {/* ── Time Range Tabs ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'var(--color-surface-subtle)', paddingTop: 4, paddingBottom: 8,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
          background: 'rgba(27,67,50,0.08)', borderRadius: 12, padding: 4,
        }}>
          {[
            ['today', `🌅 ${lang === 'am' ? 'ዛሬ' : 'Today'}`],
            ['week', `📅 ${lang === 'am' ? 'ሳምንት' : 'Week'}`],
            ['month', `🗓 ${lang === 'am' ? 'ወር' : 'Month'}`],
            ['custom', `✏️ ${lang === 'am' ? 'ብጁ' : 'Custom'}`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTimeRange(id)}
              style={{
                minHeight: 34, border: 'none', borderRadius: 9,
                background: timeRange === id ? 'var(--color-primary)' : 'transparent',
                color: timeRange === id ? 'var(--color-bg-white)' : 'var(--color-text-muted)',
                fontSize: 12, fontWeight: 900, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Person Switcher — reconcile the day person by person ── */}
      {(canSwitchPeople && switchablePeople.length > 0) && (
        <div style={{
          display: 'flex', gap: 4, overflowX: 'auto',
          paddingBottom: 6, marginBottom: 4, WebkitOverflowScrolling: 'touch',
        }}>
          {[
            ['all', `👥 ${lang === 'am' ? 'ሁሉም' : 'Everyone'}`],
            [OWNER_SCOPE, `🧑 ${lang === 'am' ? 'ባለቤት' : 'Owner'}`],
            ...switchablePeople.map(p => [p.id, `👤 ${p.name}`]),
          ].map(([id, label]) => {
            const selected = activePerson === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectPerson(id)}
                style={{
                  flexShrink: 0, minHeight: 32, padding: '4px 12px',
                  border: selected ? '1px solid var(--color-primary)' : '1px solid var(--color-bg-disabled)',
                  borderRadius: 999,
                  background: selected ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: selected ? 'var(--color-bg-white)' : 'var(--color-text-muted)',
                  fontSize: 11.5, fontWeight: 800,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {isPersonalLocked && (
        <p style={{
          fontSize: 10, fontWeight: 900, color: 'var(--color-text-soft)',
          letterSpacing: '0.06em', margin: '0 4px 6px',
        }}>
          👤 {lang === 'am' ? 'የእኔ ቀን' : 'MY DAY'}
        </p>
      )}

      {timeRange === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)' }}>
              {lang === 'am' ? 'ከ' : 'From'}
            </span>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ minHeight: 38, border: '1px solid var(--color-bg-disabled)', borderRadius: 9, padding: '6px 8px', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)' }}>
              {lang === 'am' ? 'ወደ' : 'To'}
            </span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ minHeight: 38, border: '1px solid var(--color-bg-disabled)', borderRadius: 9, padding: '6px 8px', fontSize: 13 }} />
          </label>
        </div>
      )}

      {/* ── Empty State ── */}
      {isEmpty && (
        <div style={{
          background: 'linear-gradient(135deg, var(--color-success-bg) 0%, #ecfdf5 100%)',
          border: '1px solid var(--color-success-border)', borderRadius: 16, padding: 24,
          marginTop: 8, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{unlinkedDevice ? '🔗' : quietPeriod ? '🌙' : '📒'}</div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-primary)', marginBottom: 8 }}>
            {unlinkedDevice
              ? (lang === 'am' ? 'መሣሪያዎ ገና አልተገናኘም' : 'Device not linked yet')
              : quietPeriod
                ? (lang === 'am' ? 'በዚህ ጊዜ ውስጥ ምንም እንቅስቃሴ የለም' : 'Nothing recorded in this period')
                : (lang === 'am' ? 'ወደ ሱቅ ታሪክ እንኳን በደህና መጡ' : 'Welcome to your shop')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>
            {unlinkedDevice
              ? (lang === 'am'
                ? 'መሣሪያዎን ከሰራተኛ መገለጫዎ ጋር እንዲገናኝ ባለቤቱን ይጠይቁ።'
                : 'Ask the owner to link this device to your staff profile.')
              : quietPeriod
                ? (lang === 'am'
                  ? 'በመረጡት ቀናት ውስጥ መዝገብ የለም። ሌላ ጊዜ ይምረጡ ወይም አዲስ እንቅስቃሴ ይመዝግብ።'
                  : 'No entries in the selected dates. Pick another period or record something new.')
                : (lang === 'am' ? 'ዝግጁ ሲሆን ሽያጭ ወይም ወጪ መዝግብ። ሱቅዎ ሁኔታ ይሄ በፈጣን ይዘርጋል።' : 'Record a sale or expense to get started.')}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.dispatchEvent(new CustomEvent('gebya:open-form', { detail: { type: 'sale' } }))}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-primary)', background: 'var(--color-primary)', color: 'var(--color-bg-white)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              🛒 {lang === 'am' ? 'ሽያጭ' : 'Sale'}
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('gebya:open-form', { detail: { type: 'credit' } }))}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-accent-amber)', background: 'var(--color-surface)', color: 'var(--color-accent-amber)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              📝 {lang === 'am' ? 'ዱቤ' : 'Credit'}
            </button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('gebya:open-form', { detail: { type: 'expense' } }))}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--color-danger)', background: 'var(--color-surface)', color: 'var(--color-danger)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              📤 {lang === 'am' ? 'ወጪ' : 'Expense'}
            </button>
          </div>
        </div>
      )}

      {!isEmpty && (
        isPersonScoped ? (
          <>
            {/* ════════════════════════════════════════════ */}
            {/* PERSONAL DAY VIEW — one person's numbers only */}
            {/* Shop-level rituals (cash closing, overdue     */}
            {/* reminders) stay in the Everyone view.         */}
            {/* ════════════════════════════════════════════ */}
            <SectionHeading label={
              activePersonName
                ? `${activePersonName} · ${lang === 'am' ? 'የእኔ ቀን' : 'MY DAY'}`
                : (lang === 'am' ? 'የእኔ ቀን' : 'MY DAY')
            } />

            {/* Surrender card — hands today's collection to the owner via
                the existing settlement flow */}
            {surrenderStaff && (
              <div style={{
                background: 'linear-gradient(135deg, var(--color-success-bg) 0%, #ecfdf5 100%)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 16,
                padding: '14px 16px',
                marginBottom: 10,
              }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-primary)', marginBottom: 3 }}>
                  🤝 {lang === 'am' ? 'ገንዘብ ለማስረከብ ዝግጁ ነዎት?' : 'Ready to hand over?'}
                </p>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                  {lang === 'am'
                    ? `የሚጠበቅ: 💵 ${hidden ? '••••' : fmt(metrics.cashExpected)} · 📱 ${hidden ? '••••' : fmt(metrics.transferRecorded)} ETB`
                    : `Expected: 💵 ${hidden ? '••••' : fmt(metrics.cashExpected)} cash · 📱 ${hidden ? '••••' : fmt(metrics.transferRecorded)} digital`}
                </p>
                <button
                  type="button"
                  onClick={() => setSheetTarget({ staff: surrenderStaff, settlement: null })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 18px', borderRadius: 10, border: 'none',
                    background: 'var(--color-primary)', color: 'var(--color-bg-white)',
                    fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  🤝 {lang === 'am' ? 'አሳልፍ' : 'Surrender'}
                </button>
              </div>
            )}

            <div id="today-business">
              <ErrorBoundary>
                <TodayBusiness
                  metrics={metrics}
                  closingState={closingState}
                  lang={lang}
                  onClose={handleClose}
                  showClosing
                  selfCheck
                  personName={activePersonName}
                />
              </ErrorBoundary>
            </div>

            <SectionHeading label={lang === 'am' ? 'እንቅስቃሴዎች' : 'ENTRIES'} />
            <ErrorBoundary>
              <TimelineView reportRows={reportRows} lang={lang} handleExport={handleExport} onEdit={onEdit} />
            </ErrorBoundary>
          </>
        ) : (
        <>
          {isToday ? (
            <>
              {/* 1. Hero Status */}
              <SectionHeading label={lang === 'am' ? 'የሱቅ ሁኔታ' : 'SHOP STATUS'} />
              <ErrorBoundary>
                <HeroStatus
                  metrics={metrics}
                  closingDone={closingState.done}
                  cashVariance={closingState.cashVariance}
                  overdueCount={creditSummary.overdueCount}
                  staffRows={staffRows}
                  period={period}
                  lang={lang}
                  onAction={handleAction}
                />
              </ErrorBoundary>

              {/* 2. Today's Business */}
              <SectionHeading label={lang === 'am' ? 'የዛሬ ንግድ' : "TODAY'S BUSINESS"} />
              <div id="today-business">
                <ErrorBoundary>
                  <TodayBusiness metrics={metrics} closingState={closingState} lang={lang} onClose={handleClose} />
                </ErrorBoundary>
              </div>

              {/* 3. Do This Next */}
              <SectionHeading label={lang === 'am' ? 'በመቀጠል ይህን አድርግ' : 'DO THIS NEXT'} />
              <ErrorBoundary>
                <DoThisNext
                  closingDone={closingState.done}
                  cashExpected={metrics.cashExpected}
                  cashVariance={closingState.cashVariance}
                  overdueCount={creditSummary.overdueCount}
                  overdueAmount={creditSummary.overdueAmount}
                  largestOverdueDays={creditSummary.overdue[0]?.overdue_days || 0}
                  salesCount={metrics.saleRows?.length || 0}
                  avgSalesCount={avgSalesCount}
                  expenses={metrics.spentToday}
                  avgExpenses={avgExpenses}
                  lang={lang}
                  onAction={handleAction}
                />
              </ErrorBoundary>

              {/* Staff handover status — who has surrendered today */}
              {canSwitchPeople && switchablePeople.length > 0 && (
                <>
                  <SectionHeading label={lang === 'am' ? '🤝 የሰራተኛ ማስረከቢያ' : 'STAFF HANDOVER'} />
                  <ErrorBoundary>
                    <HandoverStatus
                      staffMembers={staffMembers}
                      todayStart={todayStart}
                      lang={lang}
                      refreshKey={handoverRefresh}
                      onOpen={(member, settlement) => setSheetTarget({ staff: member, settlement })}
                    />
                  </ErrorBoundary>
                </>
              )}

              {/* 4. What I Noticed */}
              <SectionHeading label={lang === 'am' ? 'ያስተዋልኩት' : 'WHAT I NOTICED'} />
              <ErrorBoundary>
                <WhatINoticed
                  metrics={metrics} priorMetrics={priorMetrics}
                  overdueCount={creditSummary.overdueCount} closingDone={closingState.done}
                  creditCollected={metrics.creditCollected} staffSummary={staffSummary}
                  lang={lang}
                />
              </ErrorBoundary>

              {/* 5. Today's Story */}
              <SectionHeading label={lang === 'am' ? 'የዛሬ ታሪክ' : "TODAY'S STORY"} />
              <ErrorBoundary>
                <TodayStory
                  metrics={metrics}
                  overdueCount={creditSummary.overdueCount} overdueAmount={creditSummary.overdueAmount}
                  closingDone={closingState.done} cashVariance={closingState.cashVariance}
                  creditCollected={metrics.creditCollected} expenseCount={metrics.expenseRows?.length || 0}
                  staffSummary={staffSummary}
                  lang={lang}
                />
              </ErrorBoundary>
            </>
          ) : (
            /* ════════════════════════════════════════════ */
            /* COMPACT VIEW — for Week / Month / Custom    */
            /* ════════════════════════════════════════════ */
            <>
              {/* Hero Status for past days (retro close) */}
              <SectionHeading label={lang === 'am' ? 'ማጠቃለያ' : 'SUMMARY'} />
              <ErrorBoundary>
                <HeroStatus
                  metrics={metrics}
                  closingDone={closingState.done}
                  cashVariance={closingState.cashVariance}
                  overdueCount={creditSummary.overdueCount}
                  staffRows={staffRows}
                  period={period}
                  lang={lang}
                  onAction={handleAction}
                  isPast
                />
              </ErrorBoundary>

              {/* Period insights: verdict vs last period, day strip, top items */}
              <ErrorBoundary>
                <PeriodInsights
                  verdict={periodVerdict}
                  days={weekDays}
                  topItems={(salesSummary?.topItems || []).slice(0, 3)}
                  lang={lang}
                  onPickDay={handlePickDay}
                />
              </ErrorBoundary>

              {/* Business Summary */}
              <SectionHeading label={lang === 'am' ? 'የንግድ ማጠቃለያ' : 'BUSINESS SUMMARY'} />
              <ErrorBoundary>
                <TodayBusiness metrics={metrics} closingState={closingState} lang={lang} onClose={handleClose} />
              </ErrorBoundary>
            </>
          )}

          {/* 7. Today's Entries — always shown */}
          <SectionHeading label={
            isToday
              ? (lang === 'am' ? 'የዛሬ እንቅስቃሴ' : "TODAY'S ENTRIES")
              : (lang === 'am' ? 'እንቅስቃሴዎች' : 'ENTRIES')
          } />
          <ErrorBoundary>
            <TimelineView reportRows={reportRows} lang={lang} handleExport={handleExport} onEdit={onEdit} />
          </ErrorBoundary>


        </>
        )
      )}

      {/* ── Settlement sheet overlay — surrender / review ── */}
      {sheetTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'var(--color-overlay)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl bg-white px-4 pb-6 pt-2 max-h-[90vh] overflow-y-auto" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <div className="w-9 h-1 rounded-full bg-gray-300 mx-auto mb-3" />
            <Suspense fallback={
              <p style={{ textAlign: 'center', padding: 24, fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {lang === 'am' ? 'በመጫን ላይ...' : 'Loading...'}
              </p>
            }>
              <SettlementSheet
                staff={sheetTarget.staff}
                existingSettlement={sheetTarget.settlement}
                lang={lang}
                onSaved={() => {
                  setSheetTarget(null);
                  setHandoverRefresh(k => k + 1);
                  fireToast(lang === 'am' ? 'ማስረከቢያ ተመዝግቧል ✓' : 'Handover recorded ✓', 2400);
                }}
                onCancel={() => setSheetTarget(null)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
