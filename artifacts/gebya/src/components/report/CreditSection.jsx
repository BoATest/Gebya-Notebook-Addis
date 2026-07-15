// CreditSection.jsx — "Who owes me?"
//
// Shows overdue and due customers with actions.
// Overdue first, then by amount.

import { fmt } from '../../utils/numformat';
import Chapter from './Chapter';

function CustomerRow({ customer, hidden = false, lang = 'en', onAction }) {
  const isOverdue = customer.has_overdue;
  const daysOverdue = customer.overdue_days || 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid #f3f4f6',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isOverdue ? '#fef2f2' : '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 900,
          color: isOverdue ? '#dc2626' : '#6b7280',
          flexShrink: 0,
        }}>
          {(customer.display_name || customer.name || 'C').charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {customer.display_name || customer.name || (lang === 'am' ? 'ደንበኛ' : 'Customer')}
          </p>
          <p style={{ fontSize: 10, color: isOverdue ? '#dc2626' : '#9ca3af' }}>
            {isOverdue
              ? (lang === 'am' ? `${daysOverdue} ቀን አልፏል` : `${daysOverdue} days overdue`)
              : (lang === 'am' ? 'በጊዜው ውስጥ' : 'On time')
            }
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          fontSize: 14,
          fontWeight: 900,
          color: isOverdue ? '#dc2626' : '#d97706',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {hidden ? '••••' : fmt(customer.balance)}
        </span>
        {isOverdue && onAction && (
          <button
            type="button"
            onClick={() => onAction('remind', customer)}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid #e5e7eb',
              background: '#fff',
              fontSize: 10,
              fontWeight: 800,
              color: '#1B4332',
              cursor: 'pointer',
            }}
          >
            {lang === 'am' ? 'ያስታውሱ' : 'Remind'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CreditSection({ credit, hidden = false, lang = 'en', onAction }) {
  if (!credit || credit.totalCount === 0) return null;

  return (
    <Chapter
      title={lang === 'am' ? 'ዱቤ እና ደንበኛ' : 'Credit & Customers'}
      subtitle={lang === 'am' ? 'ማን ይሄዳል?' : 'Who owes you?'}
      badge={credit.overdueCount > 0 ? { text: credit.overdueCount, color: '#dc2626' } : null}
      defaultExpanded={true}
    >
      <div style={{ marginTop: 8 }}>
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'የዘገዩ' : 'Overdue'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#dc2626', marginTop: 2 }}>
              {credit.overdueCount}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'ጠቅላላ' : 'Total owed'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#d97706', marginTop: 2 }}>
              {hidden ? '••••' : fmt(credit.totalOwed)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'ደንበኛ' : 'Customers'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#374151', marginTop: 2 }}>
              {credit.totalCount}
            </p>
          </div>
        </div>

        {/* Overdue customers */}
        {credit.overdue.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {lang === 'am' ? 'የዘገዩ' : 'Overdue'}
            </p>
            {credit.overdue.slice(0, 5).map((customer, i) => (
              <CustomerRow key={customer.id || i} customer={customer} hidden={hidden} lang={lang} onAction={onAction} />
            ))}
          </div>
        )}

        {/* Due customers (not overdue) */}
        {credit.dueToday.length > 0 && (
          <div style={{ marginTop: credit.overdue.length > 0 ? 12 : 0 }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {lang === 'am' ? 'በጊዜው ውስጥ' : 'Due soon'}
            </p>
            {credit.dueToday.slice(0, 3).map((customer, i) => (
              <CustomerRow key={customer.id || i} customer={customer} hidden={hidden} lang={lang} onAction={onAction} />
            ))}
          </div>
        )}

        {/* View all link */}
        {credit.totalCount > 8 && (
          <button
            type="button"
            style={{
              width: '100%',
              padding: '10px',
              marginTop: 8,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fafaf5',
              fontSize: 12,
              fontWeight: 800,
              color: '#1B4332',
              cursor: 'pointer',
            }}
          >
            {lang === 'am' ? 'ሁሉንም ደንበኛ ይያዩ' : `View all ${credit.totalCount} customers`} →
          </button>
        )}
      </div>
    </Chapter>
  );
}
