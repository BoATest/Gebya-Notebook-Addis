import React, { useMemo, useState } from 'react';
import { Search, X, Download, ChevronRight, SlidersHorizontal, ArrowUpDown, Eye, EyeOff, Plus, AlertTriangle } from 'lucide-react';
import { fmt } from '../utils/numformat';
import { useLang } from '../context/LangContext';
import { daysAgoLabel } from '../utils/reminders';
import SortSheet from './SortSheet';
import CreditOverviewSheet from './CreditOverviewSheet';

const SORT_LABELS = {
  overdue: 'sortMostOverdue',
  balance: 'sortHighestBalance',
  active: 'sortRecentlyActive',
  added: 'sortRecentlyAdded',
  name: 'sortNameAz',
};

function customerStatus(c, t) {
  if (c.has_overdue) {
    return { text: t.daysOverdue.replace('{days}', String(c.overdue_days || 0)), color: 'var(--color-danger)', overdue: true };
  }
  if (Number(c.balance) > 0) {
    if (c.telegram_chat_id || c.phone_number) {
      return { text: t.canRemindFilter, color: '#16a34a', overdue: false };
    }
    return { text: t.statusActive, color: 'var(--color-text-muted)', overdue: false };
  }
  return { text: t.statusSettled, color: 'var(--color-text-muted)', overdue: false };
}

function CustomerRow({ customer, onSelect, t }) {
  const status = customerStatus(customer, t);
  const initial = (customer.display_name || '?').trim().charAt(0).toUpperCase() || '?';
  const lastSaleLabel = customer.last_activity_at ? daysAgoLabel(customer.last_activity_at) : null;
  const context = lastSaleLabel ? t.lastSaleLine.replace('{label}', lastSaleLabel) : null;

  return (
    <button
      onClick={() => onSelect(customer)}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.99] transition-transform"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)' }}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 font-bold text-sm"
        style={{
          background: 'var(--color-bg-disabled)',
          color: 'var(--color-text)',
          boxShadow: status.overdue ? '0 0 0 2px var(--color-danger)' : 'none',
        }}
      >
        {initial}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[15px] truncate" style={{ color: 'var(--color-text)' }}>
          {customer.display_name}
        </span>
        <span className="block text-xs truncate" style={{ color: status.color }}>
          {status.text}
          {context ? ` · ${context}` : ''}
        </span>
      </span>

      <span className="flex flex-col items-end flex-shrink-0">
        <span className="font-bold text-[15px]" style={{ color: status.overdue ? 'var(--color-danger)' : 'var(--color-text)' }}>
          {fmt(customer.balance)}
        </span>
        <ChevronRight className="w-4 h-4 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
      </span>
    </button>
  );
}

