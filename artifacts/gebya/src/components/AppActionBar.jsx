import { Plus, Minus, ShoppingBag, RotateCw, CreditCard, Wallet } from 'lucide-react';
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
}) {
  const { t } = useLang();
  const canAddRecords = usePermissionsStore(s => s.hasPermission('can_add_records'));

  const buttons = [
    { type: 'sale',    label: t.saleButton,    color: '#16a34a', icon: Plus        },
    { type: 'simple',  label: t.itemsButton,   color: '#d97706', icon: ShoppingBag },
    { type: 'expense', label: t.expenseButton,  color: '#dc2626', icon: Minus       },
    { type: 'credit',  label: t.creditButton,  color: '#2563eb', icon: RotateCw     },
  ];
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

function CreditDetailActionBar({ selectedCustomer, onAddCredit, onRecordPayment }) {
  const { t } = useLang();

  return (
    <div className="flex gap-1.5 sm:gap-2">
      <button
        onClick={onAddCredit}
        className="flex-1 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 press-scale"
        style={{ background: '#E75645', border: 'none', borderRadius: 14 }}
      >
        <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'var(--color-bg-white)', strokeWidth: 2.5 }} />
        <span className="font-bold text-xs sm:text-sm truncate" style={{ color: 'var(--color-text)' }}>
          {t.creditGave}
        </span>
      </button>
      <button
        onClick={onRecordPayment}
        disabled={!(Number(selectedCustomer.balance) > 0)}
        className="flex-1 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all min-w-0 press-scale"
        style={{
          background: '#2EAB6F', border: 'none', borderRadius: 14,
          opacity: Number(selectedCustomer.balance) > 0 ? 1 : 0.5,
        }}
      >
        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: 'var(--color-bg-white)', strokeWidth: 2.5 }} />
        <span className="font-bold text-xs sm:text-sm truncate" style={{ color: Number(selectedCustomer.balance) > 0 ? 'var(--color-text)' : 'var(--color-text)' }}>
          {t.creditGot}
        </span>
      </button>
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
}) {
  if (activeTab === 'today') {
    return (
      <div className="fixed left-0 right-0 max-w-md mx-auto z-30 px-3 py-2 border-t"
        style={{ bottom: '60px', background: 'var(--color-surface)', borderColor: 'var(--color-bg-disabled)' }}
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
        />
      </div>
    );
  }

  if (activeTab === 'credit' && selectedCustomer) {
    return (
      <div className="fixed left-0 right-0 max-w-md mx-auto z-30 px-3 py-2 border-t"
        style={{ bottom: '60px', background: 'var(--color-surface)', borderColor: 'var(--color-bg-disabled)' }}
      >
        <CreditDetailActionBar selectedCustomer={selectedCustomer} onAddCredit={onAddCredit} onRecordPayment={onRecordPayment} />
      </div>
    );
  }

  return null;
}
