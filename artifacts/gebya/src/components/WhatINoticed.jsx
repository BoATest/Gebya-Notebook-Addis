import { useMemo } from 'react';
import { computeRecommendations } from '../utils/shopStory';

const TONE_STYLES = {
  positive: { icon: '💡', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)' },
  warning: { icon: '⚠️', bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)' },
  neutral: { icon: '👀', bg: 'var(--color-surface)', border: 'var(--color-border)' },
};

export default function WhatINoticed({
  metrics,
  priorMetrics,
  staffSummary = null,
  overdueCount,
  closingDone,
  creditCollected,
  lang,
}) {
  const recs = useMemo(() => computeRecommendations({
    metrics, priorMetrics, staffSummary, overdueCount, closingDone, creditCollected, lang,
  }), [metrics, priorMetrics, staffSummary, overdueCount, closingDone, creditCollected, lang]);

  if (recs.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      {recs.map((rec, i) => {
        const tone = TONE_STYLES[rec.tone] || TONE_STYLES.neutral;
        return (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 10,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            marginBottom: 4,
          }}>
            <span aria-hidden="true" style={{ fontSize: 14, flexShrink: 0 }}>{tone.icon}</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.45 }}>
              {rec.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
