// SalesSection.jsx — "What did we sell?"
//
// Shows top items, average sale, payment mix.
// Answers the operational question, not the accounting question.

import { fmt } from '../../utils/numformat';
import Chapter from './Chapter';

export default function SalesSection({ sales, hidden = false, lang = 'en' }) {
  if (!sales || sales.totalSales === 0) return null;

  return (
    <Chapter
      title={lang === 'am' ? 'ሽያጭ' : 'Sales Summary'}
      subtitle={lang === 'am' ? 'ምን እንደ ተ거래 ጠቁማል' : 'What did we sell?'}
      defaultExpanded={true}
    >
      <div style={{ marginTop: 8 }}>
        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-text-soft)', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'ጠቅላላ' : 'Total'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-success)', marginTop: 2 }}>
              {hidden ? '••••' : fmt(sales.totalAmount)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-text-soft)', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'መካከል' : 'Average'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
              {hidden ? '••••' : fmt(sales.averageSale)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-text-soft)', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'ብዛት' : 'Count'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)', marginTop: 2 }}>
              {sales.totalSales}
            </p>
          </div>
        </div>

        {/* Top items */}
        {sales.topItems.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {lang === 'am' ? ' በርካታ የተ거래 ዕቃ' : 'Top items'}
            </p>
            {sales.topItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < sales.topItems.length - 1 ? '1px solid var(--color-bg-hover)' : 'none',
              }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: 'var(--color-bg-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 900,
                  color: 'var(--color-text-muted)',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-soft)' }}>
                    {item.count} {lang === 'am' ? 'ጊዜ' : 'times'} · {item.quantity > 0 ? `${item.quantity} ${lang === 'am' ? 'ቁጥር' : 'units'}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>
                  {hidden ? '••••' : fmt(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Payment mix */}
        {sales.totalSales > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-bg-hover)' }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {lang === 'am' ? 'የክፍያ ዘዴ' : 'Payment mix'}
            </p>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 700 }}>
              {sales.paymentBreakdown.cash > 0 && (
                <span style={{ color: 'var(--color-success)' }}>
                  💵 {sales.paymentBreakdown.cash} {lang === 'am' ? 'ጥሬ' : 'Cash'}
                </span>
              )}
              {sales.paymentBreakdown.transfer > 0 && (
                <span style={{ color: 'var(--color-accent-amber)' }}>
                  📱 {sales.paymentBreakdown.transfer} {lang === 'am' ? 'ዝውውር' : 'Transfer'}
                </span>
              )}
              {sales.paymentBreakdown.credit > 0 && (
                <span style={{ color: 'var(--color-danger)' }}>
                  📝 {sales.paymentBreakdown.credit} {lang === 'am' ? 'ዱቤ' : 'Credit'}
                </span>
              )}
              {sales.paymentBreakdown.partial > 0 && (
                <span style={{ color: 'var(--color-accent-amber)' }}>
                  ½ {sales.paymentBreakdown.partial} {lang === 'am' ? 'ከፊል' : 'Partial'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Chapter>
  );
}