export default function CustomerList({ customers = [], metrics, onSelectCustomer, onAddCustomer, onRemind, onDownloadClick }) {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('overdue');
  const [showSort, setShowSort] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [showAmounts, setShowAmounts] = useState(true);

  const { active, archivedCount, allCount, overdueCount, canRemindCount } = useMemo(() => {
    const arch = customers.filter((c) => c.archived_at);
    const act = customers.filter((c) => !c.archived_at);
    return {
      active: act,
      archivedCount: arch.length,
      allCount: act.length,
      overdueCount: act.filter((c) => c.has_overdue).length,
      canRemindCount: act.filter((c) => c.has_overdue && (c.telegram_chat_id || c.phone_number)).length,
    };
  }, [customers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = active;
    if (filter === 'overdue') list = active.filter((c) => c.has_overdue);
    else if (filter === 'canRemind') list = active.filter((c) => c.has_overdue && (c.telegram_chat_id || c.phone_number));
    else if (filter === 'archived') list = customers.filter((c) => c.archived_at);

    if (q) {
      list = list.filter((c) => {
        const hay = `${c.display_name || ''} ${c.note || ''} ${c.phone_number || ''} ${c.telegram_username || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'balance') return (Number(b.balance) || 0) - (Number(a.balance) || 0);
      if (sortBy === 'active') return (b.last_activity_at || 0) - (a.last_activity_at || 0);
      if (sortBy === 'added') return (b.created_at || 0) - (a.created_at || 0);
      if (sortBy === 'name') return String(a.display_name || '').localeCompare(String(b.display_name || ''));
      // overdue (default)
      const od = (Number(b.overdue_days) || 0) - (Number(a.overdue_days) || 0);
      if (od !== 0) return od;
      return (Number(b.overdue_amount) || 0) - (Number(a.overdue_amount) || 0);
    });
    return sorted;
  }, [active, customers, filter, query, sortBy]);

  const totalOwed = metrics?.totalOwed ?? active.reduce((s, c) => s + (Number(c.balance) || 0), 0);
  const overdueAmount = metrics?.overdueAmount ?? active.reduce((s, c) => s + (Number(c.overdue_amount) || 0), 0);
  const showRemind = overdueCount > 0;

  const chip = (value, label, count, activeColor) => {
    const isActive = filter === value;
    return (
      <button
        key={value}
        onClick={() => setFilter(value)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap min-h-[36px] active:scale-95 transition-transform"
        style={{
          background: isActive ? (activeColor || 'var(--color-primary)') : 'var(--color-bg-disabled)',
          color: isActive ? 'var(--color-bg-white)' : 'var(--color-text)',
        }}
      >
        {label}
        <span className="opacity-80">{count}</span>
      </button>
    );
  };

  return (
    <div className="pb-2">
      {/* Hero card — neutral, tappable to open overview */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowOverview(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') setShowOverview(true); }}
        className="w-full text-left px-4 py-4 rounded-2xl mb-3 cursor-pointer active:scale-[0.99] transition-transform"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.totalOwedToMe}</p>
            <p className="text-3xl font-extrabold leading-tight" style={{ color: 'var(--color-text)' }}>
              {showAmounts ? fmt(totalOwed) : '••••••'}
              <span className="text-base font-semibold ml-1">ETB</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {t.creditCustomersLine.replace('{count}', String(allCount)).replace('{overdue}', String(overdueCount))}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAmounts((v) => !v); }}
              aria-label="Toggle amounts"
              className="p-2 rounded-full active:scale-90"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {showAmounts ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          </div>
        </div>
      </div>

      {/* Search + filter + download */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchCustomerPlaceholder}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-[15px] outline-none min-h-[44px]"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)', color: 'var(--color-text)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label={t.close}
              className="absolute right-2 p-1.5 rounded-full"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowSort(true)}
          aria-label={t.filterLabel}
          className="p-3 rounded-xl active:scale-90 flex-shrink-0"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)', color: 'var(--color-text)' }}
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
        <button
          onClick={onDownloadClick}
          aria-label={t.download}
          className="p-3 rounded-xl active:scale-90 flex-shrink-0"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)', color: 'var(--color-text)' }}
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 -mx-0.5">
        {chip('all', t.allFilter, allCount)}
        {chip('overdue', t.overdueFilter, overdueCount, 'var(--color-danger)')}
        {chip('canRemind', t.canRemindFilter, canRemindCount, '#16a34a')}
        {chip('archived', t.archivedFilter, archivedCount)}
      </div>

      {/* Sort (tappable) */}
      <button
        onClick={() => setShowSort(true)}
        className="flex items-center gap-1.5 mb-3 text-xs font-medium active:scale-95 transition-transform"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        {t.sortBy}: {t[SORT_LABELS[sortBy]]}
      </button>

      {/* List */}
      <div className="space-y-2">
        {visible.map((c) => (
          <CustomerRow key={c.id} customer={c} onSelect={onSelectCustomer} t={t} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-center text-sm py-10" style={{ color: 'var(--color-text-muted)' }}>
          {query ? t.noCustomerSearchResults : t.noCustomersFound}
        </p>
      )}

      {/* Spacer so the last row clears the fixed bottom actions */}
      <div style={{ height: showRemind ? 44 : 8 }} />

      {/* Fixed bottom actions — above the bottom nav */}
      <div
        className="fixed left-0 right-0 z-20 pointer-events-none"
        style={{ bottom: 0, paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto px-3 flex flex-col gap-2 pointer-events-auto">
          {/* Reminder bar — distinct danger treatment, only when overdue */}
          {showRemind && (
            <div
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)' }}
            >
              <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
                <AlertTriangle className="w-4 h-4" />
                {overdueCount} · {fmt(overdueAmount)} ETB
              </span>
              <button
                onClick={onRemind}
                className="px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap active:scale-95 transition-transform"
                style={{ background: 'var(--color-danger)', color: 'var(--color-bg-white)' }}
              >
                {t.remindAll.replace('{count}', String(overdueCount))}
              </button>
            </div>
          )}

          {/* Add Customer — sticky above nav, brand colored, active on tap */}
          <button
            onClick={onAddCustomer}
            className="w-full py-3.5 min-h-[52px] flex items-center justify-center gap-2 rounded-2xl font-bold text-[15px] shadow-lg active:bg-[#154fcc] transition-colors"
            style={{ background: '#1A66FF', color: 'var(--color-bg-white)' }}
          >
            <Plus className="w-5 h-5" />
            {t.addCustomer}
          </button>
        </div>
      </div>

      <SortSheet
        open={showSort}
        onClose={() => setShowSort(false)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filter={filter}
        onFilterChange={setFilter}
      />

      <CreditOverviewSheet open={showOverview} onClose={() => setShowOverview(false)} metrics={metrics} />
    </div>
  );
}
