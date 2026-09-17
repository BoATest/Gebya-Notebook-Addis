import { useEffect, useRef, useState } from 'react';
import { useLang } from '../../context/LangContext';
import {
  computeSetupChecklist,
  SETUP_CHECK_COUNT,
  stampSetupCompletedAtIfComplete,
} from '../../utils/setupReadiness';
import { LABELS } from '../../labels';

/**
 * Presentation only — label, CTA and navigation target per checklist slot.
 *
 * The DONE / NOT-DONE decision is NOT made here. It comes from
 * `setupReadiness.computeSetupChecklist()`, the single definition shared with
 * the `setup_completed_at` metric, because R2-PLAN is explicit that "the
 * metric's definition = the checklist's definition; they must never diverge."
 * Order must match CHECKS in `utils/setupReadiness.js`.
 *
 * `tab` is present only on the payment-channel row: it navigates to the MONEY
 * tab, while every other row opens a card in place (see onAction below).
 *
 * Strings come from the central labels module (R2.1); byte-identity is
 * unit-locked in tests/labels-settings.spec.ts.
 */
const L = LABELS.settings.readiness;
const CHECK_META = [
  { key: 'profile', label: L.setName, cta: L.ctaAdd },
  { key: 'profile', label: L.setPhone, cta: L.ctaAdd },
  { key: 'channels', tab: 'money', label: L.setUpChannel, cta: L.ctaSetup },
  { key: 'items', label: L.addItems, cta: L.ctaAdd },
  { key: 'recurring', label: L.addRecurring, cta: L.ctaRecord },
];

export default function ReadinessHero({ shopProfile, paymentChannels = [], catalogEntries = [], recurring = [], lang, onAction }) {
  const [expanded, setExpanded] = useState(true);

  const name = shopProfile?.name || '';
  const initials = (() => {
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
  })();

  // The shared definition (see utils/setupReadiness.js).
  const checklist = computeSetupChecklist({ shopProfile, paymentChannels, catalogEntries, recurring });
  const checks = CHECK_META.map((meta, idx) => ({
    ...meta,
    done: checklist[idx]?.done === true,
    label: meta.label[lang] || meta.label.en,
    cta: meta.cta[lang] || meta.cta.en,
  }));

  const doneCount = checks.filter(c => c.done).length;
  const totalCount = SETUP_CHECK_COUNT;
  const allDone = doneCount === totalCount;

  // Gate D (Ruling 1): backfill-on-encounter. A shop that reached 5/5 before
  // this shipped is stamped the next time its owner opens the checklist, so the
  // completion metric is not undercounted by history. Write-if-null lives in
  // the helper (immutable — first stamp wins, so an old backup restore cannot
  // overwrite a real timestamp).
  const stampAttempted = useRef(false);
  useEffect(() => {
    if (stampAttempted.current || !allDone) return;
    stampAttempted.current = true;
    stampSetupCompletedAtIfComplete({ shopProfile, paymentChannels, catalogEntries, recurring })
      .catch(() => { stampAttempted.current = false; }); // non-critical; retry on next encounter
  }, [allDone, shopProfile, paymentChannels, catalogEntries, recurring]);

  if (allDone) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}
      >
        <div
          className="px-4 py-3.5 flex items-center gap-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div style={{ fontSize: '1.2rem' }}>✓</div>
          <div className="text-sm font-bold">
            {L.allSetUp[lang]}
          </div>
          <div className="text-xs ml-auto opacity-70">
            {L.details[lang]} ›
          </div>
        </div>
        {expanded && (
          <div className="px-4 pb-3 space-y-1.5">
            {checks.map((check, idx) => (
              <div key={`done-${check.key}-${idx}`} className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--color-success-text)' }}>
                <span style={{ fontSize: '0.8rem' }}>✓</span>
                <span className="flex-1">{check.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)', color: 'var(--color-bg-white)' }}
    >
      <div
        className="px-4 py-3.5 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: 'var(--color-accent-amber)', border: '2px solid rgba(255,255,255,0.25)' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black">{name || L.shopFallback[lang]}</div>
          <div className="text-xs mt-0.5" style={{ opacity: 0.7 }}>
            {L.progressOf[lang](doneCount, totalCount)}
          </div>
        </div>
        <div className="text-xs font-bold" style={{ opacity: 0.6 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          {checks.filter(c => !c.done).map((check, idx) => (
            <div
              key={`${check.key}-${idx}`}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-warning)' }} />
              <span className="text-xs font-bold flex-1">{check.label}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.(check.key, check.tab);
                }}
                className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'var(--color-warning-border)', color: 'var(--color-primary)', border: 'none', cursor: 'pointer' }}
              >
                {check.cta}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
