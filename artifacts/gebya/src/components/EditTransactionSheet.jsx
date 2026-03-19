import { useState } from 'react';
import { X, Save, ChevronDown, ChevronUp, AlertTriangle, Pencil } from 'lucide-react';
import { useLang } from '../context/LangContext';
import VoiceButton from './VoiceButton';
import PaymentTypeChips from './PaymentTypeChips';
import { getDueDateOptions } from '../utils/ethiopianCalendar';
import { fmt, fmtInput } from '../utils/format';

function handleNumericInput(e, setter) {
  let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
  setter(raw);
}

const ACCENT = {
  sale:    { btn: '#15803d', border: '#86efac' },
  expense: { btn: '#dc2626', border: '#fca5a5' },
  credit:  { btn: '#c47c1a', border: '#fcd34d' },
};

function EditTransactionSheet({ transaction, enabledProviders, onUpdate, onClose }) {
  const { t } = useLang();
  const type = transaction.type;
  const isCredit = type === 'credit';
  const accent = ACCENT[type] || ACCENT.sale;

  const typeLabels = { sale: t.editSale, expense: t.editExpense, credit: t.editCredit };

  const [item, setItem] = useState(transaction.item_name || '');
  const [quantity, setQuantity] = useState(String(transaction.quantity || 1));
  const [amount, setAmount] = useState(String(transaction.amount || ''));
  const [costPrice, setCostPrice] = useState(String(transaction.cost_price || ''));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const initPType = transaction.payment_type || 'cash';
  const initPProvider = transaction.payment_provider || '';
  const [paymentType, setPaymentType] = useState(initPType);
  const [paymentProvider, setPaymentProvider] = useState(initPProvider);
  const lastProviderByType = {
    bank:   initPType === 'bank'   ? initPProvider : '',
    wallet: initPType === 'wallet' ? initPProvider : '',
  };
  const [phoneDigits, setPhoneDigits] = useState(() => {
    const raw = transaction.customer_phone || '';
    return raw.startsWith('+251') ? raw.slice(4) : raw.replace(/\D/g, '').slice(-9);
  });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [direction, setDirection] = useState(transaction.direction || 'owes_me');
  const [selectedDue, setSelectedDue] = useState(transaction.due_date || null);
  const [customDue, setCustomDue] = useState('');
  const [saving, setSaving] = useState(false);

  const dueDateOptions = getDueDateOptions();
  const phoneValid = !phoneDigits || /^[79]\d{8}$/.test(phoneDigits);
  const phoneEntered = phoneDigits.length > 0;

  const sellingPrice = parseFloat(amount) || 0;
  const cost = parseFloat(costPrice) || 0;
  const qty = Math.max(1, parseInt(quantity) || 1);
  const belowCost = !isCredit && cost > 0 && sellingPrice < cost * qty;
  const canSave = item.trim() && sellingPrice > 0;

  const getEffectiveDueDate = () => {
    if (selectedDue === 'custom' && customDue) return new Date(customDue).getTime();
    return selectedDue;
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const updates = {
        item_name: item.trim(),
        quantity: isCredit ? 1 : qty,
        amount: sellingPrice,
        cost_price: isCredit ? 0 : cost,
        profit: (!isCredit && cost > 0) ? sellingPrice - cost * qty : null,
        payment_type: isCredit ? null : paymentType,
        payment_provider: (!isCredit && paymentType !== 'cash') ? paymentProvider || null : null,
        customer_phone: isCredit ? (phoneEntered && phoneValid ? '+251' + phoneDigits : null) : null,
        direction: isCredit ? direction : null,
        due_date: isCredit ? getEffectiveDueDate() : null,
      };
      await onUpdate(transaction.id, updates);
      onClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Edit failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const lastEdited = transaction.updated_at
    ? new Date(transaction.updated_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-6 pt-5 pb-4 border-b" style={{ borderColor: '#f0e6d4' }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4" style={{ color: '#c47c1a' }} />
                <h2 className="text-xl font-black text-gray-900">{typeLabels[type] || t.editEntryLabel}</h2>
              </div>
              {lastEdited && (
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{t.editedAt} {lastEdited}</p>
              )}
            </div>
            <button onClick={onClose} aria-label={t.close}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">

          {isCredit && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">{t.direction}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'owes_me', label: t.owesMe, sub: t.theyOweMe },
                  { id: 'i_owe',   label: t.iOweLabel, sub: t.iOweThem },
                ].map(d => (
                  <button key={d.id} type="button" onClick={() => setDirection(d.id)}
                    className="p-3 rounded-xl border-2 text-center transition-all min-h-[56px]"
                    style={{
                      borderColor: direction === d.id ? '#c47c1a' : '#e8d5b0',
                      background: direction === d.id ? '#fffbeb' : '#fff',
                      color: direction === d.id ? '#92400e' : '#4b5563',
                    }}>
                    <div className="font-bold text-sm">{d.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {isCredit ? t.creditNameLabel : t.item}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={e => setItem(e.target.value)}
                className="flex-1 p-4 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                style={{ borderColor: '#e8d5b0' }}
              />
              <VoiceButton onResult={setItem} />
            </div>
          </div>

          {!isCredit && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">{t.quantity}</label>
              <input
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (isNaN(v) || v < 1) setQuantity('1');
                  else setQuantity(String(v));
                }}
                onBlur={e => {
                  const v = parseInt(e.target.value);
                  if (isNaN(v) || v < 1) setQuantity('1');
                }}
                min="1"
                className="w-full p-4 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                style={{ borderColor: '#e8d5b0' }}
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">{t.amount}</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={fmtInput(amount)}
                onChange={e => handleNumericInput(e, setAmount)}
                placeholder="0"
                className="w-full p-4 pr-16 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                style={{ borderColor: '#e8d5b0' }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{t.birr}</span>
            </div>
          </div>

          {isCredit && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                {t.phoneOptional} <span className="text-gray-400 font-normal text-sm">{t.phoneOptionalHint}</span>
              </label>
              <div className="flex gap-0">
                <div
                  className="flex items-center justify-center px-3 py-3 rounded-l-xl border-2 border-r-0 text-sm font-bold flex-shrink-0"
                  style={{ background: '#f5f0e8', borderColor: (phoneTouched && phoneEntered && !phoneValid) ? '#dc2626' : '#e8d5b0', color: '#7c3d12', minWidth: '64px' }}
                >
                  +251
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneDigits}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, '');
                    if (raw.length <= 9) setPhoneDigits(raw);
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="9XXXXXXXX"
                  maxLength={9}
                  className="flex-1 p-4 border-2 rounded-r-xl text-base focus:outline-none min-h-[52px]"
                  style={{ borderColor: (phoneTouched && phoneEntered && !phoneValid) ? '#dc2626' : (phoneEntered && phoneValid ? '#c47c1a' : '#e8d5b0') }}
                />
              </div>
              {phoneTouched && phoneEntered && !phoneValid && (
                <p className="text-xs text-red-500 mt-1 font-medium">{t.creditPhoneHint}</p>
              )}
              {!phoneTouched && (
                <p className="text-xs text-gray-400 mt-1">{t.creditPhoneHint}</p>
              )}
            </div>
          )}

          {isCredit && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">{t.dueDate}</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {dueDateOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setSelectedDue(opt.value)}
                    className="p-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[52px]"
                    style={{
                      borderColor: selectedDue === opt.value ? '#c47c1a' : '#e8d5b0',
                      background: selectedDue === opt.value ? '#fffbeb' : '#fff',
                      color: selectedDue === opt.value ? '#92400e' : '#4b5563',
                    }}>
                    <div className="font-bold">{opt.label.split(' ')[0]}</div>
                    <div className="text-xs opacity-70">{opt.display}</div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setSelectedDue('custom')}
                className="w-full p-3 rounded-xl border-2 text-sm font-semibold min-h-[52px]"
                style={{
                  borderColor: selectedDue === 'custom' ? '#c47c1a' : '#e8d5b0',
                  background: selectedDue === 'custom' ? '#fffbeb' : '#fff',
                  color: selectedDue === 'custom' ? '#92400e' : '#4b5563',
                }}>
                {t.pickDate}
              </button>
              {selectedDue === 'custom' && (
                <input type="date" value={customDue} onChange={e => setCustomDue(e.target.value)}
                  className="w-full mt-2 p-4 border-2 rounded-2xl focus:outline-none text-base"
                  style={{ borderColor: '#e8d5b0' }} />
              )}
            </div>
          )}

          {!isCredit && (
            <PaymentTypeChips
              paymentType={paymentType}
              provider={paymentProvider}
              onTypeChange={setPaymentType}
              onProviderChange={setPaymentProvider}
              enabledProviders={enabledProviders}
              lastProviderByType={lastProviderByType}
            />
          )}

          {!isCredit && (
            <div>
              <button type="button" onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1 text-sm font-semibold py-1 min-h-[44px]"
                style={{ color: '#c47c1a' }}>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {t.advancedOptional}
              </button>

              {showAdvanced && (
                <div className="mt-2 p-4 rounded-2xl border" style={{ background: '#faf5eb', borderColor: '#f0e6d4' }}>
                  <label className="block text-gray-600 text-sm font-semibold mb-2">
                    {t.costPriceLabel} <span style={{ color: '#9ca3af' }}>{t.perUnit}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={fmtInput(costPrice)}
                      onChange={e => handleNumericInput(e, setCostPrice)}
                      placeholder="0"
                      className="w-full p-4 pr-16 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                      style={{ borderColor: '#e8d5b0' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{t.birr}</span>
                  </div>
                  {belowCost && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">{t.sellingBelowCostShort}</p>
                    </div>
                  )}
                  {cost > 0 && !belowCost && sellingPrice > 0 && (
                    <div className="mt-3 p-3 rounded-xl border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <p className="text-xs text-green-700 font-semibold">
                        {t.profitLabel} {fmt(sellingPrice - cost * qty)} {t.birr}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-2">
          <button onClick={handleSave} disabled={!canSave || saving}
            className="w-full p-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition-all min-h-[56px] active:scale-95"
            style={{ background: canSave ? accent.btn : '#e5e7eb', color: canSave ? '#fff' : '#9ca3af' }}>
            <Save className="w-5 h-5" />
            {saving ? t.saving : t.saveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditTransactionSheet;
