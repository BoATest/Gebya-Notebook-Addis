// TimelineSection.jsx — "What happened today?"
//
// Chronological evidence, not analytics.
// Newest first. Each row is a doorway to the transaction.

import { fmt } from '../../utils/numformat';
import { formatEthiopianTime } from '../../utils/ethiopianCalendar';
import Chapter from './Chapter';

function TimelineRow({ item, hidden = false, lang = 'en', onAction }) {
  const time = item.time
    ? formatEthiopianTime(item.time)
    : '';

  const kindIcon = {
    sale: '🛒',
    credit: '📝',
    collection: '💰',
    expense: '📤',
  }[item.kind] || '📋';

  const amountColor = item.kind === 'expense' ? '#dc2626' : '#16a34a';

  return (
    <button
      type="button"
      onClick={() => onAction?.(item)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid #f3f4f6',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{kindIcon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.label}
        </p>
        <p style={{ fontSize: 10, color: '#9ca3af' }}>
          {time} · {item.staff} · {item.payment === 'transfer' ? '📱' : '💵'}
        </p>
      </div>
      <span style={{
        fontSize: 13,
        fontWeight: 900,
        color: amountColor,
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}>
        {hidden ? '••••' : fmt(item.amount)}
      </span>
    </button>
  );
}

export default function TimelineSection({ timeline = [], hidden = false, lang = 'en', onAction }) {
  if (timeline.length === 0) return null;

  return (
    <Chapter
      title={lang === 'am' ? 'የዛሬ ታሪክ' : "Today's Timeline"}
      subtitle={lang === 'am' ? 'ምን ሆነ?' : 'What happened?'}
      badge={{ text: timeline.length, color: '#6b7280' }}
      defaultExpanded={false}
    >
      <div style={{ marginTop: 4 }}>
        {timeline.map((item, i) => (
          <TimelineRow key={item.id || i} item={item} hidden={hidden} lang={lang} onAction={onAction} />
        ))}
      </div>
    </Chapter>
  );
}
