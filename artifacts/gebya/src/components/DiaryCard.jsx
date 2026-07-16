import { getCurrentEthiopianDate } from '../utils/ethiopianCalendar';

export default function DiaryCard({ diary, lang = 'en' }) {
  if (!diary) return null;

  const todayDate = new Date().toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '14px 16px',
        border: '1px solid #ece6d6',
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
        📖 {getCurrentEthiopianDate()} · {todayDate}
      </p>
      <p style={{
        fontSize: 13,
        color: '#1f2937',
        lineHeight: 1.6,
        fontStyle: 'italic',
        fontWeight: 500,
      }}>
        {diary}
      </p>
    </div>
  );
}
