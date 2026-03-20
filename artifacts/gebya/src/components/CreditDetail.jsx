import { useState } from 'react';
import { ArrowLeft, Phone, CheckCircle2, Clock, Banknote, Building2, Smartphone } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { formatEthiopian, getCreditStatus } from '../utils/ethiopianCalendar';
import { fmt, fmtInput, parseInput } from '../utils/numformat';

const METHOD_ICONS = {
  cash: Banknote,
  bank: Building2,
  mobile: Smartphone,
};

const METHOD_COLORS = {
  cash: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badge: '#dcfce7', badgeText: '#166534' },
  bank: { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#dbeafe', badgeText: '#1e40af' },
  mobile: { bg: '#faf5ff', border: '#e9d5ff', text: '#7c3aed', badge: '#ede9fe', badgeText: '#5b21b6' },
};

const DEFAULT_BADGE_COLORS = { badge: '#f3f4f6', badgeText: '#6b7280' };

function MethodBadge({ method, t }) {
  if (!method) return null;
  const Icon = METHOD_ICONS[method] || null;
  const colors = METHOD_COLORS[method] || DEFAULT_BADGE_COLORS;
  const label = method === 'cash' ? t.payMethodCash
    : method === 'bank' ? t.payMethodBank
    : method === 'mobile' ? t.payMethodMobile
    : method;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold font-sans"
      style={{ background: colors.badge, color: colors.badgeText, borderRadius: 'var(--radius-xl)' }}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
    </span>
  );
}

