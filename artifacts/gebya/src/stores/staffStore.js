import { create } from 'zustand';
import db, { getAllSettlements, saveSettlement, updateSettlement } from '../db';
import { apiFetch, ROLE_BADGE } from '../utils/shared-ui.jsx';
import { fireToast } from '../components/Toast';
import { getCurrentEntitlements } from '../utils/entitlements';
import { calculateExpected, createReconciliationEntry, generateSettlementId } from '../utils/settlementSelectors';
import { startOfLocalDay } from '../utils/reportSelectors';
import { isValidEthiopianPhone, normalizeEthiopianPhone, extractSubscriberDigits } from '../utils/phoneNumber';
import { useAuthStore } from './authStore';
import { usePermissionsStore } from './permissionsStore';

const ROLE_PRESETS = {
  manager: { can_manage_team: true, can_delete_records: true, can_edit_settings: true, can_add_records: true, can_view_reports: true },
  cashier: { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: true, can_view_reports: true },
  viewer: { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: false, can_view_reports: true },
  trusted_staff: { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: true, can_view_reports: true },
};

const ROLE_OPTIONS = [
  { value: 'manager', label: { en: 'Manager', am: 'ማኔጀር' } },
  { value: 'cashier', label: { en: 'Sales Staff', am: 'ሰራተኛ' } },
  { value: 'viewer', label: { en: 'Auditor', am: 'ኦዲተር' } },
  { value: 'trusted_staff', label: { en: 'Trusted Staff', am: 'ተስፋ ያለው ሰራተኛ' } },
];

const PERMISSION_LABELS = {
  en: {
    can_manage_team: 'Can manage team',
    can_add_records: 'Can record sales & expenses',
    can_delete_records: 'Can delete records',
    can_edit_settings: 'Can edit shop settings',
    can_view_reports: 'Can view reports',
  },
  am: {
    can_manage_team: 'ቡድን ማስተዳደር ይችላል',
    can_add_records: 'ሽያጭ መመዝገብ ይችላል',
    can_delete_records: 'መዝገቦችን መሰረዝ ይችላል',
    can_edit_settings: 'ቅንብሮችን ማርትዕ ይችላል',
    can_view_reports: 'ሪፖርቶችን ማየት ይችላል',
  },
};

function getEffectiveRoleLabel(member, overrides, lang) {
  const t = (en, am) => lang === 'am' ? am : en;
  const role = member.role || 'cashier';
  const preset = ROLE_PRESETS[role];
  if (!preset) return ROLE_BADGE[role]?.label || role;
  const perms = member.resolved_permissions || {};
  const effective = { ...preset };
  const mid = member.id || member.userId;
  const memberOverrides = overrides[mid];
  if (memberOverrides) {
    for (const key of Object.keys(memberOverrides)) {
      effective[key] = memberOverrides[key];
    }
  }
  const matches = Object.keys(preset).every(k => effective[k] === preset[k]);
  return matches ? ROLE_BADGE[role]?.label || role : t('Custom', 'የተበጀ');
}

