import { useState } from 'react';
import { ArrowLeft, Phone, CheckCircle2, DollarSign, Clock } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { formatEthiopian, getCreditStatus } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/numformat';

function CreditDetail({ record, onBack, onPartialPayment, onFullPayment }) {
  const { t } = useLang();
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
      <button onClick={onBack} className="flex items-center gap-2 min-h-[44px] -ml-1"
        style={{ color: '#c47c1a' }}>
        <ArrowLeft className="w-5 h-5" />
        <span className="font-semibold">{t.backToCredit}</span>
      </button>

      <div className="rounded-2xl p-5 shadow-sm border" style={{ background: '#fff', borderColor: '#f0e6d4' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900">{record.customer_name}</h2>
            <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
              {t.due} {record.due_date ? formatEthiopian(record.due_date) : '—'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBgMap[status.color]}`}>
            {status.label}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: '#6b7280' }}>{t.originalDebt}</span>
            <span className="font-semibold text-gray-800">{fmt(record.original_amount)} {t.birr}</span>
          </div>
          {record.paid_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#6b7280' }}>{t.amountPaid}</span>
              <span className="font-semibold text-green-700">-{fmt(record.paid_amount)} {t.birr}</span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between" style={{ borderColor: '#f0e6d4' }}>
            <span className="font-bold text-gray-700">{t.stillOwes}</span>
            <span className="font-black text-red-600 text-xl">{fmt(record.remaining_amount || 0)} {t.birr}</span>
          </div>
        </div>

        {record.original_amount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: '#9ca3af' }}>
              <span>{t.progress}</span>
              <span>{paidPercent}{t.percentPaid}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${paidPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowPartial(v => !v)}
          className="flex flex-col items-center gap-1.5 p-4 rounded-2xl font-semibold min-h-[72px] active:scale-95 transition-all border"
          style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-sm">{t.paidSome}</span>
        </button>

        <button
          onClick={() => onFullPayment(record.id)}
          className="flex flex-col items-center gap-1.5 p-4 rounded-2xl font-semibold min-h-[72px] active:scale-95 transition-all border"
          style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm">{t.allPaid}</span>
        </button>
      </div>

      {record.customer_phone && (
        <a href={`tel:${record.customer_phone}`}
          className="flex items-center justify-center gap-2 p-4 rounded-2xl font-semibold min-h-[56px] border"
          style={{ background: '#fafafa', borderColor: '#e5e7eb', color: '#374151' }}>
          <Phone className="w-5 h-5" />
          {t.call} {record.customer_name}
        </a>
      )}

      {showPartial && (
        <div className="rounded-2xl p-5 shadow-sm border" style={{ background: '#fff', borderColor: '#f0e6d4' }}>
          <h3 className="font-bold text-gray-800 mb-3">{t.recordPartialPayment}</h3>
          <div className="relative mb-3">
            <input
              type="number"
              inputMode="decimal"
              value={partialAmount}
              onChange={e => setPartialAmount(e.target.value)}
              placeholder="0"
              max={record.remaining_amount}
              className="w-full p-4 pr-16 border-2 border-gray-200 rounded-2xl focus:outline-none text-base min-h-[52px]"
              style={{ borderColor: '#f0e6d4' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{t.birr}</span>
          </div>
          <button
            onClick={handlePartial}
            disabled={!parseFloat(partialAmount)}
            className="w-full p-4 rounded-2xl font-bold text-white disabled:opacity-40 min-h-[52px]"
            style={{ background: '#c47c1a' }}
          >
            {t.recordPayment}
          </button>
        </div>
      )}

      <div className="rounded-2xl p-4 border" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1" style={{ color: '#78350f' }}>
          <Clock className="w-4 h-4" /> {t.paymentHistory}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: '#6b7280' }}>{t.borrowed}</span>
            <span className="text-gray-800 font-medium">{fmt(record.original_amount)} {t.birr}</span>
          </div>
          {record.paid_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#6b7280' }}>{t.paidBack}</span>
              <span className="font-medium text-green-700">{fmt(record.paid_amount)} {t.birr}</span>
            </div>
          )}
          {record.remaining_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: '#6b7280' }}>{t.remaining}</span>
              <span className="font-medium text-red-600">{fmt(record.remaining_amount)} {t.birr}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreditDetail;
