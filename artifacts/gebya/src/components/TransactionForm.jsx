import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Save, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';
import { useLang } from '../context/LangContext';
import VoiceButton from './VoiceButton';
import PaymentTypeChips from './PaymentTypeChips';
import { getDueDateOptions } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/format';

function TransactionForm({ type, onSave, onDone, enabledProviders, recurringExpenses, initialPaymentType, initialPaymentProvider, lastPaymentHistory }) {
  const { t } = useLang();

  const configs = {
    sale:    { title: t.iSoldSomething,  itemLabel: t.whatDidYouSell,    itemPlaceholder: t.sellPlaceholder,       amountLabel: t.howMuchTotal,  buttonText: t.saveSale,    color: 'green',  addAnother: t.addAnotherSale },
    expense: { title: t.iSpentSomething, itemLabel: t.whatDidYouSpendOn, itemPlaceholder: t.spendPlaceholder,      amountLabel: t.howMuchTotal,  buttonText: t.saveExpense, color: 'red',    addAnother: t.addAnotherExpense },
    credit:  { title: t.recordCredit,    itemLabel: t.creditNameLabel,   itemPlaceholder: t.creditNamePlaceholder, amountLabel: t.amount,        buttonText: t.saveCredit,  color: 'amber',  addAnother: '' },
  };

  const config = configs[type] || configs.sale;
  const isCredit = type === 'credit';
  const isExpense = type === 'expense';
  const accent = { green: { btn: '#15803d' }, red: { btn: '#dc2626' }, amber: { btn: '#c47c1a' } }[config.color];

  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [phone, setPhone] = useState('');
  const [selectedDue, setSelectedDue] = useState(null);
  const [customDue, setCustomDue] = useState('');
  const [paymentType, setPaymentType] = useState(initialPaymentType || 'cash');
  const [paymentProvider, setPaymentProvider] = useState(initialPaymentProvider || '');
  const [creditDirection, setCreditDirection] = useState('owes_me');
  const [saveState, setSaveState] = useState('idle');
  const [lastSaved, setLastSaved] = useState(null);

  const dueDateOptions = getDueDateOptions();
  const sellingPrice = parseFloat(amount) || 0;
  const cost = parseFloat(costPrice) || 0;
  const qty = parseFloat(quantity) || 1;
  const belowCost = !isCredit && cost > 0 && sellingPrice < cost * qty;

  const hasDueDate = isCredit
    ? (selectedDue !== null && selectedDue !== undefined && selectedDue !== 'custom') || (selectedDue === 'custom' && customDue)
    : true;
  const canSave = item.trim() && sellingPrice > 0 && hasDueDate;

  const getEffectiveDueDate = () => {
    if (selectedDue === 'custom' && customDue) return new Date(customDue).getTime();
    return selectedDue;
  };

  const handleSave = async () => {
    if (!canSave) return;
    const data = {
      type,
      item_name: item.trim(),
      quantity: isCredit ? 1 : qty,
      amount: sellingPrice,
      cost_price: isCredit ? 0 : cost,
      profit: (!isCredit && cost > 0) ? (sellingPrice - cost * qty) : null,
      is_credit: isCredit,
      customer_phone: isCredit && phone.trim() ? phone.trim() : null,
      due_date: isCredit ? getEffectiveDueDate() : null,
      payment_type: isCredit ? null : paymentType,
      payment_provider: (!isCredit && paymentType !== 'cash') ? paymentProvider || null : null,
      direction: isCredit ? creditDirection : null,
      created_at: Date.now(),
    };
    try {
      await onSave(data);
      if (isCredit) {
        onDone();
      } else {
        setLastSaved({ item: data.item_name, amount: data.amount, type });
        setSaveState('success');
      }
    } catch (err) {
      // error handled in App.jsx
    }
  };

  const handleAddAnother = () => {
    const keptType = paymentType;
    const keptProvider = paymentProvider;
    setItem('');
    setQuantity('1');
    setAmount('');
    setCostPrice('');
    setShowAdvanced(false);
    setPhone('');
    setSelectedDue(null);
    setCustomDue('');
    setPaymentType(keptType);
    setPaymentProvider(keptProvider);
    setSaveState('idle');
    setLastSaved(null);
  };

  if (saveState === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
        <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-10 shadow-2xl">
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-green-500" />
            <p className="font-black text-gray-900 text-xl">{lastSaved?.item}</p>
            <p className="text-gray-500 mt-1 text-base">{fmt(lastSaved?.amount)} {t.birrSaved}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleAddAnother}
              className="w-full p-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 min-h-[56px] active:scale-95 transition-all"
              style={{ background: accent.btn }}
            >
              <Plus className="w-5 h-5" />
              {config.addAnother}
            </button>
            <button
              onClick={onDone}
              className="w-full p-4 rounded-2xl font-bold text-gray-700 text-base min-h-[52px] active:scale-95 transition-all"
              style={{ background: '#f5f5f5' }}
            >
              {t.done}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        <div className="sticky top-0 bg-white rounded-t-3xl z-10 px-6 pt-5 pb-4 border-b" style={{ borderColor: '#f0e6d4' }}>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900">{config.title}</h2>
            <button onClick={onDone} aria-label={t.close}
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
                  <button key={d.id} type="button" onClick={() => setCreditDirection(d.id)}
                    className="p-3 rounded-xl border-2 text-center transition-all min-h-[56px]"
                    style={{
                      borderColor: creditDirection === d.id ? '#c47c1a' : '#e8d5b0',
                      background: creditDirection === d.id ? '#fffbeb' : '#fff',
                      color: creditDirection === d.id ? '#92400e' : '#4b5563',
                    }}>
                    <div className="font-bold text-sm">{d.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{d.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isExpense && recurringExpenses && recurringExpenses.length > 0 && (
            <div>
              <label className="block text-gray-600 text-xs font-bold mb-2 uppercase tracking-wide">{t.quickFill}</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recurringExpenses.map(re => (
                  <button
                    key={re.id}
                    type="button"
                    onClick={() => { setItem(re.name); setAmount(String(re.amount)); }}
                    className="flex-shrink-0 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all"
                    style={{ borderColor: '#e8d5b0', background: '#faf5eb', color: '#92400e' }}
                  >
                    <div>{re.name}</div>
                    <div className="font-normal text-amber-600 mt-0.5">{fmt(re.amount)} {t.birr}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">{config.itemLabel}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={e => setItem(e.target.value)}
                placeholder={config.itemPlaceholder}
                className="flex-1 p-4 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                style={{ borderColor: '#e8d5b0' }}
              />
              <VoiceButton onResult={setItem} />
            </div>
          </div>

          {!isCredit && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">{t.howMany}</label>
              <input type="number" inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value)} min="1"
                className="w-full p-4 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                style={{ borderColor: '#e8d5b0' }} />
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2">{config.amountLabel}</label>
            <div className="relative">
              <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                className="w-full p-4 pr-16 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                style={{ borderColor: '#e8d5b0' }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{t.birr}</span>
            </div>
          </div>

          {isCredit && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                {t.phoneOptional} <span className="text-gray-400 font-normal text-sm">{t.phoneOptionalHint}</span>
              </label>
              <input type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t.phonePlaceholder}
                className="w-full p-4 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                style={{ borderColor: '#e8d5b0' }} />
            </div>
          )}

          {isCredit && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">{t.whenDue} <span className="text-red-500">*</span></label>
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
                className="w-full p-3 rounded-xl border-2 text-sm font-semibold transition-colors min-h-[52px]"
                style={{
                  borderColor: selectedDue === 'custom' ? '#c47c1a' : '#e8d5b0',
                  background: selectedDue === 'custom' ? '#fffbeb' : '#fff',
                  color: selectedDue === 'custom' ? '#92400e' : '#4b5563',
                }}>
                {t.pickDate}
              </button>
              {!hasDueDate && (
                <p className="text-xs text-amber-600 mt-1.5 font-medium">{t.selectDueDate}</p>
              )}
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
              lastProviderByType={lastPaymentHistory}
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
                    {t.whatDidYouPay} <span style={{ color: '#9ca3af' }}>{t.perUnit}</span>
                  </label>
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0"
                      className="w-full p-4 pr-16 border-2 rounded-2xl focus:outline-none text-base min-h-[52px]"
                      style={{ borderColor: '#e8d5b0' }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{t.birr}</span>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>{t.helpsSeeProfit}</p>

                  {belowCost && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">{t.sellingBelowCost}</p>
                    </div>
                  )}
                  {cost > 0 && !belowCost && sellingPrice > 0 && (
                    <div className="mt-3 p-3 rounded-xl border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <p className="text-xs text-green-700 font-semibold">
                        {t.profitOnSale} {fmt(sellingPrice - cost * qty)} {t.birr}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-2">
          <button onClick={handleSave} disabled={!canSave}
            className="w-full p-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition-all min-h-[56px] active:scale-95"
            style={{ background: canSave ? accent.btn : '#e5e7eb', color: canSave ? '#fff' : '#9ca3af', cursor: canSave ? 'pointer' : 'not-allowed' }}>
            <Save className="w-5 h-5" />
            {config.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionForm;
