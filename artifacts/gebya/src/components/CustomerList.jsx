import { useMemo, useState } from 'react';
import { Bell, Plus, Search, Users, X } from 'lucide-react';
import { fmt } from '../utils/numformat';
import { useLang } from '../context/LangContext';
import { getCustomerCollectionStatus } from '../utils/customerLedger';
import { buildCustomerReminderMessage } from '../utils/customerReminder';
import CustomerForm from './CustomerForm';

const RETURN_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'money', label: 'Money to receive' },
  { id: 'return_today', label: 'Return today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'no_date', label: 'No return date' },
];

function getCustomerName(customer) {
  return customer.display_name || customer.displayName || '';
}

function getCustomerNote(customer) {
  return customer.note || '';
}

function getCustomerPhone(customer) {
  return customer.phone_number || customer.phoneNumber || '';
}

function getCustomerTelegram(customer) {
  return customer.telegram_username || customer.telegramUsername || '';
}

function getCustomerBalance(customer) {
  return Number(customer.balance ?? customer.currentBalance ?? 0);
}

function getCustomerStatus(customer) {
  return customer.collection_status || getCustomerCollectionStatus(customer);
}

function getCollectionStatusText(customer, t) {
  const balance = getCustomerBalance(customer);
  const status = getCustomerStatus(customer);
  const owesText = `${t.customerOwesPrefix || 'Owes'} ${fmt(balance)} birr`;

  if (!status.hasBalance) return '';
  if (status.key === 'due_today') return `${owesText} - ${t.dueToday || 'Return today'}`;
  if (status.key === 'overdue') {
    const dayLabel = status.days === 1 ? (t.day || 'day') : (t.days || 'days');
    return `${owesText} - ${t.overdueBy || 'Overdue by'} ${status.days} ${dayLabel}`;
  }
  if (status.key === 'due_in') {
    const dayLabel = status.days === 1 ? (t.day || 'day') : (t.days || 'days');
    return `${owesText} - ${t.dueIn || 'Return in'} ${status.days} ${dayLabel}`;
  }
  return `${owesText} - ${t.noDueDate || 'No return date'}`;
}

