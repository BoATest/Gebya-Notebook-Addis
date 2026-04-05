import { useState } from 'react';
import { Save } from 'lucide-react';
import { useLang } from '../context/LangContext';
import PaymentTypeChips from './PaymentTypeChips';
import { fmtInput, parseInput } from '../utils/numformat';

function handleNumericInput(e, setter) {
  let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
  setter(raw);
}

function VoiceFixScreen({ transcript, detectedTotal, items = [], draft, onSave, onCancel, enabledProviders }) {
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
  const canSave = parsedAmount > 0;

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
      paymentType,
      paymentProvider: paymentType !== 'cash' ? paymentProvider : '',
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
          <label className="block text-gray-700 font-semibold mb-2 font-sans">{t.voiceCustomerName}</label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder={t.voiceCustomerPlaceholder}
            className="w-full p-4 border-2 focus:outline-none text-base min-h-[52px] font-sans"
            style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
          />
        </div>

        <PaymentTypeChips
          paymentType={paymentType}
          provider={paymentProvider}
          onTypeChange={setPaymentType}
          onProviderChange={setPaymentProvider}
          enabledProviders={enabledProviders}
          lastProviderByType={{}}
        />

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
