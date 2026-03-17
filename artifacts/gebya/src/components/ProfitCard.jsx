import PrivacyToggle from './PrivacyToggle';
import { usePrivacy } from '../context/PrivacyContext';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fmt } from '../utils/format';

function ProfitCard({ transactions }) {
  const { hidden } = usePrivacy();
  const hid = (n) => hidden ? '••••' : fmt(n);

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

      <div className="rounded-2xl p-4 shadow-sm border" style={{ background: '#fff', borderColor: '#f0e6d4' }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="flex items-center gap-1" style={{ color: '#6b7280' }}>
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#15803d' }} /> Sales
          </span>
          <span className="font-semibold" style={{ color: '#15803d' }}>{hid(revenue)} birr</span>
        </div>

        {expenses_total > 0 && (
          <div className="flex justify-between text-sm mb-2">
            <span className="flex items-center gap-1" style={{ color: '#6b7280' }}>
              <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Expenses
            </span>
            <span className="font-semibold text-red-500">-{hid(expenses_total)} birr</span>
          </div>
        )}

        {hasCostData && (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: '#6b7280' }}>Cost of goods</span>
              <span className="font-semibold" style={{ color: '#ea580c' }}>-{hid(costOfGoods)} birr</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm" style={{ borderColor: '#f0e6d4' }}>
              <span className="font-semibold" style={{ color: '#374151' }}>Net Profit</span>
              <span className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{hid(profit)} birr
              </span>
            </div>
          </>
        )}

        {!hasCostData && (
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
            Tap "Advanced" when recording a sale to see true profit
          </p>
        )}
      </div>
    </div>
  );
}

export default ProfitCard;
