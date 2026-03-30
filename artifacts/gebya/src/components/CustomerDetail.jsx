import { ArrowLeft, Bell, Link2, MessageCircle, Phone, Plus, Wallet } from 'lucide-react';
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
}) {
  const { t } = useLang();
  if (!customer) return null;
  const hasTelegramConnection = !!customer.telegram_username;
  const isTelegramNotifyEnabled = hasTelegramConnection && customer.telegram_notify_enabled;

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
              {customer.telegram_username ? t.telegramConnectedHint : t.telegramConnectHint}
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
              {customer.telegram_username ? t.manageTelegram : t.connectTelegram}
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
              {hasTelegramConnection
                ? (isTelegramNotifyEnabled ? t.telegramNotifyEnabledState : t.telegramNotifyDisabledState)
                : t.telegramNotifyConnectFirst}
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

        {!hasTelegramConnection && (
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: '#b45309' }}>
            <Bell className="w-4 h-4" />
            <span>{t.telegramNotifyConnectFirst}</span>
          </div>
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
          className="p-4 font-black text-white min-h-[56px] flex items-center justify-center gap-2 press-scale"
          style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1B4332' }}
        >
          <Wallet className="w-5 h-5" />
          {t.recordPayment}
        </button>
      </div>

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

        {customer.transactions?.length ? (
          <div className="space-y-2">
            {customer.transactions.map((item) => {
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
                    <div className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                      {formatEthiopian(item.created_at)}
                      {!isPayment && item.due_date ? ` · ${t.due} ${formatEthiopian(item.due_date)}` : ''}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm" style={{ color: isPayment ? '#166534' : '#92400e' }}>
                      {isPayment ? '-' : '+'}
                      {fmt(item.amount || 0)} {t.birr}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            {t.noTransactionsYet}
          </p>
        )}
      </div>
    </div>
  );
}

export default CustomerDetail;
