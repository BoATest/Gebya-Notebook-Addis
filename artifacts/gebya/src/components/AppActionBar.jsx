import { Plus, Minus, ShoppingBag, RotateCw, Users, Truck, CreditCard, Wallet } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';

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

  const buttons = [
    { type: 'sale',    label: t.saleButton,    color: '#16a34a', icon: Plus        },
    { type: 'simple',  label: t.itemsButton,   color: '#d97706', icon: ShoppingBag },
    { type: 'expense', label: t.expenseButton,  color: '#dc2626', icon: Minus       },
    { type: 'credit',  label: t.creditButton,  color: '#2563eb', icon: RotateCw     },
  ];

  return (
    <div className="flex gap-1.5 sm:gap-2">
      {buttons.map(b => {
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
              background: pressed ? `${b.color}15` : '#ffffff',
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

function CreditListActionBar({ creditView, onAddCustomer, onAddSupplier }) {
  const { t } = useLang();

  if (creditView === 'customers') {
    return (
      <button
        onClick={onAddCustomer}
        className="w-full py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all press-scale"
        style={{
          background: '#1A66FF', border: 'none', borderRadius: 14,
          boxShadow: '0 6px 18px rgba(26,102,255,0.25)',
        }}
      >
        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2.5 }} />
        <span className="font-bold text-xs sm:text-sm truncate" style={{ color: '#ffffff', textTransform: 'uppercase' }}>
          {t.addCustomer}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onAddSupplier}
      className="w-full py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 sm:gap-2 transition-all press-scale"
      style={{
        background: '#dc2626', border: 'none', borderRadius: 14,
        boxShadow: '0 6px 18px rgba(220,38,38,0.25)',
      }}
    >
      <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2.5 }} />
      <span className="font-bold text-xs sm:text-sm truncate" style={{ color: '#ffffff', textTransform: 'uppercase' }}>
        {t.addSupplier}
      </span>
    </button>
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
        <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2.5 }} />
        <span className="font-bold text-xs sm:text-sm truncate" style={{ color: '#1a1a1a' }}>
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
        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#ffffff', strokeWidth: 2.5 }} />
        <span className="font-bold text-xs sm:text-sm truncate" style={{ color: Number(selectedCustomer.balance) > 0 ? '#1a1a1a' : '#374151' }}>
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
  creditView,
  customerSummaries,
  onCreditTap,
  onItemizedSaleTap,
  onSimpleSaleTap,
  onExpenseTap,
  onAddCustomer,
  onAddSupplier,
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
        style={{ bottom: '60px', background: '#ffffff', borderColor: '#e5e7eb' }}
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

  if (activeTab === 'credit' && !selectedCustomer && !selectedSupplier) {
    return (
      <div className="fixed left-0 right-0 max-w-md mx-auto z-30 px-3 py-2 border-t"
        style={{ bottom: '60px', background: '#ffffff', borderColor: '#e5e7eb' }}
      >
        <CreditListActionBar creditView={creditView} onAddCustomer={onAddCustomer} onAddSupplier={onAddSupplier} />
      </div>
    );
  }

  if (activeTab === 'credit' && selectedCustomer) {
    return (
      <div className="fixed left-0 right-0 max-w-md mx-auto z-30 px-3 py-2 border-t"
        style={{ bottom: '60px', background: '#ffffff', borderColor: '#e5e7eb' }}
      >
        <CreditDetailActionBar selectedCustomer={selectedCustomer} onAddCredit={onAddCredit} onRecordPayment={onRecordPayment} />
      </div>
    );
  }

  return null;
}
