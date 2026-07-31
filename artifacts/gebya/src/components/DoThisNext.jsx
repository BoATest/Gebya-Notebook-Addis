import { useMemo, useState } from 'react';
import { computeAttentionItems } from '../utils/shopStory';

const URGENT_ICON = '🔥';
const WARNING_ICON = '⚠';
const INFO_ICON = 'ℹ';

const ITEM_ICON_MAP = {
  cash_pending: '💰',
  cash_mismatch: '⚠️',
  overdue_customers: '👤',
  low_sales: '📉',
  high_expenses: '📤',
};

export default function DoThisNext({
  closingDone,
  cashExpected,
  cashVariance,
  overdueCount,
  overdueAmount,
  largestOverdueDays,
  salesCount,
  avgSalesCount,
  expenses,
  avgExpenses,
  lang,
  onAction,
}) {
  const items = useMemo(() => {
    const raw = computeAttentionItems({
      closingDone, cashExpected, cashVariance, overdueCount, overdueAmount,
      largestOverdueDays, salesCount, avgSalesCount,
      expenses, avgExpenses, lang,
    });
    return raw.map(item => ({
      ...item,
      urgency: item.severity === 'urgent' ? 'urgent' : item.severity === 'warning' ? 'warning' : 'info',
      icon: ITEM_ICON_MAP[item.type] || INFO_ICON,
      cta: item.action,
    }));
  }, [closingDone, cashExpected, cashVariance, overdueCount, overdueAmount,
      largestOverdueDays, salesCount, avgSalesCount, expenses, avgExpenses, lang]);

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      {items.map((item, i) => (
        <ActionCard key={i} item={item} lang={lang} onAction={onAction} />
      ))}
    </div>
  );
}

function ActionCard({ item, lang, onAction, expandedContent }) {
  const [expanded, setExpanded] = useState(false);
  const hasExpand = Boolean(expandedContent);

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${
        item.urgency === 'urgent' ? 'var(--color-danger-border)' : item.urgency === 'warning' ? 'var(--color-warning-border)' : 'var(--color-bg-disabled)'
      }`,
      background: item.urgency === 'urgent' ? 'var(--color-danger-bg)' : item.urgency === 'warning' ? 'var(--color-warning-bg)' : 'var(--color-bg-active)',
      marginBottom: 6,
      overflow: 'hidden',
    }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          cursor: hasExpand ? 'pointer' : 'default',
        }}
        onClick={() => { if (hasExpand) setExpanded(!expanded); }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>
          {item.urgency === 'urgent' ? URGENT_ICON : item.urgency === 'warning' ? WARNING_ICON : INFO_ICON}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>{item.message}</p>
          {item.detail && (
            <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginTop: 1 }}>{item.detail}</p>
          )}
        </div>
        {item.cta && !hasExpand && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAction?.(item.actionType); }}
            style={{
              fontSize: 11, fontWeight: 800, color: 'var(--color-primary)',
              background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              padding: '4px 8px',
            }}
          >
            {item.cta}
          </button>
        )}
        {hasExpand && (
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)' }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
      {hasExpand && expanded && (
        <div style={{ borderTop: '1px solid var(--color-border-light)', padding: 12 }}>
          {expandedContent}
        </div>
      )}
    </div>
  );
}
