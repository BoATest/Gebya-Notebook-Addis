import { useState } from 'react';
import { fmt } from '../utils/numformat';

const URGENT_ICON = '🔥';
const WARNING_ICON = '⚠';
const INFO_ICON = 'ℹ';

export default function DoThisNext({
  closingDone,
  cashExpected,
  cashVariance,
  overdueCount,
  overdueAmount,
  largestOverdueDays,
  unconfirmedStaff,
  salesCount,
  avgSalesCount,
  expenses,
  avgExpenses,
  lang,
  onAction,
  staffReportContent,
}) {
  const items = buildActionItems({
    closingDone, cashExpected, cashVariance, overdueCount, overdueAmount,
    largestOverdueDays, unconfirmedStaff, salesCount, avgSalesCount,
    expenses, avgExpenses, lang,
  });

  if (items.length === 0 && !unconfirmedStaff.length) return null;

  return (
    <div style={{ marginTop: 10 }}>
      {items.map((item, i) => (
        <ActionCard key={i} item={item} lang={lang} onAction={onAction} />
      ))}
      {unconfirmedStaff > 0 && (
        <ActionCard
          item={{
            urgency: 'urgent',
            icon: '👥',
            message: lang === 'am'
              ? `${unconfirmedStaff} ሰራተኛ ገንዘብ አላስረከበም`
              : `${unconfirmedStaff} staff haven't reported cash`,
            detail: lang === 'am' ? 'ከሰራተኞች ገንዘብ ሰብስብ' : 'Collect cash from staff',
            cta: lang === 'am' ? '👥 ሰብስብ →' : '👥 Collect from Staff →',
            actionType: 'collect_staff',
          }}
          lang={lang}
          onAction={onAction}
          expandedContent={staffReportContent}
        />
      )}
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
        item.urgency === 'urgent' ? '#fecaca' : item.urgency === 'warning' ? '#fde68a' : '#e5e7eb'
      }`,
      background: item.urgency === 'urgent' ? '#fef2f2' : item.urgency === 'warning' ? '#fffbeb' : '#f9fafb',
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
          <p style={{ fontSize: 12, fontWeight: 800, color: '#1f2937' }}>{item.message}</p>
          {item.detail && (
            <p style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', marginTop: 1 }}>{item.detail}</p>
          )}
        </div>
        {item.cta && !hasExpand && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAction?.(item.actionType); }}
            style={{
              fontSize: 11, fontWeight: 800, color: '#1B4332',
              background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              padding: '4px 8px',
            }}
          >
            {item.cta}
          </button>
        )}
        {hasExpand && (
          <span style={{ fontSize: 11, fontWeight: 800, color: '#6b7280' }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
      {hasExpand && expanded && (
        <div style={{ borderTop: '1px solid #f3f4f6', padding: 12 }}>
          {expandedContent}
        </div>
      )}
    </div>
  );
}

function buildActionItems({
  closingDone, cashExpected, cashVariance, overdueCount, overdueAmount,
  largestOverdueDays, unconfirmedStaff, salesCount, avgSalesCount,
  expenses, avgExpenses, lang,
}) {
  const items = [];

  if (!closingDone && cashExpected > 0) {
    items.push({
      urgency: 'urgent',
      icon: '💰',
      message: lang === 'am' ? 'ገንዘብ ገና አልተቆጠረም' : 'Cash not counted yet',
      detail: lang === 'am' ? `${fmt(cashExpected)} ETB ይጠበቃል` : `${fmt(cashExpected)} ETB expected`,
      cta: lang === 'am' ? '💰 ቆጥር' : '💰 Count Cash →',
      actionType: 'count_cash',
    });
  }

  if (closingDone && Math.abs(cashVariance) > (cashExpected || 1) * 0.05) {
    items.push({
      urgency: 'urgent',
      icon: '⚠️',
      message: lang === 'am' ? 'ገንዘብ አይዛመድም' : 'Cash does not match',
      detail: lang === 'am'
        ? `${fmt(Math.abs(cashVariance))} ETB ልዩነት`
        : `${fmt(Math.abs(cashVariance))} ETB variance`,
      cta: lang === 'am' ? '📋 መርምር' : '📋 Review',
      actionType: 'review',
    });
  }

  if (overdueCount > 0) {
    items.push({
      urgency: 'warning',
      icon: '👤',
      message: lang === 'am'
        ? `${overdueCount} ሰው ዕዳ አለባቸው`
        : `${overdueCount} people still owe you`,
      detail: lang === 'am'
        ? `${fmt(overdueAmount)} ETB · አንጋፋው ${largestOverdueDays} ቀን`
        : `${fmt(overdueAmount)} ETB · Oldest: ${largestOverdueDays} days`,
      cta: lang === 'am' ? '🔔 ሁሉን አስታውስ' : '🔔 Remind All →',
      actionType: 'overdue',
    });
  }

  if (avgSalesCount > 0 && salesCount < avgSalesCount * 0.5 && salesCount > 0) {
    items.push({
      urgency: 'info',
      icon: '📉',
      message: lang === 'am' ? 'ሽያጭ ዝቅተኛ ነው' : 'Sales are lower than usual',
      detail: lang === 'am'
        ? `በተለምዶ ${avgSalesCount} · ዛሬ ${salesCount}`
        : `Usually ${avgSalesCount} · Today ${salesCount}`,
      cta: null,
      actionType: null,
    });
  }

  if (avgExpenses > 0 && expenses > avgExpenses * 1.5) {
    items.push({
      urgency: 'info',
      icon: '📤',
      message: lang === 'am' ? 'ወጪ ከፍተኛ ነው' : 'Expenses are higher than usual',
      detail: lang === 'am'
        ? `በተለምዶ ${fmt(avgExpenses)} ETB · ዛሬ ${fmt(expenses)} ETB`
        : `Usually ${fmt(avgExpenses)} ETB · Today ${fmt(expenses)} ETB`,
      cta: null,
      actionType: null,
    });
  }

  return items;
}
