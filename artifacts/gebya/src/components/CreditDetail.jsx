import { useState } from 'react';
import { ArrowLeft, Phone, CheckCircle2, DollarSign, Clock } from 'lucide-react';
import { formatEthiopian, getCreditStatus } from '../utils/ethiopianCalendar';

function CreditDetail({ record, onBack, onPartialPayment, onFullPayment }) {
  const [showPartial, setShowPartial] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');

  const status = getCreditStatus(record.due_date);

  const handlePartial = () => {
    const amt = parseFloat(partialAmount);
    if (!amt || amt <= 0) return;
    onPartialPayment(record.id, Math.min(amt, record.remaining_amount));
    setShowPartial(false);
    setPartialAmount('');
  };

  const paidPercent = record.original_amount > 0
    ? Math.round((record.paid_amount / record.original_amount) * 100)
    : 0;

  const statusBgMap = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 min-h-[44px] -ml-1"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Merro</span>
      </button>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{record.customer_name}</h2>
            <p className="text-gray-500 text-sm mt-1">
              Due {record.due_date ? formatEthiopian(record.due_date) : '—'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBgMap[status.color]}`}>
            {status.label}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Original debt</span>
            <span className="font-semibold text-gray-800">{record.original_amount.toLocaleString()} birr</span>
          </div>
          {record.paid_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount paid</span>
              <span className="font-semibold text-emerald-600">-{record.paid_amount.toLocaleString()} birr</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="font-bold text-gray-700">Still owes</span>
            <span className="font-bold text-red-600 text-lg">{(record.remaining_amount || 0).toLocaleString()} birr</span>
          </div>
        </div>

        {record.original_amount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{paidPercent}% paid</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowPartial(v => !v)}
          className="flex flex-col items-center gap-1 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-700 font-medium min-h-[72px] active:scale-95 transition-all"
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-sm">Paid Some</span>
        </button>

        <button
          onClick={() => onFullPayment(record.id)}
          className="flex flex-col items-center gap-1 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium min-h-[72px] active:scale-95 transition-all"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm">All Paid</span>
        </button>
      </div>

      {record.customer_phone && (
        <a
          href={`tel:${record.customer_phone}`}
          className="flex items-center justify-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-700 font-medium min-h-[56px]"
        >
          <Phone className="w-5 h-5" />
          Call {record.customer_name}
        </a>
      )}

      {showPartial && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-3">Record Partial Payment</h3>
          <div className="relative mb-3">
            <input
              type="number"
              inputMode="decimal"
              value={partialAmount}
              onChange={e => setPartialAmount(e.target.value)}
              placeholder="0"
              max={record.remaining_amount}
              className="w-full p-4 pr-16 border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none text-base min-h-[52px]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">birr</span>
          </div>
          <button
            onClick={handlePartial}
            disabled={!parseFloat(partialAmount)}
            className="w-full p-4 bg-blue-500 text-white rounded-2xl font-bold disabled:bg-gray-200 disabled:text-gray-400 min-h-[52px]"
          >
            Record Payment
          </button>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <h3 className="font-semibold text-gray-600 text-sm mb-3 flex items-center gap-1">
          <Clock className="w-4 h-4" /> History
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Borrowed</span>
            <span className="text-gray-800 font-medium">{record.original_amount.toLocaleString()} birr</span>
          </div>
          {record.paid_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid back</span>
              <span className="text-emerald-600 font-medium">{record.paid_amount.toLocaleString()} birr</span>
            </div>
          )}
          {record.remaining_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Remaining</span>
              <span className="text-red-500 font-medium">{record.remaining_amount.toLocaleString()} birr</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreditDetail;
