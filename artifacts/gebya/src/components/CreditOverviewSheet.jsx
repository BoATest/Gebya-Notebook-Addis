import { X } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { fmt } from '../utils/numformat';

/**
 * Tapping the neutral hero card opens this overview (spec §3).
 * Shows the factual credit metrics already computed for the page.
 */
export default function CreditOverviewSheet({ open, onClose, metrics }) {
  const { t } = useLang();
  if (!open || !metrics) return null;

  const m = metrics;
  const delta = typeof m.monthlyDelta === 'number'
    ? `${m.monthlyDelta > 0 ? '+' : ''}${m.monthlyDelta}%`
    : '—';

  const rows = [
    { label: t.totalOwedToMe, value: `${fmt(m.totalOwed)} ETB` },
    { label: t.overdueFilter, value: `${fmt(m.overdueAmount)} ETB · ${m.overdueCount}` },
    {
      label: 'On-time rate',
      value: m.onTimeRate != null ? `${m.onTimeRate}%` : '—',
    },
    { label: 'Collected this month', value: `${fmt(m.monthlyCollected)} ETB` },
    { label: 'vs last month', value: delta },
    { label: 'Streak', value: `${m.streak || 0}d` },
    { label: 'Top customer', value: m.topCustomer?.display_name || '—' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t.creditOverview}
    >
      <div
        className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-bg-disabled)]">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{t.creditOverview}</h2>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 -mr-2 rounded-full active:scale-95"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 space-y-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between px-3 py-3 rounded-xl"
              style={{ background: 'var(--color-bg-disabled)' }}
            >
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
              <span className="font-bold text-[15px] text-right" style={{ color: 'var(--color-text)' }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className="h-2" />
      </div>
    </div>
  );
}
