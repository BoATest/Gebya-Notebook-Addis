import { useMemo, useState } from 'react';
import { ArrowLeft, Bell, Link2, MessageCircle, Pencil, Phone, Plus, RefreshCcw, Send, Wallet, X } from 'lucide-react';
import { fmt } from '../utils/numformat';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';
import { buildCustomerReminderMessage } from '../utils/customerReminder';
import { useLang } from '../context/LangContext';

function CustomerDetail({
  customer: propCustomer,
  onBack,
  onAddCredit,
  onRecordPayment,
  onToggleTelegramNotify,
  onOpenTelegramConnect,
  onResendTelegramUpdate,
  onEditTransaction,
  shopName,
}) {
  const { t } = useLang();
  const [manualReminderText, setManualReminderText] = useState('');
  const customer = propCustomer;

  if (!customer) return null;

  const hasLinkedBorrower = !!customer.telegramChatId || !!customer.telegram_chat_id;
  const hasManualTelegram = !!customer.telegramUsername || !!customer.telegram_username;
  const hasPendingLink = !hasLinkedBorrower && !!customer.telegram_link_requested_at;
  const isTelegramNotifyEnabled = hasLinkedBorrower && (customer.telegram_notify_enabled || customer.telegramNotifyEnabled);
  const hasCollectableBalance = Number(customer.currentBalance || customer.balance || 0) > 0;

  const transactions = customer.transactions || [];

  const buildReminderText = () => buildCustomerReminderMessage({
    customer,
    shopName,
  });

  const handleShareReminder = async () => {
    const text = buildReminderText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: t.shareReminder || 'Share reminder',
          text,
        });
        return;
      } catch {
        // Fall through to clipboard/manual copy when sharing is dismissed or blocked.
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Show the text below so the merchant can still copy it manually.
      }
    }

    setManualReminderText(text);
  };

  const historyRows = useMemo(() => {
    let runningBalance = 0;

    return [...transactions]
      .sort((a, b) => (
        (Number(a.created_at || a.createdAt) || 0) - (Number(b.created_at || b.createdAt) || 0)
        || (Number(a.updated_at || a.updatedAt) || 0) - (Number(b.updated_at || b.updatedAt) || 0)
        || (Number(a.id) || 0) - (Number(b.id) || 0)
      ))
      .map((item) => {
        const isPayment = item.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT || item.type === 'payment';
        runningBalance = isPayment
          ? runningBalance - Number(item.amount || 0)
          : runningBalance + Number(item.amount || 0);

        return {
          ...item,
          balance_after: runningBalance,
        };
      });
  }, [transactions]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 min-h-[44px] -ml-1 press-scale"
        style={{ color: '#1B4332' }}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-semibold">{t.backToCustomers || 'Back to customers'}</span>
      </button>

      <div
        className="p-5 border"
        style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              {customer.displayName || customer.display_name}
            </h2>
            {customer.note && (
              <p className="text-sm mt-2" style={{ color: '#6b7280' }}>
                {customer.note}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              Remaining balance
            </p>
            <p className="text-2xl font-black" style={{ color: '#92400e' }}>
              {fmt(customer.currentBalance || customer.balance || 0)} {t.birr || 'birr'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 mt-4">
          {(customer.phoneNumber || customer.phone_number) && (
            <a
              href={`tel:${customer.phoneNumber || customer.phone_number}`}
              className="flex items-center gap-2 p-3 min-h-[48px] border"
              style={{ background: '#fafafa', borderColor: '#e5e7eb', borderRadius: 'var(--radius-md)', color: '#374151' }}
            >
              <Phone className="w-4 h-4" />
              {customer.phoneNumber || customer.phone_number}
            </a>
          )}
          {(customer.telegramUsername || customer.telegram_username) && (
            <div
              className="flex items-center gap-2 p-3 min-h-[48px] border"
              style={{ background: '#f0f9ff', borderColor: '#bae6fd', borderRadius: 'var(--radius-md)', color: '#0369a1' }}
            >
              <MessageCircle className="w-4 h-4" />
              {customer.telegramUsername || customer.telegram_username}
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
            <p className="text-sm font-black text-gray-900">{t.telegramConnection || 'Telegram Connection'}</p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {hasLinkedBorrower
                ? (t.telegramBorrowerUpdatesLinked || 'Receive updates via Telegram')
                : hasPendingLink
                  ? (t.telegramBorrowerLinkWaiting || 'Waiting for customer to connect')
                  : hasManualTelegram
                    ? (t.telegramManualSavedNotLinked || 'Telegram saved but not linked')
                    : (t.telegramConnectHint || 'Connect Telegram for updates')}
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
              {hasLinkedBorrower || hasPendingLink || hasManualTelegram
                ? (t.manageTelegram || 'Manage')
                : (t.connectTelegram || 'Connect')}
            </span>
          </button>
        </div>

        <div
          className="flex items-center justify-between gap-3 p-3 border"
          style={{ background: isTelegramNotifyEnabled ? '#f0fdf4' : '#fafafa', borderColor: isTelegramNotifyEnabled ? '#bbf7d0' : '#e5e7eb', borderRadius: 'var(--radius-md)' }}
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">{t.notifyOnTelegram || 'Notify on Telegram'}</p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {hasLinkedBorrower
                ? (isTelegramNotifyEnabled
                    ? (t.telegramNotifyEnabledState || 'Notifications enabled')
                    : (t.telegramNotifyDisabledState || 'Notifications disabled'))
                : hasPendingLink
                  ? (t.telegramBorrowerNeedsBotStart || 'Customer needs to start the bot')
                  : hasManualTelegram
                    ? (t.telegramDraftUntilLinked || 'Draft until linked')
                    : (t.telegramLinkBeforeUpdates || 'Link Telegram first')}
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTelegramNotify}
            className={`w-11 h-6 rounded-full transition-colors ${isTelegramNotifyEnabled ? 'bg-green-900' : 'bg-gray-300'}`}
            style={{ padding: '2px', flexShrink: 0 }}
            aria-label={t.notifyOnTelegram || 'Toggle Telegram notifications'}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isTelegramNotifyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {!hasLinkedBorrower && (
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#b45309' }}>
            <Bell className="w-4 h-4" />
            <span>{hasPendingLink ? (t.telegramBorrowerNotStarted || 'Customer has not started the bot') : (t.telegramNotifyConnectFirst || 'Connect Telegram first')}</span>
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
            {t.telegramResendLatestUpdate || 'Resend latest update'}
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
          {t.addCredit || 'Add Credit'}
        </button>
        <button
          type="button"
          onClick={onRecordPayment}
          disabled={!hasCollectableBalance}
          className="p-4 font-black text-white min-h-[56px] flex items-center justify-center gap-2 press-scale disabled:opacity-45 disabled:cursor-not-allowed"
          style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)', boxShadow: hasCollectableBalance ? '0 4px 0 #1B4332' : 'none' }}
        >
          <Wallet className="w-5 h-5" />
          {t.recordPayment || 'Record Payment'}
        </button>
      </div>

      {!hasCollectableBalance && (
        <p className="text-xs font-medium -mt-1" style={{ color: '#6b7280' }}>
          {t.noBalanceToRecordPayment || 'No balance to record payment'}
        </p>
      )}

      {hasCollectableBalance && (
        <button
          type="button"
          onClick={handleShareReminder}
          className="w-full p-3 text-sm font-black flex items-center justify-center gap-2 border press-scale"
          style={{ background: '#fff7ed', color: '#9a3412', borderColor: '#fed7aa', borderRadius: 'var(--radius-md)' }}
        >
          <Send className="w-4 h-4" />
          {t.shareReminder || 'Share reminder'}
        </button>
      )}

      <div
        className="p-4 border"
        style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: '#1B4332' }}>
            Notebook history
          </h3>
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            {transactions.length} {(t.entries || 'entries')}
          </span>
        </div>

        {historyRows.length ? (
          <div className="space-y-2">
            {historyRows.map((item) => {
              const isPayment = item.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT || item.type === 'payment';
              const entryColor = isPayment ? '#166534' : '#92400e';
              const entryBorder = isPayment ? '#bbf7d0' : '#fde68a';
              const entryBackground = isPayment ? '#f0fdf4' : '#fffbeb';
              const entryLabel = isPayment ? (t.paymentRecordedLabel || 'Payment recorded') : (t.creditAddedLabel || 'Credit added');
              const signedAmount = `${isPayment ? '-' : '+'}${fmt(item.amount || 0)} ${t.birr || 'birr'}`;
              return (
                <div
                  key={item.id}
                  className="p-3 border"
                  style={{
                    background: entryBackground,
                    borderColor: entryBorder,
                    borderLeft: `4px solid ${entryColor}`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-black text-sm leading-tight" style={{ color: entryColor }}>
                      {entryLabel}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="font-black text-sm leading-tight text-right" style={{ color: entryColor }}>
                        {signedAmount}
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditTransaction?.(item)}
                        className="p-1.5 flex items-center justify-center border press-scale"
                        style={{ minWidth: '36px', minHeight: '36px', borderRadius: 'var(--radius-sm)', borderColor: '#e8e2d8', background: '#fff' }}
                        aria-label={t.editEntry || 'Edit'}
                      >
                        <Pencil className="w-3.5 h-3.5" style={{ color: '#C4883A' }} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-start justify-between gap-3 text-xs" style={{ color: '#4b5563' }}>
                    <p className="font-semibold leading-snug min-w-0 truncate">
                      {item.itemNote || item.item_note || (isPayment ? 'Payment received' : 'No item note')}
                    </p>
                    <p className="leading-snug flex-shrink-0 text-right" style={{ color: '#6b7280' }}>
                      {formatEthiopian(item.createdAt || item.created_at)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" style={{ color: '#6b7280' }}>
                    {!isPayment && (item.dueDate || item.due_date) ? (
                      <span>Return date: {formatEthiopian(item.dueDate || item.due_date)}</span>
                    ) : null}
                    {(item.reference || item.reference_code) ? <span style={{ color: '#9ca3af' }}>Ref {item.reference || item.reference_code}</span> : null}
                    {(item.actor_name_snapshot) ? <span style={{ color: '#9ca3af' }}>By {item.actor_name_snapshot}</span> : null}
                  </div>
                  <p className="mt-1 text-[11px] font-bold" style={{ color: '#6b7280' }}>
                    Balance after: {fmt(item.balance_after || 0)} {t.birr || 'birr'}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {t.noTransactionsYet || 'No transactions yet'}
            </p>
            <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
              {t.noTransactionsHint || 'Add credit or record payments to see history'}
            </p>
          </div>
        )}
      </div>

      {manualReminderText && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade">
          <div className="bg-white w-full max-w-md p-5 space-y-4" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900">{t.copyReminder || 'Copy reminder'}</h3>
                <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                  {t.copyReminderHint || 'Copy this message and send it using any app.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualReminderText('')}
                aria-label={t.close || 'Close'}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center press-scale"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <textarea
              value={manualReminderText}
              readOnly
              rows={7}
              className="w-full p-3 border-2 focus:outline-none text-sm resize-none"
              style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default CustomerDetail;
