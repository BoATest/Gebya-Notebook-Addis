import { ChevronDown, ChevronUp } from 'lucide-react';
import { useStaffStore } from '../../stores/staffStore';
import { fmt } from '../../utils/numformat';
import ReconStatusBadge from './ReconStatusBadge';

export default function StaffPastSettlements({ activeStaff, hasUnresolvedSettlements, lang, t }) {
  const store = useStaffStore();

  if (store.settlements.length === 0) return null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <button
        onClick={() => store.toggleSection('pastSettlements')}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
        style={{ background: hasUnresolvedSettlements ? 'var(--color-bg-accent-amber)' : 'var(--color-surface-alt)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {t('Past Settlements', 'ያለፉ ማስተካከያዎች')}
          </span>
          <span className="text-xs font-bold text-gray-400">{store.settlements.length}</span>
          {hasUnresolvedSettlements && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              {t('Needs review', 'ክለሳ ይፈልጋል')}
            </span>
          )}
        </div>
        {store.expandedSections.pastSettlements ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <div style={{
        overflow: 'hidden',
        maxHeight: store.expandedSections.pastSettlements ? '400px' : '0',
        opacity: store.expandedSections.pastSettlements ? 1 : 0,
        transition: 'max-height 0.3s ease, opacity 0.25s ease',
      }}>
        <div className="divide-y max-h-60 overflow-y-auto" style={{ borderColor: 'var(--color-border-light)' }}>
          {store.settlements.slice().sort((a, b) => b.settled_at - a.settled_at).slice(0, 20).map((s, i) => {
            const staff = activeStaff.find(r => String(r.id) === String(s.staff_id));
            const rStatus = s.reconciliation_status;
            return (
              <div key={s.id || i} className="px-4 py-2.5 flex items-center justify-between cursor-pointer"
                style={{ background: rStatus === 'staff_submitted' ? 'var(--color-bg-accent-blue)' : 'transparent' }}
                onClick={() => store.handleViewSettlement(
                  staff || { id: s.staff_id, displayName: `#${s.staff_id}`, name: `#${s.staff_id}` },
                  s
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-800">
                    {new Date(s.settled_at).toLocaleDateString()} · {staff?.display_name || staff?.name || `#${s.staff_id}`}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {fmt(s.actual_cash || 0)} ETB {s.final_variance !== 0 && (
                      <span style={{ color: s.final_variance >= 0 ? 'var(--color-success-text)' : 'var(--color-danger)', fontWeight: 700 }}>
                        ({s.final_variance >= 0 ? '+' : ''}{fmt(s.final_variance)})
                      </span>
                    )}
                  </div>
                </div>
                {rStatus && <ReconStatusBadge status={rStatus} lang={lang} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
