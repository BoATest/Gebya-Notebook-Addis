import { useMemo } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import { computeHeroStatus } from '../utils/shopStory';

export default function HeroStatus({
  metrics,
  closingDone,
  cashVariance,
  overdueCount,
  staffRows = [],
  period,
  lang,
  onAction,
  isPast,
}) {
  const { hidden } = usePrivacy();

  const status = useMemo(() => {
    if (isPast && !closingDone) {
      return {
        sentence: lang === 'am'
          ? 'ይህ ቀን ገና አልተዘጋም'
          : 'This day hasn\'t been closed yet.',
        cta: lang === 'am' ? '✅ ዝጋ' : '✅ Close this day',
        actionType: 'retro_close',
      };
    }
    return computeHeroStatus({
      metrics, closingDone, cashVariance, overdueCount, staffRows, period, lang,
    });
  }, [metrics, closingDone, cashVariance, overdueCount, staffRows, period, lang, isPast]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--color-success-bg) 0%, var(--color-success-bg) 100%)',
      borderRadius: 16,
      border: '1px solid var(--color-success-border)',
      padding: '16px 18px',
      marginTop: 4,
    }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 6, lineHeight: 1.4 }}>
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
          background: 'var(--color-primary)',
          color: 'var(--color-bg-white)',
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
