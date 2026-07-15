// DiarySection.jsx — "What should I remember?"
//
// Auto-generated one-sentence summary.
// The feature that turns the app from a tool into a companion.
// No POS has this. No accounting software has this.

import { getCurrentEthiopianDate } from '../../utils/ethiopianCalendar';
import Chapter from './Chapter';

export default function DiarySection({ diary, lang = 'en' }) {
  if (!diary) return null;

  const todayDate = new Date().toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Chapter
      title={lang === 'am' ? 'የሱቅ ታሪክ' : 'Shop Diary'}
      subtitle={lang === 'am' ? 'ምን ማስታወሻ አለ?' : 'What should you remember?'}
      defaultExpanded={true}
    >
      <div style={{
        background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
        border: '1px solid #fde68a',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
      }}>
        <p style={{
          fontSize: 10,
          fontWeight: 800,
          color: '#92400e',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}>
          {getCurrentEthiopianDate()} · {todayDate}
        </p>
        <p style={{
          fontSize: 14,
          color: '#1f2937',
          lineHeight: 1.6,
          fontStyle: 'italic',
        }}>
          {diary}
        </p>
      </div>
    </Chapter>
  );
}
