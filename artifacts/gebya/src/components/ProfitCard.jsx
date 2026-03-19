import PrivacyToggle from './PrivacyToggle';
import { useLang } from '../context/LangContext';

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
    </div>
  );
}

export default ProfitCard;
