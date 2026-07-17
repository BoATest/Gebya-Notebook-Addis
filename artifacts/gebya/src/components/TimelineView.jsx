import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';

const FILTERS = ['all', 'sale', 'expense', 'collection', 'credit'];

export default function TimelineView({
  reportRows,
  lang,
  handleExport,
  onEdit,
}) {
  const { hidden } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = useMemo(() => {
    let rows = reportRows;
    if (activeFilter !== 'all') {
      rows = rows.filter(r => r.report_kind === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.item_name || '').toLowerCase().includes(q) ||
        (r.customer_name || '').toLowerCase().includes(q) ||
        String(r.amount || '').includes(q)
      );
    }
    return rows;
  }, [reportRows, searchQuery, activeFilter]);

  const filterLabels = {
    all: lang === 'am' ? 'ሁሉም' : 'All',
    sale: lang === 'am' ? 'ሽያጭ' : 'Sales',
    expense: lang === 'am' ? 'ወጪ' : 'Expenses',
    collection: lang === 'am' ? 'መሰብሰብ' : 'Collections',
    credit: lang === 'am' ? 'ዱቤ' : 'Credit',
  };

  const kindEmoji = {
    sale: '🛒',
    expense: '📤',
    collection: '👤',
    credit: '📝',
  };

  const paymentLabel = (row) => {
    const method = row.payment_type || (row.report_kind === 'collection' ? 'cash' : 'cash');
    if (method === 'telebirr') return 'Telebirr';
    if (method === 'cbe' || method === 'cbebirr') return 'CBE';
    if (method === 'bank') return 'Bank';
    return lang === 'am' ? 'ጥሬ' : 'Cash';
  };

  return (
    <div style={{ marginTop: 4 }}>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search className="w-4 h-4" style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: '#9ca3af',
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'am' ? 'ፈልግ...' : 'Search entries...'}
            style={{
              width: '100%',
              minHeight: 36,
              padding: '4px 10px 4px 32px',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
              background: '#fafaf8',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              }}
            >
              <X className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleExport}
          style={{
            minHeight: 36, padding: '4px 12px',
            border: '1px solid #e5e7eb', borderRadius: 10,
            background: '#fff', fontSize: 11, fontWeight: 800,
            color: '#6b7280', cursor: 'pointer',
          }}
        >
          {lang === 'am' ? 'ላክ' : 'Export'}
        </button>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: 'none',
              background: activeFilter === f ? '#1B4332' : '#f3f4f6',
              color: activeFilter === f ? '#fff' : '#6b7280',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>
          {searchQuery
            ? (lang === 'am' ? 'ምንም አልተገኘም' : 'No matching entries')
            : (lang === 'am' ? 'ምንም እንቅስቃሴ የለም' : 'No entries yet')}
        </p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ece6d6', overflow: 'hidden' }}>
          {filtered.map((row, i) => (
            <div key={row.report_id || row.id || i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: onEdit ? 'pointer' : 'default',
            }}
              onClick={() => onEdit?.(row)}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {kindEmoji[row.report_kind] || '📄'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', truncate: true }}>
                  {row.title || row.item_name || row.customer_name || (lang === 'am' ? 'መዝገብ' : 'Record')}
                </p>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginTop: 1 }}>
                  {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  {row.actor_name ? ` · ${row.actor_name}` : ''}
                  {` · ${paymentLabel(row)}`}
                </p>
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: row.report_kind === 'expense' ? '#dc2626' : '#059669',
                flexShrink: 0,
              }}>
                {hidden ? '••••' : `${(row.amount || 0).toLocaleString()} ETB`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
