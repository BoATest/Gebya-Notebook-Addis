import PrivacyToggle from './PrivacyToggle';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { fmt } from '../utils/format';

function ProfitCard({ transactions }) {
  const { t } = useLang();

  const sales = transactions.filter(tx => tx.type === 'sale');
  const expenses = transactions.filter(tx => tx.type === 'expense');

  const revenue = sales.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const costOfGoods = sales.reduce((sum, tx) => sum + ((tx.cost_price || 0) * (tx.quantity || 1)), 0);
  const expenses_total = expenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const hasCostData = sales.some(tx => tx.cost_price > 0);

  const profit = revenue - costOfGoods - expenses_total;
  const mainValue = hasCostData ? profit : revenue;
  const mainLabel = hasCostData ? t.todaysProfit : t.todaysSales;

  return (
    <div className="space-y-3">
      <PrivacyToggle value={mainValue} label={mainLabel} />

      <div className="rounded-2xl p-4 shadow-sm border" style={{ background: '#fff', borderColor: '#f0e6d4' }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="flex items-center gap-1" style={{ color: '#6b7280' }}>
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#15803d' }} /> {t.salesLabel}
          </span>
          <span className="font-semibold" style={{ color: '#15803d' }}>{fmt(revenue)} {t.birr}</span>
        </div>

        {expenses_total > 0 && (
          <div className="flex justify-between text-sm mb-2">
            <span className="flex items-center gap-1" style={{ color: '#6b7280' }}>
              <TrendingDown className="w-3.5 h-3.5 text-red-500" /> {t.expenses}
            </span>
            <span className="font-semibold text-red-500">-{fmt(expenses_total)} {t.birr}</span>
          </div>
        )}

        {hasCostData && (
          <>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: '#6b7280' }}>{t.costOfGoods}</span>
              <span className="font-semibold" style={{ color: '#ea580c' }}>-{fmt(costOfGoods)} {t.birr}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm" style={{ borderColor: '#f0e6d4' }}>
              <span className="font-semibold" style={{ color: '#374151' }}>{t.netProfit}</span>
              <span className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                {profit >= 0 ? '+' : ''}{fmt(profit)} {t.birr}
              </span>
            </div>
          </>
        )}

        {!hasCostData && (
          <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
            {t.advancedHint}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProfitCard;
