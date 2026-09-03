import { Plus, Minus, ShoppingBag, RotateCw, NotebookPen } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';
import { usePermissionsStore } from '../stores/permissionsStore';

function TodayActionBar({
  customerSummaries,
  onCreditTap,
  onItemizedSaleTap,
  onSimpleSaleTap,
  onExpenseTap,
  pressedBtn,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  saleWorkspaceEnabled = false,
}) {
  const { t } = useLang();
  const canAddRecords = usePermissionsStore(s => s.hasPermission('can_add_records'));

  const legacyButtons = [
    { type: 'sale',    label: t.saleButton,    color: '#16a34a', icon: Plus        },
    { type: 'simple',  label: t.itemsButton,   color: '#d97706', icon: ShoppingBag },
    { type: 'expense', label: t.expenseButton,  color: '#dc2626', icon: Minus       },
    { type: 'credit',  label: t.creditButton,  color: '#2563eb', icon: RotateCw     },
  ];
  // Unified Sale Workspace (v1): the two sale buttons merge into ONE
  // "+ New Sale" (opens the full-screen workspace). The inline capture strip
  // on the Today tab covers the zero-tap simple-sale case. Expense and
  // standalone credit keep their buttons and their forms unchanged.
  const workspaceButtons = [
    { type: 'sale',    label: t.newSaleBtn || t.newSaleTitle, color: '#16a34a', icon: NotebookPen },
    { type: 'expense', label: t.expenseButton,  color: '#dc2626', icon: Minus       },
    { type: 'credit',  label: t.creditButton,  color: '#2563eb', icon: RotateCw     },
  ];
  const buttons = saleWorkspaceEnabled ? workspaceButtons : legacyButtons;
  // Staff without `can_add_records` (e.g. viewers) only get the customer-credit
  // action; business record entry is hidden.
  const visibleButtons = canAddRecords
    ? buttons
    : buttons.filter(b => b.type === 'credit');

  return (
    <div className="flex gap-1.5 sm:gap-2">
      {visibleButtons.map(b => {
        const pressed = pressedBtn === b.type;
        const Icon = b.icon;
        const handlers = {
          sale:    () => onItemizedSaleTap?.(),
          simple:  () => onSimpleSaleTap?.(),
          expense: () => onExpenseTap?.(),
          credit:  () => onCreditTap?.(),
        };
        return (
          <button
            key={b.type}
            onClick={handlers[b.type]}
            onPointerDown={() => onPointerDown?.(b.type)}
            onPointerUp={() => onPointerUp?.()}
            onPointerLeave={() => onPointerLeave?.()}
            onPointerCancel={() => onPointerCancel?.()}
            className="flex-1 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0"
            style={{
              background: pressed ? `${b.color}15` : 'var(--color-bg-white)',
              border: `1.5px solid ${b.color}`,
              borderRadius: 'var(--radius-md)',
              transform: pressed ? 'scale(0.98)' : 'none',
            }}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: b.color, strokeWidth: 2.5 }} />
            <span className="font-bold text-xs sm:text-sm truncate" style={{ color: b.color }}>{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AppActionBar({
  activeTab,
  selectedCustomer,
  selectedSupplier,
  customerSummaries,
  onCreditTap,
  onItemizedSaleTap,
  onSimpleSaleTap,
  onExpenseTap,
  onAddCredit,
  onRecordPayment,
  pressedBtn,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  saleWorkspaceEnabled = false,
}) {
  if (activeTab === 'today') {
    return (
      <div className="fixed left-0 right-0 z-30 px-3 py-2 border-t max-w-md mx-auto bottom-[60px] lg:max-w-none lg:left-64 lg:right-0 lg:bottom-0 lg:px-8"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border-light)', boxShadow: '0 -12px 32px -16px rgba(27,67,50,0.28)' }}
      >
        <TodayActionBar
          customerSummaries={customerSummaries}
          onCreditTap={onCreditTap}
          onItemizedSaleTap={onItemizedSaleTap}
          onSimpleSaleTap={onSimpleSaleTap}
          onExpenseTap={onExpenseTap}
          pressedBtn={pressedBtn}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onPointerCancel={onPointerCancel}
          saleWorkspaceEnabled={saleWorkspaceEnabled}
        />
      </div>
    );
  }

  // Credit-detail "You Gave / You Got" bar is rendered in-flow inside
  // CustomerDetail (see CustomerDetail.jsx Persistent actions section).
  return null;
}
