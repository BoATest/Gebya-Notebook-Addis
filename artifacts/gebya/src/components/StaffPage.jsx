import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useStaffStore } from '../stores/staffStore';
import { fireToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { getCurrentEntitlements } from '../utils/entitlements';
import { apiFetch, ROLE_BADGE, RoleBadge } from '../utils/shared-ui.jsx';
import { calculateExpected } from '../utils/settlementSelectors';
import { fmt } from '../utils/numformat';

import StaffStats from './staff/StaffStats';
import StaffTodayTeam from './staff/StaffTodayTeam';
import StaffPastSettlements from './staff/StaffPastSettlements';
import StaffCollectionForm from './staff/StaffCollectionForm';
import StaffJoinCode from './staff/StaffJoinCode';
import StaffAllMembers from './staff/StaffAllMembers';
import StaffDeviceManager from './staff/StaffDeviceManager';
import StaffActivityFeed from './staff/StaffActivityFeed';
import ReconStatusBadge from './staff/ReconStatusBadge';

export default function StaffPage({
  staffMembers,
  activeStaffMemberId,
  currentActorLabel,
  shopProfile,
  onSetActiveStaffMember,
  onSaveStaffMember,
  onUpdateStaffMember,
  onDeactivateStaffMember,
  onReactivateStaffMember,
  onApproveDevice,
  onRejectDevice,
  onRotateJoinCode,
  lang,
  canManageTeam,
}) {
  const t = (en, am) => lang === 'am' ? am : en;

  // ─── Global state for isolated component isolation ───
  const store = useStaffStore();

  // Load data
  useEffect(() => {
    store.loadCloudMembers();
    store.loadSettlements();
  }, [store]);

  // Prevent browser reloading/disappearing tabs
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      store.refreshSettlements();
      store.refreshToday();
    };
    const interval = setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [store]);

  // Escape to close settlement sheet
  useEffect(() => {
    if (!store.settling && !store.viewingSettlement) return;
    const handle = (e) => { if (e.key === 'Escape') store.clearSettlementOverlay(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [store.settling, store.viewingSettlement, store]);

  // ─── Combined staff list (local + cloud) ───
  const combinedStaffList = useMemo(() => {
    const local = (staffMembers || []).map(m => ({ ...m, _source: 'local' }));
    const cloud = (store.cloudMembers || []).map(m => ({ ...m, _source: 'cloud' }));
    const localIds = new Set(local.map(m => String(m.id)));
    const uniqueCloud = cloud.filter(m => !localIds.has(String(m.id)));
    return [...local, ...uniqueCloud];
  }, [staffMembers, store.cloudMembers]);

  const filteredMembers = useMemo(() => {
    if (!store.searchQuery.trim()) return combinedStaffList;
    const q = store.searchQuery.toLowerCase();
    return combinedStaffList.filter(m =>
      (m.display_name || m.displayName || m.name || '').toLowerCase().includes(q) ||
      (m.phone || m.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [combinedStaffList, store.searchQuery]);

  const activeStaff = useMemo(() => (staffMembers || []).filter(m => m.active !== false), [staffMembers]);
  const inactiveStaff = useMemo(() => (staffMembers || []).filter(m => m.active === false), [staffMembers]);

  const lastSettlementPerStaff = useMemo(() => {
    const map = {};
    for (const s of store.settlements) {
      const key = String(s.staff_id);
      if (!map[key] || s.settled_at > map[key].settled_at) map[key] = s;
    }
    return map;
  }, [store.settlements]);

  const pendingDevices = useMemo(() => {
    const out = [];
    for (const m of (staffMembers || [])) {
      for (const d of (m.devices || [])) {
        if (d.device_status === 'pending' || d.pending) {
          out.push({ ...d, staffName: m.display_name, staffId: m.id });
        }
      }
    }
    return out;
  }, [staffMembers]);

  const unsettledStaff = useMemo(() =>
    activeStaff.filter(m => {
      const last = lastSettlementPerStaff[String(m.id)];
      const daysSince = last ? Math.floor((Date.now() - new Date(last.settled_at).getTime()) / 86400000) : null;
      return daysSince === null || daysSince > 0;
    }),
    [activeStaff, lastSettlementPerStaff]
  );

  const hasUnresolvedSettlements = useMemo(() =>
    store.settlements.some(s => s.reconciliation_status === 'staff_submitted' || s.reconciliation_status === 'disputed'),
    [store.settlements]
  );

  const snapshotStats = useMemo(() => {
    const totalStaff = (staffMembers || []).length;
    const active = activeStaff.length;
    const pendingDeviceCount = pendingDevices.length;
    const unsettledCount = unsettledStaff.length;
    const submittedCount = store.settlements.filter(s => s.reconciliation_status === 'staff_submitted').length;
    const finalizedCount = store.settlements.filter(s => s.reconciliation_status === 'finalized' || s.reconciliation_status === 'checked').length;
    const totalCollected = store.settlements.reduce((sum, s) => sum + Number(s.actual_total || 0), 0);
    return { totalStaff, active, pendingDeviceCount, unsettledCount, submittedCount, finalizedCount, totalCollected };
  }, [staffMembers, activeStaff, pendingDevices, unsettledStaff, store.settlements]);

  // Estimated amounts for unsettled staff
  const [estimatedAmounts, setEstimatedAmounts] = useState({});
  const [estimatesLoading, setEstimatesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEstimatesLoading(true);
    (async () => {
      const results = {};
      await Promise.all(unsettledStaff.map(async (m) => {
        const last = lastSettlementPerStaff[String(m.id)];
        const periodStart = last ? last.settled_at : 0;
        try { const calc = await calculateExpected(String(m.id), periodStart, Date.now()); results[m.id] = calc; } catch {}
      }));
      if (!cancelled) { setEstimatedAmounts(results); setEstimatesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [unsettledStaff, lastSettlementPerStaff]);

  // ─── Staff add handlers ───
  const handleAddLocalStaff = useCallback(async () => {
    if (!store.localStaffName.trim()) return;
    try {
      const { entitlements } = await getCurrentEntitlements();
      if (activeStaff.length >= entitlements.max_staff) {
        fireToast(t('Staff limit reached. Upgrade to add more.', 'የሰራተኛ ገደብ ደረሰዋል'), 3000);
        return;
      }
    } catch {}
    await onSaveStaffMember?.({ display_name: store.localStaffName.trim(), role: 'cashier', active: true });
    store.setLocalStaffName('');
  }, [store, activeStaff, onSaveStaffMember, t]);

  // ─── Render ───
  return (
    <div className="space-y-4 pb-4">
      {/* Notification banner */}
      {canManageTeam && snapshotStats.submittedCount > 0 && (
        <div className="rounded-2xl border flex items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--color-info-border)', background: 'var(--color-bg-accent-blue)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-info-bg)' }}>
            <span className="text-sm font-black" style={{ color: 'var(--color-info)' }}>!</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'var(--color-info)' }}>
              {t('Staff submissions pending review', 'የሰራተኞች ስብስብ ክለሳ ይፈልጋል')}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {snapshotStats.submittedCount} {t('staff member(s) have submitted their collection', 'ሰራተኞች ስብስባቸውን ልከዋል')}
            </p>
          </div>
          <button onClick={() => store.toggleSection('pastSettlements')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
          >{t('Review', 'ክለሳ')}</button>
        </div>
      )}

      {/* Stats */}
      {canManageTeam && <StaffStats snapshotStats={snapshotStats} t={t} />}

      {/* NEEDS ATTENTION */}
      {canManageTeam && unsettledStaff.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-warning-border)', background: 'var(--color-bg-accent-amber)' }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--color-warning-bg)' }}>
            <span className="text-xs font-black uppercase tracking-wide" style={{ color: 'var(--color-warning)' }}>{t('Needs attention', 'ክለሳ ይፈልጋል')}</span>
            <span className="text-[10px] font-bold" style={{ color: 'var(--color-warning)' }}>({unsettledStaff.length})</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-warning-border)' }}>
            {unsettledStaff.map(m => {
              const last = lastSettlementPerStaff[String(m.id)];
              const estimate = estimatedAmounts[m.id];
              const isSubmitted = last?.reconciliation_status === 'staff_submitted';
              return (
                <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-900 truncate">{m.display_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {last ? t('Last settled', 'የመጨረሻ ማስተካከያ') + ' · ' + new Date(last.settled_at).toLocaleDateString() : t('Never settled', 'በጭረት አላስተካከለም')}
                    </div>
                    {estimate && estimate.expectedTotal > 0 && (
                      <div className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--color-warning)' }}>{t('Est.', 'ተገምቶ')} {fmt(estimate.expectedTotal)} {t('birr', 'ብር')}</div>
                    )}
                    {estimatesLoading && !estimate && (<div className="text-[10px] text-gray-400 mt-0.5">...</div>)}
                  </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isSubmitted ? (
                        <button onClick={() => store.handleViewSettlement(m, last)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                          style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                          {t('Review', 'መርምር')}
                        </button>
                      ) : (
                        <button onClick={() => store.setSettling(m)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                          style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}>
                          {t('Settle', 'አስተካክል')}
                        </button>
                      )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Team */}
      <StaffTodayTeam
        activeStaff={activeStaff}
        inactiveStaff={inactiveStaff}
        canManageTeam={canManageTeam}
        lastSettlementPerStaff={lastSettlementPerStaff}
        todayStaffSales={store.todayStaffSales}
        todayStaffTransactions={store.todayStaffTransactions}
        expandedStaffDrilldown={store.expandedStaffDrilldown}
        onReactivateStaffMember={onReactivateStaffMember}
        onSetSettling={store.setSettling}
        onViewSettlement={store.handleViewSettlement}
        t={t}
      />

      {/* Past Settlements */}
      <StaffPastSettlements activeStaff={activeStaff} hasUnresolvedSettlements={hasUnresolvedSettlements} lang={lang} t={t} />

      {/* My Collection */}
      <StaffCollectionForm
        activeStaffMemberId={activeStaffMemberId}
        activeStaff={activeStaff}
        lastSettlementPerStaff={lastSettlementPerStaff}
        lang={lang}
        t={t}
      />

      {/* Join Code */}
      {canManageTeam && (
        <StaffJoinCode shopProfile={shopProfile} onRotateJoinCode={onRotateJoinCode} t={t} />
      )}

      {/* All Staff */}
      {canManageTeam && (
        <StaffAllMembers
          staffMembers={staffMembers}
          combinedStaffList={combinedStaffList}
          filteredMembers={filteredMembers}
          canManageTeam={canManageTeam}
          onSaveStaffMember={onSaveStaffMember}
          onUpdateStaffMember={onUpdateStaffMember}
          onReactivateStaffMember={onReactivateStaffMember}
          onDeactivateStaffMember={onDeactivateStaffMember}
          lang={lang}
          t={t}
        />
      )}

      {/* Device Manager */}
      {canManageTeam && pendingDevices.length > 0 && (
        <StaffDeviceManager pendingDevices={pendingDevices} onApproveDevice={onApproveDevice} onRejectDevice={onRejectDevice} t={t} />
      )}

      {/* Activity Feed */}
      {canManageTeam && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => store.toggleSection('activity')}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
            style={{ background: 'var(--color-surface-alt)' }}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('Activity Feed', 'የእንቅስቃሴ መረጃ')}</span>
            {store.expandedSections.activity ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          <div style={{
            overflow: 'hidden',
            maxHeight: store.expandedSections.activity ? '2000px' : '0',
            opacity: store.expandedSections.activity ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.25s ease',
          }}>
            <div className="px-4 py-3"><StaffActivityFeed todayRefreshKey={store.todayRefreshKey} /></div>
          </div>
        </div>
      )}

      {/* Settlement Sheet */}
      {store.settling && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl bg-white px-4 pb-6 pt-2 max-h-[90vh] overflow-y-auto" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <div className="w-9 h-1 rounded-full bg-gray-300 mx-auto mb-3" />
            <SettlementSheet
              staff={store.settling}
              existingSettlement={store.viewingSettlement?.settlement || null}
              lang={lang}
              onSaved={store.handleSettlementSaved}
              onCancel={() => store.clearSettlementOverlay()}
            />
          </div>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={store.pendingNoPerms != null}
        tone="danger"
        title={t('Remove all permissions?', 'ሁሉም ፍቃዶች ይቺርዳሉ?')}
        message={t('This staff member will not be able to do anything in the app. Proceed?', 'ይህ ሰራተኛ በቀላሉ ምንም አይችልም። ሙሉ?')}
        confirmLabel={t('Proceed', 'ሙሉ')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => { const p = store.pendingNoPerms; store.setPendingNoPerms(null); if (p) store.applyTogglePermission(p.member, p.key, p.nextValue, lang); }}
        onCancel={() => store.setPendingNoPerms(null)}
      />

      <ConfirmDialog
        open={store.pendingPermChange != null}
        tone="default"
        title={store.pendingPermChange ? (store.pendingPermChange.nextValue ? t(`Grant "${store.pendingPermChange.label}"?`, `"${store.pendingPermChange.label}" ይስጡ?`) : t(`Revoke "${store.pendingPermChange.label}"?`, `"${store.pendingPermChange.label}" ያስወግዱ?`)) : ''}
        message={store.pendingPermChange ? t(`Change permission for ${store.pendingPermChange.member.displayName || store.pendingPermChange.member.display_name || 'this member'}?`, `ለ${store.pendingPermChange.member.displayName || store.pendingPermChange.member.display_name || 'ይህ አባል'} ፍቃድ ይቀየር?`) : ''}
        confirmLabel={t('Confirm', 'አረጋግጥ')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => { const p = store.pendingPermChange; store.setPendingPermChange(null); if (p) store.applyTogglePermission(p.member, p.key, p.nextValue, lang); }}
        onCancel={() => store.setPendingPermChange(null)}
      />

      <ConfirmDialog
        open={store.pendingRoleChange != null}
        tone="default"
        title={store.pendingRoleChange ? t(`Change role to ${store.pendingRoleChange.label}?`, `ሚና ወደ ${store.pendingRoleChange.label} ይቀየር?`) : ''}
        message={store.pendingRoleChange ? t(`This will update ${store.pendingRoleChange.member.displayName || store.pendingRoleChange.member.display_name || 'this member'}'s permissions to match the ${store.pendingRoleChange.label} role.`, `የ${store.pendingRoleChange.member.displayName || store.pendingRoleChange.member.display_name || 'ይህ አባል'} ፍቃዶች ወደ ${store.pendingRoleChange.label} ሚና ይቀየራሉ።`) : ''}
        confirmLabel={t('Change Role', 'ሚና ቀይር')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => { const p = store.pendingRoleChange; store.setPendingRoleChange(null); if (p) store.handleRoleChange(p.member, p.newRole, lang); }}
        onCancel={() => store.setPendingRoleChange(null)}
      />

      <ConfirmDialog
        open={store.pendingDeactivation != null}
        tone="danger"
        title={store.pendingDeactivation ? t(`Deactivate ${store.pendingDeactivation.name}?`, `${store.pendingDeactivation.name}ን ያቁሙ?`) : ''}
        message={t('They will not be able to access the shop until reactivated. Their sales history is preserved.', 'እስኪነቁ ድረስ ሱቁን መጠቀም አይችሉም። የሽያጭ ታሪካቸው ይቆያል።')}
        confirmLabel={t('Deactivate', 'አቁም')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => {
          const p = store.pendingDeactivation;
          store.setPendingDeactivation(null);
          if (p) onDeactivateStaffMember?.(p.id);
        }}
        onCancel={() => store.setPendingDeactivation(null)}
      />
    </div>
  );
}
