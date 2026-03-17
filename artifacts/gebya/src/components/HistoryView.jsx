import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/format';

function groupByDay(transactions) {
  const groups = {};
  for (const t of transactions) {
    const key = new Date(t.created_at).toDateString();
    if (!groups[key]) groups[key] = { date: t.created_at, transactions: [] };
    groups[key].transactions.push(t);
  }
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

function groupByWeek(transactions) {
  const groups = {};
  for (const t of transactions) {
    const d = new Date(t.created_at);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const key = monday.getTime();
    if (!groups[key]) groups[key] = { weekStart: monday.getTime(), transactions: [] };
    groups[key].transactions.push(t);
  }
  return Object.values(groups).sort((a, b) => b.weekStart - a.weekStart);
}

function calcStats(transactions) {
  const sales = transactions.filter(t => t.type === 'sale');
  const expenses = transactions.filter(t => t.type === 'expense');
  const revenue = sales.reduce((s, t) => s + (t.amount || 0), 0);
  const costOfGoods = sales.reduce((s, t) => s + ((t.cost_price || 0) * (t.quantity || 1)), 0);
  const expenseTotal = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const hasCost = sales.some(t => t.cost_price > 0);
  const profit = revenue - costOfGoods - expenseTotal;
  return { revenue, profit, hasCost, expenseTotal };
}

const typeIcon  = { sale: '💰', expense: '🛒', credit: '👥' };
const typeColor = { sale: '#15803d', expense: '#dc2626', credit: '#c47c1a' };

function HistoryView({ transactions, onEdit }) {
  const [grouping, setGrouping] = useState('day');
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const dayGroups = groupByDay(transactions);
  const weekGroups = groupByWeek(transactions);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex gap-2">
        {[['day', 'By Day'], ['week', 'By Week']].map(([val, lbl]) => (
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
          <p className="text-lg font-medium" style={{ color: '#9ca3af' }}>No records yet</p>
          <p className="text-sm mt-1" style={{ color: '#d1d5db' }}>Record your first sale or expense to start</p>
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
                      {isToday ? 'Today' : formatEthiopian(group.date)}
                    </span>
                    {!isToday && (
                      <span className="text-xs ml-2" style={{ color: '#9ca3af' }}>
                        {new Date(group.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                      {group.transactions.length} entries
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`text-sm font-black ${stats.profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                        {stats.hasCost ? `${stats.profit >= 0 ? '+' : ''}${fmt(stats.profit)}` : fmt(stats.revenue)} birr
                      </div>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>{stats.hasCost ? 'profit' : 'revenue'}</div>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {expanded && (
                  <div className="divide-y" style={{ borderColor: '#fef9ec' }}>
                    {group.transactions.map(t => (
                      <button
                        key={t.id}
                        onClick={() => onEdit(t)}
                        className="w-full px-4 py-3 flex justify-between items-center text-left active:bg-amber-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">{typeIcon[t.type]}</span>
                          <div className="min-w-0">
                            <span className="font-medium text-gray-800 text-sm truncate block">{t.item_name}</span>
                            {t.quantity > 1 && <span className="text-xs text-gray-400">×{t.quantity}</span>}
                            {t.customer_name && <p className="text-xs text-gray-400">{t.customer_name}</p>}
                            {t.updated_at && <p className="text-xs" style={{ color: '#c47c1a' }}>edited</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <div className="text-right">
                            <span className="font-semibold text-sm" style={{ color: typeColor[t.type] }}>
                              {t.type === 'expense' ? '-' : ''}{fmt(t.amount || 0)}
                            </span>
                            {t.profit !== null && t.profit !== undefined && (
                              <p className={`text-xs ${t.profit >= 0 ? 'text-green-600' : 'text-red-400'}`}>
                                {t.profit >= 0 ? '+' : ''}{fmt(t.profit)} profit
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
                      {isCurrentWeek ? 'This Week' : `${formatEthiopian(group.weekStart)} – ${formatEthiopian(weekEnd.getTime())}`}
                    </span>
                    <div className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                      {group.transactions.length} entries
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`text-sm font-black ${stats.profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                        {stats.hasCost ? `${stats.profit >= 0 ? '+' : ''}${fmt(stats.profit)}` : fmt(stats.revenue)} birr
                      </div>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>{stats.hasCost ? 'profit' : 'revenue'}</div>
                    </div>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {expanded && (
                  <div className="divide-y" style={{ borderColor: '#fef9ec' }}>
                    {group.transactions.map(t => (
                      <button
                        key={t.id}
                        onClick={() => onEdit(t)}
                        className="w-full px-4 py-3 flex justify-between items-center text-left active:bg-amber-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">{typeIcon[t.type]}</span>
                          <div className="min-w-0">
                            <span className="font-medium text-gray-800 text-sm truncate block">{t.item_name}</span>
                            <span className="text-xs text-gray-400">{formatEthiopian(t.created_at)}</span>
                            {t.updated_at && <p className="text-xs" style={{ color: '#c47c1a' }}>edited</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <span className="font-semibold text-sm" style={{ color: typeColor[t.type] }}>
                            {t.type === 'expense' ? '-' : ''}{fmt(t.amount || 0)}
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
