// HistorySection.jsx — "What if I need old records?"
//
// Lowest priority. Collapsed by default.
// Contains time range, search, export, filter.
// Exactly like Apple Settings — daily things first, advanced tools later.

import { useState } from 'react';
import { Search, Filter, Download, X } from 'lucide-react';
import { fmt } from '../../utils/numformat';
import Chapter from './Chapter';

function TransactionRow({ tx, hidden = false, lang = 'en', onEdit }) {
  const time = tx.created_at
    ? new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const isOut = tx.report_kind === 'expense';
  const amountColor = isOut ? '#dc2626' : '#16a34a';

  return (
    <button
      type="button"
      onClick={() => onEdit?.(tx)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid #f3f4f6',
        border: 'none',
        borderTop: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 900, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tx.title || tx.item_name || tx.note || (lang === 'am' ? 'መዝገብ' : 'Record')}
        </p>
        <p style={{ fontSize: 10, color: '#9ca3af' }}>
          {tx.report_kind === 'credit' ? '📝 Dubie' : tx.report_kind === 'collection' ? '💰 Collection' : tx.payment_type || 'Cash'} · {time}
        </p>
      </div>
      <span style={{ fontSize: 13, fontWeight: 900, color: amountColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {hidden ? '••••' : fmt(tx.amount || 0)}
      </span>
    </button>
  );
}

export default function HistorySection({
  transactions = [],
  searchQuery = '',
  onSearchChange,
  onEdit,
  onExport,
  onFilter,
  hidden = false,
  lang = 'en',
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const handleSearch = (value) => {
    setLocalQuery(value);
    onSearchChange?.(value);
  };

  if (transactions.length === 0 && !searchQuery) return null;

  return (
    <Chapter
      title={lang === 'am' ? 'ታሪክ እና ሪፖርት' : 'History & Reports'}
      subtitle={lang === 'am' ? 'பழைய ታሪክ ይፈልጉ' : 'Search, export, filter'}
      defaultExpanded={false}
      expanded={expanded}
      onToggle={setExpanded}
      badge={{ text: `${transactions.length}`, color: '#6b7280' }}
    >
      <div style={{ marginTop: 8 }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search className="w-4 h-4" style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
          }} />
          <input
            type="text"
            value={localQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder={lang === 'am' ? 'መዝገቦችን ፈልግ...' : 'Search transactions...'}
            style={{
              width: '100%',
              minHeight: 40,
              padding: '8px 36px 8px 36px',
              border: `1px solid ${localQuery ? '#1B4332' : '#e5e7eb'}`,
              borderRadius: 10,
              fontSize: 13,
              outline: 'none',
            }}
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => handleSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <X className="w-4 h-4" style={{ color: '#9ca3af' }} />
            </button>
          )}
        </div>

        {/* Transaction list */}
        <div>
          {transactions.slice(0, 20).map((tx, i) => (
            <TransactionRow key={tx.report_id || tx.id || i} tx={tx} hidden={hidden} lang={lang} onEdit={onEdit} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
          <button
            type="button"
            onClick={onExport}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#fff',
              fontSize: 12,
              fontWeight: 800,
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={onFilter}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#fff',
              fontSize: 12,
              fontWeight: 800,
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
      </div>
    </Chapter>
  );
}
