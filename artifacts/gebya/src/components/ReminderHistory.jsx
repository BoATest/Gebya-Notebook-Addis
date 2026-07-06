import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { useLang } from '../context/LangContext';

const PAGE_LIMIT = 20;

const STATUS_CONFIG = {
  sent:    { en: 'Sent',    am: 'ተልኳል',    bg: '#ecfdf5', border: '#86efac', color: '#166534' },
  queued:  { en: 'Queued',  am: 'በመጠባበቅ',  bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  failed:  { en: 'Failed',  am: 'አልተሳካም',  bg: '#fef2f2', border: '#fca5a5', color: '#991b1b' },
  skipped: { en: 'Skipped', am: 'ተሻረ',     bg: '#f9fafb', border: '#e5e7eb', color: '#6b7280' },
};

function statusStyle(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.queued;
}

function formatDate(ts, lang) {
  if (!ts) return '—';
  const d = new Date(ts);
  const dateStr = d.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString(lang === 'am' ? 'am-ET' : 'en-US', {
    hour: '2-digit', minute: '2-digit',
  });
  return `${dateStr} ${timeStr}`;
}

function ReminderHistory({ shopId, customerId: initialCustomerId }) {
  const { lang } = useLang();

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [customerFilter, setCustomerFilter] = useState(initialCustomerId ? String(initialCustomerId) : '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchHistory = useCallback(async (nextOffset = 0, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const cid = customerFilter ? Number(customerFilter) : undefined;
      const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : undefined;
      const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : undefined;

      const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');
      const params = new URLSearchParams({
        shopId: String(shopId),
        limit: String(PAGE_LIMIT),
        offset: String(nextOffset),
      });
      if (cid) params.set('customerId', String(cid));
      if (from != null) params.set('fromDate', String(from));
      if (to != null) params.set('toDate', String(to));

      const res = await fetch(`${API_BASE}/reminders/history?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const newEntries = data.entries || [];
      setEntries(prev => append ? [...prev, ...newEntries] : newEntries);
      setTotal(data.total || 0);
      setOffset(nextOffset);
    } catch (err) {
      setError(err.message || (lang === 'am' ? 'ማስታወሻ ታሪክ መጫን አልተቻለም' : 'Failed to load reminder history'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [shopId, customerFilter, fromDate, toDate, lang]);

  useEffect(() => {
    fetchHistory(0, false);
  }, [fetchHistory]);

  const handleApplyFilters = () => {
    fetchHistory(0, false);
  };

  const handleClearFilters = () => {
    setCustomerFilter(initialCustomerId ? String(initialCustomerId) : '');
    setFromDate('');
    setToDate('');
  };

  const handleLoadMore = () => {
    fetchHistory(offset + PAGE_LIMIT, true);
  };

  const hasMore = offset + entries.length < total;
  const hasFilters = !!customerFilter || !!fromDate || !!toDate;

  return (
    <div className="space-y-4 pb-4">
      <div
        className="px-4 py-3 mb-1 text-center"
        style={{ background: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
      >
        <p className="text-sm font-black" style={{ color: '#fff' }}>
          {lang === 'am' ? 'የማስታወሻ ታሪክ' : 'Reminder History'}
        </p>
      </div>

      <div
        style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)', padding: 12 }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
          }}
        >
          <p className="text-xs font-black text-gray-700">
            🔎 {lang === 'am' ? 'ማጣሪያዎች' : 'Filters'}
          </p>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="text-[11px] font-bold press-scale"
              style={{ color: '#6b7280', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              {lang === 'am' ? 'አጥር' : 'Clear'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label style={{ display: 'block', color: '#6b7280', fontSize: 11, fontWeight: 850 }}>
            {lang === 'am' ? 'የደንበኛ ስም / ID (አማራጭ)' : 'Customer name or ID (optional)'}
            <input
              type="text"
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              placeholder={lang === 'am' ? 'ስም ወይም ቁጥር' : 'Name or ID'}
              style={{ minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 13, width: '100%', marginTop: 4 }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#6b7280', fontSize: 11, fontWeight: 850 }}>
              {lang === 'am' ? 'ከ' : 'From'}
              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#6b7280', fontSize: 11, fontWeight: 850 }}>
              {lang === 'am' ? 'ወደ' : 'To'}
              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{ minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}
              />
            </label>
          </div>

          <button
            onClick={handleApplyFilters}
            className="w-full py-2 font-black text-sm press-scale"
            style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', minHeight: 40 }}
          >
            {lang === 'am' ? 'ተጠቀም' : 'Apply filters'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)', padding: '10px 12px' }}>
          <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 800 }}>{lang === 'am' ? 'ጠቅላላ' : 'Total'}</p>
          <p style={{ fontSize: 18, fontWeight: 950, color: '#1f2937' }}>{total}</p>
        </div>
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)', padding: '10px 12px' }}>
          <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 800 }}>{lang === 'am' ? 'የተላኩ' : 'Sent'}</p>
          <p style={{ fontSize: 18, fontWeight: 950, color: '#166534' }}>{entries.filter(e => e.status === 'sent').length}</p>
        </div>
        <div style={{ flex: 1, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)', padding: '10px 12px' }}>
          <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 800 }}>{lang === 'am' ? 'ያልተሳኩ' : 'Failed'}</p>
          <p style={{ fontSize: 18, fontWeight: 950, color: '#991b1b' }}>{entries.filter(e => e.status === 'failed').length}</p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 12px', color: '#991b1b', fontSize: 13, fontWeight: 700 }}>
          {lang === 'am' ? 'ስህተት፦ ' : 'Error: '}{error}
        </div>
      )}

      {loading && entries.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p style={{ color: '#9ca3af', fontSize: 14 }}>{lang === 'am' ? 'እየጫነ…' : 'Loading…'}</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)', overflow: 'hidden' }}>
          {entries.map((entry) => {
            const st = statusStyle(entry.status);
            const displayName = entry.customerNameSnapshot || entry.customer_name || (lang === 'am' ? 'ደንበኛ' : 'Customer');
            return (
              <div key={entry.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="font-bold text-sm truncate" style={{ color: '#1f2937' }}>
                      {displayName}
                    </p>
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                      Chat ID: {entry.chatId || '—'}
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      {formatDate(entry.sentAt, lang)}
                    </p>
                    {entry.failureReason && (
                      <p style={{ fontSize: 11, color: '#dc2626', marginTop: 2, wordBreak: 'break-word' }}>
                        {lang === 'am' ? 'ስህተት፦ ' : 'Error: '}{entry.failureReason}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[11px] font-black px-2 py-1 flex-shrink-0"
                    style={{
                      background: st.bg,
                      color: st.color,
                      border: `1px solid ${st.border}`,
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {lang === 'am' ? st.am : st.en}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && entries.length === 0 && !error && (
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)', padding: '32px 16px' }}>
          <div className="text-center">
            <Bell className="mx-auto mb-2" style={{ width: 32, height: 32, color: '#e5e7eb' }} />
            <p style={{ color: '#9ca3af', fontSize: 13, fontWeight: 650 }}>
              {lang === 'am' ? 'ምንም ማስታወሻ ታሪክ የለም' : 'No reminder history found'}
            </p>
          </div>
        </div>
      )}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full py-2.5 text-xs font-bold text-center transition-all press-scale border rounded-xl"
          style={{
            borderColor: '#C4883A',
            color: '#6b4f1d',
            background: loadingMore ? 'rgba(196,136,58,0.04)' : 'rgba(196,136,58,0.08)',
            cursor: loadingMore ? 'not-allowed' : 'pointer',
            minHeight: 40,
          }}
        >
          {loadingMore
            ? (lang === 'am' ? 'እየጠገነ…' : 'Loading…')
            : (lang === 'am' ? 'ተጨማሪ አሳይ' : 'Load more')}
        </button>
      )}
    </div>
  );
}

export default ReminderHistory;
