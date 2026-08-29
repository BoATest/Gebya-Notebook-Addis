export default function ReconStatusBadge({ status, lang }) {
  const t = (en, am) => lang === 'am' ? am : en;
  const STATUSES = {
    staff_submitted: { label: t('Waiting for your review', 'ሰራተኛ ልኳል'), bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
    owner_reviewed: { label: t('You reviewed — needs finalize', 'ባለቤት ተመልክቷል'), bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    disputed: { label: t('Difference found', 'አልተስማማም'), bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
    finalized: { label: t('Settled', 'ተጠናቋል'), bg: 'var(--color-success-bg)', color: 'var(--color-success-text)' },
    checked: { label: t('Counted directly', 'ተፈትሟል'), bg: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' },
  };
  const s = STATUSES[status] || STATUSES.checked;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}
