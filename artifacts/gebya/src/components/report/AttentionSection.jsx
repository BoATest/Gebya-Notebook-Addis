// AttentionSection.jsx — "What needs me?"
//
// Only appears if there are attention items.
// Never shows "No alerts" — just hides.

import Chapter from './Chapter';

function AttentionItem({ item, lang = 'en', onAction }) {
  const dotColor = item.severity === 'urgent' ? '#dc2626' : '#d97706';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: dotColor,
        marginTop: 5,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#1f2937' }}>
          {item.message}
        </p>
        {item.detail && (
          <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {item.detail}
          </p>
        )}
      </div>
      {item.action && (
        <button
          type="button"
          onClick={() => onAction?.(item)}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: item.actionType === 'primary' ? 'none' : '1px solid #1B4332',
            background: item.actionType === 'primary' ? '#1B4332' : '#fff',
            color: item.actionType === 'primary' ? '#fff' : '#1B4332',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {item.action}
        </button>
      )}
    </div>
  );
}

export default function AttentionSection({ items = [], lang = 'en', onAction }) {
  if (items.length === 0) return null;

  return (
    <Chapter
      title={lang === 'am' ? 'ትኩረት' : 'Attention'}
      subtitle={lang === 'am' ? 'ምን ይፈልጋል?' : 'What needs you?'}
      badge={{ text: items.length, color: '#d97706' }}
      defaultExpanded={true}
    >
      <div style={{ marginTop: 4 }}>
        {items.map((item, i) => (
          <AttentionItem key={item.type || i} item={item} lang={lang} onAction={onAction} />
        ))}
      </div>
    </Chapter>
  );
}
