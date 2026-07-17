import { useMemo } from 'react';
import { computeRecommendations } from '../utils/shopStory';

export default function WhatINoticed({
  metrics,
  priorMetrics,
  staffSummary,
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
    <div style={{ marginTop: 14 }}>
      <h3 style={{ fontSize: 12, fontWeight: 900, color: '#1f2937', marginBottom: 6, letterSpacing: '0.03em' }}>
        {lang === 'am' ? 'ያስተዋልኩት' : 'WHAT I NOTICED'}
      </h3>
      {recs.map((rec, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 10,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          marginBottom: 4,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', lineHeight: 1.4 }}>
            {rec}
          </p>
        </div>
      ))}
    </div>
  );
}
