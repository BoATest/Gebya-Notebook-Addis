import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useLang } from '../context/LangContext';
import { fmt } from '../utils/format';

function PrivacyToggle({ value, label, suffix, className = '' }) {
  const { hidden, toggle } = usePrivacy();
  const { t } = useLang();

  const suffixText = suffix || t.birr;
  const labelText = label || t.todaysSales;

  const displayValue = hidden
    ? '••••••'
    : `${typeof value === 'number' ? fmt(value) : value} ${suffixText}`;

  return (
    <button
      onClick={toggle}
      aria-label={hidden ? t.tapToRevealAria : t.hideAmountAria}
      className={`w-full text-left rounded-2xl p-5 shadow-sm border active:scale-95 transition-transform cursor-pointer ${className}`}
      style={{ background: '#fff', borderColor: '#f0e6d4' }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#92400e' }}>{labelText}</span>
        {hidden
          ? <EyeOff className="w-5 h-5" style={{ color: '#c47c1a' }} />
          : <Eye className="w-5 h-5" style={{ color: '#c47c1a' }} />
        }
      </div>
      <div className="text-4xl font-black tracking-tight" style={{ color: hidden ? '#d1d5db' : '#14532d' }}>
        {displayValue}
      </div>
      {hidden && (
        <div className="text-xs mt-1" style={{ color: '#c47c1a' }}>{t.tapToReveal}</div>
      )}
    </button>
  );
}

export default PrivacyToggle;
