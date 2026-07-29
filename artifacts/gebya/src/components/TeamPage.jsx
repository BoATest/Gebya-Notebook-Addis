import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Shield, KeyRound } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useShopStore } from '../stores/shopStore';
import { usePermissionsStore } from '../stores/permissionsStore';
import { fireToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { apiFetch, ROLE_BADGE, RoleBadge } from '../utils/shared-ui.jsx';
import { getCurrentEntitlements } from '../utils/entitlements';
import identityApi from '../api/identity';
import { getAuthToken } from '../utils/syncEngine';

function ActorSelector({ staffMembers, activeStaffMemberId, currentActorLabel, onSetActiveStaffMember, shopProfile, lang }) {
  return (
    <div className="rounded-xl border px-4 py-3" style={{ borderColor: '#e8e2d8', background: '#fcfbf8' }}>
      <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
        {lang === 'am' ? 'አሁን ሪኮርድ እያደረጉ ያሉ' : 'Recording as'}
      </div>
      <div className="text-sm font-black text-gray-900 mb-2">{currentActorLabel || 'Owner'}</div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">
        {lang === 'am' ? 'አዲስ ሪኮርዶችን እንደ ያስቀምጡ' : 'Save new records as'}
      </label>
      <select
        value={activeStaffMemberId || ''}
        onChange={(e) => onSetActiveStaffMember?.(e.target.value || null)}
        className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none bg-white"
        style={{ borderColor: '#e8e2d8' }}
      >
        <option value="">Owner ({shopProfile?.name || 'Owner'})</option>
        {(staffMembers || []).filter(m => m.active !== false).map(m => (
          <option key={m.id} value={m.id}>{m.display_name}</option>
        ))}
      </select>
    </div>
  );
}

const PERMISSION_LABELS = {
  en: {
    can_add_records: 'Can record sales & expenses',
    can_delete_records: 'Can delete records',
    can_edit_settings: 'Can edit shop settings',
    can_view_reports: 'Can view reports',
  },
  am: {
    can_add_records: 'ሽያጭ መመዝገብ ይችላል',
    can_delete_records: 'መዝገቦችን መሰረዝ ይችላል',
    can_edit_settings: 'ቅንብሮችን ማርትዕ ይችላል',
    can_view_reports: 'ሪፖርቶችን ማየት ይችላል',
  },
};

function PermissionToggle({ keyName, value, onChange, lang }) {
  const label = PERMISSION_LABELS[lang]?.[keyName] || keyName;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(keyName, !value)}
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ background: value ? '#1B4332' : '#e5e7eb' }}
      >
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(14px)' : 'translateX(2px)' }}
        />
      </button>
    </div>
  );
}

