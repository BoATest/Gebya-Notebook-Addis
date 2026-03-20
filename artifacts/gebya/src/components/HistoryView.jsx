import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Pencil, Search, X } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/numformat';

function groupByDay(transactions) {
  const groups = {};
  for (const tx of transactions) {
    const key = new Date(tx.created_at).toDateString();
    if (!groups[key]) groups[key] = { date: tx.created_at, transactions: [] };
    groups[key].transactions.push(tx);
  }
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

function groupByWeek(transactions) {
  const groups = {};
  for (const tx of transactions) {
    const d = new Date(tx.created_at);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const key = monday.getTime();
    if (!groups[key]) groups[key] = { weekStart: monday.getTime(), transactions: [] };
    groups[key].transactions.push(tx);
  }
  return Object.values(groups).sort((a, b) => b.weekStart - a.weekStart);
}

function calcStats(transactions) {
  const sales = transactions.filter(tx => tx.type === 'sale');
  const expenses = transactions.filter(tx => tx.type === 'expense');
  const revenue = sales.reduce((s, tx) => s + (tx.amount || 0), 0);
  const costOfGoods = sales.reduce((s, tx) => s + ((tx.cost_price || 0) * (tx.quantity || 1)), 0);
  const expenseTotal = expenses.reduce((s, tx) => s + (tx.amount || 0), 0);
  const hasCost = sales.some(tx => tx.cost_price > 0);
  const profit = revenue - costOfGoods - expenseTotal;
  return { revenue, profit, hasCost, expenseTotal };
}

function getTopProducts(transactions, limit = 5) {
  const byQty = {};
  const byRev = {};
  for (const tx of transactions) {
    if (tx.type !== 'sale') continue;
    const name = tx.item_name || 'Unknown';
    const qty = tx.quantity || 1;
    const amount = tx.amount || 0;
    byQty[name] = (byQty[name] || 0) + qty;
    byRev[name] = (byRev[name] || 0) + amount;
  }
  const topByQty = Object.entries(byQty)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, qty]) => ({ name, qty, revenue: byRev[name] || 0 }));
  const topByRev = Object.entries(byRev)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, revenue]) => ({ name, revenue, qty: byQty[name] || 0 }));
  return { topByQty, topByRev };
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getMonthStart(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getMonthEnd(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function filterCurrentWeek(transactions) {
  const ws = getWeekStart(Date.now());
  const we = ws + 7 * 86400000;
  return transactions.filter(tx => tx.created_at >= ws && tx.created_at < we);
}

function filterCurrentMonth(transactions) {
  const ms = getMonthStart(Date.now());
  const me = getMonthEnd(Date.now());
  return transactions.filter(tx => tx.created_at >= ms && tx.created_at <= me);
}

function matchesSearch(tx, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (tx.item_name || '').toLowerCase().includes(q) ||
    (tx.customer_name || '').toLowerCase().includes(q)
  );
}

const typeIcon  = { sale: '💰', expense: '🛒', credit: '👥' };
const typeColor = { sale: '#15803d', expense: '#dc2626', credit: '#C4883A' };
const medals    = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

function TopProductsList({ transactions, title }) {
  const { t } = useLang();
  const { topByQty, topByRev } = getTopProducts(transactions);
  const [tab, setTab] = useState('qty');

  const items = tab === 'qty' ? topByQty : topByRev;

  if (topByQty.length === 0) return null;

  return (
    <div className="px-4 py-3" style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-500">🏆 {title}</p>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('qty')}
            className="text-xs px-2 py-0.5 rounded-full font-bold transition-all press-scale"
            style={{
              background: tab === 'qty' ? '#1B4332' : '#f5f5f5',
              color: tab === 'qty' ? '#fff' : '#9ca3af',
            }}
          >
            {t.byQuantity}
          </button>
          <button
            onClick={() => setTab('rev')}
            className="text-xs px-2 py-0.5 rounded-full font-bold transition-all press-scale"
            style={{
              background: tab === 'rev' ? '#1B4332' : '#f5f5f5',
              color: tab === 'rev' ? '#fff' : '#9ca3af',
            }}
          >
            {t.byRevenue}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {items.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="text-sm flex-shrink-0">{medals[i] || `${i + 1}.`}</span>
            <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{p.name}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(27,67,50,0.1)', color: '#1B4332' }}>
              {tab === 'qty' ? `×${p.qty}` : `${fmt(p.revenue)} ${t.birr}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSummary({ transactions }) {
  const { t } = useLang();
  const { revenue, profit, expenseTotal, hasCost } = calcStats(transactions);
  const netProfit = hasCost ? profit : revenue - expenseTotal;

  return (
    <div className="px-4 py-3 space-y-2" style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{t.totalSales}</span>
        <span className="text-sm font-bold text-green-700">
          {`${fmt(revenue)} ${t.birr}`}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{t.totalExpenses}</span>
        <span className="text-sm font-bold text-red-500">
          {`${fmt(expenseTotal)} ${t.birr}`}
        </span>
      </div>
      <div className="border-t pt-2" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-gray-600">{t.netProfit}</span>
          <span className={`text-sm font-black ${netProfit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
            {`${netProfit >= 0 ? '+' : ''}${fmt(netProfit)} ${t.birr}`}
          </span>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ transactions, onEdit }) {
  const { t } = useLang();
  const [period, setPeriod] = useState('day');
  const [grouping, setGrouping] = useState('day');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const filteredTransactions = transactions.filter(tx => matchesSearch(tx, searchQuery));

  const dayGroups = groupByDay(filteredTransactions);
  const weekGroups = groupByWeek(filteredTransactions);

  const weekTransactions = filterCurrentWeek(filteredTransactions);
  const monthTransactions = filterCurrentMonth(filteredTransactions);

  const periods = [
    { id: 'day',   label: t.periodDay },
    { id: 'week',  label: t.periodWeek },
    { id: 'month', label: t.periodMonth },
  ];

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-black text-gray-800 px-1 font-serif">{t.report}</h2>

      <div className="flex gap-1.5 p-1" style={{ background: 'rgba(27,67,50,0.08)', borderRadius: 'var(--radius-md)' }}>
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className="flex-1 py-2 text-sm font-bold transition-all press-scale"
            style={{
              background: period === p.id ? '#1B4332' : 'transparent',
              color: period === p.id ? '#fff' : '#6b7280',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border outline-none transition-all"
          style={{
            borderColor: hasSearch ? '#1B4332' : 'var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-xs)',
            color: '#374151',
          }}
        />
        {hasSearch && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 press-scale"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" style={{ color: '#9ca3af' }} />
          </button>
        )}
      </div>

      {period === 'day' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 flex-shrink-0">{t.groupBy}</span>
            <div className="flex gap-1.5 flex-1">
              {[['day', t.daily], ['week', t.weekly]].map(([val, lbl]) => (
                <button key={val} onClick={() => setGrouping(val)}
                  className="px-3 py-1 text-xs font-bold transition-all press-scale"
                  style={{
                    background: grouping === val ? '#1B4332' : '#f0f0f0',
                    color: grouping === val ? '#fff' : '#6b7280',
                    borderRadius: '99px',
                  }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            hasSearch ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-12 h-12 mb-4" style={{ color: '#e5e7eb' }} />
                <p className="text-base font-medium" style={{ color: '#9ca3af' }}>{t.noSearchResults} "{searchQuery}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="w-16 h-16 mb-4" style={{ color: '#e5e7eb' }} />
                <p className="text-lg font-medium" style={{ color: '#9ca3af' }}>{t.noRecords}</p>
                <p className="text-sm mt-1" style={{ color: '#d1d5db' }}>{t.startRecording}</p>
              </div>
            )
          ) : grouping === 'day' ? (
            <div className="space-y-3">
              {dayGroups.map(group => {
                const stats = calcStats(group.transactions);
                const isToday = new Date(group.date).toDateString() === new Date().toDateString();
                const key = group.date.toString();
                const expanded = expandedGroups[key] ?? isToday;
                return (
                  <div
                    key={group.date}
                    className="border overflow-hidden transition-all animate-slide-up"
                    style={{
                      background: '#fff',
                      borderColor: 'var(--color-border)',
                      boxShadow: 'var(--shadow-xs)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <button className="w-full px-4 py-3 flex justify-between items-center"
                      style={{ background: isToday ? 'rgba(27,67,50,0.05)' : '#fafafa' }}
                      onClick={() => toggleGroup(key)}>
                      <div>
                        <span className="font-bold text-gray-800 text-sm font-sans">
                          {isToday ? t.today : formatEthiopian(group.date)}
                        </span>
                        {!isToday && (
                          <span className="text-xs ml-2" style={{ color: '#9ca3af' }}>
                            {new Date(group.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                          {group.transactions.length} {t.entries}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-sm font-black ${stats.profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                            {stats.hasCost ? `${stats.profit >= 0 ? '+' : ''}${fmt(stats.profit)}` : fmt(stats.revenue)} {t.birr}
                          </div>
                          <div className="text-xs" style={{ color: '#9ca3af' }}>{stats.hasCost ? t.profit : t.revenue}</div>
                        </div>
                        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
                        {group.transactions.map(tx => (
                          <button
                            key={tx.id}
                            onClick={() => onEdit(tx)}
                            className="w-full px-4 py-3 flex justify-between items-center text-left transition-colors press-scale"
                            style={{ background: 'transparent' }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base flex-shrink-0">{typeIcon[tx.type]}</span>
                              <div className="min-w-0">
                                <span className="font-medium text-gray-800 text-sm truncate block">{tx.item_name}</span>
                                {tx.quantity > 1 && <span className="text-xs text-gray-400">×{tx.quantity}</span>}
                                {tx.customer_name && <p className="text-xs text-gray-400">{tx.customer_name}</p>}
                                {tx.updated_at && <p className="text-xs" style={{ color: '#C4883A' }}>{t.edited}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <div className="text-right">
                                <span className="font-semibold text-sm" style={{ color: typeColor[tx.type] }}>
                                  {tx.type === 'expense' ? '-' : ''}{fmt(tx.amount || 0)}
                                </span>
                                {tx.profit !== null && tx.profit !== undefined && (
                                  <p className={`text-xs ${tx.profit >= 0 ? 'text-green-600' : 'text-red-400'}`}>
                                    {tx.profit >= 0 ? '+' : ''}{fmt(tx.profit)} {t.profit}
                                  </p>
                                )}
                              </div>
                              <Pencil className="w-3.5 h-3.5 text-gray-300" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {weekGroups.map(group => {
                const stats = calcStats(group.transactions);
                const weekEnd = new Date(group.weekStart + 6 * 86400000);
                const key = group.weekStart.toString();
                const expanded = expandedGroups[key];
                const isCurrentWeek = Date.now() >= group.weekStart && Date.now() <= group.weekStart + 7 * 86400000;
                return (
                  <div key={group.weekStart} className="border overflow-hidden animate-slide-up" style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}>
                    <button className="w-full px-4 py-3 flex justify-between items-center"
                      style={{ background: isCurrentWeek ? 'rgba(27,67,50,0.05)' : '#fafafa' }}
                      onClick={() => toggleGroup(key)}>
                      <div>
                        <span className="font-bold text-gray-800 text-sm font-sans">
                          {isCurrentWeek ? t.thisWeek : `${formatEthiopian(group.weekStart)} – ${formatEthiopian(weekEnd.getTime())}`}
                        </span>
                        <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                          {group.transactions.length} {t.entries}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className={`text-sm font-black ${stats.profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                            {stats.hasCost ? `${stats.profit >= 0 ? '+' : ''}${fmt(stats.profit)}` : fmt(stats.revenue)} {t.birr}
                          </div>
                          <div className="text-xs" style={{ color: '#9ca3af' }}>{stats.hasCost ? t.profit : t.revenue}</div>
                        </div>
                        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>

                    {expanded && (
                      <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
                        {group.transactions.map(tx => (
                          <button
                            key={tx.id}
                            onClick={() => onEdit(tx)}
                            className="w-full px-4 py-3 flex justify-between items-center text-left transition-colors press-scale"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-base flex-shrink-0">{typeIcon[tx.type]}</span>
                              <div className="min-w-0">
                                <span className="font-medium text-gray-800 text-sm truncate block">{tx.item_name}</span>
                                <span className="text-xs text-gray-400">{formatEthiopian(tx.created_at)}</span>
                                {tx.updated_at && <p className="text-xs" style={{ color: '#C4883A' }}>{t.edited}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <span className="font-semibold text-sm" style={{ color: typeColor[tx.type] }}>
                                {tx.type === 'expense' ? '-' : ''}{fmt(tx.amount || 0)}
                              </span>
                              <Pencil className="w-3.5 h-3.5 text-gray-300" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {period === 'week' && (
        <div className="space-y-4">
          <StatsSummary transactions={weekTransactions} />
          <TopProductsList transactions={weekTransactions} title={t.topProductsWeek} />
          {weekTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {hasSearch ? (
                <>
                  <Search className="w-12 h-12 mb-3" style={{ color: '#e5e7eb' }} />
                  <p className="text-base font-medium" style={{ color: '#9ca3af' }}>{t.noSearchResults} "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <Calendar className="w-12 h-12 mb-3" style={{ color: '#e5e7eb' }} />
                  <p className="text-base font-medium" style={{ color: '#9ca3af' }}>{t.noSalesThisPeriod}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {period === 'month' && (
        <div className="space-y-4">
          <StatsSummary transactions={monthTransactions} />
          <TopProductsList transactions={monthTransactions} title={t.topProductsMonth} />
          {monthTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {hasSearch ? (
                <>
                  <Search className="w-12 h-12 mb-3" style={{ color: '#e5e7eb' }} />
                  <p className="text-base font-medium" style={{ color: '#9ca3af' }}>{t.noSearchResults} "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <Calendar className="w-12 h-12 mb-3" style={{ color: '#e5e7eb' }} />
                  <p className="text-base font-medium" style={{ color: '#9ca3af' }}>{t.noSalesThisPeriod}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryView;
