import { useMemo } from 'react';
import { ArrowLeft, Bell, Link2, MessageCircle, Pencil, Phone, Plus, RefreshCcw, Wallet } from 'lucide-react';
import { fmt } from '../utils/numformat';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';
import { useLang } from '../context/LangContext';

function CustomerDetail({
  customer,
  onBack,
  onAddCredit,
  onRecordPayment,
  onToggleTelegramNotify,
  onOpenTelegramConnect,
  onResendTelegramUpdate,
  onEditTransaction,
}) {
  const { t } = useLang();
  if (!customer) return null;

  const hasLinkedBorrower = !!customer.telegram_chat_id;
  const hasManualTelegram = !!customer.telegram_username;
  const hasPendingLink = !hasLinkedBorrower && !!customer.telegram_link_requested_at;
  const isTelegramNotifyEnabled = hasLinkedBorrower && customer.telegram_notify_enabled;
  const hasCollectableBalance = Number(customer.balance || 0) > 0;
  const historyRows = useMemo(() => {
    let runningBalance = Number(customer.balance || 0);

    return (customer.transactions || []).map((item) => {
      const balanceAfter = runningBalance;
      runningBalance = item.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT
        ? runningBalance + Number(item.amount || 0)
        : runningBalance - Number(item.amount || 0);

      return {
        ...item,
        balance_after: balanceAfter,
      };
    });
  }, [customer]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 min-h-[44px] -ml-1 press-scale"
        style={{ color: '#1B4332' }}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-semibold">{t.backToCustomers}</span>
      </button>

      <div
        className="p-5 border"
        style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{customer.display_name}</h2>
            {customer.note && (
              <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
                {customer.note}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              {t.currentBalance}
            </p>
            <p className="text-2xl font-black" style={{ color: '#92400e' }}>
              {fmt(customer.balance || 0)} {t.birr}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 mt-4">
          {customer.phone_number && (
            <a
              href={`tel:${customer.phone_number}`}
              className="flex items-center gap-2 p-3 min-h-[48px] border"
              style={{ background: '#fafafa', borderColor: '#e5e7eb', borderRadius: 'var(--radius-md)', color: '#374151' }}
            >
              <Phone className="w-4 h-4" />
              {customer.phone_number}
            </a>
          )}
          {customer.telegram_username && (
            <div
              className="flex items-center gap-2 p-3 min-h-[48px] border"
              style={{ background: '#f0f9ff', borderColor: '#bae6fd', borderRadius: 'var(--radius-md)', color: '#0369a1' }}
            >
              <MessageCircle className="w-4 h-4" />
              {customer.telegram_username}
            </div>
          )}
        </div>
      </div>

      <div
        className="p-4 border space-y-3"
        style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-gray-900">{t.telegramConnection}</p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {hasLinkedBorrower
                ? ' Borrower updates are linked to the Gebya bot.'
                : hasPendingLink
                  ? ' Borrower link is waiting for the bot start.'
                  : hasManualTelegram
                    ? ' Manual Telegram contact is saved, but bot updates are not linked yet.'
                    : t.telegramConnectHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTelegramConnect}
            className="px-3 py-2 text-sm font-black min-h-[44px] border press-scale"
            style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', borderRadius: 'var(--radius-sm)' }}
          >
            <span className="inline-flex items-center gap-1">
              <Link2 className="w-4 h-4" />
              {hasLinkedBorrower || hasPendingLink || hasManualTelegram ? t.manageTelegram : t.connectTelegram}
            </span>
          </button>
        </div>

        <div
          className="flex items-center justify-between gap-3 p-3 border"
          style={{ background: isTelegramNotifyEnabled ? '#f0fdf4' : '#fafafa', borderColor: isTelegramNotifyEnabled ? '#bbf7d0' : '#e5e7eb', borderRadius: 'var(--radius-md)' }}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">{t.notifyOnTelegram}</p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {hasLinkedBorrower
                ? (isTelegramNotifyEnabled ? t.telegramNotifyEnabledState : t.telegramNotifyDisabledState)
                : hasPendingLink
                  ? 'Borrower still needs to start the Gebya bot before updates can send.'
                  : hasManualTelegram
                    ? 'Updates can open as a drafted Telegram message until the borrower links the Gebya bot.'
                    : 'Link the borrower to the Gebya bot before turning updates on.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTelegramNotify}
            className={`w-11 h-6 rounded-full transition-colors ${isTelegramNotifyEnabled ? 'bg-green-900' : 'bg-gray-300'}`}
            style={{ padding: '2px', flexShrink: 0 }}
            aria-label={t.notifyOnTelegram}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isTelegramNotifyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {!hasLinkedBorrower && (
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#b45309' }}>
            <Bell className="w-4 h-4" />
            <span>{hasPendingLink ? 'Borrower has not started the bot yet.' : t.telegramNotifyConnectFirst}</span>
          </div>
        )}

        {hasLinkedBorrower && (
          <button
            type="button"
            onClick={onResendTelegramUpdate}
            className="w-full p-3 text-sm font-black flex items-center justify-center gap-2 border press-scale"
            style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', borderRadius: 'var(--radius-md)' }}
          >
            <RefreshCcw className="w-4 h-4" />
            Resend latest update
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onAddCredit}
          className="p-4 font-black text-white min-h-[56px] flex items-center justify-center gap-2 press-scale"
          style={{ background: '#C4883A', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #96662b' }}
        >
          <Plus className="w-5 h-5" />
          {t.addCredit}
        </button>
        <button
          type="button"
          onClick={onRecordPayment}
          disabled={!hasCollectableBalance}
          className="p-4 font-black text-white min-h-[56px] flex items-center justify-center gap-2 press-scale disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)', boxShadow: hasCollectableBalance ? '0 4px 0 #1B4332' : 'none' }}
        >
          <Wallet className="w-5 h-5" />
          {t.recordPayment}
        </button>
      </div>

      {!hasCollectableBalance && (
        <p className="text-xs font-medium -mt-1" style={{ color: '#6b7280' }}>
          {t.noBalanceToRecordPayment}
        </p>
      )}

      <div
        className="p-4 border"
        style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: '#1B4332' }}>
            {t.customerTransactionHistory}
          </h3>
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            {(customer.transaction_count || 0)} {t.entries}
          </span>
        </div>

        {historyRows.length ? (
          <div className="space-y-2">
            {historyRows.map((item) => {
              const isPayment = item.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 p-3 border"
                  style={{
                    background: isPayment ? '#f0fdf4' : '#fffbeb',
                    borderColor: isPayment ? '#bbf7d0' : '#fde68a',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm" style={{ color: isPayment ? '#166534' : '#92400e' }}>
                      {isPayment ? t.paymentRecordedLabel : t.creditAddedLabel}
                    </p>
                    {item.item_note && (
                      <p className="text-sm mt-1" style={{ color: '#4b5563' }}>
                        {item.item_note}
                      </p>
                    )}
                    <div className="text-xs mt-1 flex flex-wrap gap-x-2 gap-y-1" style={{ color: '#9ca3af' }}>
                      <span>{formatEthiopian(item.created_at)}</span>
                      {!isPayment && item.due_date ? <span>{t.dueLabelShort}: {formatEthiopian(item.due_date)}</span> : null}
                      {item.reference_code ? <span>{item.reference_code}</span> : null}
                      <span>{t.balanceAfterEntry}: {fmt(item.balance_after || 0)} {t.birr}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-black text-sm" style={{ color: isPayment ? '#166534' : '#92400e' }}>
                        {isPayment ? '-' : '+'}
                        {fmt(item.amount || 0)} {t.birr}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditTransaction?.(item)}
                      className="p-2 flex items-center justify-center border press-scale"
                      style={{ minWidth: '40px', minHeight: '40px', borderRadius: 'var(--radius-sm)', borderColor: '#e8e2d8', background: '#fff' }}
                      aria-label={t.editEntry}
                    >
                      <Pencil className="w-4 h-4" style={{ color: '#C4883A' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {t.noTransactionsYet}
            </p>
            <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
              {t.noTransactionsHint}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerDetail;