export const useStaffStore = create((set, get) => ({

  // ─── Cloud members ───
  cloudMembers: null,
  membersLoading: false,

  // ─── Settlements ───
  settlements: [],
  settlementRefreshKey: 0,
  settling: null,
  viewingSettlement: null,

  // ─── Today data ───
  todayRefreshKey: 0,
  todayStaffSales: {},
  todayStaffTransactions: {},

  // ─── Permission editing ───
  localPermOverrides: {},
  savingPerms: false,
  pendingNoPerms: null,
  pendingPermChange: null,
  pendingRoleChange: null,
  pendingDeactivation: null,

  // ─── UI state ───
  expandedSections: { activity: false, more: false, pastSettlements: true },
  expandedMember: null,
  expandedStaffDrilldown: null,
  editingStaffName: null,
  editNameValue: '',
  editPhoneValue: '',
  searchQuery: '',

  // ─── Collection form ───
  staffCollectCash: '',
  staffCollectTransfer: '',
  staffCollectNote: '',
  staffCollecting: false,

  // ─── Load cloud members ───
  loadCloudMembers: async () => {
    if (!usePermissionsStore.getState().hasPermission('can_manage_team')) return;
    set({ membersLoading: true });
    try {
      const data = await apiFetch('/business/members');
      set({ cloudMembers: data.members || [] });
    } catch {
      set({ cloudMembers: null });
    } finally {
      set({ membersLoading: false });
    }
  },

  // ─── Load settlements ───
  loadSettlements: async () => {
    try {
      const bizRow = await db.settings.get('gebya_business_id');
      const bizId = bizRow?.value != null ? Number(bizRow.value) : 0;
      const rows = await getAllSettlements(Date.now() - 30 * 86400000, Date.now() + 86400000, bizId);
      set({ settlements: rows });
    } catch {}
  },

  // ─── Today data ───
  setTodayStaffSales(sales) { set({ todayStaffSales: sales }); },
  setTodayStaffTransactions(txns) { set({ todayStaffTransactions: txns }); },

  refreshSettlements() { set(s => ({ settlementRefreshKey: s.settlementRefreshKey + 1 })); },
  refreshToday() { set(s => ({ todayRefreshKey: s.todayRefreshKey + 1 })); },

  // ─── Permission editing actions ───
  setPendingNoPerms(v) { set({ pendingNoPerms: v }); },
  setPendingPermChange(v) { set({ pendingPermChange: v }); },
  setPendingRoleChange(v) { set({ pendingRoleChange: v }); },
  setPendingDeactivation(v) { set({ pendingDeactivation: v }); },
  setSavingPerms(v) { set({ savingPerms: v }); },

  updateLocalPermOverrides(memberId, key, value) {
    set(s => ({
      localPermOverrides: {
        ...s.localPermOverrides,
        [memberId]: { ...(s.localPermOverrides[memberId] || {}), [key]: value },
      },
    }));
  },

  removeLocalPermOverride(memberId, key) {
    set(s => {
      const next = { ...s.localPermOverrides };
      if (next[memberId]) {
        const updated = { ...next[memberId] };
        delete updated[key];
        if (Object.keys(updated).length === 0) delete next[memberId];
        else next[memberId] = updated;
      }
      return { localPermOverrides: next };
    });
  },

  clearLocalPermOverrides(memberId) {
    set(s => {
      const next = { ...s.localPermOverrides };
      delete next[memberId];
      return { localPermOverrides: next };
    });
  },

  applyTogglePermission: async (member, key, nextValue, lang) => {
    const t = (en, am) => lang === 'am' ? am : en;
    const mid = member.id || member.userId;
    set(s => ({ savingPerms: true }));
    get().updateLocalPermOverrides(mid, key, nextValue);
    try {
      await apiFetch(`/business/members/${member.userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ [key]: nextValue }),
      });
      fireToast(t('✓ Updated', '✓ ተሻሽሏል'), 1500);
    } catch (err) {
      get().removeLocalPermOverride(mid, key);
      fireToast(err.message || t('Failed', 'አልተሳካም'), 2400);
    } finally {
      set({ savingPerms: false });
    }
  },

  handleTogglePermission: (member, key, nextValue, lang) => {
    const t = (en, am) => lang === 'am' ? am : en;
    const { savingPerms } = get();
    if (savingPerms) return;
    if (member.role === 'owner') {
      fireToast(t('Owner permissions cannot be edited', 'የባለቤት ፍቃዶች አይቀየርም'), 2200);
      return;
    }
    const perms = member.resolved_permissions || {};
    const next = { ...perms, [key]: nextValue };
    const hasAny = Object.values(next).some(v => v === true);
    if (!hasAny) {
      set({ pendingNoPerms: { member, key, nextValue } });
      return;
    }
    const label = PERMISSION_LABELS[lang]?.[key] || key;
    set({ pendingPermChange: { member, key, nextValue, label } });
  },

  handleRoleChange: async (member, newRole, lang) => {
    const t = (en, am) => lang === 'am' ? am : en;
    const { savingPerms } = get();
    if (savingPerms) return;
    if (member.role === 'owner') {
      fireToast(t('Owner role cannot be changed', 'የባለቤት ሚና አይቀየርም'), 2200);
      return;
    }
    if (member.role === newRole) return;
    set({ savingPerms: true });
    const preset = ROLE_PRESETS[newRole];
    if (!preset) { set({ savingPerms: false }); return; }
    try {
      await apiFetch(`/business/members/${member.userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify(preset),
      });
      get().clearLocalPermOverrides(member.id || member.userId);
      const clouds = get().cloudMembers;
      if (clouds) {
        set({
          cloudMembers: clouds.map(m =>
            String(m.userId) === String(member.userId)
              ? { ...m, role: newRole, resolved_permissions: { ...preset } }
              : m
          ),
        });
      }
      fireToast(
        t(`✓ Role changed to ${ROLE_BADGE[newRole]?.label || newRole}`,
          `✓ ሚና ወደ ${ROLE_BADGE[newRole]?.label || newRole} ተቀይሯል`),
        1800
      );
    } catch (err) {
      fireToast(err.message || t('Failed to change role', 'ሚና መቀየር አልተሳካም'), 2400);
    } finally {
      set({ savingPerms: false });
    }
  },

  // ─── Settlement UI ───
  setSettling(v) { set({ settling: v }); },
  setViewingSettlement(v) { set({ viewingSettlement: v }); },
  clearSettlementOverlay() { set({ settling: null, viewingSettlement: null }); },

  handleViewSettlement(staff, settlement) {
    set({ viewingSettlement: { settlement, staff } });
  },

  handleSettlementSaved() {
    set({ settling: null, viewingSettlement: null });
    get().refreshSettlements();
  },

  handleStaffSubmitCollection: async (activeStaffMemberId, lastSettlementPerStaff, lang) => {
    const t = (en, am) => lang === 'am' ? am : en;
    const staffId = activeStaffMemberId;
    if (!staffId) return;
    const { staffCollectCash, staffCollectTransfer, staffCollectNote } = get();
    const cash = Number(staffCollectCash) || 0;
    const transfer = Number(staffCollectTransfer) || 0;
    if (cash === 0 && transfer === 0) {
      fireToast(t('Enter at least cash or transfer amount', 'ቢያንስ የጥሬ ገንዘብ ወይም የዝውውር መጠን ያስገቡ'), 2000);
      return;
    }
    set({ staffCollecting: true });
    try {
      const lastSettlement = lastSettlementPerStaff[String(staffId)];
      const periodStart = lastSettlement ? lastSettlement.settled_at : 0;
      const calc = await calculateExpected(String(staffId), periodStart, Date.now());
      const now = Date.now();
      const newEntry = createReconciliationEntry('staff', 'submitted', staffCollectNote.trim() || t('Staff submitted collection', 'ሰራተኛ ስብስብ አስገብቷል'));
      // Re-submitting updates the existing open submission instead of creating a duplicate.
      const existing = get().settlements.find(
        s => String(s.staff_id) === String(staffId) && s.reconciliation_status === 'staff_submitted'
      );
      const settlementPayload = {
        staff_id: staffId,
        period_start: periodStart,
        period_end: now,
        expected_cash: calc.expectedCash,
        expected_transfer: calc.expectedTransfer,
        expected_total: calc.expectedTotal,
        actual_cash: cash,
        actual_transfer: transfer,
        actual_total: cash + transfer,
        status: 'checked',
        reconciliation_status: 'staff_submitted',
        staff_reported_cash: cash,
        staff_reported_transfer: transfer,
        staff_submitted_at: now,
        staff_note: staffCollectNote.trim() || null,
        settled_at: now,
        settled_by: staffId,
        reconciliation_log: existing?.reconciliation_log
          ? [...existing.reconciliation_log, newEntry]
          : [newEntry],
      };
      if (existing) {
        await updateSettlement(existing.settlement_id, settlementPayload);
      } else {
        await saveSettlement({ settlement_id: generateSettlementId(), ...settlementPayload });
      }
      fireToast(t('✓ Collection submitted', '✓ ስብስብ ተልኳል'), 1800);
      set({ staffCollectCash: '', staffCollectTransfer: '', staffCollectNote: '', staffCollecting: false });
      get().refreshSettlements();
      // Notify owner
      const clouds = get().cloudMembers || [];
      const member = clouds.find(m => String(m.userId || m.id) === String(staffId)) ||
        clouds.find(m => String(m.id) === String(staffId));
      const bizId = useAuthStore.getState().currentBusinessId;
      const staffName = member?.display_name || member?.displayName || 'Staff';
      if (bizId) {
        apiFetch('/notifications', {
          method: 'POST',
          body: JSON.stringify({
            businessId: bizId,
            type: 'staff_submitted_collection',
            title: t('Staff submitted collection', 'ሰራተኛ ስብስብ አስገብቷል') + ` · ${staffName}`,
            body: `Cash: ${cash}, Transfer: ${transfer}`,
          }),
        }).catch(() => {});
      }
    } catch (err) {
      set({ staffCollecting: false });
      fireToast(err.message || t('Failed to submit', 'ማስገባት አልተሳካም'), 2400);
    }
  },

  // ─── Cloud staff: add via invite link is gone; onboarding is now code-driven ───
  // The owner generates a code in the Team tab; staff joins via StaffJoinScreen.
  // No handleAddCloudStaff needed here.

  // ─── UI actions ───
  toggleSection(section) {
    set(s => ({ expandedSections: { ...s.expandedSections, [section]: !s.expandedSections[section] } }));
  },

  setExpandedMember(v) { set({ expandedMember: v }); },
  setExpandedStaffDrilldown(v) { set({ expandedStaffDrilldown: v }); },

  startEditingStaff(staffId, displayName, phone) {
    set({ editingStaffName: staffId, editNameValue: displayName, editPhoneValue: phone || '' });
  },
  stopEditingStaff() {
    set({ editingStaffName: null, editNameValue: '', editPhoneValue: '' });
  },

  saveEditingStaff(staffMembers, onUpdateStaffMember) {
    const { editingStaffName, editNameValue, editPhoneValue } = get();
    if (!editingStaffName) return;
    const member = staffMembers.find(item => String(item.id) === String(editingStaffName));
    const displayName = editNameValue.trim() || member?.display_name || 'Staff';
    const normalizedPhone = normalizeEthiopianPhone(editPhoneValue);
    onUpdateStaffMember?.(editingStaffName, {
      display_name: displayName,
      phone: normalizedPhone || undefined,
    });
    set({ editingStaffName: null, editNameValue: '', editPhoneValue: '' });
  },

  setSearchQuery(v) { set({ searchQuery: v }); },

  setStaffCollectCash(v) { set({ staffCollectCash: v }); },
  setStaffCollectTransfer(v) { set({ staffCollectTransfer: v }); },
  setStaffCollectNote(v) { set({ staffCollectNote: v }); },

  // ─── Helpers (not stored, just exported for convenience) ───
  ROLE_PRESETS,
  ROLE_OPTIONS,
  PERMISSION_LABELS,
  getEffectiveRoleLabel,
}));

// New: refresh cloud members on app focus for live role/permission updates
  if (typeof window !== 'undefined') {
  let refreshTimer = null;
  window.addEventListener('focus', () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (!usePermissionsStore.getState().hasPermission('can_manage_team')) return;
      const { loadCloudMembers } = useStaffStore.getState();
      loadCloudMembers();
    }, 500);
  });
}