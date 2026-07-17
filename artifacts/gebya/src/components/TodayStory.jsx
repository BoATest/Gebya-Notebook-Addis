import { useMemo } from 'react';
import { computeTodayStory } from '../utils/shopStory';
import { usePrivacy } from '../context/PrivacyContext';

export default function TodayStory({
  metrics,
  staffSummary,
  overdueCount,
  overdueAmount,
  closingDone,
  cashVariance,
  creditCollected,
  expenseCount,
  lang,
}) {
  const { hidden } = usePrivacy();

  const story = useMemo(() => computeTodayStory({
    metrics, staffSummary, overdueCount, overdueAmount, closingDone,
    cashVariance, creditCollected, expenseCount, lang,
  }), [metrics, staffSummary, overdueCount, overdueAmount, closingDone,
    cashVariance, creditCollected, expenseCount, lang]);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #ece6d6',
      padding: '14px 16px',
      marginTop: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>📖</span>
        <h3 style={{ fontSize: 12, fontWeight: 900, color: '#1f2937', letterSpacing: '0.03em' }}>
          {lang === 'am' ? 'የዛሬ ታሪክ' : 'TODAY\'S STORY'}
        </h3>
      </div>
      <p style={{
        fontSize: 13,
        fontWeight: 500,
        color: '#4b5563',
        lineHeight: 1.6,
        fontStyle: 'italic',
      }}>
        {hidden ? '••••••••••••••••••••••••••••••' : `"${story}"`}
      </p>
    </div>
  );
}
