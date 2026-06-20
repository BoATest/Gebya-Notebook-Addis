import { useCallback, useEffect, useState } from 'react';
import { Users, Copy, Check } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useShopStore } from '../stores/shopStore';
import { fireToast } from './Toast';
import { getAuthToken } from '../utils/syncEngine';

const API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';

async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const ROLE_BADGE = {
  owner: { label: 'Owner', bg: '#fef3c7', color: '#92400e' },
  cashier: { label: 'Cashier', bg: '#f3f4f6', color: '#4b5563' },
  viewer: { label: 'Viewer', bg: '#f3f4f6', color: '#4b5563' },
};

function RoleBadge({ role }) {
  const style = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}

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

  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('cashier');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);

  const [cloudMembers, setCloudMembers] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const [staffName, setStaffName] = useState('');

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

  const handleInvite = async () => {
    if (!phone.trim()) return;
    setInviting(true);
    try {
      const data = await apiFetch('/business/invite', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone.trim(), role }),
      });
      setInviteLink(data.invite_link);
      setPhone('');
      fireToast(lang === 'am' ? '✓ ጥሪ ተፈጠረ' : '✓ Invite created', 2000);
      loadMembers();
    } catch (err) {
      fireToast(err.message || (lang === 'am' ? 'አልተሳካም' : 'Failed'), 2400);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleAddLocalStaff = async () => {
    if (!staffName.trim()) return;
    await onSaveStaffMember?.({ display_name: staffName.trim(), role: 'staff', active: true });
    setStaffName('');
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

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8', background: '#fff' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-black text-gray-900">
              {lang === 'am' ? 'ሰራተኛ ጋብዝ' : 'Invite staff'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {lang === 'am'
              ? 'ሰራተኛ ቴሌፎን ቁጥር ያስገቡ — ለራሳቸው ስልክ ሊጠቀሙ ይችላሉ'
              : 'Staff get their own phone login and see the full shop notebook'}
          </p>
        </div>

        <form className="px-4 py-3 space-y-3" onSubmit={(e) => { e.preventDefault(); handleInvite(); }}>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={lang === 'am' ? 'ቴሌፎን ቁጥር' : 'Phone number'}
              className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
              style={{ borderColor: phone.trim() ? '#C4883A' : '#e8e2d8' }}
            />
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none bg-white"
              style={{ borderColor: '#e8e2d8' }}
            >
              <option value="cashier">{lang === 'am' ? 'ካሸር' : 'Cashier'}</option>
              <option value="viewer">{lang === 'am' ? 'ተመልካች' : 'Viewer'}</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!phone.trim() || inviting}
            className="w-full py-2.5 rounded-xl text-sm font-bold min-h-[44px]"
            style={{ background: phone.trim() ? '#1B4332' : '#e5e7eb', color: phone.trim() ? '#fff' : '#9ca3af' }}
          >
            {inviting ? '...' : (lang === 'am' ? 'ጥሪ ፍጠር' : 'Invite')}
          </button>

          {inviteLink && (
            <div className="rounded-xl border px-3 py-2.5 space-y-2" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
              <p className="text-xs font-bold text-green-800">{lang === 'am' ? 'ጥሪ ሊንክ' : 'Invite link — share this'}</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs font-mono text-gray-600 truncate">{inviteLink}</span>
                <button type="button" onClick={handleCopyLink} className="flex-shrink-0 px-2 py-1.5 rounded-lg press-scale text-xs font-bold" style={{ background: copied ? '#dcfce7' : '#e8e2d8', color: copied ? '#166534' : '#374151' }} aria-label="Copy">
                  {copied ? 'Copied' : 'Copy Link'}
                </button>
              </div>
              <p className="text-[10px] text-gray-400">Coming soon: send via Telegram automatically</p>
            </div>
          )}
        </form>
      </div>

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
            cloudMembers.map(m => {
              const displayName = m.name || m.phoneNumber || 'Staff member';
              return (
                <div key={m.id} className="px-4 py-3 flex items-center justify-between border-b last:border-0" style={{ borderColor: '#f0ece4', background: m.active ? '#fff' : '#f9fafb' }}>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{displayName}</div>
                    <div className="text-xs text-gray-500">
                      {m.joined_at || m.joinedAt ? new Date(m.joined_at || m.joinedAt).toLocaleDateString() : (lang === 'am' ? 'ያልተቀላቀለ' : 'Not joined yet')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleBadge role={m.role} />
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5`} style={{ background: m.active ? '#ecfdf5' : '#f3f4f6', color: m.active ? '#166534' : '#6b7280' }}>
                      {m.active ? (lang === 'am' ? 'ንቁ' : 'Active') : (lang === 'am' ? 'ተሰናብቷል' : 'Inactive')}
                    </span>
                  </div>
                </div>
              );
            })
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
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              placeholder={lang === 'am' ? 'የሰራተኛ ስም' : 'Staff name'}
              className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
              style={{ borderColor: staffName.trim() ? '#C4883A' : '#e8e2d8' }}
              onKeyDown={e => e.key === 'Enter' && handleAddLocalStaff()}
            />
            <button
              type="button"
              onClick={handleAddLocalStaff}
              disabled={!staffName.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px]"
              style={{ background: staffName.trim() ? '#1B4332' : '#e5e7eb', color: staffName.trim() ? '#fff' : '#9ca3af' }}
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
