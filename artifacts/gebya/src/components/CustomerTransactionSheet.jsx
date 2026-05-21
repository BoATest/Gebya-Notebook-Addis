import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp, Clock3, PackageCheck, Save, WalletCards, X } from 'lucide-react';
import { fmt, fmtInput, parseInput } from '../utils/numformat';
import { formatEthiopian, getDueDateOptions } from '../utils/ethiopianCalendar';
import { CUSTOMER_TRANSACTION_TYPES, isValidCustomerTransactionType } from '../utils/customerTransactionTypes';
import { useLang } from '../context/LangContext';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

function formatQuickAmount(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function handleNumericInput(e, setter) {
  let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  if (parts.length > 2) raw = `${parts[0]}.${parts.slice(1).join('')}`;
  setter(raw);
}

function CustomerTransactionSheet({
  customer,
  mode = CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD,
  existingTransaction = null,
  onSave,
  onUpdate,
  onDone,
  catalogEntries = [],
}) {
  const { t, lang } = useLang();
  const isEditing = !!existingTransaction;
  const [amount, setAmount] = useState(existingTransaction?.amount ? String(existingTransaction.amount) : '');
  const [itemNote, setItemNote] = useState(existingTransaction?.item_note || '');
  const [catalogEntryId, setCatalogEntryId] = useState(existingTransaction?.catalog_entry_id ? String(existingTransaction.catalog_entry_id) : '');
  const [dueDate, setDueDate] = useState(
    existingTransaction?.due_date ? new Date(existingTransaction.due_date).toISOString().slice(0, 10) : '',
  );
  const [showMore, setShowMore] = useState(Boolean(existingTransaction?.item_note || existingTransaction?.catalog_entry_id));
  const [saving, setSaving] = useState(false);

  const transactionType = useMemo(() => {
    if (existingTransaction?.type && isValidCustomerTransactionType(existingTransaction.type)) {
      return existingTransaction.type;
    }
    if (mode === CUSTOMER_TRANSACTION_TYPES.PAYMENT) return CUSTOMER_TRANSACTION_TYPES.PAYMENT;
    return CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD;
  }, [existingTransaction?.type, mode]);

  const isPayment = transactionType === CUSTOMER_TRANSACTION_TYPES.PAYMENT;
  const selectedCatalogEntry = catalogEntries.find(entry => String(entry.id) === String(catalogEntryId)) || null;
  const quickCatalogEntries = !isPayment ? catalogEntries.slice(0, 5) : [];
  const parsedAmount = parseFloat(parseInput(amount)) || 0;
  const currentBalance = Math.max(Number(customer?.balance) || 0, 0);
  const hasCollectableBalance = !isPayment || currentBalance > 0;
  const updatedBalance = isPayment
    ? Math.max(currentBalance - parsedAmount, 0)
    : currentBalance + parsedAmount;
  const dueDateOptions = useMemo(() => getDueDateOptions(), []);
  const localizedDueDateOptions = useMemo(() => {
    const labels = lang === 'am'
      ? ['ዛሬ', 'ነገ', 'ሚቀጥለው ሳምንት']
      : ['Today', 'Tomorrow', 'Next week'];
    return dueDateOptions.map((option, index) => ({
      ...option,
      label: labels[index] || option.label,
    }));
  }, [dueDateOptions, lang]);
  const overPayment = isPayment && parsedAmount > currentBalance;
  const canSave = parsedAmount > 0 && !overPayment && hasCollectableBalance;
  const accent = isPayment ? '#1B4332' : '#92400e';
  const softBg = isPayment ? '#f0fdf4' : '#fffbeb';
  const softBorder = isPayment ? '#bbf7d0' : '#fde68a';
  const title = isEditing
    ? (isPayment ? (t.editPayment || t.recordPayment) : (t.editCredit || t.addCredit))
    : (isPayment ? t.recordPayment : t.addCredit);
  const saveLabel = saving ? t.saving : (isEditing ? t.saveChanges : (isPayment ? t.savePayment : t.saveCredit));
  const primaryHint = isPayment
    ? (t.remainingBalanceHint || 'This is the remaining balance after saving the payment.')
    : (t.currentBalanceHint || 'This is the balance after saving the new Dubie.');

  const handleQuickAmount = (value) => {
    setAmount(String(value));
  };

  const handleSelectCatalogEntry = (entry) => {
    setCatalogEntryId(String(entry.id));
    if (!itemNote.trim()) setItemNote(entry.name || '');
    setShowMore(true);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    if (!isValidCustomerTransactionType(transactionType)) return;

    setSaving(true);
    try {
      const payload = {
        customer_id: customer?.id,
        type: transactionType,
        amount: parsedAmount,
        catalog_entry_id: catalogEntryId ? Number(catalogEntryId) : null,
        item_kind: selectedCatalogEntry?.kind || null,
        item_note: itemNote.trim() || selectedCatalogEntry?.name || null,
        due_date: !isPayment && dueDate ? new Date(dueDate).getTime() : null,
      };
      const didSave = isEditing
        ? await onUpdate?.(existingTransaction.id, payload)
        : await onSave?.(payload);
      if (didSave) onDone?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade">
      <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto animate-slide-up" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}>
        <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', borderColor: 'var(--color-border-light)' }}>
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-gray-900 leading-tight">{title}</h2>
              <p className="text-sm mt-1 truncate" style={{ color: '#6b7280' }}>{customer?.display_name || ''}</p>
              <p className="text-xs mt-1 font-semibold" style={{ color: '#92400e' }}>
                {t.today}: {formatEthiopian(Date.now())}
              </p>
            </div>
            <button onClick={onDone} aria-label={t.close} className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center press-scale">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-gray-800 font-black mb-2">
              {t.amount} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={fmtInput(amount)}
                onChange={(e) => handleNumericInput(e, setAmount)}
                placeholder="0"
                autoFocus
                className="w-full p-4 pr-16 border-2 focus:outline-none text-2xl font-black min-h-[60px]"
                style={{ borderRadius: 'var(--radius-md)', borderColor: parsedAmount > 0 && !overPayment ? accent : '#e8e2d8' }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">{t.birr}</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1 pr-1" aria-label={t.quickAmount || 'Quick amount'}>
              {QUICK_AMOUNTS.map(value => {
                const active = Number(parseInput(amount)) === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQuickAmount(value)}
                    className="flex-shrink-0 min-h-[40px] min-w-[62px] px-3 border text-sm font-black press-scale"
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      borderColor: active ? accent : '#e8e2d8',
                      background: active ? accent : '#fff',
                      color: active ? '#fff' : '#374151',
                    }}
                  >
                    {formatQuickAmount(value)}
                  </button>
                );
              })}
            </div>
            {isPayment && !hasCollectableBalance && (
              <p className="text-xs font-medium mt-2" style={{ color: '#b45309' }}>
                {t.noBalanceToRecordPayment}
              </p>
            )}
            {overPayment && (
              <p className="text-xs font-medium mt-2 text-red-600">
                {t.paymentExceedsOwed}
              </p>
            )}
          </div>

          <div className="p-3 border" style={{ background: softBg, borderColor: softBorder, borderRadius: 'var(--radius-md)' }}>
            <div className="flex items-center gap-2 mb-2">
              <WalletCards className="w-4 h-4" style={{ color: accent }} />
              <p className="text-xs font-black uppercase tracking-wide" style={{ color: '#6b7280' }}>{t.balanceAfterEntry}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <p className="text-[11px] font-bold" style={{ color: '#6b7280' }}>{t.previousBalance}</p>
                <p className="text-base font-black text-gray-900">{fmt(currentBalance)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold" style={{ color: '#6b7280' }}>{isPayment ? '-' : '+'}</p>
                <p className="text-base font-black" style={{ color: accent }}>{fmt(parsedAmount)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-bold" style={{ color: '#6b7280' }}>{t.updatedBalance}</p>
                <p className="text-lg font-black" style={{ color: accent }}>{fmt(updatedBalance)} {t.birr}</p>
              </div>
            </div>
            <p className="text-xs mt-2 font-medium leading-5" style={{ color: '#6b7280' }}>
              {primaryHint}
            </p>
          </div>

          {!isPayment && quickCatalogEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <PackageCheck className="w-3.5 h-3.5" style={{ color: '#1B4332' }} />
                <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: '#6b7280' }}>
                  {t.recentItems || 'Recent items'}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {quickCatalogEntries.map(entry => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectCatalogEntry(entry)}
                    className="flex-shrink-0 min-h-[40px] px-3 border text-xs font-black press-scale"
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      borderColor: String(catalogEntryId) === String(entry.id) ? '#1B4332' : '#e8e2d8',
                      background: String(catalogEntryId) === String(entry.id) ? 'rgba(27,67,50,0.08)' : '#fff',
                      color: '#1f2937',
                    }}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isPayment && (
            <div>
              <label className="block text-gray-800 font-black mb-2 text-sm">{t.dueDateOptional}</label>
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2">
                {localizedDueDateOptions.map((option) => {
                  const optionDate = new Date(option.value).toISOString().slice(0, 10);
                  const active = dueDate === optionDate;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDueDate(optionDate)}
                      className="px-3 py-2 text-left border min-h-[44px] whitespace-nowrap press-scale"
                      style={{
                        background: active ? '#1B4332' : '#fff',
                        color: active ? '#fff' : '#374151',
                        borderColor: active ? '#1B4332' : '#e8e2d8',
                        borderRadius: '999px',
                      }}
                    >
                      <span className="block text-xs font-bold">{option.label}</span>
                      <span className="block text-[11px] opacity-80">{option.display}</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative">
                <CalendarDays className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-3 pl-10 border-2 focus:outline-none text-sm min-h-[48px]" style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }} />
              </div>
              <p className="text-xs mt-2 font-medium leading-5" style={{ color: '#6b7280' }}>
                {dueDate ? `${t.ethiopianDisplay}: ${formatEthiopian(new Date(dueDate))}` : t.pickDateWithEthiopianHint}
              </p>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowMore(value => !value)}
              className="flex items-center gap-1 text-xs font-black py-2 min-h-[40px] press-scale"
              style={{ color: '#C4883A' }}
            >
              {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {t.moreOptional || 'More (optional)'}
            </button>
            {showMore && (
              <div className="space-y-3">
                {!isPayment && catalogEntries.length > 0 && (
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">
                      {t.savedCatalogLabel}
                    </label>
                    <select
                      value={catalogEntryId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCatalogEntryId(value);
                        const entry = catalogEntries.find(item => String(item.id) === String(value));
                        if (!entry) return;
                        if (!itemNote.trim()) setItemNote(entry.name || '');
                      }}
                      className="w-full p-3 border-2 focus:outline-none text-sm bg-white"
                      style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
                    >
                      <option value="">{t.typeNoteManually}</option>
                      {catalogEntries.map(entry => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} - {entry.kind === 'service' ? t.serviceLabel : t.itemLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">
                    {isPayment ? t.paymentNoteOptional : t.itemNoteOptional}
                  </label>
                  <textarea
                    value={itemNote}
                    onChange={(e) => setItemNote(e.target.value)}
                    placeholder={isPayment ? t.paymentNotePlaceholder : t.creditItemPlaceholder}
                    rows={2}
                    className="w-full p-3 border-2 focus:outline-none text-sm resize-none"
                    style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-5 pb-6 pt-3 border-t" style={{ borderColor: '#e8e2d8' }}>
          {!canSave && (
            <div className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: overPayment ? '#dc2626' : '#9ca3af' }}>
              <Clock3 className="w-3.5 h-3.5" />
              {overPayment ? t.paymentExceedsOwed : (parsedAmount <= 0 ? t.validAmountRequired : t.noBalanceToRecordPayment)}
            </div>
          )}
          <button onClick={handleSave} disabled={!canSave || saving} className="w-full p-4 font-black text-white text-base flex items-center justify-center gap-2 min-h-[56px] press-scale" style={{ background: isPayment ? '#2d6a4f' : '#C4883A', opacity: canSave ? 1 : 0.45, borderRadius: 'var(--radius-md)', boxShadow: canSave ? (isPayment ? '0 4px 0 #1B4332, var(--shadow-sm)' : '0 4px 0 #96662b, var(--shadow-sm)') : 'none' }}>
            <Save className="w-5 h-5" />
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerTransactionSheet;
