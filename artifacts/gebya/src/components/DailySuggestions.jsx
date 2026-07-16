import { useLang } from '../context/LangContext';

const SUGGESTIONS = [
  {
    id: 'no_sales_morning',
    condition: (sales, expenses, period, bestSeller, overdueCount) =>
      sales === 0 && period === 'morning',
    icon: '☀️',
    getMessage: (lang) => lang === 'am'
      ? 'ዛሬን ይጀምሩ — የመጀመሪያ ሽያጭዎን ይመዝግቡ'
      : 'Start your day — record your first sale',
    action: 'sale',
    actionLabel: (lang) => lang === 'am' ? 'ሽያጭ መዝግብ' : 'Record a Sale',
  },
  {
    id: 'no_sales',
    condition: (sales, expenses, period, bestSeller, overdueCount) =>
      sales === 0 && period !== 'morning',
    icon: '💰',
    getMessage: (lang) => lang === 'am'
      ? 'ዛሬ ሽያጭ አልተመዘገበም — ይጨምሩ?'
      : 'No sales recorded today — add one?',
    action: 'sale',
    actionLabel: (lang) => lang === 'am' ? 'ሽያጭ ምዝግብ' : 'Record a Sale',
  },
  {
    id: 'no_expenses',
    condition: (sales, expenses, period, bestSeller, overdueCount) =>
      sales > 0 && expenses === 0,
    icon: '🛒',
    getMessage: (lang) => lang === 'am'
      ? 'ዛሬ ወጪ አልተመዘገበም — ይጨምሩ?'
      : 'No expenses recorded today — add one?',
    action: 'expense',
    actionLabel: (lang) => lang === 'am' ? 'ወጪ ምዝግብ' : 'Record Expense',
  },
  {
    id: 'overdue_customers',
    condition: (sales, expenses, period, bestSeller, overdueCount) =>
      overdueCount > 0,
    icon: '📞',
    getMessage: (lang, count) => lang === 'am'
      ? `${count} ደንበኛ ይሄዳቸዋል — ያስታውሷቸው`
      : `${count} customer${count !== 1 ? 's' : ''} still owe — send a reminder`,
    action: 'credit',
    actionLabel: (lang) => lang === 'am' ? 'ተመልከት' : 'View',
  },
  {
    id: 'best_seller',
    condition: (sales, expenses, period, bestSeller, overdueCount) =>
      sales >= 3 && bestSeller,
    icon: '🏆',
    getMessage: (lang, count, name) => lang === 'am'
      ? `${name} ዛሬ በብዛት ተሽጧል — ${count} ጊዜ`
      : `${name} is your best seller today — ${count} time${count !== 1 ? 's' : ''}`,
    action: null,
    actionLabel: null,
  },
  {
    id: 'count_cash',
    condition: (sales, expenses, period, bestSeller, overdueCount) =>
      sales > 0 && (period === 'evening' || period === 'night'),
    icon: '💰',
    getMessage: (lang) => lang === 'am'
      ? 'ገንዘብ ገና አልተቆጠረም — ከመዝጋትዎ በፊት ይቁጠሩ'
      : 'Cash not counted yet — count before closing',
    action: null,
    actionLabel: null,
  },
  {
    id: 'close_shop',
    condition: (sales, expenses, period, bestSeller, overdueCount) =>
      sales > 0 && period === 'night',
    icon: '🏁',
    getMessage: (lang) => lang === 'am'
      ? 'ቀኑን ዝጋ — የዛሬን ምዝገባ ያጠናቅቁ'
      : 'Close the day — finalize today\'s records',
    action: null,
    actionLabel: null,
  },
];

export default function DailySuggestions({
  todayTransactions,
  period = 'afternoon',
  bestSeller = null,
  overdueCount = 0,
  onAction,
}) {
  const { lang } = useLang();

  const salesCount = todayTransactions.filter(tx => tx.type === 'sale').length;
  const expensesCount = todayTransactions.filter(tx => tx.type === 'expense').length;

  const suggestion = SUGGESTIONS.find(s => s.condition(
    salesCount, expensesCount, period,
    bestSeller, overdueCount
  ));

  if (!suggestion) return null;

  const message = suggestion.getMessage(lang, suggestion.id === 'best_seller' ? bestSeller.count : overdueCount, bestSeller?.name);

  return (
    <div
      className="flex items-center gap-3 animate-elastic"
      style={{
        background: '#fff',
        border: '1px solid var(--color-border, #ece6d6)',
        borderRadius: 12,
        padding: '10px 14px',
        boxShadow: '0 2px 8px -4px rgba(0,0,0,0.06)',
      }}
    >
      <span className="text-lg flex-shrink-0">{suggestion.icon}</span>
      <p className="flex-1 text-xs font-semibold leading-snug" style={{ color: '#4b5563' }}>
        {message}
      </p>
      {suggestion.action && (
        <button
          onClick={() => onAction(suggestion.action)}
          className="flex-shrink-0 press-scale"
          style={{
            padding: '7px 12px',
            border: 'none',
            borderRadius: 8,
            background: '#1B4332',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {suggestion.actionLabel(lang)}
        </button>
      )}
    </div>
  );
}
