import { useState } from 'react';
import { useLang } from '../../context/LangContext';
import { setPlanTier, shouldShowStaffQuota } from '../../utils/entitlements';
import { fireToast } from '../Toast';
import { X, Check, Sparkles } from 'lucide-react';
import { LABELS } from '../../labels';

// Strings come from the central labels module (R2.1); byte-identity is
// unit-locked in tests/labels-settings.spec.ts.
const L = LABELS.settings.plan;

const PLUS_FEATURES = [
  { key: 'staff', ...L.plusStaff },
  { key: 'tx', ...L.plusTx },
  { key: 'reports', ...L.plusReports },
  { key: 'multi', ...L.plusMulti },
  { key: 'support', ...L.plusSupport },
];

export default function PlanPanel({ tier, entitlements, staffCount, transactionCount }) {
  const { lang } = useLang();
  const [showModal, setShowModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  if (tier === 'plus') {
    return (
      <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm" style={{ background: 'var(--color-warning)', color: 'var(--color-primary)' }}>
            ★
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-gray-800">Gebya Plus</div>
            <div className="text-xs text-gray-500">✓ Active</div>
          </div>
        </div>
      </div>
    );
  }

  const staffPct = entitlements.max_staff === Infinity ? 0 : Math.round((staffCount / entitlements.max_staff) * 100);
  const txPct = entitlements.max_transactions_per_month === Infinity ? 0 : Math.round((transactionCount / entitlements.max_transactions_per_month) * 100);
  const nearLimit = (staffPct >= 80 || txPct >= 80);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await setPlanTier('plus');
      fireToast(L.upgradedToast[lang], 2500);
      setTimeout(() => window.location.reload(), 800);
    } catch {
      fireToast(L.upgradeFailedToast[lang], 2000);
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border overflow-hidden px-5 py-4" style={{ borderColor: nearLimit ? 'var(--color-danger-border)' : 'var(--color-warning-border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm" style={{ background: 'var(--color-warning)', color: 'var(--color-primary)' }}>
            ★
          </div>
          <div className="flex-1">
            <div className="text-sm font-black text-gray-800">{L.freeTitle[lang]}</div>
            <div className="text-xs text-gray-500">{L.freeSubtitle[lang]}</div>
          </div>
        </div>

        {/* Gate D (owner-ruled, UNCONDITIONAL): the staff quota row is hidden
            on the free plan entirely — staff is not enforced yet, and
            displaying an unenforced limit ("0/3" OR "2/3") is a trust bug.
            Policy lives in entitlements.shouldShowStaffQuota() so it stays
            unit-tested and cannot drift. The Monthly-tx row is deliberately
            NOT given the same treatment: 0/500 stays visible because that
            quota IS enforced and is the one thing a free-plan owner needs to
            understand before they hit it. */}
        {shouldShowStaffQuota(entitlements, staffCount) && (
          <div className="mb-2">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span style={{ color: 'var(--color-text-muted)' }}>{L.staffLabel[lang]}</span>
              <span style={{ color: 'var(--color-text)' }}>{staffCount}/{entitlements.max_staff}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(staffPct || 0, 100)}%`, background: (staffPct || 0) >= 100 ? 'var(--color-danger)' : 'var(--color-warning)' }} />
            </div>
          </div>
        )}

        {entitlements.max_transactions_per_month !== Infinity && (
          <div className="mb-3">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span style={{ color: 'var(--color-text-muted)' }}>{L.txLabel[lang]}</span>
              <span style={{ color: 'var(--color-text)' }}>{transactionCount}/{entitlements.max_transactions_per_month}</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--color-bg-hover)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(txPct || 0, 100)}%`, background: (txPct || 0) >= 100 ? 'var(--color-danger)' : 'var(--color-warning)' }} />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full mt-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all press-scale"
          style={{ background: 'var(--color-accent-amber)', color: 'var(--color-bg-white)' }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {L.upgradeCta[lang]}
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm animate-slide-up p-6"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm" style={{ background: 'var(--color-warning)', color: 'var(--color-primary)' }}>
                  ★
                </div>
                <span className="text-lg font-black text-gray-900">Gebya Plus</span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full press-scale"
                style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {L.modalTagline[lang]}
            </p>

            <div className="space-y-2 mb-5">
              {PLUS_FEATURES.map(f => (
                <div key={f.key} className="flex items-center gap-2.5 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                  <span className="font-medium text-gray-800">{f[lang]}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full py-3 rounded-xl text-sm font-black text-white transition-all press-scale disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {upgrading
                ? L.upgrading[lang]
                : L.upgradeNow[lang]}
            </button>

            <p className="text-[10px] text-center mt-3" style={{ color: 'var(--color-text-muted)' }}>
              {L.deviceNote[lang]}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
