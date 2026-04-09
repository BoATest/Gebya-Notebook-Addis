import { useLang } from '../context/LangContext';

const SUGGESTIONS_EN = [
  {
    id: 'great_streak_no_sales',
    condition: (sales, expenses, streak) => streak >= 3 && sales === 0,
    icon: '🔥',
    message: (sales, expenses, streak) => `Great ${streak}-day streak! Keep it going — record today's sales`,
    action: 'sale',
    actionLabel: 'Record a Sale',
  },
  {
    id: 'no_sales',
    condition: (sales) => sales === 0,
    icon: '💰',
    message: () => "No sales recorded today — add one?",
    action: 'sale',
    actionLabel: 'Record a Sale',
  },
  {
    id: 'no_expenses',
    condition: (sales, expenses) => sales > 0 && expenses === 0,
    icon: '🛒',
    message: () => "No expenses recorded today — add one?",
    action: 'expense',
    actionLabel: 'Record Expense',
  },
];

const SUGGESTIONS_AM = [
  {
    id: 'great_streak_no_sales',
    condition: (sales, expenses, streak) => streak >= 3 && sales === 0,
    icon: '🔥',
    message: (sales, expenses, streak) => `${streak} ቀን ተከታታይ! ቀጥሉ — የዛሬ ሽያጭ ይምዝግቡ`,
    action: 'sale',
    actionLabel: 'ሽያጭ ምዝግብ',
  },
  {
    id: 'no_sales',
    condition: (sales) => sales === 0,
    icon: '💰',
    message: () => "ዛሬ ሽያጭ አልተመዘገበም — ይጨምሩ?",
    action: 'sale',
    actionLabel: 'ሽያጭ ምዝግብ',
  },
  {
    id: 'no_expenses',
    condition: (sales, expenses) => sales > 0 && expenses === 0,
    icon: '🛒',
    message: () => "ዛሬ ወጪ አልተመዘገበም — ይጨምሩ?",
    action: 'expense',
    actionLabel: 'ወጪ ምዝግብ',
  },
];

export default function DailySuggestions({ todayTransactions, streak = 1, onAction }) {
  const { lang } = useLang();
  const suggestions = lang === 'am' ? SUGGESTIONS_AM : SUGGESTIONS_EN;

  const salesCount = todayTransactions.filter(tx => tx.type === 'sale').length;
  const expensesCount = todayTransactions.filter(tx => tx.type === 'expense').length;

  const suggestion = suggestions.find(s => s.condition(salesCount, expensesCount, streak));

  if (!suggestion) return null;

  const message = suggestion.message(salesCount, expensesCount, streak);

  return (
    <div
      className="animate-elastic px-4 py-3"
      style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex-shrink-0 text-2xl">{suggestion.icon}</span>
          <p className="flex-1 text-sm font-medium leading-snug text-gray-600 font-sans">{message}</p>
        </div>
        <button
          onClick={() => onAction(suggestion.action)}
          className="w-full flex-shrink-0 px-3 py-2.5 text-xs font-bold text-white transition-all press-scale font-sans sm:w-auto"
          style={{ background: '#1B4332', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-xs)' }}
        >
          {suggestion.actionLabel}
        </button>
      </div>
    </div>
  );
}
