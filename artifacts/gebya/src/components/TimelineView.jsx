import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { fmt } from '../utils/numformat';
import { formatEthiopianTime } from '../utils/ethiopianCalendar';

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
            color: 'var(--color-text-soft)',
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
              border: '1px solid var(--color-bg-disabled)',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
              background: 'var(--color-surface-subtle)',
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
              <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-soft)' }} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleExport}
          style={{
            minHeight: 36, padding: '4px 12px',
            border: '1px solid var(--color-bg-disabled)', borderRadius: 10,
            background: 'var(--color-surface)', fontSize: 11, fontWeight: 800,
            color: 'var(--color-text-muted)', cursor: 'pointer',
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
              background: activeFilter === f ? 'var(--color-primary)' : 'var(--color-bg-hover)',
              color: activeFilter === f ? 'var(--color-bg-white)' : 'var(--color-text-muted)',
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
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', textAlign: 'center', padding: '20px 0' }}>
          {searchQuery
            ? (lang === 'am' ? 'ምንም አልተገኘም' : 'No matching entries')
            : (lang === 'am' ? 'ምንም እንቅስቃሴ የለም' : 'No entries yet')}
        </p>
      ) : (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {filtered.map((row, i) => (
            <div key={row.report_id || row.id || i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--color-bg-hover)' : 'none',
              cursor: onEdit ? 'pointer' : 'default',
            }}
              onClick={() => onEdit?.(row)}
            >
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {kindEmoji[row.report_kind] || '📄'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', truncate: true }}>
                  {row.title || row.item_name || row.customer_name || (lang === 'am' ? 'መዝገብ' : 'Record')}
                </p>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-soft)', marginTop: 1 }}>
                  {row.created_at ? formatEthiopianTime(row.created_at) : ''}
                  {row.actor_name ? ` · ${row.actor_name}` : ''}
                  {` · ${paymentLabel(row)}`}
                </p>
              </div>
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: row.report_kind === 'expense' ? 'var(--color-danger)' : 'var(--color-success)',
                flexShrink: 0,
              }}>
                {hidden ? '••••' : `${fmt(row.amount || 0)} ETB`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
