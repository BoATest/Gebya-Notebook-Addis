import PrivacyToggle from './PrivacyToggle';
import { useLang } from '../context/LangContext';

function ProfitCard({ transactions }) {
  const { t } = useLang();

  const sales = transactions.filter(tx => tx.type === 'sale');
  const expenses = transactions.filter(tx => tx.type === 'expense');

  const revenue = sales.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const costOfGoods = sales.reduce((sum, tx) => sum + ((tx.cost_price || 0) * (tx.quantity || 1)), 0);
  const expenses_total = expenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const salesWithCost = sales.filter(tx => tx.cost_price > 0).length;
  const totalSales = sales.length;

  const hasNoCostData = totalSales === 0 || salesWithCost === 0;
  const hasAllCostData = totalSales > 0 && salesWithCost === totalSales;
  const hasPartialCostData = !hasNoCostData && !hasAllCostData;

  const profit = revenue - costOfGoods - expenses_total;

  let mainValue, mainLabel;
  if (hasNoCostData) {
    mainValue = revenue;
    mainLabel = t.todaysSales;
  } else if (hasPartialCostData) {
    mainValue = profit;
    mainLabel = t.estimatedProfit;
  } else {
    mainValue = profit;
    mainLabel = t.todaysProfit;
  }

  return (
    <div className="space-y-3">
      <PrivacyToggle value={mainValue} label={mainLabel} />
      {hasPartialCostData && (
        <div className="px-1 space-y-1">
          <p className="text-xs text-amber-600 dark:text-amber-400 leading-snug">
            {t.partialCostDisclaimer}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
            {t.partialCostTip}
          </p>
        </div>
      )}
    </div>
  );
}

export default ProfitCard;
