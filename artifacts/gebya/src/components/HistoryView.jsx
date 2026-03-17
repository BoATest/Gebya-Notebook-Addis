import { Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { formatEthiopian } from '../utils/ethiopianCalendar';

function groupByDay(transactions) {
  const groups = {};
  for (const t of transactions) {
    const key = new Date(t.created_at).toDateString();
    if (!groups[key]) {
      groups[key] = { date: t.created_at, transactions: [] };
    }
    groups[key].transactions.push(t);
  }
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

function calcDayStats(transactions) {
  const sales = transactions.filter(t => t.type === 'sale');
  const expenses = transactions.filter(t => t.type === 'expense');
  const revenue = sales.reduce((s, t) => s + (t.amount || 0), 0);
  const costOfGoods = sales.reduce((s, t) => s + ((t.cost_price || 0) * (t.quantity || 1)), 0);
  const expenseTotal = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const hasCost = sales.some(t => t.cost_price > 0);
  const profit = revenue - costOfGoods - expenseTotal;
  return { revenue, profit, hasCost, expenseTotal };
}

function exportToCSV(transactions) {
  const headers = ['Date (Ethiopian)', 'Type', 'Item', 'Quantity', 'Amount (birr)', 'Cost (birr)', 'Profit (birr)', 'Customer'];
  const rows = transactions.map(t => [
    formatEthiopian(t.created_at),
    t.type,
    `"${t.item_name || ''}"`,
    t.quantity || 1,
    t.amount || 0,
    t.cost_price || '',
    t.profit !== null && t.profit !== undefined ? t.profit : '',
    `"${t.customer_name || ''}"`,
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gebya-backup-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function HistoryView({ transactions }) {
  const groups = groupByDay(transactions);

  return (
    <div className="space-y-4">
      <button
        onClick={() => exportToCSV(transactions)}
        className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-2xl font-bold min-h-[56px] active:scale-95 transition-all"
      >
        <Download className="w-5 h-5" />
        Export to CSV (Backup)
      </button>
      <p className="text-xs text-gray-400 text-center -mt-2">Download your data to keep it safe</p>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-gray-400 text-lg font-medium">No history yet</p>
          <p className="text-gray-300 text-sm mt-1">Record your first sale or expense to start</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const stats = calcDayStats(group.transactions);
            const isToday = new Date(group.date).toDateString() === new Date().toDateString();
            return (
              <div key={group.date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-700 text-sm">
                      {isToday ? 'Today' : formatEthiopian(group.date)}
                    </span>
                    {!isToday && (
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(group.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {stats.hasCost ? (
                      <span className={`text-sm font-bold ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {stats.profit >= 0 ? '+' : ''}{stats.profit.toLocaleString()} birr
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-700">{stats.revenue.toLocaleString()} birr</span>
                    )}
                    <p className="text-xs text-gray-400">{stats.hasCost ? 'profit' : 'revenue'}</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {group.transactions.map(t => (
                    <div key={t.id} className="px-4 py-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {t.type === 'sale' ? '💰' : t.type === 'expense' ? '🛒' : '👥'}
                        </span>
                        <div>
                          <span className="text-sm font-medium text-gray-800">{t.item_name}</span>
                          {t.quantity > 1 && (
                            <span className="text-xs text-gray-400 ml-1">×{t.quantity}</span>
                          )}
                          {t.customer_name && (
                            <p className="text-xs text-gray-400">{t.customer_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-semibold ${
                          t.type === 'sale' ? 'text-emerald-600' :
                          t.type === 'expense' ? 'text-red-500' : 'text-blue-600'
                        }`}>
                          {t.type === 'expense' ? '-' : ''}{(t.amount || 0).toLocaleString()}
                        </span>
                        {t.profit !== null && t.profit !== undefined && (
                          <p className={`text-xs ${t.profit >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {t.profit >= 0 ? '+' : ''}{t.profit.toLocaleString()} profit
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HistoryView;
