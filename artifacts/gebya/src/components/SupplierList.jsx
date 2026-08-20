import React, { useMemo, useState } from 'react';
import { Search, X, Download, ChevronRight, SlidersHorizontal, ArrowUpDown, Plus } from 'lucide-react';
import { fmt } from '../utils/numformat';
import { useLang } from '../context/LangContext';
import SortSheet from './SortSheet';

const SORT_LABELS = {
  balance: 'sortHighestBalance',
  active: 'sortRecentlyActive',
  added: 'sortRecentlyAdded',
  name: 'sortNameAz',
};

function SupplierRow({ supplier, onSelect, t }) {
  const initial = (supplier.display_name || '?').trim().charAt(0).toUpperCase() || '?';
  const lastSaleLabel = supplier.last_activity_at ? '' : null;
  const owes = Number(supplier.balance) > 0;
  const statusText = owes ? t.iOweTag : t.statusSettled;
  const statusColor = owes ? '#d97706' : 'var(--color-text-muted)';

  return (
    <button
      onClick={() => onSelect(supplier)}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:scale-[0.99] transition-transform"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)' }}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 font-bold text-sm"
        style={{ background: 'var(--color-bg-disabled)', color: 'var(--color-text)' }}
      >
        {initial}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-[15px] truncate" style={{ color: 'var(--color-text)' }}>
          {supplier.display_name}
        </span>
        <span className="block text-xs truncate" style={{ color: statusColor }}>
          {statusText}
        </span>
      </span>

      <span className="flex flex-col items-end flex-shrink-0">
        <span className="font-bold text-[15px]" style={{ color: 'var(--color-text)' }}>
          {fmt(supplier.balance)}
        </span>
        <ChevronRight className="w-4 h-4 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
      </span>
    </button>
  );
}

export default function SupplierList({ suppliers = [], onSelectSupplier, onAddSupplier, onDownloadClick }) {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('balance');
  const [showSort, setShowSort] = useState(false);

  const { active, archivedCount, allCount } = useMemo(() => {
    const arch = suppliers.filter((s) => s.archived_at);
    const act = suppliers.filter((s) => !s.archived_at);
    return { active: act, archivedCount: arch.length, allCount: act.length };
  }, [suppliers]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = active;
    if (filter === 'archived') list = suppliers.filter((s) => s.archived_at);
    if (q) {
      list = list.filter((s) => {
        const hay = `${s.display_name || ''} ${s.note || ''} ${s.phone_number || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === 'active') return (b.last_activity_at || 0) - (a.last_activity_at || 0);
      if (sortBy === 'added') return (b.created_at || 0) - (a.created_at || 0);
      if (sortBy === 'name') return String(a.display_name || '').localeCompare(String(b.display_name || ''));
      return (Number(b.balance) || 0) - (Number(a.balance) || 0);
    });
    return sorted;
  }, [active, suppliers, filter, query, sortBy]);

  const totalIowe = useMemo(
    () => active.reduce((s, c) => s + (Number(c.balance) || 0), 0),
    [active]
  );

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
      {/* Hero card — neutral, "Total I owe" */}
      <div
        className="w-full text-left px-4 py-4 rounded-2xl mb-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-bg-disabled)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t.totalIOwe}</p>
        <p className="text-3xl font-extrabold leading-tight" style={{ color: 'var(--color-text)' }}>
          {fmt(totalIowe)}
          <span className="text-base font-semibold ml-1">ETB</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {t.creditCustomersLine.replace('{count}', String(allCount)).replace('{overdue}', '0')}
        </p>
      </div>

      {/* Search + filter + download */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchSupplierPlaceholder || t.searchCustomerPlaceholder}
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
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
        {chip('all', t.allFilter, allCount)}
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
        {visible.map((s) => (
          <SupplierRow key={s.id} supplier={s} onSelect={onSelectSupplier} t={t} />
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-center text-sm py-10" style={{ color: 'var(--color-text-muted)' }}>
          {query ? t.noCustomerSearchResults : t.noSuppliersYet || t.noCustomersFound}
        </p>
      )}

      {/* Spacer so the last row clears the fixed bottom action */}
      <div style={{ height: 8 }} />

      {/* Add Supplier — sticky above nav, brand colored, active on tap */}
      <div
        className="fixed left-0 right-0 z-20 pointer-events-none"
        style={{ bottom: 0, paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto px-3 pointer-events-auto">
          <button
            onClick={onAddSupplier}
            className="w-full py-3.5 min-h-[52px] flex items-center justify-center gap-2 rounded-2xl font-bold text-[15px] shadow-lg active:bg-[#154fcc] transition-colors"
            style={{ background: '#1A66FF', color: 'var(--color-bg-white)' }}
          >
            <Plus className="w-5 h-5" />
            {t.addSupplier}
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
        supplier
      />
    </div>
  );
}
