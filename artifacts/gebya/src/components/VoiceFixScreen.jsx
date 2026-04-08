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
  const { t, lang } = useLang();
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]">
      <div
        className="sticky top-0 z-10 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 border-b flex-shrink-0 sm:px-6"
        style={{ background: '#fff', borderColor: 'var(--color-border-light)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 font-sans">Gebya Voice</p>
            <h2 className="mt-2 text-2xl font-black text-gray-900 font-sans">{t.voiceFixTitle}</h2>
            <p className="mt-1 text-sm text-gray-500 font-sans">
              {lang === 'am' ? 'ወደ ደብተርዎ ከመግባቱ በፊት ያስተካክሉት።' : 'Make any quick fixes before this goes into your notebook.'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 font-sans"
            style={{ background: '#f5f5f5' }}
          >
            {t.cancel}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 sm:px-6">
        {!isSaleIntent && (
          <div className="rounded-2xl border p-4" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
            <p className="font-bold text-gray-900">{t.voiceSalesOnlyTitle}</p>
            <p className="text-sm mt-1 leading-6" style={{ color: '#6b7280' }}>
              {t.voiceSalesOnlyBody}
            </p>
          </div>
        )}

        <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: 'var(--color-border)' }}>
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

        <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: 'var(--color-border)' }}>
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

        <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: 'var(--color-border)' }}>
          <PaymentTypeChips
            paymentType={paymentType}
            provider={paymentProvider}
            onTypeChange={setPaymentType}
            onProviderChange={setPaymentProvider}
            enabledProviders={enabledProviders}
            lastProviderByType={{}}
          />
        </div>

        {draftItems.length > 0 && (
          <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: 'var(--color-border)' }}>
            <label className="block text-gray-700 font-semibold mb-3 font-sans">{t.voiceParsedItems}</label>
            <div className="space-y-3">
              {draftItems.map((item, index) => (
                <div key={index} className="rounded-xl border p-3" style={{ background: '#FAF8F5', borderColor: '#e8e2d8' }}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateDraftItem(index, 'name', e.target.value)}
                    placeholder={t.voiceItemNamePlaceholder}
                    className="w-full p-3 border-2 focus:outline-none text-base min-h-[48px] font-sans mb-3"
                    style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8', background: '#fff' }}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: 'var(--color-border)' }}>
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

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 flex-shrink-0 sm:px-6">
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
