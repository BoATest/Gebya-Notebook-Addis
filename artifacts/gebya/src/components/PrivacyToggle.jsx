import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useLang } from '../context/LangContext';
import { fmt } from '../utils/numformat';

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
      className={`w-full text-left p-5 active:scale-95 transition-transform cursor-pointer press-scale ${className}`}
      style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold uppercase tracking-wide font-sans" style={{ color: '#1B4332' }}>{labelText}</span>
        {hidden
          ? <EyeOff className="w-5 h-5" style={{ color: '#C4883A' }} />
          : <Eye className="w-5 h-5" style={{ color: '#C4883A' }} />
        }
      </div>
      <div className="text-4xl font-black tracking-tight font-sans" style={{ color: hidden ? '#d1d5db' : '#14532d' }}>
        {displayValue}
      </div>
      {hidden && (
        <div className="text-xs mt-1 font-sans" style={{ color: '#C4883A' }}>{t.tapToReveal}</div>
      )}
    </button>
  );
}

export default PrivacyToggle;
