// MoneySection.jsx — "Where is my money?"
//
// Shows cash, transfer, credit, expenses in one view.
// Profit only shown when complete cost data exists.

import { fmt } from '../../utils/numformat';
import Chapter from './Chapter';

function MoneyRow({ label, value, color = '#1f2937', bold = false, suffix = ' ETB' }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid #f3f4f6',
    }}>
      <span style={{ fontSize: 13, color: '#374151', fontWeight: bold ? 800 : 600 }}>
        {label}
      </span>
      <span style={{
        fontSize: 14,
        fontWeight: 900,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fmt(value)}{suffix}
      </span>
    </div>
  );
}

function ExpenseBar({ name, amount, maxAmount }) {
  const width = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, width: 70, textAlign: 'right', flexShrink: 0 }}>
        {name}
      </span>
      <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(width, 100)}%`,
          height: '100%',
          background: '#1B4332',
          borderRadius: 4,
          transition: 'width 0.3s',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#374151', width: 60, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(amount)}
      </span>
    </div>
  );
}

export default function MoneySection({ money, expenseBreakdown = [], hidden = false, lang = 'en' }) {
  if (!money) return null;

  const showProfit = money.hasCostData && money.totalProfit !== null;
  const maxExpense = expenseBreakdown.length > 0 ? expenseBreakdown[0].total : 0;

  return (
    <Chapter
      title={lang === 'am' ? 'ገንዘብ' : 'Money'}
      subtitle={lang === 'am' ? 'የዛሬ ገንዘብ የት ነው?' : 'Where is today\'s money?'}
      defaultExpanded={true}
    >
      <div style={{ marginTop: 8 }}>
        <MoneyRow
          label={lang === 'am' ? 'ሽያጭ' : 'Sales'}
          value={money.sales}
          color="#16a34a"
          bold
        />
        <MoneyRow
          label={lang === 'am' ? 'ወጪ' : 'Expenses'}
          value={money.expenses}
          color="#dc2626"
        />
        <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />
        <MoneyRow
          label={lang === 'am' ? 'የሚጠበቅ ጥሬ ገንዘብ' : 'Cash expected'}
          value={money.cashExpected}
        />
        <MoneyRow
          label={lang === 'am' ? 'የሚጠበቅ ትራንስፈር' : 'Transfer expected'}
          value={money.transferRecorded}
          color="#d97706"
        />
        <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />
        <MoneyRow
          label={lang === 'am' ? 'የተሰጠ ዱቤ' : 'Credit extended'}
          value={money.creditExtended}
          color="#d97706"
        />
        <MoneyRow
          label={lang === 'am' ? 'የተሰበሰበ ዱቤ' : 'Credit collected'}
          value={money.creditCollected}
          color="#16a34a"
        />

        {showProfit && (
          <>
            <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />
            <MoneyRow
              label={lang === 'am' ? 'የተጠላ ቀሪ' : 'Estimated earnings'}
              value={money.totalProfit}
              color={money.totalProfit >= 0 ? '#16a34a' : '#dc2626'}
              bold
            />
          </>
        )}

        {/* Expense breakdown */}
        {expenseBreakdown.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              {lang === 'am' ? 'ወጪ ማጠቃለያ' : 'Expense breakdown'}
            </p>
            {expenseBreakdown.slice(0, 5).map((item, i) => (
              <ExpenseBar
                key={i}
                name={item.category}
                amount={item.total}
                maxAmount={maxExpense}
              />
            ))}
          </div>
        )}
      </div>
    </Chapter>
  );
}
