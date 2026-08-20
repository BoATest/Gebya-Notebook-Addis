import { X, Check } from 'lucide-react';
import { useLang } from '../context/LangContext';

const SORTS_CUSTOMER = [
  { value: 'overdue', labelKey: 'sortMostOverdue' },
  { value: 'balance', labelKey: 'sortHighestBalance' },
  { value: 'active', labelKey: 'sortRecentlyActive' },
  { value: 'added', labelKey: 'sortRecentlyAdded' },
  { value: 'name', labelKey: 'sortNameAz' },
];

const SORTS_SUPPLIER = [
  { value: 'balance', labelKey: 'sortHighestBalance' },
  { value: 'active', labelKey: 'sortRecentlyActive' },
  { value: 'added', labelKey: 'sortRecentlyAdded' },
  { value: 'name', labelKey: 'sortNameAz' },
];

const FILTERS_CUSTOMER = [
  { value: 'all', labelKey: 'allFilter' },
  { value: 'overdue', labelKey: 'overdueFilter' },
  { value: 'canRemind', labelKey: 'canRemindFilter' },
  { value: 'archived', labelKey: 'archivedFilter' },
];

const FILTERS_SUPPLIER = [
  { value: 'all', labelKey: 'allFilter' },
  { value: 'archived', labelKey: 'archivedFilter' },
];

/**
 * Combined Sort & Filter panel (spec §15). Tapping a sort or filter selects it;
 * a Done button closes. Both controls are reachable from a single tappable element.
 */
export default function SortSheet({ open, onClose, sortBy, onSortChange, filter, onFilterChange, supplier = false }) {
  const { t } = useLang();
  if (!open) return null;

  const SORTS = supplier ? SORTS_SUPPLIER : SORTS_CUSTOMER;
  const FILTERS = supplier ? FILTERS_SUPPLIER : FILTERS_CUSTOMER;

  const renderOption = (opt, active, onSelect) => (
    <button
      key={opt.value}
      onClick={() => onSelect(opt.value)}
      className="w-full flex items-center justify-between px-3 py-3 rounded-xl min-h-[48px] active:scale-[0.99] transition-transform"
      style={{
        background: active ? 'var(--color-bg-disabled)' : 'transparent',
        color: 'var(--color-text)',
      }}
    >
      <span className="font-medium text-[15px]">{t[opt.labelKey]}</span>
      {active && <Check className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.sortBy}
    >
      <div
        className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-bg-disabled)]">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{t.sortBy}</h2>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 -mr-2 rounded-full active:scale-95"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-2 py-2">
          <p className="px-3 pt-1 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            {t.filterLabel}
          </p>
          {FILTERS.map((opt) => renderOption(opt, filter === opt.value, onFilterChange))}

          <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            {t.sortBy}
          </p>
          {SORTS.map((opt) => renderOption(opt, sortBy === opt.value, onSortChange))}
        </div>

        <div className="p-3">
          <button
            onClick={onClose}
            className="w-full py-3 min-h-[48px] rounded-xl font-bold text-[15px] active:scale-[0.99] transition-transform"
            style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
          >
            {t.done || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