function MemberPermissionPanel({ member, onUpdatePermission, lang }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingNoPerms, setPendingNoPerms] = useState(null);
  const perms = member.resolved_permissions || {};
  const isOwnerRole = member.role === 'owner';

  const applyToggle = async (key, nextValue) => {
    setSaving(true);
    try {
      await apiFetch(`/business/members/${member.userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ [key]: nextValue }),
      });
      if (member.resolved_permissions) {
        member.resolved_permissions[key] = nextValue;
      }
      fireToast(lang === 'am' ? '✓ ተሻሽሏል' : '✓ Updated', 1500);
    } catch (err) {
      fireToast(err.message || (lang === 'am' ? 'አልተሳካም' : 'Failed'), 2400);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (key, nextValue) => {
    if (saving) return;
    if (isOwnerRole) {
      fireToast(lang === 'am' ? 'የባለቤት ፍቃዶች አይቀየርም' : 'Owner permissions cannot be edited', 2200);
      return;
    }

    const next = { ...perms, [key]: nextValue };
    const hasAny = Object.values(next).some(v => v === true);
    if (!hasAny) {
      setPendingNoPerms({ key, nextValue });
      return;
    }
    await applyToggle(key, nextValue);
  };

  return (
    <div className="border-b last:border-0" style={{ borderColor: '#f0ece4' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
        style={{ background: member.active ? '#fff' : '#f9fafb' }}
      >
        <div>
          <div className="text-sm font-bold text-gray-900">{member.phoneNumber || 'Staff member'}</div>
          <div className="text-xs text-gray-500">
            {member.joined_at || member.joinedAt ? new Date(member.joined_at || member.joinedAt).toLocaleDateString() : (lang === 'am' ? 'ያልተቀላቀለ' : 'Not joined yet')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={member.role} />
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5`} style={{ background: member.active ? '#ecfdf5' : '#f3f4f6', color: member.active ? '#166534' : '#6b7280' }}>
            {member.active ? (lang === 'am' ? 'ንቁ' : 'Active') : (lang === 'am' ? 'ተሰናብቷል' : 'Inactive')}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1" style={{ background: '#fafaf9' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {lang === 'am' ? 'ፍቃዶች' : 'Permissions'}
            </span>
          </div>
          {(isOwnerRole ? ['can_manage_team'] : Object.keys(perms)).map((key) => (
            <PermissionToggle
              key={key}
              keyName={key}
              value={isOwnerRole ? true : (perms[key] ?? false)}
              onChange={isOwnerRole ? () => {} : handleToggle}
              lang={lang}
            />
          ))}
          {isOwnerRole && (
            <div className="text-[10px] text-gray-400 mt-1">{lang === 'am' ? 'የባለቤት ፍቃዶች ሁሉም ሲሆኑ አይቀየሩም' : 'Owner permissions are full and cannot be edited'}</div>
          )}
          {!isOwnerRole && (
            <div className="text-[10px] text-gray-400 mt-1">{lang === 'am' ? 'ለውጦቹ በሚቀጥለው ሲንክ ላይ ይገባሉ' : 'Changes apply on next sync'}</div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingNoPerms != null}
        tone="danger"
        title={lang === 'am' ? 'ሁሉም ፍቃዶች ይቺርዳሉ?' : 'Remove all permissions?'}
        message={lang === 'am' ? 'ይህ ሰራተኛ በቀላሉ ምንም አይችልም። ሙሉ?' : 'This staff member will not be able to do anything in the app. Proceed?'}
        confirmLabel={lang === 'am' ? 'ሙሉ' : 'Proceed'}
        cancelLabel={lang === 'am' ? 'ሰርዝ' : 'Cancel'}
        onConfirm={() => { const p = pendingNoPerms; setPendingNoPerms(null); if (p) applyToggle(p.key, p.nextValue); }}
        onCancel={() => setPendingNoPerms(null)}
      />
    </div>
  );
}

export default function TeamPage({
  staffMembers,
  activeStaffMemberId,
  currentActorLabel,
  onSetActiveStaffMember,
  onSaveStaffMember,
  onUpdateStaffMember,
  onDeactivateStaffMember,
  onReactivateStaffMember,
}) {
  const { lang } = useLang();
  const shopProfile = useShopStore(s => s.shopProfile);
  const canManageTeam = usePermissionsStore(s => s.hasPermission('can_manage_team'));

  const [localStaffName, setLocalStaffName] = useState('');

   const [cloudMembers, setCloudMembers] = useState(null);
   const [membersLoading, setMembersLoading] = useState(false);
   const [rotatingJoinCode, setRotatingJoinCode] = useState(false);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const data = await apiFetch('/business/members');
      setCloudMembers(data.members || []);
    } catch {
      setCloudMembers(null);
    } finally {
      setMembersLoading(false);
    }
  }, []);

   useEffect(() => { loadMembers(); }, [loadMembers]);

   const handleRotateJoinCode = useCallback(async () => {
     setRotatingJoinCode(true);
     try {
       const token = await getAuthToken();
       if (!token) return;
       const result = await identityApi.rotateJoinCode(shopProfile?.id, token);
       const current = shopProfile || {};
       useShopStore.getState().setShopProfile({ ...current, join_code: result.join_code, join_url: result.join_url });
       fireToast(lang === 'am' ? 'ኮድ ተሻከራል' : 'Join code reset', 2000);
     } catch {
       fireToast(lang === 'am' ? 'ኮድ አልተሻከረም' : 'Failed to reset join code', 3000);
     } finally {
       setRotatingJoinCode(false);
     }
   }, [shopProfile, lang]);

  const handleAddLocalStaff = async () => {
    if (!localStaffName.trim()) return;
    // Check staff entitlement limit
    try {
      const { entitlements } = await getCurrentEntitlements();
      const activeStaff = (staffMembers || []).filter(m => m.active !== false).length;
      if (activeStaff >= entitlements.max_staff) {
        fireToast(lang === 'am' ? 'የሰራተኛ ገደብ ደረሰዋል' : `Staff limit reached (${entitlements.max_staff}). Upgrade to add more.`, 3000);
        return;
      }
    } catch { /* entitlement check non-critical */ }
    await onSaveStaffMember?.({ display_name: localStaffName.trim(), role: 'staff', active: true });
    setLocalStaffName('');
  };

  return (
    <div className="space-y-4 pb-4">
      <ActorSelector
        staffMembers={staffMembers}
        activeStaffMemberId={activeStaffMemberId}
        currentActorLabel={currentActorLabel}
        onSetActiveStaffMember={onSetActiveStaffMember}
        shopProfile={shopProfile}
        lang={lang}
      />

      {/* Join code — visible to owners: lets staff join by entering the code */}
      {canManageTeam && (shopProfile?.join_code || shopProfile?.join_url) && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8', background: '#fff' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-black text-gray-900">
                {lang === 'am' ? 'የመቀላቀል ኮድ' : 'Join code'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'am'
                ? 'ይህን ኮድ ሰራተኛዎት ሊጠቀሙ ይችላሉ — መቀላቀል ላይ ያስገቡት'
                : 'Share this code so staff can join from the Join screen'}
            </p>
          </div>
          <div className="px-4 py-3 space-y-2">
             {shopProfile?.join_code && (
               <div className="flex items-center gap-2">
                 <span className="flex-1 text-lg font-black tracking-[0.3em] font-mono select-all" style={{ color: '#1B4332' }}>
                   {shopProfile.join_code}
                 </span>
                 <button
                   type="button"
                   onClick={async () => { try { await navigator.clipboard.writeText(shopProfile.join_code); fireToast(lang === 'am' ? '✓ ኮድ ተቀድሷል' : '✓ Code copied', 1500); } catch {} }}
                   className="flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-bold press-scale"
                   style={{ background: '#e8e2d8', color: '#374151' }}
                 >
                   {lang === 'am' ? 'ኮድ ቅዳ' : 'Copy code'}
                 </button>
                 <button
                   type="button"
                   onClick={handleRotateJoinCode}
                   disabled={rotatingJoinCode}
                   className="flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-bold press-scale"
                   style={{ background: rotatingJoinCode ? '#e5e7eb' : '#fef3c7', color: rotatingJoinCode ? '#9ca3af' : '#92400e', minWidth: 44, minHeight: 36 }}
                   title={lang === 'am' ? 'ኮድ ለአዲስ ይቀየሩ' : 'Reset join code'}
                 >
                   {rotatingJoinCode
                     ? (lang === 'am' ? 'ያስቀምጠል…' : 'Resetting…')
                     : (lang === 'am' ? 'ኮድ ለአዲስ' : 'Reset code')}
                 </button>
               </div>
             )}
            {shopProfile?.join_url && (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs font-mono text-gray-600 truncate">{shopProfile.join_url}</span>
                <button
                  type="button"
                  onClick={async () => { try { await navigator.clipboard.writeText(shopProfile.join_url); fireToast(lang === 'am' ? '✓ ሊንክ ተቀድሷል' : '✓ Link copied', 1500); } catch {} }}
                  className="flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-bold press-scale"
                  style={{ background: '#f5f0e8', color: '#374151' }}
                >
                  {lang === 'am' ? 'ሊንክ ቅዳ' : 'Copy link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team members list — visible to everyone, but permission editing only for owners */}
      {cloudMembers !== null && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {lang === 'am' ? 'የቡድን አባላት' : 'Team members'}
            </span>
            {membersLoading && <span className="text-xs text-gray-400">...</span>}
          </div>
          {cloudMembers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              {lang === 'am' ? 'እስካሁን አባላት የሉም' : 'No members yet'}
            </div>
          ) : (
            cloudMembers.map(m => (
              <MemberPermissionPanel
                key={m.id}
                member={m}
                onUpdatePermission={() => loadMembers()}
                lang={lang}
              />
            ))
          )}
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {lang === 'am' ? 'የዚህ ስልክ ሰራተኞች (Attribution)' : 'This-phone staff labels'}
          </span>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {lang === 'am' ? 'ሁሉም ስልኩን ቢጋሩ ለሪኮርዶች ስም ለመስጠት' : 'For shops where multiple people share one phone'}
          </p>
        </div>
        <div className="px-4 py-3 space-y-2">
          <div className="flex gap-2">
             <input
              type="text"
              value={localStaffName}
              onChange={e => setLocalStaffName(e.target.value)}
              placeholder={lang === 'am' ? 'የሰራተኛ ስም' : 'Staff name'}
              className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
              style={{ borderColor: localStaffName.trim() ? '#C4883A' : '#e8e2d8' }}
              onKeyDown={e => e.key === 'Enter' && handleAddLocalStaff()}
            />
            <button
              type="button"
              onClick={handleAddLocalStaff}
              disabled={!localStaffName.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px]"
              style={{ background: localStaffName.trim() ? '#1B4332' : '#e5e7eb', color: localStaffName.trim() ? '#fff' : '#9ca3af' }}
            >
              {lang === 'am' ? 'ጨምር' : 'Add'}
            </button>
          </div>
          {(staffMembers || []).map(member => (
            <div key={member.id} className="flex items-center justify-between px-3 py-2 rounded-xl border" style={{ borderColor: '#e8e2d8', background: member.active === false ? '#f9fafb' : '#fff' }}>
              <div>
                <span className="text-sm font-bold text-gray-900">{member.display_name}</span>
                <span className="ml-2 text-xs text-gray-400">{member.active === false ? (lang === 'am' ? 'ተሰናብቷል' : 'Inactive') : (member.role || 'staff')}</span>
              </div>
              <button
                type="button"
                onClick={() => member.active === false ? onReactivateStaffMember?.(member.id) : onDeactivateStaffMember?.(member.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-semibold"
                style={{ background: '#f5f5f5', color: '#6b7280' }}
              >
                {member.active === false ? (lang === 'am' ? 'ንቁ አድርግ' : 'Reactivate') : (lang === 'am' ? 'አቁም' : 'Deactivate')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
