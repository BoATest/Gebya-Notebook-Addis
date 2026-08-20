import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import { useLang } from '../context/LangContext';

/**
 * Generic bottom-sheet menu of download/export actions.
 * `options`: [{ key, label, format: 'csv' | 'pdf', onSelect }]
 */
export default function DownloadMenuSheet({ open, onClose, title, options = [] }) {
  const { t } = useLang();
  if (!open) return null;

  const iconFor = (format) => (format === 'pdf' ? FileText : FileSpreadsheet);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || t.download}
    >
      <div
        className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-bg-disabled)]">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{title || t.download}</h2>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 -mr-2 rounded-full active:scale-95"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-2">
          {options.length === 0 && (
            <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t.noOverdueTitle}
            </p>
          )}
          {options.map((opt) => {
            const Icon = iconFor(opt.format);
            return (
              <button
                key={opt.key}
                onClick={() => { opt.onSelect?.(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl min-h-[48px] active:scale-[0.99] transition-transform"
                style={{ color: 'var(--color-text)' }}
              >
                <span
                  className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
                  style={{ background: 'var(--color-bg-disabled)' }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                </span>
                <span className="flex-1 text-left">
                  <span className="block font-semibold text-[15px]">{opt.label}</span>
                  {opt.subtitle && (
                    <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>{opt.subtitle}</span>
                  )}
                </span>
                <Download className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
              </button>
            );
          })}
        </div>
        <div className="h-2" />
      </div>
    </div>
  );
}
