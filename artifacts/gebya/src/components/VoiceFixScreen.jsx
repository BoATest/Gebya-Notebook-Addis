import { useState } from 'react';
import { Save } from 'lucide-react';
import { useLang } from '../context/LangContext';
import PaymentTypeChips from './PaymentTypeChips';
import { fmt, fmtInput, parseInput } from '../utils/numformat';

function handleNumericInput(e, setter) {
  let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
  setter(raw);
}

function VoiceFixScreen({ transcript, detectedTotal, items = [], draft, onSave, onCancel, enabledProviders, customerSuggestions = [] }) {
  const { t } = useLang();
  const hasMultiple = items.length > 1;
  const isSaleIntent = !draft?.intent || draft.intent === 'sale';
  const parsedItems = draft?.items?.length
    ? draft.items.map((item) => ({
      name: item.name || '',
      quantity: item.quantity != null ? String(item.quantity) : '1',
      unit_price: item.unit_price != null ? String(item.unit_price) : '',
    }))
    : [];
  const runningTotal = draft?.total_amount ?? (hasMultiple ? items.reduce((sum, it) => sum + (it.detectedTotal || 0), 0) : null);
  const effectiveTotal = runningTotal ?? detectedTotal;
  const combinedNote = hasMultiple ? items.map(it => it.transcript).join(', ') : (transcript || '');
  const [amount, setAmount] = useState(effectiveTotal != null ? String(effectiveTotal) : '');
  const [note, setNote] = useState(combinedNote);
  const [customerName, setCustomerName] = useState(draft?.customer_name || '');
  const [draftItems, setDraftItems] = useState(parsedItems);
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [saleSettlementMode, setSaleSettlementMode] = useState('paid_now');
  const [paidAmount, setPaidAmount] = useState('');
  const [saleDueDate, setSaleDueDate] = useState('');

  const normalizedItems = draftItems.map((item) => {
    const quantity = Math.max(1, parseFloat(parseInput(item.quantity || '1')) || 1);
    const unitPrice = item.unit_price ? (parseFloat(parseInput(item.unit_price)) || 0) : null;
    return {
      name: item.name.trim(),
      quantity,
      unit_price: unitPrice,
      line_total: unitPrice != null ? quantity * unitPrice : null,
    };
  }).filter((item) => item.name);

  const computedAmount = normalizedItems.length > 0 && normalizedItems.every((item) => item.line_total != null)
    ? normalizedItems.reduce((sum, item) => sum + (item.line_total || 0), 0)
    : null;
  const parsedAmount = computedAmount ?? (parseFloat(parseInput(amount)) || 0);
  const parsedPaidAmount = parseFloat(parseInput(paidAmount)) || 0;
  const requiresCustomerBalance = saleSettlementMode !== 'paid_now';
  const remainingAmount = saleSettlementMode === 'paid_now'
    ? 0
    : saleSettlementMode === 'pay_later'
      ? parsedAmount
      : Math.max(parsedAmount - parsedPaidAmount, 0);
  const settledAmount = saleSettlementMode === 'paid_now'
    ? parsedAmount
    : saleSettlementMode === 'pay_later'
      ? 0
      : parsedPaidAmount;
  const normalizedCustomerQuery = customerName.trim().toLowerCase();
  const matchedCustomers = requiresCustomerBalance && normalizedCustomerQuery
    ? customerSuggestions
      .filter((customer) => {
        const name = String(customer.display_name || '').toLowerCase();
        const noteText = String(customer.note || '').toLowerCase();
        return name.includes(normalizedCustomerQuery) || noteText.includes(normalizedCustomerQuery);
      })
      .slice(0, 5)
    : [];
  const selectedExistingCustomer = requiresCustomerBalance
    ? customerSuggestions.find((customer) => String(customer.display_name || '').trim().toLowerCase() === normalizedCustomerQuery) || null
    : null;
  const currentCustomerBalance = Math.max(Number(selectedExistingCustomer?.balance || 0), 0);
  const nextCustomerBalance = currentCustomerBalance + remainingAmount;
  const partialAmountValid = saleSettlementMode !== 'paid_partly' || (parsedPaidAmount > 0 && parsedPaidAmount < parsedAmount);
  const customerValid = !requiresCustomerBalance || customerName.trim().length > 0;
  const canSave = parsedAmount > 0 && partialAmountValid && customerValid;

  const updateDraftItem = (index, field, value) => {
    setDraftItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      amount: parsedAmount,
      note: note.trim(),
      draft: {
        customer_name: customerName.trim() || null,
        items: normalizedItems,
        total_amount: parsedAmount,
        intent: draft?.intent || 'sale',
        needs_review: false,
      },
      paymentType: saleSettlementMode === 'pay_later' ? null : paymentType,
      paymentProvider: saleSettlementMode === 'pay_later' || paymentType === 'cash' ? '' : paymentProvider,
      saleSettlementMode,
      paidAmount: settledAmount,
      remainingAmount,
      settlementDueDate: remainingAmount > 0 && saleDueDate ? new Date(saleDueDate).getTime() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div
        className="sticky top-0 z-10 px-6 pt-5 pb-4 border-b flex-shrink-0"
        style={{ background: '#fff', borderColor: 'var(--color-border-light)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900 font-sans">{t.voiceFixTitle}</h2>
          <button
            onClick={onCancel}
            className="py-2 px-4 text-sm font-semibold text-gray-500 min-h-[44px] font-sans"
            style={{ background: '#f5f5f5', borderRadius: 'var(--radius-sm)' }}
          >
            {t.cancel}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {!isSaleIntent && (
          <div className="p-4 border" style={{ background: '#fff7ed', borderColor: '#fed7aa', borderRadius: 'var(--radius-md)' }}>
            <p className="font-bold text-gray-900">{t.voiceSalesOnlyTitle}</p>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {t.voiceSalesOnlyBody}
            </p>
          </div>
        )}

        <div>
          <label className="block text-gray-700 font-semibold mb-2 font-sans">{t.voiceTotalLabel}</label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={fmtInput(amount)}
              onChange={e => handleNumericInput(e, setAmount)}
              placeholder="0"
              autoFocus
              className="w-full p-4 pr-16 border-2 focus:outline-none text-base min-h-[52px] font-sans"
              style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium font-sans">{t.birr}</span>
          </div>
          {computedAmount != null && (
            <p className="text-xs text-gray-500 mt-2">{t.voiceAutoCalculatedTotal}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2 text-sm font-sans">{t.saleSettlementLabel}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'paid_now', label: t.saleSettlementPaidNow, sub: t.saleSettlementPaidNowHint },
              { id: 'paid_partly', label: t.saleSettlementPaidPartly, sub: t.saleSettlementPaidPartlyHint },
              { id: 'pay_later', label: t.saleSettlementPayLater, sub: t.saleSettlementPayLaterHint },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSaleSettlementMode(option.id)}
                className="p-3 border-2 text-center transition-all min-h-[68px] press-scale"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  borderColor: saleSettlementMode === option.id ? '#1B4332' : '#e8e2d8',
                  background: saleSettlementMode === option.id ? 'rgba(27,67,50,0.07)' : '#fff',
                  color: saleSettlementMode === option.id ? '#1B4332' : '#4b5563',
                }}
              >
                <div className="font-bold text-sm font-sans">{option.label}</div>
                <div className="text-[11px] opacity-70 mt-1 font-sans">{option.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {saleSettlementMode === 'paid_partly' && (
          <div>
            <label className="block text-gray-700 font-semibold mb-2 font-sans">{t.salePaidAmountLabel}</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={fmtInput(paidAmount)}
                onChange={e => handleNumericInput(e, setPaidAmount)}
                placeholder="0"
                className="w-full p-4 pr-16 border-2 focus:outline-none text-base min-h-[52px] font-sans"
                style={{ borderRadius: 'var(--radius-md)', borderColor: partialAmountValid || !paidAmount ? '#e8e2d8' : '#dc2626' }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium font-sans">{t.birr}</span>
            </div>
            {!partialAmountValid && (
              <p className="text-xs mt-2 font-medium text-red-600 font-sans">{t.salePaidAmountHint}</p>
            )}
          </div>
        )}

        {requiresCustomerBalance && (
          <>
            <div>
              <label className="block text-gray-700 font-semibold mb-2 font-sans">
                {t.customerIdentifier} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder={t.customerIdentifierPlaceholder}
                className="w-full p-4 border-2 focus:outline-none text-base min-h-[52px] font-sans"
                style={{ borderRadius: 'var(--radius-md)', borderColor: customerValid ? '#e8e2d8' : '#dc2626' }}
              />
              {!customerValid && (
                <p className="text-xs mt-2 font-medium text-red-600 font-sans">{t.saleCustomerRequiredHint}</p>
              )}
              {matchedCustomers.length > 0 && (
                <div className="mt-2 space-y-2">
                  {matchedCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setCustomerName(customer.display_name || '')}
                      className="w-full p-3 border text-left press-scale"
                      style={{ background: '#fff', borderColor: '#e8e2d8', borderRadius: 'var(--radius-md)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate font-sans">{customer.display_name}</p>
                          {customer.note && (
                            <p className="text-xs mt-1 truncate font-sans" style={{ color: '#6b7280' }}>{customer.note}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[11px] font-bold uppercase tracking-wide font-sans" style={{ color: '#9ca3af' }}>{t.currentBalance}</p>
                          <p className="text-sm font-black font-sans" style={{ color: '#92400e' }}>{fmt(customer.balance || 0)} {t.birr}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm font-sans">{t.dueDateOptional}</label>
              <input
                type="date"
                value={saleDueDate}
                onChange={e => setSaleDueDate(e.target.value)}
                className="w-full p-4 border-2 focus:outline-none text-base min-h-[52px] font-sans"
                style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
              />
            </div>

            <div className="p-4 border" style={{ background: '#fffbeb', borderColor: '#fde68a', borderRadius: 'var(--radius-md)' }}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-sans">
                  <span className="font-semibold text-gray-700">{t.saleRemainingBalanceLabel}</span>
                  <span className="font-black" style={{ color: '#92400e' }}>{fmt(remainingAmount)} {t.birr}</span>
                </div>
                {selectedExistingCustomer && (
                  <>
                    <div className="flex items-center justify-between gap-3 text-sm font-sans">
                      <span className="font-semibold text-gray-700">{t.currentBalance}</span>
                      <span className="font-black text-gray-900">{fmt(currentCustomerBalance)} {t.birr}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm font-sans">
                      <span className="font-semibold text-gray-700">{t.updatedBalance}</span>
                      <span className="font-black" style={{ color: '#92400e' }}>{fmt(nextCustomerBalance)} {t.birr}</span>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs mt-2 font-medium font-sans" style={{ color: '#6b7280' }}>
                {t.saleRemainingBalanceHint}
              </p>
            </div>
          </>
        )}

        {saleSettlementMode !== 'pay_later' && (
          <PaymentTypeChips
            paymentType={paymentType}
            provider={paymentProvider}
            onTypeChange={setPaymentType}
            onProviderChange={setPaymentProvider}
            enabledProviders={enabledProviders}
            lastProviderByType={{}}
          />
        )}

        {draftItems.length > 0 && (
          <div>
            <label className="block text-gray-700 font-semibold mb-2 font-sans">{t.voiceParsedItems}</label>
            <div className="space-y-3">
              {draftItems.map((item, index) => (
                <div key={index} className="p-3 rounded-xl" style={{ background: '#FAF8F5', border: '1px solid #e8e2d8' }}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateDraftItem(index, 'name', e.target.value)}
                    placeholder={t.voiceItemNamePlaceholder}
                    className="w-full p-3 border-2 focus:outline-none text-base min-h-[48px] font-sans mb-3"
                    style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8', background: '#fff' }}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={e => handleNumericInput(e, value => updateDraftItem(index, 'quantity', value))}
                      placeholder={t.voiceQuantity}
                      className="w-full p-3 border-2 focus:outline-none text-base min-h-[48px] font-sans"
                      style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8', background: '#fff' }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={fmtInput(item.unit_price)}
                      onChange={e => handleNumericInput(e, value => updateDraftItem(index, 'unit_price', value))}
                      placeholder={t.voiceUnitPrice}
                      className="w-full p-3 border-2 focus:outline-none text-base min-h-[48px] font-sans"
                      style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8', background: '#fff' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-gray-700 font-semibold mb-2 font-sans">{t.voiceNoteLabel}</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t.voiceNotePlaceholder}
            className="w-full p-4 border-2 focus:outline-none text-base min-h-[52px] font-sans"
            style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
          />
        </div>
      </div>

      <div className="px-6 pb-8 pt-2 flex-shrink-0">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full p-4 font-black text-white text-base flex items-center justify-center gap-2 transition-all min-h-[56px] font-sans"
          style={{
            background: canSave ? '#2d6a4f' : '#e5e7eb',
            color: canSave ? '#fff' : '#9ca3af',
            cursor: canSave ? 'pointer' : 'not-allowed',
            borderRadius: 'var(--radius-md)',
            boxShadow: canSave ? '0 4px 0 #1B4332' : 'none',
          }}
        >
          <Save className="w-5 h-5" />
          {t.voiceSave}
        </button>
      </div>
    </div>
  );
}

export default VoiceFixScreen;
