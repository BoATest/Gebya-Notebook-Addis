import PrivacyToggle from './PrivacyToggle';
import { TrendingUp, TrendingDown } from 'lucide-react';

function ProfitCard({ transactions }) {
  const sales = transactions.filter(t => t.type === 'sale');
  const expenses = transactions.filter(t => t.type === 'expense');

  const revenue = sales.reduce((sum, t) => sum + (t.amount || 0), 0);
  const costOfGoods = sales.reduce((sum, t) => sum + ((t.cost_price || 0) * (t.quantity || 1)), 0);
  const expenses_total = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const hasCostData = sales.some(t => t.cost_price > 0);

  const profit = revenue - costOfGoods - expenses_total;

  const mainValue = hasCostData ? profit : revenue;
  const mainLabel = hasCostData ? "Today's Profit" : "Today's Sales";

  return (
    <div className="space-y-3">
      <PrivacyToggle value={mainValue} label={mainLabel} />

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Sales
          </span>
          <span className="font-semibold text-emerald-600">{revenue.toLocaleString()} birr</span>
        </div>

        {expenses_total > 0 && (
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Expenses
            </span>
            <span className="font-semibold text-red-500">-{expenses_total.toLocaleString()} birr</span>
          </div>
        )}

        {hasCostData && (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Cost of goods</span>
              <span className="font-semibold text-orange-500">-{costOfGoods.toLocaleString()} birr</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Net Profit</span>
              <span className={`font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{profit.toLocaleString()} birr
              </span>
            </div>
          </>
        )}

        {!hasCostData && (
          <p className="text-xs text-gray-400 mt-1">
            Tap "Advanced" when recording a sale to see true profit
          </p>
        )}
      </div>
    </div>
  );
}

export default ProfitCard;
