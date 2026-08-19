import { useCallback } from 'react';
import db from '../db';
import { getAuthToken } from '../utils/syncEngine';
import identityApi from '../api/identity';
import { useStaffStore } from '../stores/staffStore';
import { normalizeStaffDraft } from '../utils/staffMembers';
import { trackEvent } from '../utils/eventTracking';

export function useStaffOps({ setStaffMembers, setActiveStaffMemberId, staffMembers, activeStaffMemberId, shopProfile }) {

  const sortStaff = useCallback((members) => (
    [...members].sort((a, b) => {
      if ((a.active !== false) !== (b.active !== false)) return a.active === false ? 1 : -1;
      return String(a.display_name || '').localeCompare(String(b.display_name || ''));
    })
  ), []);

  const refreshStaffMembers = useCallback(async () => {
    const shopId = shopProfile?.shop_id || shopProfile?.id;
    if (!shopId) return;
    const token = await getAuthToken();
    if (!token) return;
    const data = await identityApi.listStaff(shopId, token);
    if (!data?.staff) return;
    setStaffMembers(data.staff
      .filter(s => s.role !== 'owner')
      .map(s => ({
        id: s.staff_id,
        staff_id: s.staff_id,
        display_name: s.display_name,
        phone_snapshot: s.phone_snapshot,
        role: s.role,
        active: s.staff_status !== 'inactive',
        staff_status: s.staff_status,
        pending: (s.devices || []).some(d => d.device_status === 'pending'),
        permissions: s.permissions,
        joined_at: s.joined_at,
        updated_at: Date.now(),
        deactivated_at: s.deactivated_at,
        devices: (s.devices || []).map(d => ({
          id: d.device_id,
          device_id: d.device_id,
          device_label: d.device_label,
          active: d.device_status === 'active',
          device_status: d.device_status,
          pending: d.device_status === 'pending',
          last_seen_at: d.last_seen_at,
          created_at: d.created_at,
        })),
      })));
  }, [shopProfile, setStaffMembers]);

  const handleSaveStaffMember = useCallback(async (payload) => {
    const normalized = normalizeStaffDraft(payload);
    if (!normalized) return false;
    const token = await getAuthToken();
    if (!token) return false;
    try {
      const shopId = shopProfile?.shop_id || shopProfile?.id;
      if (!shopId) return false;
      const result = await identityApi.addStaff(shopId, {
        display_name: normalized.display_name,
        phone: payload.phone,
        role: normalized.role || 'cashier',
      }, token);
      await refreshStaffMembers();
      return result;
    } catch (err) {
      console.error('addStaff failed', err);
      return false;
    }
  }, [shopProfile, refreshStaffMembers]);

  const handleUpdateStaffMember = useCallback(async (staffId, payload) => {
    const member = staffMembers.find(item => String(item.id) === String(staffId));
    if (!member) return false;
    const displayName = String(payload?.display_name || '').trim();
    if (!displayName) return false;

    const now = Date.now();
    const updates = { display_name: displayName, updated_at: now };
    if (payload.phone !== undefined) {
      updates.phone_snapshot = payload.phone;
    }
    await db.staff_members.update(member.id, updates);
    const updatedMember = { ...member, display_name: displayName, updated_at: now, ...(payload.phone !== undefined ? { phone_snapshot: payload.phone } : {}) };
    setStaffMembers(prev => sortStaff(prev.map(item => item.id === member.id ? updatedMember : item)));
    return updatedMember;
  }, [staffMembers, setStaffMembers, sortStaff]);

  const handleSetActiveStaffMember = useCallback(async (staffId) => {
    const nextId = staffId ? Number(staffId) : null;
    await db.settings.put({ key: 'active_staff_member_id', value: nextId });
    setActiveStaffMemberId(nextId);
  }, [setActiveStaffMemberId]);

  // Cloud members are the single source of truth. StaffPage passes the
  // member's user id (member.userId) as staffId, which is exactly what the
  // legacy deactivate/reactivate routes key on, so we call the API directly
  // and refresh the cloud list. A legacy local-only record fallback is kept.
  const handleDeactivateStaffMember = useCallback(async (staffId) => {
    const token = await getAuthToken();
    if (!token) return false;
    try {
      await identityApi.deactivateStaff(staffId, token);
      await refreshStaffMembers();
      const { loadCloudMembers } = useStaffStore.getState();
      await loadCloudMembers();
      return true;
    } catch (err) {
      const local = staffMembers.find(item => String(item.id) === String(staffId));
      if (local) {
        const now = Date.now();
        await db.staff_members.update(local.id, { active: false, updated_at: now, deactivated_at: now });
        setStaffMembers(prev => sortStaff(prev.map(item =>
          item.id === local.id ? { ...item, active: false, updated_at: now, deactivated_at: now } : item
        )));
        if (String(activeStaffMemberId) === String(local.id)) {
          await db.settings.put({ key: 'active_staff_member_id', value: null });
          setActiveStaffMemberId(null);
        }
        return true;
      }
      console.error('deactivateStaff failed', err);
      return false;
    }
  }, [staffMembers, activeStaffMemberId, setStaffMembers, setActiveStaffMemberId, sortStaff, refreshStaffMembers]);

  const handleReactivateStaffMember = useCallback(async (staffId) => {
    const token = await getAuthToken();
    if (!token) return false;
    try {
      await identityApi.reactivateStaff(staffId, token);
      await refreshStaffMembers();
      const { loadCloudMembers } = useStaffStore.getState();
      await loadCloudMembers();
      return true;
    } catch (err) {
      const local = staffMembers.find(item => String(item.id) === String(staffId));
      if (local) {
        const now = Date.now();
        await db.staff_members.update(local.id, { active: true, updated_at: now, deactivated_at: null });
        setStaffMembers(prev => sortStaff(prev.map(item =>
          item.id === local.id ? { ...item, active: true, updated_at: now, deactivated_at: null } : item
        )));
        return true;
      }
      console.error('reactivateStaff failed', err);
      return false;
    }
  }, [staffMembers, setStaffMembers, sortStaff, refreshStaffMembers]);

  const handleApproveDevice = useCallback(async (deviceId) => {
    try {
      const token = await getAuthToken();
      if (!token) return null;
      const result = await identityApi.approveDevice(deviceId, token);
      await refreshStaffMembers();
      const { loadCloudMembers } = useStaffStore.getState();
      await loadCloudMembers();
      return result;
    } catch {
      return null;
    }
  }, [refreshStaffMembers]);

  const handleRejectDevice = useCallback(async (deviceId, reason) => {
    try {
      const token = await getAuthToken();
      if (!token) return null;
      const result = await identityApi.rejectDevice(deviceId, { reason }, token);
      await refreshStaffMembers();
      const { loadCloudMembers } = useStaffStore.getState();
      await loadCloudMembers();
      return result;
    } catch {
      return null;
    }
  }, [refreshStaffMembers]);

  return {
    handleSaveStaffMember,
    handleUpdateStaffMember,
    handleSetActiveStaffMember,
    handleDeactivateStaffMember,
    handleReactivateStaffMember,
    handleApproveDevice,
    handleRejectDevice,
    refreshStaffMembers,
  };
}
