import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Save, AlertTriangle } from 'lucide-react';
import VoiceButton from './VoiceButton';
import { getDueDateOptions } from '../utils/ethiopianCalendar';

const TYPE_CONFIG = {
  sale: { title: 'I Sold Something', itemLabel: 'What did you sell?', itemPlaceholder: 'e.g. bread, sugar...', amountLabel: 'How much total?', buttonText: 'Save Sale', color: 'green' },
  expense: { title: 'I Spent Something', itemLabel: 'What did you spend on?', itemPlaceholder: 'e.g. transport, rent...', amountLabel: 'How much total?', buttonText: 'Save Expense', color: 'red' },
  credit: { title: 'Someone Owes Me', itemLabel: 'Who owes you?', itemPlaceholder: 'e.g. Abebe...', amountLabel: 'How much do they owe?', buttonText: 'Save Credit', color: 'blue' },
};

function TransactionForm({ type, onSave, onCancel }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.sale;
  const isCredit = type === 'credit';

  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [amount, setAmount] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDue, setSelectedDue] = useState(null);
  const [customDue, setCustomDue] = useState('');

  const dueDateOptions = getDueDateOptions();
  const sellingPrice = parseFloat(amount) || 0;
  const cost = parseFloat(costPrice) || 0;
  const qty = parseFloat(quantity) || 1;
  const belowCost = !isCredit && cost > 0 && sellingPrice < cost * qty;

  const hasDueDate = isCredit ? (selectedDue !== null && selectedDue !== undefined && selectedDue !== 'custom') || (selectedDue === 'custom' && customDue) : true;
  const canSave = item.trim() && sellingPrice > 0 && hasDueDate;

  const getEffectiveDueDate = () => {
    if (selectedDue === 'custom' && customDue) {
      return new Date(customDue).getTime();
    }
    return selectedDue;
  };

  const handleSave = () => {
    if (!canSave) return;

    const transaction = {
      type,
      item_name: item.trim(),
      quantity: isCredit ? 1 : qty,
      amount: sellingPrice,
      cost_price: isCredit ? 0 : cost,
      profit: (!isCredit && cost > 0) ? (sellingPrice - cost * qty) : null,
      is_credit: isCredit,
      due_date: isCredit ? getEffectiveDueDate() : null,
      created_at: Date.now(),
    };

    onSave(transaction);
  };

  const colorMap = {
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-3xl z-10 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
            <button
              onClick={onCancel}
              aria-label="Close"
              className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2 text-base">{config.itemLabel}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={e => setItem(e.target.value)}
                placeholder={config.itemPlaceholder}
                className="flex-1 p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none text-base min-h-[52px]"
              />
              {!isCredit && <VoiceButton onResult={setItem} />}
            </div>
          </div>

          {!isCredit && (
            <div>
              <label className="block text-gray-700 font-medium mb-2 text-base">How many?</label>
              <input
                type="number"
                inputMode="numeric"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
                className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none text-base min-h-[52px]"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-2 text-base">{config.amountLabel}</label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full p-4 pr-16 border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none text-base min-h-[52px]"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">birr</span>
            </div>
          </div>

          {isCredit && (
            <div>
              <label className="block text-gray-700 font-medium mb-2 text-base">When is it due?</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {dueDateOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedDue(opt.value)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[52px] ${
                      selectedDue === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold">{opt.label.split(' ')[0]}</div>
                    <div className="text-xs opacity-70">{opt.display}</div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDue('custom')}
                className={`w-full p-3 rounded-xl border-2 text-sm font-medium transition-colors min-h-[52px] ${
                  selectedDue === 'custom'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                Pick Date
              </button>
              {isCredit && !hasDueDate && (
                <p className="text-xs text-amber-600 mt-1">Please select a due date</p>
              )}
              {selectedDue === 'custom' && (
                <input
                  type="date"
                  value={customDue}
                  onChange={e => setCustomDue(e.target.value)}
                  className="w-full mt-2 p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none text-base"
                />
              )}
            </div>
          )}

          {!isCredit && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1 text-blue-600 text-sm font-medium py-1 min-h-[44px]"
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Advanced (optional)
              </button>

              {showAdvanced && (
                <div className="mt-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="block text-gray-600 text-sm font-medium mb-2">
                    What did you pay for this? <span className="text-gray-400">(per unit)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={costPrice}
                      onChange={e => setCostPrice(e.target.value)}
                      placeholder="0"
                      className="w-full p-4 pr-16 border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none text-base min-h-[52px]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">birr</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Optional — helps you see your true profit</p>

                  {belowCost && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-700">You are selling below cost. You may lose money on this sale.</p>
                    </div>
                  )}

                  {cost > 0 && !belowCost && sellingPrice > 0 && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <p className="text-xs text-emerald-700 font-medium">
                        Profit on this sale: {(sellingPrice - cost * qty).toLocaleString()} birr
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full p-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all min-h-[56px] ${
              canSave
                ? `${colorMap[config.color]} active:scale-95`
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-5 h-5" />
            {config.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionForm;
