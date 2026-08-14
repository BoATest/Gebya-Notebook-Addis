import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../context/LangContext';
import { useStaffStore } from '../stores/staffStore';
import { fireToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import db from '../db';
import { startOfLocalDay } from '../utils/reportSelectors';
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
import StaffTasks from './staff/StaffTasks';
import StaffAttendance from './staff/StaffAttendance';
import SettlementSheet from './report/SettlementSheet';

export default function StaffPage({
  activeStaffMemberId,
  currentActorLabel,
  shopProfile,
  onSetActiveStaffMember,
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

  // Owner/manager experience is organized into tabs
  const [ownerTab, setOwnerTab] = useState('team');
  const [openCollectionSheet, setOpenCollectionSheet] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [addStaffName, setAddStaffName] = useState('');
  const [addStaffPhone, setAddStaffPhone] = useState('');
  const [addStaffRole, setAddStaffRole] = useState('cashier');
  const [addStaffError, setAddStaffError] = useState(null);
  const [addStaffSaving, setAddStaffSaving] = useState(false);

  // ─── Global state for isolated component isolation ───
  const store = useStaffStore();
  const loadCloudMembers = useStaffStore((s) => s.loadCloudMembers);
  const loadSettlements = useStaffStore((s) => s.loadSettlements);
  const refreshSettlements = useStaffStore((s) => s.refreshSettlements);
  const refreshToday = useStaffStore((s) => s.refreshToday);

  // Load data
  useEffect(() => {
    loadCloudMembers();
    loadSettlements();
  }, [loadCloudMembers, loadSettlements]);

  // Keep today's per-staff sales aggregate fresh so the owner Today tab stats
  // are accurate even before the Activity tab (which also computes this) mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const todayStart = startOfLocalDay();
        const todayEnd = todayStart + 86400000;
        const txns = await db.transactions
          .where('created_at').between(todayStart, todayEnd).toArray()
          .then(rows => rows.filter(t => !t.deletedAt));
        if (cancelled) return;
        const salesMap = {};
        for (const txn of txns) {
          if (txn.type !== 'sale') continue;
          const staffId = txn.actor_staff_member_id;
          if (!staffId) continue;
          if (!salesMap[staffId]) salesMap[staffId] = { count: 0, total: 0, cashTotal: 0, transferTotal: 0 };
          salesMap[staffId].count += 1;
          salesMap[staffId].total += Number(txn.amount || 0);
          if (txn.payment_type === 'transfer' || txn.payment_type === 'bank') salesMap[staffId].transferTotal += Number(txn.amount || 0);
          else salesMap[staffId].cashTotal += Number(txn.amount || 0);
        }
        if (!cancelled) store.setTodayStaffSales(salesMap);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [store.todayRefreshKey, store.setTodayStaffSales]);

  // Prevent browser reloading/disappearing tabs
  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      refreshSettlements();
      refreshToday();
    };
    const interval = setInterval(() => { if (!document.hidden) refresh(); }, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refreshSettlements, refreshToday]);

  // Escape to close settlement sheet
  useEffect(() => {
    if (!store.settling && !store.viewingSettlement) return;
    const handle = (e) => { if (e.key === 'Escape') store.clearSettlementOverlay(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [store.settling, store.viewingSettlement]);

  // ─── Canonical staff list (cloud = single source of truth) ───
  const combinedStaffList = useMemo(() => store.cloudMembers || [], [store.cloudMembers]);

  const filteredMembers = useMemo(() => {
    if (!store.searchQuery.trim()) return combinedStaffList;
    const q = store.searchQuery.toLowerCase();
    return combinedStaffList.filter(m =>
      (m.display_name || m.displayName || m.name || '').toLowerCase().includes(q) ||
      (m.phone || m.phoneNumber || m.phone_snapshot || '').toLowerCase().includes(q)
    );
  }, [combinedStaffList, store.searchQuery]);

  const activeStaff = useMemo(() => combinedStaffList.filter(m => m.active !== false), [combinedStaffList]);
  const inactiveStaff = useMemo(() => combinedStaffList.filter(m => m.active === false), [combinedStaffList]);

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
    for (const m of combinedStaffList) {
      for (const d of (m.devices || [])) {
        if (d.device_status === 'pending' || d.pending) {
          out.push({ ...d, staffName: m.display_name, staffId: m.id || m.userId });
        }
      }
    }
    return out;
  }, [combinedStaffList]);

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
    const totalStaff = combinedStaffList.length;
    const active = activeStaff.length;
    const pendingDeviceCount = pendingDevices.length;
    const unsettledCount = unsettledStaff.length;
    const submittedCount = store.settlements.filter(s => s.reconciliation_status === 'staff_submitted').length;
    const finalizedCount = store.settlements.filter(s => s.reconciliation_status === 'finalized' || s.reconciliation_status === 'checked').length;
    const totalCollected = store.settlements.reduce((sum, s) => sum + Number(s.actual_total || 0), 0);
    return { totalStaff, active, pendingDeviceCount, unsettledCount, submittedCount, finalizedCount, totalCollected };
  }, [combinedStaffList, activeStaff, pendingDevices, unsettledStaff, store.settlements]);

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

  // ─── Render ───
  const ownerTabs = [
    { key: 'team', label: t('Team', 'ቡድን') },
    { key: 'today', label: t('Today', 'ዛሬ') },
    { key: 'settlements', label: t('Settlements', 'ማስተካከያ') },
    { key: 'activity', label: t('Activity', 'እንቅስቃሴ') },
  ];

  return (
    <div className="space-y-4 pb-4">
      {canManageTeam ? (
        <>
          {/* Owner/manager tab bar */}
          <div className="flex gap-1 p-1 rounded-2xl border sticky top-0 z-20" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-alt)' }}>
            {ownerTabs.map(tab => {
              const badge =
                tab.key === 'team' ? pendingDevices.length :
                tab.key === 'today' ? unsettledStaff.length :
                tab.key === 'settlements' ? snapshotStats.submittedCount : 0;
              const active = ownerTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setOwnerTab(tab.key)}
                  className="relative flex-1 px-2 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
                  style={{
                    background: active ? 'var(--color-primary)' : 'transparent',
                    color: active ? 'var(--color-bg-white)' : 'var(--color-text-muted)',
                  }}
                >
                  {tab.label}
                  {badge > 0 && (
                    <span
                      className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black"
                      style={{
                        background: active ? 'var(--color-bg-white)' : 'var(--color-danger)',
                        color: active ? 'var(--color-primary)' : 'var(--color-bg-white)',
                      }}
                    >{badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB: Team */}
          {ownerTab === 'team' && (
            <>
              {/* Join Code */}
              <StaffJoinCode shopProfile={shopProfile} onRotateJoinCode={onRotateJoinCode} t={t} />

              {/* Add Staff */}
              {canManageTeam && (
                <>
                  <div className="px-2 pb-2">
                    <button
                      onClick={() => setShowAddStaffModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition"
                      style={{
                        background: 'var(--color-primary)',
                        color: 'var(--color-bg-white)',
                      }}
                    >
                      {t('Add Staff', 'ሰራተኛ አክሙ')}
                    </button>
                  </div>

                  {showAddStaffModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--color-overlay)' }}>
                      <div className="bg-white rounded-2xl p-5 w-full max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                          {t('Add Staff Member', 'ሰራተኛ አክሙ')}
                        </h3>
                        <p className="text-xs text-gray-500 mb-3">
                          {t('Enter staff details to add them to your shop.', 'የሰራተኛ ዝርዝር ያስገቡ።')}
                        </p>
                        {addStaffError && (
                          <p className="text-xs text-red-600 mb-2">{addStaffError}</p>
                        )}
                        <div className="mb-3">
                          <input
                            type="text"
                            value={addStaffName}
                            onChange={e => setAddStaffName(e.target.value)}
                            placeholder={t('Display name (optional)', 'ስም ለማሳጥ (አርጣ)')}
                            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                            style={{ borderColor: 'var(--color-border)' }}
                          />
                        </div>
                        <div className="mb-3">
                          <input
                            type="tel"
                            value={addStaffPhone}
                            onChange={e => { setAddStaffPhone(e.target.value); setAddStaffError(null); }}
                            placeholder={t('Phone number', 'ስምንትና')}
                            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                            style={{ borderColor: 'var(--color-border)' }}
                          />
                        </div>
                        <div className="mb-4">
                          <label className="text-xs font-bold text-gray-700 mb-1 block">{t('Role', 'ሚና')}</label>
                          <select
                            value={addStaffRole}
                            onChange={e => setAddStaffRole(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
                            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-white)' }}
                          >
                            <option value="cashier">{t('Cashier', 'ክራሚያ')}</option>
                            <option value="viewer">{t('Viewer', 'ተመልካች')}</option>
                            <option value="manager">{t('Manager', 'አስተዳዳሪ')}</option>
                            <option value="trusted_staff">{t('Trusted Staff', 'ተስፋ ያለው ሰራተኛ')}</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setShowAddStaffModal(false);
                              setAddStaffName('');
                              setAddStaffPhone('');
                              setAddStaffRole('cashier');
                              setAddStaffError(null);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-bold border"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            {t('Cancel', 'ሰርዝ')}
                          </button>
                          <button
                            onClick={async () => {
                              const { isValidEthiopianPhone, normalizeEthiopianPhone } = await import('../utils/phoneNumber');
                              if (!addStaffPhone || !isValidEthiopianPhone(addStaffPhone)) {
                                setAddStaffError(t('A valid Ethiopian phone number is required', 'በዚህ ዘርባዊ የሆነ ቀድሞ ይሰማረው'));
                                return;
                              }
                              setAddStaffSaving(true);
                              setAddStaffError(null);
                              try {
                                const saved = await onSaveStaffMember?.({
                                  display_name: addStaffName.trim() || undefined,
                                  phone: normalizeEthiopianPhone(addStaffPhone),
                                  role: addStaffRole,
                                });
                                if (!saved) throw new Error('Failed to save');
                                setShowAddStaffModal(false);
                                setAddStaffName('');
                                setAddStaffPhone('');
                                setAddStaffRole('cashier');
                              } catch (err) {
                                setAddStaffError(t('Failed to add staff. Please try again.', 'ሰራተኛ ማከል አልተመለሰም።'));
                              } finally {
                                setAddStaffSaving(false);
                              }
                            }}
                            disabled={addStaffSaving || !addStaffPhone}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                            style={{ background: 'var(--color-primary)' }}
                          >
                            {addStaffSaving ? '...' : t('Add', 'አክሙ')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Device Manager */}
              {pendingDevices.length > 0 && (
                <StaffDeviceManager pendingDevices={pendingDevices} onApproveDevice={onApproveDevice} onRejectDevice={onRejectDevice} t={t} />
              )}

              {/* All Staff */}
              <StaffAllMembers
                canManageTeam={canManageTeam}
                lang={lang}
                t={t}
                onReactivateStaffMember={onReactivateStaffMember}
              />
            </>
          )}

          {/* TAB: Today */}
          {ownerTab === 'today' && (
            <>
              {/* Notification banner */}
              {snapshotStats.submittedCount > 0 && (
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
                  <button onClick={() => setOwnerTab('settlements')}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
                  >{t('Review', 'ክለሳ')}</button>
                </div>
              )}

              {/* Stats */}
              <StaffStats snapshotStats={snapshotStats} t={t} />

              {/* NEEDS ATTENTION */}
              {unsettledStaff.length > 0 && (
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

              {/* Tasks & Attendance */}
              {activeStaffMemberId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StaffTasks staff={activeStaff.find(s => String(s.id) === String(activeStaffMemberId))} lang={lang} canManageTeam={canManageTeam} />
                  <StaffAttendance staff={activeStaff.find(s => String(s.id) === String(activeStaffMemberId))} lang={lang} canManageTeam={canManageTeam} />
                </div>
              )}
            </>
          )}

          {/* TAB: Settlements */}
          {ownerTab === 'settlements' && (
            <>
              <StaffStats snapshotStats={snapshotStats} t={t} />
              <StaffPastSettlements activeStaff={activeStaff} hasUnresolvedSettlements={hasUnresolvedSettlements} lang={lang} t={t} />
            </>
          )}

          {/* TAB: Activity */}
          {ownerTab === 'activity' && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-3" style={{ background: 'var(--color-surface-alt)' }}>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('Activity Feed', 'የእንቅስቃሴ መረጃ')}</span>
              </div>
              <div className="px-4 py-3"><StaffActivityFeed todayRefreshKey={store.todayRefreshKey} /></div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Staff single-surface (My Collection + Today's team) */}
          <StaffCollectionForm
            activeStaffMemberId={activeStaffMemberId}
            activeStaff={activeStaff}
            lastSettlementPerStaff={lastSettlementPerStaff}
            lang={lang}
            t={t}
          />

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
        </>
      )}

      {/* Settlement Sheet */}
      {store.settling && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'var(--color-overlay)', backdropFilter: 'blur(2px)' }}>
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
