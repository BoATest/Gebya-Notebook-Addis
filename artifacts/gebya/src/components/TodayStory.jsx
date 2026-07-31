import { useMemo } from 'react';
import { computeTodayStory } from '../utils/shopStory';
import { usePrivacy } from '../context/PrivacyContext';

export default function TodayStory({
  metrics,
  staffSummary = null,
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
      background: 'var(--color-surface)',
      borderRadius: 12,
      border: '1px solid #ece6d6',
      padding: '14px 16px',
      marginTop: 4,
    }}>
      <p style={{
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-text-muted)',
        lineHeight: 1.6,
        fontStyle: 'italic',
      }}>
        {hidden ? '••••••••••••••••••••••••••••••' : `"${story}"`}
      </p>
    </div>
  );
}