function CreditDetail({ record, onBack, onPartialPayment, onFullPayment, paymentLogs = [] }) {
  const { t } = useLang();
  const [rawAmount, setRawAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);

  const status = getCreditStatus(record.due_date);
  const remaining = record.remaining_amount || 0;

  const handleAmountChange = (e) => {
    const raw = parseInput(e.target.value);
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
    setRawAmount(raw);
    setAmountError('');
    const num = parseFloat(raw);
    if (!isNaN(num) && num > remaining) {
      setAmountError(t.paymentExceedsOwed || `Maximum is ${fmt(remaining)} birr`);
    }
  };

  const parsedAmt = parseFloat(rawAmount) || 0;
  const isOverLimit = parsedAmt > remaining;

  const handlePartial = () => {
    if (!parsedAmt || parsedAmt <= 0) return;
    if (isOverLimit) {
      setAmountError(t.paymentExceedsOwed || `Maximum is ${fmt(remaining)} birr`);
      return;
    }
    onPartialPayment(record.id, parsedAmt, selectedMethod);
    setRawAmount('');
    setAmountError('');
    setSelectedMethod(null);
  };

  const handleFull = () => {
    onFullPayment(record.id, selectedMethod);
    setSelectedMethod(null);
  };

  const toggleMethod = (method) => {
    setSelectedMethod(prev => prev === method ? null : method);
  };

  const paidPercent = record.original_amount > 0
    ? Math.round((record.paid_amount / record.original_amount) * 100)
    : 0;

  const statusBgMap = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const methods = [
    { key: 'cash', label: t.payMethodCash, Icon: Banknote },
    { key: 'bank', label: t.payMethodBank, Icon: Building2 },
    { key: 'mobile', label: t.payMethodMobile, Icon: Smartphone },
  ];

  const hasLogs = paymentLogs.length > 0;
  const sortedLogs = [...paymentLogs].sort((a, b) => b.paid_at - a.paid_at);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 min-h-[44px] -ml-1 press-scale font-sans"
        style={{ color: '#1B4332' }}>
        <ArrowLeft className="w-5 h-5" />
        <span className="font-semibold">{t.backToCredit}</span>
      </button>

      <div className="p-5 border animate-elastic texture-noise" style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 font-serif">{record.customer_name}</h2>
            <p className="text-sm mt-1 font-sans" style={{ color: '#6b7280' }}>
              {t.due} {record.due_date ? formatEthiopian(record.due_date) : '—'}
            </p>
          </div>
          <span className={`px-3 py-1 text-xs font-bold border font-sans ${statusBgMap[status.color]}`} style={{ borderRadius: 'var(--radius-xl)' }}>
            {status.label}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-sans" style={{ color: '#6b7280' }}>{t.originalDebt}</span>
            <span className="font-semibold text-gray-800 font-sans">{fmt(record.original_amount)} {t.birr}</span>
          </div>
          {record.paid_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-sans" style={{ color: '#6b7280' }}>{t.amountPaid}</span>
              <span className="font-semibold text-green-700 font-sans">-{fmt(record.paid_amount)} {t.birr}</span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <span className="font-bold text-gray-700 font-sans">{t.stillOwes}</span>
            <span className="font-black text-red-600 text-xl font-sans">{fmt(record.remaining_amount || 0)} {t.birr}</span>
          </div>
        </div>

        {record.original_amount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1 font-sans" style={{ color: '#9ca3af' }}>
              <span>{t.progress}</span>
              <span>{paidPercent}{t.percentPaid}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{ width: `${paidPercent}%`, background: '#1B4332' }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-5 border animate-elastic" style={{ background: '#fff', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
        <h3 className="font-bold text-gray-800 mb-3 font-sans">{t.recordPayment}</h3>
        <div className="relative mb-1">
          <input
            type="text"
            inputMode="decimal"
            value={fmtInput(rawAmount)}
            onChange={handleAmountChange}
            placeholder="0"
            className="w-full p-4 pr-16 border-2 focus:outline-none text-xl font-bold min-h-[56px] font-sans"
            style={{
              borderRadius: 'var(--radius-md)',
              borderColor: amountError ? '#ef4444' : rawAmount ? '#1B4332' : 'var(--color-border)',
            }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium font-sans">{t.birr}</span>
        </div>
        {amountError && (
          <p className="text-xs font-semibold text-red-500 mb-2 px-1 font-sans">{amountError}</p>
        )}
        {!amountError && <div className="mb-3" />}

        <div className="flex gap-2 mb-4">
          {methods.map(({ key, label, Icon }) => {
            const colors = METHOD_COLORS[key];
            const active = selectedMethod === key;
            return (
              <button
                key={key}
                onClick={() => toggleMethod(key)}
                className="flex-1 flex flex-col items-center gap-1 py-2 px-1 border-2 font-semibold text-xs transition-all font-sans"
                style={{
                  borderRadius: 'var(--radius-md)',
                  background: active ? colors.bg : '#fafafa',
                  borderColor: active ? colors.border : '#e5e7eb',
                  color: active ? colors.text : '#9ca3af',
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handlePartial}
          disabled={!parsedAmt || isOverLimit}
          className="w-full p-4 font-bold text-white disabled:opacity-40 min-h-[52px] press-scale font-sans"
          style={{ background: '#1B4332', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
        >
          {t.recordPayment}
        </button>

        <button
          onClick={handleFull}
          className="w-full mt-2 p-3 font-semibold border-2 min-h-[44px] press-scale font-sans flex items-center justify-center gap-2"
          style={{ borderColor: '#1B4332', color: '#1B4332', borderRadius: 'var(--radius-md)', background: 'transparent' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {t.markFullyPaid}
        </button>
      </div>

      {record.customer_phone && (
        <a href={`tel:${record.customer_phone}`}
          className="flex items-center justify-center gap-2 p-4 font-semibold min-h-[56px] border press-scale font-sans"
          style={{ background: '#fafafa', borderColor: '#e5e7eb', color: '#374151', borderRadius: 'var(--radius-md)' }}>
          <Phone className="w-5 h-5" />
          {t.call} {record.customer_name}
        </a>
      )}

      <div className="p-4 border animate-elastic stagger-3" style={{ background: 'rgba(27,67,50,0.04)', borderColor: 'rgba(27,67,50,0.15)', borderRadius: 'var(--radius-md)' }}>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-1 font-sans" style={{ color: '#1B4332' }}>
          <Clock className="w-4 h-4" /> {t.paymentHistory}
        </h3>
        {hasLogs ? (
          <div className="space-y-2">
            {sortedLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0" style={{ borderColor: 'rgba(27,67,50,0.1)' }}>
                <div className="flex flex-col gap-0.5">
                  <span className="font-sans text-xs" style={{ color: '#6b7280' }}>
                    {formatEthiopian(log.paid_at)}
                  </span>
                  {log.payment_method && <MethodBadge method={log.payment_method} t={t} />}
                </div>
                <span className="font-semibold text-green-700 font-sans">+{fmt(log.amount)} {t.birr}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-sans" style={{ color: '#6b7280' }}>{t.borrowed}</span>
              <span className="text-gray-800 font-medium font-sans">{fmt(record.original_amount)} {t.birr}</span>
            </div>
            {record.paid_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="font-sans" style={{ color: '#6b7280' }}>{t.paidBack}</span>
                <span className="font-medium text-green-700 font-sans">{fmt(record.paid_amount)} {t.birr}</span>
              </div>
            )}
            {record.remaining_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="font-sans" style={{ color: '#6b7280' }}>{t.remaining}</span>
                <span className="font-medium text-red-600 font-sans">{fmt(record.remaining_amount)} {t.birr}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreditDetail;
