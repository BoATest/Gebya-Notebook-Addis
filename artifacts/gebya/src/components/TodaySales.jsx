import { Eye, EyeOff } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { usePrivacy } from '../context/PrivacyContext';
import { fmt } from '../utils/numformat';
import { getCurrentEthiopianDate } from '../utils/ethiopianCalendar';
import { heroFontSize } from '../utils/todaySummary';

export default function TodaySales({
  salesTotal = 0,
  cashTotal = 0,
  digitalTotal = 0,
  entryCount = 0,
}) {
  const { lang } = useLang();
  const { hidden, toggle } = usePrivacy();

  const heroStyle = heroFontSize(salesTotal);
  const todayDateShort = new Date().toLocaleDateString('en', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e8e2d8',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {lang === 'am' ? 'የዛሬ ሽያጭ' : "Today's Sales"}
          <span style={{ fontWeight: 600, color: '#9ca3af', textTransform: 'none', marginLeft: 6 }}>
            {getCurrentEthiopianDate()} · {todayDateShort}
          </span>
        </p>
        <button
          onClick={toggle}
          aria-label="Toggle privacy"
          style={{
            minHeight: 32,
            padding: '4px 8px',
            border: hidden ? '1px solid #fde68a' : '1px solid transparent',
            borderRadius: 999,
            background: hidden ? 'rgba(196,136,58,0.10)' : 'transparent',
            color: hidden ? '#92400e' : '#9ca3af',
            fontSize: 10,
            fontWeight: hidden ? 700 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {hidden && <span>{lang === 'am' ? 'አሳይ' : 'Show'}</span>}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: heroStyle.size, fontWeight: 900, color: '#1f2937', lineHeight: heroStyle.lineHeight }}>
          {hidden ? '••••' : fmt(salesTotal)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af' }}>
          {lang === 'am' ? 'ብር' : 'ETB'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>
          {entryCount} {lang === 'am' ? 'ምዝገባ' : 'entries'}
        </span>
        {cashTotal > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
            💵 {hidden ? '••••' : fmt(cashTotal)}
          </span>
        )}
        {digitalTotal > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>
            📱 {hidden ? '••••' : fmt(digitalTotal)}
          </span>
        )}
      </div>

      <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        🔒 {lang === 'am'
          ? 'በዚህ ስልክ ብቻ ይቀመጣል'
          : 'Saved on this phone'}
      </p>
    </div>
  );
}
