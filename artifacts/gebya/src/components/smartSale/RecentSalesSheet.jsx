import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Share2 } from 'lucide-react';
import { useLang } from '../../context/LangContext';
import { fmt } from '../../utils/numformat';
import { formatEthiopianTime } from '../../utils/ethiopianCalendar';

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
  return formatEthiopianTime(ts);
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

export default function RecentSalesSheet({ transactions = [], onClose, onHistory, onViewTransaction }) {
  const handleRowTap = (tx) => {
    onClose?.();
    onViewTransaction?.(tx);
  };
  const { lang } = useLang();
  const [search, setSearch] = useState('');

  const todayDateStr = new Date().toDateString();
  const todaySales = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'sale' && new Date(tx.created_at).toDateString() === todayDateStr)
      .slice(0, 20);
  }, [transactions, todayDateStr]);

  const sales = useMemo(() => {
    const filtered = todaySales.filter(tx => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (tx.item_name || '').toLowerCase().includes(q)
        || (tx.payment_type || '').toLowerCase().includes(q)
        || (tx.customer_name || '').toLowerCase().includes(q)
        || String(tx.amount || '').includes(q);
    });
    return groupByDay(filtered);
  }, [todaySales, search]);

  const handleShareAgain = async (tx) => {
    const text = `Gebya Sale: ${tx.item_name || 'Sale'} — ${fmt(tx.amount)} ETB (${tx.payment_type || 'cash'})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Gebya Sale', text });
      } else {
        await navigator.clipboard.writeText(text);
        alert(lang === 'am' ? 'ተገልብጧል' : 'Copied to clipboard');
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ maxWidth: '28rem', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #e8e2d8' }}>
        <button onClick={onClose} className="press-scale flex items-center justify-center" style={{ minWidth: '44px', minHeight: '44px' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: '#6b7280' }} />
        </button>
        <h2 className="text-base font-bold flex-1" style={{ color: '#111827' }}>
          {lang === 'am' ? 'የዛሬ ሽያጭ' : "Today's Sales"}
        </h2>
        <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>
          {todaySales.length}
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
              {search.trim()
                ? (lang === 'am' ? 'ለፍለጋውምንም ውጤት የለም' : 'No matching sales')
                : (lang === 'am' ? 'ዛሬ ሽያጭ የለም' : 'No sales today')}
            </p>
          </div>
        ) : (
          sales.map(group => (
            <div key={group.date} className="mb-3">
              <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#6b7280' }}>
                {formatDateLabel(group.date, lang)}
              </p>
              <div className="space-y-1">
                {group.transactions.map(tx => {
                  const paymentLabel = tx.payment_type === 'cash' ? '💵 Cash'
                    : tx.payment_type === 'credit' ? '👥 Credit'
                    : tx.payment_provider || tx.payment_type || '—';
                  return (
                    <div
                      key={tx.id}
                      className="p-2.5 border text-left"
                      style={{ borderColor: '#e8e2d8', borderRadius: 'var(--radius-sm)', background: '#fff', cursor: 'pointer' }}
                      onClick={() => handleRowTap(tx)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate" style={{ color: '#111827' }}>
                            {tx.item_name || (lang === 'am' ? 'ሽያጭ' : 'Sale')}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: '#6b7280' }}>
                            {tx.customer_name && <span>{tx.customer_name} · </span>}
                            {paymentLabel} · {formatTime(tx.created_at)}
                          </p>
                          {tx.items && tx.items.length > 1 && (
                            <p className="text-[10px]" style={{ color: '#9ca3af' }}>
                              {tx.items.length} {lang === 'am' ? 'ንጥሎች' : 'items'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-black" style={{ color: '#14532d' }}>
                            {fmt(tx.amount)} ETB
                          </span>
                          <button
                            onClick={() => handleShareAgain(tx)}
                            className="flex items-center justify-center press-scale"
                            style={{ minWidth: '36px', minHeight: '36px' }}
                            aria-label={lang === 'am' ? 'አጋራ' : 'Share'}
                          >
                            <Share2 className="w-3.5 h-3.5" style={{ color: '#6b7280' }} onClick={(e) => { e.stopPropagation(); handleShareAgain(tx); }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* See All History */}
        <div className="py-3 text-center">
          <button
            onClick={onHistory}
            className="text-xs font-bold underline press-scale"
            style={{ color: '#6b7280' }}
          >
            {lang === 'am' ? 'ሁሉንም ታሪክ ይመልከቱ' : 'See All History'}
          </button>
        </div>
      </div>
    </div>
  );
}
