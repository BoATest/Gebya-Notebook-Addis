import { useLang } from '../context/LangContext';

const PERIOD_ICONS = {
  morning: '☀️',
  afternoon: '⛅',
  evening: '🌙',
  night: '🌙',
};

export default function ShopPulse({
  shopName,
  period = 'morning',
  greeting,
  observations = [],
  focusItems = [],
}) {
  const { lang } = useLang();

  const greetingText = lang === 'am'
    ? `${greeting?.am || 'እንደምን አደርክ'}${shopName ? `፣ ${shopName}` : ''}`
    : `${greeting?.en || 'Good morning'}${shopName ? `, ${shopName}` : ''}`;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
        border: '1px solid #fde68a',
        borderRadius: 16,
        padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: observations.length > 0 ? 10 : 0 }}>
        <span style={{ fontSize: 22 }}>{PERIOD_ICONS[period] || '☀️'}</span>
        <p style={{ fontSize: 15, fontWeight: 900, color: '#1f2937', lineHeight: 1.3 }}>
          {greetingText}
        </p>
      </div>

      {observations.length > 0 && (
        <div style={{ marginBottom: focusItems.length > 0 ? 14 : 0 }}>
          {observations.map((obs, i) => (
            <p
              key={i}
              style={{
                fontSize: i === 0 ? 13 : 12,
                fontWeight: i === 0 ? 700 : 500,
                color: '#4b5563',
                lineHeight: 1.5,
                marginTop: i === 0 ? 0 : 3,
              }}
            >
              {obs}
            </p>
          ))}
        </div>
      )}

      {focusItems.length > 0 && (
        <div>
          <p style={{
            fontSize: 10,
            fontWeight: 900,
            color: '#92400e',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
            marginTop: 2,
          }}>
            {lang === 'am' ? 'የዛሬ ትኩረት' : "Today's focus"}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {focusItems.slice(0, 3).map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.7)',
                  borderRadius: 10,
                  cursor: item.action ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (item.action === 'count_cash') {
                    const el = document.querySelector('[data-section="closing"]');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  } else if (item.action === 'sale') {
                    window.dispatchEvent(new CustomEvent('gebya:open-form', { detail: { type: 'sale' } }));
                  }
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon || '•'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1f2937' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
