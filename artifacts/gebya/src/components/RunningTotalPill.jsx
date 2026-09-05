import { fmt } from '../utils/numformat';

/**
 * RunningTotalPill (Phase 8c)
 * Compact live counter: "Today: 1,200 ETB · 5 sales"
 * Presentational only — parent computes totals.
 */
export default function RunningTotalPill({ total = 0, count = 0, creditCount = 0, lang = 'en', label = null, onTap, compact = false }) {
  const t = (en, am) => (lang === 'am' ? am : en);
  const clickable = typeof onTap === 'function';

  return (
    <button
      onClick={clickable ? onTap : undefined}
      className={clickable ? 'press-scale' : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: compact ? '5px 12px' : '7px 14px',
        borderRadius: 999,
        background: 'var(--color-success-bg, #ecfdf5)',
        border: '1.5px solid var(--color-success-border, #a7f3d0)',
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        minHeight: 36,
      }}
    >
      {label && (
        <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>
        {t('Today', 'ዛሬ')}
      </span>
      <span style={{ fontSize: compact ? 13 : 15, fontWeight: 900, color: 'var(--color-success, #047857)', lineHeight: 1 }}>
        {fmt(total)} ETB
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', lineHeight: 1 }}>
        · {count} {t(count === 1 ? 'sale' : 'sales', count === 1 ? 'ሽያጭ' : 'ሽያጮች')}
      </span>
      {creditCount > 0 && (
        <span
          title={t('Credit sales not yet collected', 'ክፍያ ያልተከፈለ ዱቤ ሽያጭ')}
          style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-info, #2563eb)', background: 'var(--color-info-bg, #eff6ff)', borderRadius: 999, padding: '2px 7px', lineHeight: 1.3 }}
        >
          {creditCount} {t('dubie', 'ዱቤ')}
        </span>
      )}
    </button>
  );
}
