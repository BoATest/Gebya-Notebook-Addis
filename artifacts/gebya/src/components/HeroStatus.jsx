import { useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { computeHeroStatus } from '../utils/shopStory';

export default function HeroStatus({
  metrics,
  closingDone,
  cashVariance,
  overdueCount,
  staffRows,
  period,
  lang,
  onAction,
}) {
  const { hidden } = usePrivacy();

  const status = useMemo(() => computeHeroStatus({
    metrics, closingDone, cashVariance, overdueCount, staffRows, period, lang,
  }), [metrics, closingDone, cashVariance, overdueCount, staffRows, period, lang]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
      borderRadius: 16,
      border: '1px solid #bbf7d0',
      padding: '16px 18px',
      marginTop: 4,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1B4332', marginBottom: 6, lineHeight: 1.4 }}>
        {hidden ? '••••••' : status.sentence}
      </p>
      <button
        type="button"
        onClick={() => onAction?.(status.actionType)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          borderRadius: 10,
          border: 'none',
          background: '#1B4332',
          color: '#fff',
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {status.cta}
      </button>
    </div>
  );
}