function matchesCustomer(customer, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    getCustomerName(customer),
    getCustomerNote(customer),
    getCustomerPhone(customer),
    getCustomerTelegram(customer),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function buildQuickReminderMessage(customer, shopName) {
  return buildCustomerReminderMessage({ customer, shopName });
}

function CustomerList({ customers = [], onSelectCustomer, onAddCustomer, shopName }) {
  const [query, setQuery] = useState('');
  const [returnFilter, setReturnFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [reminderTarget, setReminderTarget] = useState(null);
  const [copied, setCopied] = useState(false);
  const { t } = useLang();

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => {
      if (!matchesCustomer(customer, query)) return false;
      const status = getCustomerStatus(customer);
      if (returnFilter === 'money') return status.hasBalance;
      if (returnFilter === 'return_today') return status.key === 'due_today';
      if (returnFilter === 'overdue') return status.key === 'overdue';
      if (returnFilter === 'no_date') return status.key === 'no_due_date';
      return true;
    }),
    [returnFilter, customers, query]
  );

  const outstanding = useMemo(
    () => filteredCustomers.reduce((sum, customer) => sum + getCustomerBalance(customer), 0),
    [filteredCustomers]
  );

  const customersWithBalance = useMemo(
    () => filteredCustomers.filter((customer) => getCustomerBalance(customer) > 0).length,
    [filteredCustomers]
  );

  const searchSummary = t.customerSearchResults
    ? t.customerSearchResults
        .replace('{shown}', String(filteredCustomers.length))
        .replace('{total}', String(customers.length))
    : `${filteredCustomers.length} of ${customers.length}`;

  const handleAddCustomer = async (payload) => {
    setSaveError(false);
    const saved = await onAddCustomer?.(payload);
    if (saved) {
      setShowForm(false);
      return true;
    }
    setSaveError(true);
    return false;
  };

  const handleSendReminder = async (customer) => {
    setReminderTarget(customer);
    const message = buildQuickReminderMessage(customer, shopName);
    const hasPhone = Boolean(getCustomerPhone(customer));
    const hasTelegram = Boolean(getCustomerTelegram(customer));
    const safeShopName = shopName || 'your shop';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Reminder from ${safeShopName}`,
          text: message,
        });
        setReminderTarget(null);
        return;
      } catch {
      }
    }

if (hasPhone) {
       const encodedBody = encodeURIComponent(message);
       window.open(`sms:?body=${encodedBody}`, '_blank', 'noopener,noreferrer');
       setReminderTarget(null);
       return;
     }

     if (hasTelegram) {
       const telegram = getCustomerTelegram(customer);
       const normalized = telegram.startsWith('@') ? telegram.slice(1) : telegram;
       const encoded = encodeURIComponent(message);
       window.open(`https://t.me/${normalized}?text=${encoded}`, '_blank', 'noopener,noreferrer');
      setReminderTarget(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => { setCopied(false); setReminderTarget(null); }, 2500);
    } catch {
      setReminderTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="p-4 border"
        style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide font-bold" style={{ color: '#9ca3af' }}>
              {t.customerTotalBalance || 'Total Balance'}
            </p>
            <p className="text-xl font-black" style={{ color: '#92400e' }}>
              {fmt(outstanding)} birr
            </p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {customersWithBalance} {t.customerBalance || 'with balance'}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-2 text-sm font-black text-white min-h-[44px] press-scale"
            style={{ background: '#1B4332', borderRadius: 'var(--radius-sm)' }}
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <Plus className="w-4 h-4" /> {t.addCustomer || 'Add Customer'}
            </span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9ca3af' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchCustomerPlaceholder || 'Search customers...'}
          autoCapitalize="words"
          className="w-full pl-9 pr-4 py-3 text-sm bg-white border outline-none"
          style={{ borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
        />
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {RETURN_FILTERS.map((filter) => {
          const active = returnFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setReturnFilter(filter.id)}
              className="px-1.5 py-2 text-[11px] font-black min-h-[40px] border press-scale"
              style={{
                background: active ? '#1B4332' : '#fff',
                color: active ? '#fff' : '#374151',
                borderColor: active ? '#1B4332' : 'var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs" style={{ color: '#6b7280' }}>
          {hasQuery ? searchSummary : t.customerSearchHint || `${customers.length} customers`}
        </p>
        {hasQuery && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-xs font-bold min-h-[32px] px-2"
            style={{ color: '#1B4332' }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => onSelectCustomer?.(customer)}
            className="w-full text-left p-4 border press-scale cursor-pointer"
            style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCustomer?.(customer); } }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">{getCustomerName(customer)}</p>
                {getCustomerBalance(customer) > 0 && (
                  <p className="text-sm mt-1 font-bold" style={{ color: getCustomerStatus(customer).isDueNow ? '#b45309' : '#92400e' }}>
                    {getCollectionStatusText(customer, t)}
                  </p>
                )}
                {getCustomerNote(customer) && (
                  <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                    {getCustomerNote(customer)}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs" style={{ color: '#9ca3af' }}>
                  {getCustomerPhone(customer) && <span>{getCustomerPhone(customer)}</span>}
                  {getCustomerTelegram(customer) && <span>{getCustomerTelegram(customer)}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
                  Balance
                </p>
                <p className="text-lg font-black" style={{ color: '#92400e' }}>
                  {fmt(getCustomerBalance(customer))} birr
                </p>
                {getCustomerBalance(customer) > 0 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSendReminder(customer); }}
                    className="mt-1 p-1.5 flex items-center justify-center border press-scale"
                    style={{ minWidth: '32px', minHeight: '32px', borderRadius: 'var(--radius-sm)', borderColor: '#e8e2d8', background: '#fff' }}
                    aria-label="Send reminder"
                  >
                    <Bell className="w-3.5 h-3.5" style={{ color: '#C4883A' }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div
            className="flex flex-col items-center justify-center text-center py-10 border"
            style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }}
          >
            <Users className="w-8 h-8 mb-2" style={{ color: '#d1d5db' }} />
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              {customers.length === 0
                ? (t.noCustomersYet || 'No customers yet')
                : (hasQuery || collectionFilter !== 'all' ? (t.noCustomerSearchResults || 'No matches found') : (t.noCustomersFound || 'No customers'))}
            </p>
            <p className="text-xs mt-2 max-w-xs" style={{ color: '#6b7280' }}>
              {customers.length === 0
                ? (t.customerHelperText || 'Add your first customer to start tracking credit')
                : (returnFilter === 'return_today'
                  ? (t.noReturnTodayHint || 'No customers are due today')
                  : (returnFilter === 'overdue'
                    ? (t.noOverdueHint || 'No overdue customers')
                    : (returnFilter === 'no_date'
                      ? (t.noNoDateHint || 'All customers with balance have a return date')
                      : (t.customerSearchHint || 'Try a different search term'))))}
            </p>
          </div>
        )}
      </div>

      {reminderTarget && !copied && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade"
          onClick={(e) => { if (e.target === e.currentTarget) setReminderTarget(null); }}
        >
          <div
            className="bg-white w-full max-w-md max-h-[80vh] overflow-y-auto animate-slide-up"
            style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', borderColor: 'var(--color-border-light)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide font-black" style={{ color: '#C4883A' }}>
                    Reminder
                  </p>
                  <h2 className="text-lg font-black text-gray-900">Send reminder to {getCustomerName(reminderTarget)}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setReminderTarget(null)}
                  aria-label="Close"
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center press-scale"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {getCustomerPhone(reminderTarget) && (
                <button
                  type="button"
                  onClick={() => { handleSendReminder(reminderTarget); }}
                  className="w-full p-3 font-black text-white min-h-[52px] flex items-center justify-center gap-2 press-scale"
                  style={{ background: '#166534', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #14532d' }}
                >
                  Send SMS
                </button>
              )}
              {getCustomerTelegram(reminderTarget) && (
                <button
                  type="button"
                  onClick={() => { handleSendReminder(reminderTarget); }}
                  className="w-full p-3 font-black text-white min-h-[52px] flex items-center justify-center gap-2 press-scale"
                  style={{ background: '#2481cc', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1a5f94' }}
                >
                  Send via Telegram
                </button>
              )}
              <button
                type="button"
                onClick={() => { handleSendReminder(reminderTarget); }}
                className="w-full p-3 font-black text-white min-h-[52px] flex items-center justify-center gap-2 press-scale"
                style={{ background: '#374151', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1f2937' }}
              >
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={() => setReminderTarget(null)}
                className="w-full p-3 font-semibold text-sm min-h-[44px] flex items-center justify-center"
                style={{ color: '#6b7280', borderRadius: 'var(--radius-md)' }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderTarget && copied && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade">
          <div
            className="bg-white w-full max-w-md p-6 animate-slide-up text-center"
            style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}
          >
            <p className="text-3xl mb-2">Copied</p>
            <p className="text-sm" style={{ color: '#6b7280' }}>Reminder text copied. Send it to {getCustomerName(reminderTarget)} using any app.</p>
            <button
              type="button"
              onClick={() => { setReminderTarget(null); setCopied(false); }}
              className="mt-4 w-full p-3 font-black text-white min-h-[52px] press-scale"
              style={{ background: '#1B4332', borderRadius: 'var(--radius-md)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <CustomerForm
          onSave={handleAddCustomer}
          onDone={() => setShowForm(false)}
        />
      )}

      {saveError && (
        <p className="text-center text-xs font-bold" style={{ color: '#dc2626' }}>
          {t.customerSaveFailed || 'Could not save customer. Please try again.'}
        </p>
      )}
    </div>
  );
}

export default CustomerList;
