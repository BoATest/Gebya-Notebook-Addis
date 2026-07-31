import { useState, useId } from 'react';

export default function TabCard({ icon, title, subtitle, badge, badgeTone, children, open: openProp, onToggle, id, defaultOpen }) {
  const [internalOpen, setInternalOpen] = useState(!!defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const uid = useId();
  const panelId = id ? `${id}-panel` : `tabcard-${uid}-panel`;
  const btnId = id ? `${id}-btn` : `tabcard-${uid}-btn`;

  const handleToggle = () => {
    if (isControlled) onToggle?.(!open);
    else setInternalOpen(!open);
  };

  const toneStyles = {
    ok: { bg: 'var(--color-success-bg)', color: 'var(--color-success-text)' },
    warn: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    neutral: { bg: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' },
  };
  const tone = toneStyles[badgeTone] || toneStyles.neutral;

  return (
    <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden mb-2.5">
      <button
        type="button"
        id={btnId}
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: 'var(--color-surface-subtle)' }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-gray-900 truncate">{title}</div>
          {subtitle && <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>}
        </div>
        {badge && (
          <span className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: tone.bg, color: tone.color }}>
            {badge}
          </span>
        )}
        <span style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ›
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.22s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-1 pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
