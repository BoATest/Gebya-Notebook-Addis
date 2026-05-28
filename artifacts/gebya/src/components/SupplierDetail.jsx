// SupplierDetail.jsx — per-supplier ledger (Khatabook-style "supplier credit")
// Shows: balance owed, list of purchases on credit + payments made, history.
// Actions: + Purchase on credit, + Pay supplier, Mark fully paid.
// No Telegram or Remind buttons — those are for chasing customers, not suppliers.
import { useMemo } from 'react';
import { ArrowLeft, CheckCircle2, Phone, Plus, Wallet } from 'lucide-react';
import { fmt } from '../utils/numformat';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { SUPPLIER_TRANSACTION_TYPES } from '../utils/supplierLedger';
import { useLang } from '../context/LangContext';

function SupplierDetail({
  supplier,
  onBack,
  onAddPurchase,
  onPaySupplier,
  onMarkFullyPaid,
}) {
  const { t, lang } = useLang();
  if (!supplier) return null;

  const hasBalance = Number(supplier.balance || 0) > 0;

  const historyRows = useMemo(() => {
    let runningBalance = Number(supplier.balance || 0);
    return (supplier.transactions || []).map((item) => {
      const balanceAfter = runningBalance;
      runningBalance = item.type === SUPPLIER_TRANSACTION_TYPES.PAYMENT
        ? runningBalance + Number(item.amount || 0)
        : runningBalance - Number(item.amount || 0);
      return { ...item, balance_after: balanceAfter };
    });
  }, [supplier]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 min-h-[44px] -ml-1 press-scale"
        style={{ color: 'var(--color-primary)' }}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-semibold">{lang === 'am' ? 'ወደ አቅራቢዎች ተመለስ' : 'Back to suppliers'}</span>
      </button>

      {/* Header card */}
      <div
        className="p-5 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{supplier.display_name}</h2>
            {supplier.note && (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>{supplier.note}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              {lang === 'am' ? 'ለመክፈል' : 'I owe'}
            </p>
            <p className="text-2xl font-black" style={{ color: hasBalance ? '#dc2626' : '#9ca3af' }}>
              {fmt(supplier.balance || 0)} {lang === 'am' ? 'ብር' : 'birr'}
            </p>
          </div>
        </div>

        {supplier.phone_number && (
          <a
            href={`tel:${supplier.phone_number}`}
            className="mt-4 flex items-center gap-2 p-3 min-h-[48px] border"
            style={{ background: 'var(--color-surface-muted)', borderColor: 'var(--color-border-light)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)' }}
          >
            <Phone className="w-4 h-4" />
            {supplier.phone_number}
          </a>
        )}
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAddPurchase}
          className="p-3 font-bold text-white text-sm min-h-[48px] flex items-center justify-center gap-1.5 press-scale"
          style={{ background: '#C4883A', borderRadius: 'var(--radius-md)' }}
        >
          <Plus className="w-4 h-4" />
          {lang === 'am' ? 'ግዢ በዱቤ' : 'Buy on credit'}
        </button>
        <button
          type="button"
          onClick={onPaySupplier}
          disabled={!hasBalance}
          className="p-3 font-bold text-white text-sm min-h-[48px] flex items-center justify-center gap-1.5 press-scale disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)' }}
        >
          <Wallet className="w-4 h-4" />
          {lang === 'am' ? 'ክፍያ' : 'Pay supplier'}
        </button>
      </div>

      {/* Mark fully paid */}
      {hasBalance && onMarkFullyPaid && (
        <button
          type="button"
          onClick={() => onMarkFullyPaid(supplier)}
          className="w-full p-3 font-bold text-sm min-h-[44px] flex items-center justify-center gap-2 border-2 press-scale"
          style={{
            background: '#f0fdf4',
            color: '#166534',
            borderColor: '#bbf7d0',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {lang === 'am'
            ? `ሙሉ ለሙሉ ተከፍሏል (${fmt(supplier.balance || 0)} ብር)`
            : `Mark fully paid (${fmt(supplier.balance || 0)} birr)`}
        </button>
      )}

      {!hasBalance && (
        <p className="text-xs font-medium -mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'am' ? 'የተከፈለ ዱቤ የለም' : 'No outstanding balance'}
        </p>
      )}

      {/* History */}
      <div
        className="p-4 border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-primary)' }}>
            {lang === 'am' ? 'መዝገብ' : 'History'}
          </h3>
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            {(supplier.transaction_count || 0)} {lang === 'am' ? 'መዝገብ' : 'entries'}
          </span>
        </div>

        {historyRows.length ? (
          <div className="space-y-2">
            {historyRows.map((item) => {
              const isPayment = item.type === SUPPLIER_TRANSACTION_TYPES.PAYMENT;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 p-3 border"
                  style={{
                    background: isPayment ? '#f0fdf4' : '#fef2f2',
                    borderColor: isPayment ? '#bbf7d0' : '#fecaca',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm" style={{ color: isPayment ? '#166534' : '#991b1b' }}>
                      {isPayment
                        ? (lang === 'am' ? 'ክፍያ ተከፍሏል' : 'Payment to supplier')
                        : (lang === 'am' ? 'ግዢ በዱቤ' : 'Bought on credit')}
                    </p>
                    {item.item_name && (
                      <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{item.item_name}</p>
                    )}
                    <div className="text-xs mt-1 flex flex-wrap gap-x-2 gap-y-1" style={{ color: '#9ca3af' }}>
                      <span>{formatEthiopian(item.created_at)}</span>
                      {item.actor_name_snapshot && <span>{lang === 'am' ? 'በ' : 'by'} {item.actor_name_snapshot}</span>}
                      <span>{lang === 'am' ? 'ቀሪ' : 'after'}: {fmt(item.balance_after || 0)} {lang === 'am' ? 'ብር' : 'birr'}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm" style={{ color: isPayment ? '#166534' : '#991b1b' }}>
                      {isPayment ? '-' : '+'}{fmt(item.amount || 0)} {lang === 'am' ? 'ብር' : 'birr'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {lang === 'am' ? 'መዝገብ የለም' : 'No entries yet'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'am'
                ? 'ከዚህ አቅራቢ ግዢዎችን ይመዝግቡ።'
                : 'Record what you buy on credit from this supplier.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SupplierDetail;
