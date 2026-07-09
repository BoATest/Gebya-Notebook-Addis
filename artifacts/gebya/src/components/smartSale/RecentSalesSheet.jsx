import { useState, useMemo } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useLang } from '../../context/LangContext';
import { fmt } from '../../utils/numformat';
import { formatEthiopian } from '../../utils/ethiopianCalendar';

function groupByDay(transactions) {
  const groups = {};
  for (const tx of transactions) {
    const key = new Date(tx.created_at).toDateString();
    if (!groups[key]) groups[key] = { date: tx.created_at, transactions: [] };
    groups[key].transactions.push(tx);
  }
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateLabel(ts, lang) {
  const now = new Date();
  const date = new Date(ts);
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return lang === 'am' ? 'ዛሬ' : 'Today';
  if (isYesterday) return lang === 'am' ? 'ትናንት' : 'Yesterday';
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function RecentSalesSheet({ transactions = [], onClose, onPreview }) {
  const { lang } = useLang();
  const [search, setSearch] = useState('');

  const sales = useMemo(() => {
    const filtered = transactions
      .filter(tx => tx.type === 'sale')
      .filter(tx => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (tx.item_name || '').toLowerCase().includes(q)
          || (tx.payment_type || '').toLowerCase().includes(q)
          || String(tx.amount || '').includes(q);
      })
      .slice(0, 20);
    return groupByDay(filtered);
  }, [transactions, search]);

  const recentSales = transactions.filter(tx => tx.type === 'sale').slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ maxWidth: '28rem', margin: '0 auto' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-3 sm:px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid #e8e2d8' }}
      >
        <button
          onClick={onClose}
          className="press-scale flex items-center justify-center"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: '#6b7280' }} />
        </button>
        <h2 className="text-base font-bold flex-1" style={{ color: '#111827' }}>
          {lang === 'am' ? 'የቅርብ ሽያጭ' : 'Recent Sales'}
        </h2>
        <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>
          {recentSales.length}
        </span>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'am' ? 'ፈልግ...' : 'Search...'}
            className="w-full pl-9 pr-3 py-2.5 border-2 text-sm focus:outline-none"
            style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8', minHeight: '44px' }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-2">
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm font-bold" style={{ color: '#374151' }}>
              {lang === 'am' ? 'የቅርብ ሽያጭ የለም' : 'No recent sales'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
              {search.trim()
                ? (lang === 'am' ? 'ለፍለጋውምንም ውጤት የለም' : 'No matching sales')
                : (lang === 'am' ? 'የተቀመጡ ሽያጮች እዚህ ይታያሉ' : 'Saved sales will appear here')}
            </p>
          </div>
        ) : (
          sales.map(group => (
            <div key={group.date} className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#6b7280' }}>
                {formatDateLabel(group.date, lang)}
              </p>
              <div className="space-y-1.5">
                {group.transactions.map(tx => {
                  const paymentLabel = tx.payment_type === 'cash' ? '💵 Cash'
                    : tx.payment_type === 'credit' ? '👥 Credit'
                    : tx.payment_provider || tx.payment_type || '—';
                  return (
                    <button
                      key={tx.id}
                      onClick={() => onPreview?.(tx)}
                      className="w-full p-3 border text-left flex items-center justify-between gap-2 press-scale"
                      style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-sm)', background: '#fff', minHeight: '48px' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#111827' }}>
                          {tx.item_name || (lang === 'am' ? 'ሽያጭ' : 'Sale')}
                        </p>
                        <p className="text-xs" style={{ color: '#6b7280' }}>
                          {paymentLabel} · {formatTime(tx.created_at)}
                        </p>
                        {tx.items && tx.items.length > 1 && (
                          <p className="text-[10px]" style={{ color: '#9ca3af' }}>
                            {tx.items.length} {lang === 'am' ? 'ንጥሎች' : 'items'}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-black flex-shrink-0" style={{ color: '#14532d' }}>
                        {fmt(tx.amount)} ETB
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
