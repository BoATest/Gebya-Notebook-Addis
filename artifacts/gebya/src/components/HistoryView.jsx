import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/format';

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

const typeIcon  = { sale: '💰', expense: '🛒', credit: '👥' };
const typeColor = { sale: '#15803d', expense: '#dc2626', credit: '#c47c1a' };

function HistoryView({ transactions, onEdit }) {
  const { t } = useLang();
  const [grouping, setGrouping] = useState('day');
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const dayGroups = groupByDay(transactions);
  const weekGroups = groupByWeek(transactions);

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-lg font-black text-gray-800 px-1">{t.report}</h2>
      <div className="flex gap-2">
        {[['day', t.byDay], ['week', t.byWeek]].map(([val, lbl]) => (
          <button key={val} onClick={() => setGrouping(val)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: grouping === val ? '#c47c1a' : '#f5f5f5',
              color: grouping === val ? '#fff' : '#6b7280',
            }}>
            {lbl}
          </button>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="w-16 h-16 mb-4" style={{ color: '#e5e7eb' }} />
          <p className="text-lg font-medium" style={{ color: '#9ca3af' }}>{t.noRecords}</p>
          <p className="text-sm mt-1" style={{ color: '#d1d5db' }}>{t.startRecording}</p>
        </div>
      ) : grouping === 'day' ? (
        <div className="space-y-3">
          {dayGroups.map(group => {
            const stats = calcStats(group.transactions);
            const isToday = new Date(group.date).toDateString() === new Date().toDateString();
            const key = group.date.toString();
            const expanded = expandedGroups[key] ?? isToday;
            return (
              <div key={group.date} className="rounded-2xl shadow-sm border overflow-hidden" style={{ background: '#fff', borderColor: '#f0e6d4' }}>
                <button className="w-full px-4 py-3 flex justify-between items-center"
                  style={{ background: isToday ? '#fffbeb' : '#fafafa' }}
                  onClick={() => toggleGroup(key)}>
                  <div>
                    <span className="font-bold text-gray-800 text-sm">
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
                  <div className="divide-y" style={{ borderColor: '#fef9ec' }}>
                    {group.transactions.map(tx => (
                      <button
                        key={tx.id}
                        onClick={() => onEdit(tx)}
                        className="w-full px-4 py-3 flex justify-between items-center text-left active:bg-amber-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">{typeIcon[tx.type]}</span>
                          <div className="min-w-0">
                            <span className="font-medium text-gray-800 text-sm truncate block">{tx.item_name}</span>
                            {tx.quantity > 1 && <span className="text-xs text-gray-400">×{tx.quantity}</span>}
                            {tx.customer_name && <p className="text-xs text-gray-400">{tx.customer_name}</p>}
                            {tx.updated_at && <p className="text-xs" style={{ color: '#c47c1a' }}>{t.edited}</p>}
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
              <div key={group.weekStart} className="rounded-2xl shadow-sm border overflow-hidden" style={{ background: '#fff', borderColor: '#f0e6d4' }}>
                <button className="w-full px-4 py-3 flex justify-between items-center"
                  style={{ background: isCurrentWeek ? '#fffbeb' : '#fafafa' }}
                  onClick={() => toggleGroup(key)}>
                  <div>
                    <span className="font-bold text-gray-800 text-sm">
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
                  <div className="divide-y" style={{ borderColor: '#fef9ec' }}>
                    {group.transactions.map(tx => (
                      <button
                        key={tx.id}
                        onClick={() => onEdit(tx)}
                        className="w-full px-4 py-3 flex justify-between items-center text-left active:bg-amber-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">{typeIcon[tx.type]}</span>
                          <div className="min-w-0">
                            <span className="font-medium text-gray-800 text-sm truncate block">{tx.item_name}</span>
                            <span className="text-xs text-gray-400">{formatEthiopian(tx.created_at)}</span>
                            {tx.updated_at && <p className="text-xs" style={{ color: '#c47c1a' }}>{t.edited}</p>}
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

    </div>
  );
}

export default HistoryView;
