import { useLang } from '../context/LangContext';

const SUGGESTIONS_EN = [
  {
    id: 'great_streak_no_sales',
    condition: (sales, expenses, streak) => streak >= 3 && sales === 0,
    icon: 'ðŸ”¥',
    message: (sales, expenses, streak) => `Great ${streak}-day streak! Keep it going â€” record today's sales`,
    action: 'sale',
    actionLabel: 'Record a Sale',
  },
  {
    id: 'no_sales',
    condition: (sales) => sales === 0,
    icon: 'ðŸ’°',
    message: () => "No sales recorded today â€” add one?",
    action: 'sale',
    actionLabel: 'Record a Sale',
  },
  {
    id: 'no_expenses',
    condition: (sales, expenses) => sales > 0 && expenses === 0,
    icon: 'ðŸ›’',
    message: () => "No expenses recorded today â€” add one?",
    action: 'expense',
    actionLabel: 'Record Expense',
  },
];

const SUGGESTIONS_AM = [
  {
    id: 'great_streak_no_sales',
    condition: (sales, expenses, streak) => streak >= 3 && sales === 0,
    icon: 'ðŸ”¥',
    message: (sales, expenses, streak) => `${streak} á‰€áŠ• á‰°áŠ¨á‰³á‰³á‹­! á‰€áŒ¥áˆ‰ â€” á‹¨á‹›áˆ¬ áˆ½á‹«áŒ­ á‹­áˆá‹áŒá‰¡`,
    action: 'sale',
    actionLabel: 'áˆ½á‹«áŒ­ áˆá‹áŒá‰¥',
  },
  {
    id: 'no_sales',
    condition: (sales) => sales === 0,
    icon: 'ðŸ’°',
    message: () => "á‹›áˆ¬ áˆ½á‹«áŒ­ áŠ áˆá‰°áˆ˜á‹˜áŒˆá‰ áˆ â€” á‹­áŒ¨áˆáˆ©?",
    action: 'sale',
    actionLabel: 'áˆ½á‹«áŒ­ áˆá‹áŒá‰¥',
  },
  {
    id: 'no_expenses',
    condition: (sales, expenses) => sales > 0 && expenses === 0,
    icon: 'ðŸ›’',
    message: () => "á‹›áˆ¬ á‹ˆáŒª áŠ áˆá‰°áˆ˜á‹˜áŒˆá‰ áˆ â€” á‹­áŒ¨áˆáˆ©?",
    action: 'expense',
    actionLabel: 'á‹ˆáŒª áˆá‹áŒá‰¥',
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
      className="px-4 py-3 flex flex-col items-stretch gap-3 min-[380px]:flex-row min-[380px]:items-center animate-elastic"
      style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
    >
      <span className="text-2xl flex-shrink-0">{suggestion.icon}</span>
      <p className="flex-1 text-sm text-gray-600 font-medium leading-snug font-sans">{message}</p>
      <button
        onClick={() => onAction(suggestion.action)}
        className="w-full min-[380px]:w-auto flex-shrink-0 px-3 py-2 text-xs font-bold text-white transition-all press-scale font-sans"
        style={{ background: '#1B4332', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-xs)' }}
      >
        {suggestion.actionLabel}
      </button>
    </div>
  );
}



