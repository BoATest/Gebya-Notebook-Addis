import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Copy, Check, ChevronDown, ChevronUp, Shield, KeyRound, Upload, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useShopStore } from '../stores/shopStore';
import { usePermissionsStore } from '../stores/permissionsStore';
import { useAuthStore } from '../stores/authStore';
import { fireToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { getAuthToken } from '../utils/syncEngine';
import { getCurrentEntitlements } from '../utils/entitlements';
import { loadStaffActivityFeed } from '../utils/staffActivityFeed';
import { getActorDisplayLabel } from '../utils/staffMembers';
import { loadSettlementFromLocalStorage, clearSettlementDraft, calculateExpected } from '../utils/settlementSelectors';
import { startOfLocalDay } from '../utils/reportSelectors';
import StaffReportSheet from './StaffReportSheet';
import SettlementSheet from './report/SettlementSheet';
import StaffSettlementList from './report/StaffSettlementList';
import db, { getAllSettlements, saveSettlement, updateSettlement } from '../db';
import { fmt } from '../utils/numformat';

const API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';

async function apiFetch(path, options = {}) {
  const token = await getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  const bizId = useAuthStore.getState().currentBusinessId;
  if (bizId) headers['x-business-id'] = String(bizId);
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const ROLE_BADGE = {
  owner: { label: 'Owner', bg: '#fef3c7', color: '#92400e' },
  manager: { label: 'Manager', bg: '#fef3c7', color: '#92400e' },
  trusted_staff: { label: 'Trusted Staff', bg: '#e0f2fe', color: '#0369a1' },
  cashier: { label: 'Sales Staff', bg: '#f3f4f6', color: '#4b5563' },
  viewer: { label: 'Auditor', bg: '#f3f4f6', color: '#4b5563' },
};

function RoleBadge({ role }) {
  const style = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}

function ReconStatusBadge({ status, lang }) {
  const t = (en, am) => lang === 'am' ? am : en;
  const STATUSES = {
    staff_submitted: { label: t('Staff submitted', 'ሰራተኛ ልኳል'), bg: '#e0f2fe', color: '#0369a1' },
    owner_reviewed: { label: t('Owner reviewed', 'ባለቤት ተመልክቷል'), bg: '#fef3c7', color: '#92400e' },
    disputed: { label: t('Disputed', 'አልተስማማም'), bg: '#fef2f2', color: '#b91c1c' },
    finalized: { label: t('Finalized', 'ተጠናቋል'), bg: '#dcfce7', color: '#166534' },
    checked: { label: t('Checked', 'ተፈትሟል'), bg: '#f3f4f6', color: '#6b7280' },
  };
  const s = STATUSES[status] || STATUSES.checked;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

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

function parseCsvToInvites(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const result = [];
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length < 2) continue;
    const [name, phone, role = 'cashier'] = parts;
    if (!name || !phone) continue;
    result.push({
      staff_name: name,
      phone_number: phone.replace(/^0+/, ''),
      role: ['cashier', 'viewer', 'owner', 'manager', 'trusted_staff'].includes(role) ? role : 'cashier',
    });
  }
  return result;
}

function BulkInviteModal({ onClose, onImported, lang }) {
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState([]);

  const handleImport = async () => {
    const rows = parseCsvToInvites(csv);
    setImporting(true);
    const out = [];
    for (const row of rows) {
      try {
        const res = await apiFetch('/business/invite', { method: 'POST', body: JSON.stringify(row) });
        out.push({ ...row, ok: true, data: res });
      } catch (err) {
        out.push({ ...row, ok: false, error: err.message || 'Failed' });
      }
    }
    setResults(out);
    setImporting(false);
    try { await onImported?.(); } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-2xl border bg-white p-4" style={{ borderColor: '#e8e2d8' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-black text-gray-900">{lang === 'am' ? 'ከ CSV አስገባ' : 'Import from CSV'}</div>
            <div className="text-[10px] text-gray-500">{lang === 'am' ? 'ስም, ስልክ, ቦታ' : 'name, phone, role'}</div>
          </div>
          <button type="button" onClick={onClose} className="text-xs font-bold text-gray-500">✕</button>
        </div>
        <textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          placeholder={`Abebe Bekele,911223344,cashier\nSara Hailu,922334455,viewer`}
          className="w-full h-32 rounded-xl border px-3 py-2 text-xs font-mono"
          style={{ borderColor: '#e8e2d8' }}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="text-[10px] text-gray-500">{lang === 'am' ? 'ቻር ለማድረግ ይጠቀሙ' : 'Use commas to separate columns'}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl border text-xs font-bold" style={{ borderColor: '#e8e2d8' }}>{lang === 'am' ? 'መውጫ' : 'Cancel'}</button>
            <button type="button" disabled={importing || !csv.trim()} onClick={handleImport} className="px-3 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold disabled:opacity-50">
              {importing ? (lang === 'am' ? 'በመጫን ላይ...' : 'Importing...') : (lang === 'am' ? 'አስገባ' : 'Import')}
            </button>
          </div>
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-[10px] font-bold text-gray-700">Results · {results.filter(r => r.ok).length} success / {results.filter(r => !r.ok).length} failed</div>
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border px-2 py-1.5" style={{ borderColor: r.ok ? '#bbf7d0' : '#fecaca', background: r.ok ? '#ecfdf5' : '#fef2f2' }}>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-gray-900 truncate">{r.staff_name}</div>
                  <div className="text-[10px] text-gray-600">{r.phone_number} · {r.role}</div>
                </div>
                <div className="text-[10px] font-black" style={{ color: r.ok ? '#166534' : '#b91c1c' }}>
                  {r.ok ? 'OK' : (r.error || 'Failed')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffActivityFeed() {
  const { lang } = useLang();
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadStaffActivityFeed()
      .then(res => { if (!cancelled) setActivities(res.activities || []); })
      .catch(() => { if (!cancelled) setActivities([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filters = [
    { key: 'all', label: lang === 'am' ? 'ሁሉም' : 'All' },
    { key: 'sale', label: lang === 'am' ? 'ሽያጭ' : 'Sales' },
    { key: 'customer_payment', label: lang === 'am' ? 'ክፍያ' : 'Payments' },
    { key: 'customer_credit', label: lang === 'am' ? 'ዱቤ' : 'Dubie' },
  ];

  const visible = useMemo(
    () => filter === 'all' ? activities : activities.filter(a => a.event_type === filter),
    [activities, filter]
  );

  const grouped = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    const todayStart = startOfLocalDay(now);
    const weekStart = todayStart - (new Date(now).getDay() * day);
    const monthStart = new Date(now).getFullYear() + '-' + String(new Date(now).getMonth() + 1).padStart(2, '0');

    const groups = {
      today: { label: lang === 'am' ? 'ዛሬ' : 'Today', items: [] },
      week: { label: lang === 'am' ? 'በዚህ ሳምንት' : 'This week', items: [] },
      month: { label: lang === 'am' ? 'በዚህ ወር' : 'This month', items: [] },
      older: { label: lang === 'am' ? 'ቀደም ብሎ' : 'Older', items: [] },
    };

    for (const a of visible) {
      const ts = a.created_at || 0;
      if (ts >= todayStart) groups.today.items.push(a);
      else if (ts >= weekStart) groups.week.items.push(a);
      else if (String(new Date(ts).getFullYear()) + '-' + String(new Date(ts).getMonth() + 1).padStart(2, '0') === monthStart) groups.month.items.push(a);
      else groups.older.items.push(a);
    }

    return Object.fromEntries(
      Object.entries(groups).filter(([, g]) => g.items.length > 0)
    );
  }, [visible, lang]);

  const periodOrder = ['today', 'week', 'month', 'older'];

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap"
              style={{
                background: active ? '#1B4332' : '#f3f4f6',
                color: active ? '#fff' : '#6b7280',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-6">{lang === 'am' ? 'በመጫን ላይ…' : 'Loading…'}</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">{lang === 'am' ? 'የሰራተኞች እንቅስቃሴ እዚህ ይታያል' : 'Staff activity will appear here as team members record sales, payments, and Dubie.'}</p>
      ) : (
        <div className="space-y-2">
          {periodOrder.filter(p => grouped[p]).map(period => {
            const group = grouped[period];
            const totalAmount = group.items.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const isExpanded = expandedPeriod === period;
            return (
              <div key={period} className="rounded-xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
                <button
                  onClick={() => setExpandedPeriod(isExpanded ? null : period)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left"
                  style={{ background: '#fcfbf8' }}
                >
                  <div>
                    <div className="text-xs font-black text-gray-700">{group.label}</div>
                    <div className="text-[10px] font-bold" style={{ color: '#1B4332' }}>
                      {group.items.length} {lang === 'am' ? 'እንቅስቃሴዎች' : 'activities'}
                      {totalAmount > 0 && ` · ${fmt(totalAmount)} ${lang === 'am' ? 'ብር' : 'birr'}`}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2 space-y-1">
                    {group.items.map(a => (
                      <div key={a.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                          {(a.staff_name || 'S').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-gray-800 truncate">
                            {a.staff_name}
                            <span style={{ color: '#9ca3af', fontWeight: 400 }}> · {a.summary || a.event_type}</span>
                          </div>
                          {a.amount != null && (
                            <div className="text-[10px]" style={{ color: '#6b7280' }}>{a.amount.toLocaleString()} birr</div>
                          )}
                        </div>
                        {a.sync_state === 'needs_retry' && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded-full" style={{ background: '#fef2f2', color: '#dc2626' }}>
                            {lang === 'am' ? 'እንደገና' : 'Retry'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  lang,
  canManageTeam,
}) {
  const t = (en, am) => lang === 'am' ? am : en;

  // ── Invite state ──
  const [phone, setPhone] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [localStaffName, setLocalStaffName] = useState('');
  const [role, setRole] = useState('cashier');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // ── Cloud members ──
  const [cloudMembers, setCloudMembers] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Expanded / collapsed sections ──
  const [expandedSections, setExpandedSections] = useState({
    invite: false,
    activity: false,
    more: false,
  });

  // ── Quick-collect state ──
  const [quickCollectStaff, setQuickCollectStaff] = useState(null);
  const [quickCollectAmount, setQuickCollectAmount] = useState('');

  // ── Settlement state ──
  const [settling, setSettling] = useState(null);
  const [viewingSettlement, setViewingSettlement] = useState(null);
  const [settlementRefreshKey, setSettlementRefreshKey] = useState(0);

  // ── Permission editing state ──
  const [expandedMember, setExpandedMember] = useState(null);
  const [pendingNoPerms, setPendingNoPerms] = useState(null);
  const [pendingPermChange, setPendingPermChange] = useState(null);
  const [savingPerms, setSavingPerms] = useState(false);
  const [localPermOverrides, setLocalPermOverrides] = useState({});

  // ── Inline rename state ──
  const [editingStaffName, setEditingStaffName] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editPhoneValue, setEditPhoneValue] = useState('');

  // ── Today's staff sales & transactions ──
  const [todayStaffSales, setTodayStaffSales] = useState({});
  const [todayStaffTransactions, setTodayStaffTransactions] = useState({});
  const [expandedStaffDrilldown, setExpandedStaffDrilldown] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const todayStart = startOfLocalDay();
        const todayEnd = todayStart + 86400000;
        const txns = await db.transactions.where('created_at').between(todayStart, todayEnd).toArray();
        if (cancelled) return;
        const salesMap = {};
        const txnMap = {};
        for (const t of txns) {
          if (t.type !== 'sale') continue;
          const staffId = t.actor_staff_member_id;
          if (!staffId) continue;
          if (!salesMap[staffId]) salesMap[staffId] = { count: 0, total: 0, cashTotal: 0, transferTotal: 0 };
          salesMap[staffId].count += 1;
          salesMap[staffId].total += Number(t.amount || 0);
          if (t.payment_type === 'transfer' || t.payment_type === 'bank') {
            salesMap[staffId].transferTotal += Number(t.amount || 0);
          } else {
            salesMap[staffId].cashTotal += Number(t.amount || 0);
          }
          if (!txnMap[staffId]) txnMap[staffId] = [];
          txnMap[staffId].push(t);
        }
        setTodayStaffSales(salesMap);
        setTodayStaffTransactions(txnMap);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Staff collection form ──
  const [staffCollectCash, setStaffCollectCash] = useState('');
  const [staffCollectTransfer, setStaffCollectTransfer] = useState('');
  const [staffCollectNote, setStaffCollectNote] = useState('');
  const [staffCollecting, setStaffCollecting] = useState(false);

  // ── Settlements data ──
  const [settlements, setSettlements] = useState([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bizRow = await db.settings.get('gebya_business_id');
        const bizId = Number(bizRow?.value) || 0;
        const rows = await getAllSettlements(Date.now() - 90 * 86400000, Date.now() + 86400000, bizId);
        if (!cancelled) setSettlements(rows);
      } catch {}
    })();
    const interval = setInterval(async () => {
      const bizRow = await db.settings.get('gebya_business_id');
      const bizId = Number(bizRow?.value) || 0;
      try {
        const rows = await getAllSettlements(Date.now() - 90 * 86400000, Date.now() + 86400000, bizId);
        setSettlements(rows);
      } catch {}
    }, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [settlementRefreshKey]);

  // ── Visibility guard for settlement poll ──
  useEffect(() => {
    const handle = () => {
      if (document.hidden) return;
      setSettlementRefreshKey(k => k + 1);
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []);

  // ── Derived data ──
  const activeStaff = useMemo(() =>
    (staffMembers || []).filter(m => m.active !== false),
    [staffMembers]
  );
  const inactiveStaff = useMemo(() =>
    (staffMembers || []).filter(m => m.active === false),
    [staffMembers]
  );

  const lastSettlementPerStaff = useMemo(() => {
    const map = {};
    for (const s of settlements) {
      const key = String(s.staff_id);
      if (!map[key] || s.settled_at > map[key].settled_at) {
        map[key] = s;
      }
    }
    return map;
  }, [settlements]);

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

  // ── Cloud data loading ──
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

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await apiFetch('/business/invites/pending');
      setPendingInvites(Array.isArray(data.pending) ? data.pending : []);
    } catch {
      setPendingInvites([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); loadPending(); }, [loadMembers, loadPending]);

  // ── Handlers ──
  const handleInvite = async () => {
    if (!phone.trim() || !inviteName.trim()) return;
    try {
      const { entitlements } = await getCurrentEntitlements();
      if (activeStaff.length >= entitlements.max_staff) {
        fireToast(t('Staff limit reached. Upgrade to add more.', 'የሰራተኛ ገደብ ደረሰዋል'), 3000);
        return;
      }
    } catch { /* non-critical */ }
    setInviting(true);
    try {
      const data = await apiFetch('/business/invite', {
        method: 'POST',
        body: JSON.stringify({ phone_number: phone.trim(), role, staff_name: inviteName.trim() }),
      });
      setInviteLink(data.invite_link);
      setPhone('');
      setInviteName('');
      fireToast(t('✓ Invite created', '✓ ጥሪ ተፈጠረ'), 2000);
      loadMembers();
      loadPending();
    } catch (err) {
      fireToast(err.message || t('Failed', 'አልተሳካም'), 2400);
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await apiFetch(`/business/invites/${inviteId}`, { method: 'DELETE' });
      fireToast(t('Invite cancelled', 'ጥሪ ተሰረዘ'), 1800);
      loadPending();
    } catch (err) {
      fireToast(err.message || t('Failed', 'አልተሳካም'), 2400);
    }
  };

  const handleAddLocalStaff = async () => {
    if (!localStaffName.trim()) return;
    try {
      const { entitlements } = await getCurrentEntitlements();
      if (activeStaff.length >= entitlements.max_staff) {
        fireToast(t('Staff limit reached. Upgrade to add more.', 'የሰራተኛ ገደብ ደረሰዋል'), 3000);
        return;
      }
    } catch { /* non-critical */ }
    await onSaveStaffMember?.({ display_name: localStaffName.trim(), role: 'staff', active: true });
    setLocalStaffName('');
  };

  const handleTogglePermission = (member, key, nextValue) => {
    if (savingPerms) return;
    if (member.role === 'owner') {
      fireToast(t('Owner permissions cannot be edited', 'የባለቤት ፍቃዶች አይቀየርም'), 2200);
      return;
    }
    const perms = member.resolved_permissions || {};
    const next = { ...perms, [key]: nextValue };
    const hasAny = Object.values(next).some(v => v === true);
    if (!hasAny) {
      setPendingNoPerms({ member, key, nextValue });
      return;
    }
    const label = PERMISSION_LABELS[lang]?.[key] || key;
    setPendingPermChange({ member, key, nextValue, label });
  };

  const applyTogglePermission = async (member, key, nextValue) => {
    setSavingPerms(true);
    setLocalPermOverrides(prev => ({
      ...prev,
      [member.id || member.userId]: { ...(prev[member.id || member.userId] || {}), [key]: nextValue },
    }));
    try {
      await apiFetch(`/business/members/${member.userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ [key]: nextValue }),
      });
      fireToast(t('✓ Updated', '✓ ተሻሽሏል'), 1500);
    } catch (err) {
      setLocalPermOverrides(prev => {
        const next = { ...prev };
        const mid = member.id || member.userId;
        if (next[mid]) {
          const updated = { ...next[mid] };
          delete updated[key];
          if (Object.keys(updated).length === 0) delete next[mid];
          else next[mid] = updated;
        }
        return next;
      });
      fireToast(err.message || t('Failed', 'አልተሳካም'), 2400);
    } finally {
      setSavingPerms(false);
    }
  };

  const handleQuickCollect = async (staff) => {
    setQuickCollectStaff(staff);
    const sales = todayStaffSales[staff.id];
    const suggested = sales ? String(Math.round(sales.cashTotal)) : '';
    setQuickCollectAmount(suggested);
  };

  const handleQuickCollectConfirm = async () => {
    const staff = quickCollectStaff;
    if (!staff) return;
    const amount = parseFloat(quickCollectAmount) || 0;
    try {
      await saveSettlement({
        staff_id: staff.id,
        period_start: startOfLocalDay(),
        period_end: Date.now(),
        actual_cash: amount,
        actual_transfer: 0,
        status: 'checked',
        settled_at: Date.now(),
        notes: t('Quick collected', 'ፈጣን ማስተካከያ'),
      });
      fireToast(t(`✓ ${fmt(amount)} ETB collected`, `✓ ${fmt(amount)} ብር ተሰበሰበ`), 1500);
      setQuickCollectStaff(null);
      setQuickCollectAmount('');
      setSettlementRefreshKey(k => k + 1);
    } catch (err) {
      fireToast(err.message || t('Failed', 'አልተሳካም'), 2400);
    }
  };

  const handleSettlementSaved = () => {
    setSettling(null);
    setViewingSettlement(null);
    setSettlementRefreshKey(k => k + 1);
  };

  const handleStaffSubmitCollection = async () => {
    const staffId = activeStaffMemberId;
    if (!staffId) return;
    const cash = Number(staffCollectCash) || 0;
    const transfer = Number(staffCollectTransfer) || 0;
    if (cash === 0 && transfer === 0) {
      fireToast(t('Enter at least cash or transfer amount', 'ቢያንስ የጥሬ ገንዘብ ወይም የዝውውር መጠን ያስገቡ'), 2000);
      return;
    }
    setStaffCollecting(true);
    try {
      const lastSettlement = lastSettlementPerStaff[String(staffId)];
      const periodStart = lastSettlement ? lastSettlement.settled_at : 0;
      const calc = await calculateExpected(String(staffId), periodStart, Date.now());
      await saveSettlement({
        staff_id: staffId,
        period_start: periodStart,
        period_end: Date.now(),
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
        staff_submitted_at: Date.now(),
        staff_note: staffCollectNote.trim() || null,
        settled_at: Date.now(),
        settled_by: staffId,
        reconciliation_log: [{ actor: 'staff', action: 'submitted', note: staffCollectNote.trim() || t('Staff submitted collection', 'ሰራተኛ ስብስብ አስገብቷል'), timestamp: Date.now() }],
      });
      fireToast(t('✓ Collection submitted', '✓ ስብስብ ተልኳል'), 1800);
      setSettlementRefreshKey(k => k + 1);
      setStaffCollectCash('');
      setStaffCollectTransfer('');
      setStaffCollectNote('');
    } catch (err) {
      fireToast(err.message || t('Failed to submit', 'ማስገባት አልተሳካም'), 2400);
    }
    setStaffCollecting(false);
  };

  const activeSettlement = settling || (viewingSettlement ? viewingSettlement.settlement : null);
  const activeSettlementStaff = settling || (viewingSettlement ? viewingSettlement.staff : null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ── Stats ──
  const snapshotStats = useMemo(() => {
    const totalStaff = (staffMembers || []).length;
    const active = activeStaff.length;
    const pendingDeviceCount = pendingDevices.length;
    const unsettledCount = unsettledStaff.length;
    return { totalStaff, active, pendingDeviceCount, unsettledCount };
  }, [staffMembers, activeStaff, pendingDevices, unsettledStaff]);

  // ── Combined staff list (local + cloud) ──
  const combinedStaffList = useMemo(() => {
    const local = (staffMembers || []).map(m => ({ ...m, _source: 'local' }));
    const cloud = (cloudMembers || []).map(m => ({ ...m, _source: 'cloud' }));
    const localIds = new Set(local.map(m => String(m.id)));
    const uniqueCloud = cloud.filter(m => !localIds.has(String(m.id)));
    return [...local, ...uniqueCloud];
  }, [staffMembers, cloudMembers]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return combinedStaffList;
    const q = searchQuery.toLowerCase();
    return combinedStaffList.filter(m =>
      (m.display_name || m.displayName || m.name || '').toLowerCase().includes(q) ||
      (m.phone || m.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [combinedStaffList, searchQuery]);

  // ── Render ──
  return (
    <div className="space-y-4 pb-4">
      {/* ════════════════════════════════════════════ */}
      {/* 1. SNAPSHOT STATS BAR                       */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && (
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: '#e8e2d8', background: '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: '#1B4332' }}>{snapshotStats.active}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Active', 'ንቁ')}</div>
          </div>
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: unsettledStaff.length > 0 ? '#fde68a' : '#e8e2d8', background: unsettledStaff.length > 0 ? '#fffbeb' : '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: unsettledStaff.length > 0 ? '#d97706' : '#6b7280' }}>{snapshotStats.unsettledCount}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Unsettled', 'ያልተስተካከለ')}</div>
          </div>
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: pendingDevices.length > 0 ? '#fde68a' : '#e8e2d8', background: pendingDevices.length > 0 ? '#fffbeb' : '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: pendingDevices.length > 0 ? '#d97706' : '#6b7280' }}>{snapshotStats.pendingDeviceCount}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Pending', 'በመጠባበቅ')}</div>
          </div>
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: '#e8e2d8', background: '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: '#1B4332' }}>{snapshotStats.totalStaff}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Total', 'ጠቅላላ')}</div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 2. NEEDS ATTENTION (conditional)            */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && (unsettledStaff.length > 0 || pendingDevices.length > 0) && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
          <div className="px-4 py-2 text-xs font-black uppercase tracking-wide" style={{ color: '#92400e' }}>
            {t('Needs attention', 'ትኩረት የሚፈልግ')}
          </div>
          {unsettledStaff.map(m => {
            const estCash = todayStaffSales[m.id];
            return (
              <div key={m.id} className="px-4 py-2.5 flex items-center justify-between border-t" style={{ borderColor: '#fef3c7' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span>💰</span>
                  <div>
                    <span className="text-xs font-bold text-gray-800 truncate">{m.display_name}</span>
                    <span className="text-[10px] text-gray-500"> {t('not settled', 'አልተስተካከለም')}</span>
                    {estCash && (
                      <div className="text-[10px] font-bold mt-0.5" style={{ color: '#d97706' }}>
                        {t('Est.', 'ግምት')} {fmt(estCash.cashTotal)} ETB
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleQuickCollect(m)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                    style={{ background: '#dcfce7', color: '#166534' }}
                  >
                    ✓ {t('Collected', 'ተሰበሰበ')}
                  </button>
                  <button
                    onClick={() => setSettling(m)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                    style={{ background: '#1B4332', color: '#fff' }}
                  >
                    {t('Settle', 'አስተካክል')}
                  </button>
                </div>
              </div>
            );
          })}
          {pendingDevices.map(d => (
            <div key={d.id} className="px-4 py-2.5 flex items-center justify-between border-t" style={{ borderColor: '#fef3c7' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span>📱</span>
                <span className="text-xs font-bold text-gray-800 truncate">{d.staffName || 'Staff'}</span>
                <span className="text-[10px] text-gray-500">{t('device pending', 'መሳሪያ በመጠባበቅ')}</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onApproveDevice?.(d.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#1B4332', color: '#fff' }}
                >
                  {t('Approve', 'አረጋግጥ')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 3. TODAY'S TEAM  (with drill-down)           */}
      {/* ════════════════════════════════════════════ */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {t("Today's Team", 'የዛሬ ቡድን')}
          </span>
          <span className="text-xs font-black" style={{ color: '#1B4332' }}>{activeStaff.length} {t('active', 'ንቁ')}</span>
        </div>
        <div className="divide-y" style={{ borderColor: '#f0ece4' }}>
          {activeStaff.length === 0 && (
            <div className="px-4 py-6 text-center">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm font-bold text-gray-500">
                {canManageTeam
                  ? t('Invite your first team member', 'የመጀመሪያ ሰራተኛዎን ይጋብዙ')
                  : t('No team members yet', 'እስካሁን የቡድን አባላት የሉም')}
              </p>
            </div>
          )}
          {activeStaff.map(m => {
            const isPendingDevice = (m.devices || []).some(d => d.device_status === 'pending' || d.pending);
            const isDrilled = expandedStaffDrilldown === m.id;
            const sales = todayStaffSales[m.id];
            const txns = todayStaffTransactions[m.id] || [];
            const isOwnerView = canManageTeam;
            return (
              <div key={m.id}>
                <button
                  onClick={() => setExpandedStaffDrilldown(isDrilled ? null : m.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      {(m.display_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{m.display_name}</div>
                      <div className="text-xs text-gray-500">
                        <RoleBadge role={m.role || 'staff'} />
                        {isPendingDevice && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
                            {t('pending', 'በመጠባበቅ')}
                          </span>
                        )}
                      </div>
                      {sales && (
                        <div className="text-xs font-bold mt-0.5" style={{ color: '#1B4332' }}>
                          {sales.count} {t('sales', 'ሽያጮች')} · {fmt(sales.total)} {t('birr', 'ብር')}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: isDrilled ? '#1B4332' : '#9ca3af' }}>
                    {isDrilled ? '▾' : '▸'}
                  </span>
                </button>

                {/* Drill-down panel */}
                {isDrilled && (
                  <div style={{ background: '#fafaf9', borderTop: '1px solid #f0ece4' }}>
                    <div className="px-4 py-3">
                      {/* Summary cards */}
                      {sales && (
                        <div className="flex gap-2 mb-3">
                          <div className="flex-1 rounded-lg border px-2 py-1.5 text-center bg-white" style={{ borderColor: '#e8e2d8' }}>
                            <div className="text-sm font-black" style={{ color: '#1B4332' }}>{sales.count}</div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Items', 'እቃዎች')}</div>
                          </div>
                          <div className="flex-1 rounded-lg border px-2 py-1.5 text-center bg-white" style={{ borderColor: '#e8e2d8' }}>
                            <div className="text-sm font-black" style={{ color: '#1B4332' }}>{fmt(sales.cashTotal)}</div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Cash', 'ጥሬ')}</div>
                          </div>
                          <div className="flex-1 rounded-lg border px-2 py-1.5 text-center bg-white" style={{ borderColor: '#e8e2d8' }}>
                            <div className="text-sm font-black" style={{ color: '#1B4332' }}>{fmt(sales.transferTotal)}</div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Transfer', 'ዝውውር')}</div>
                          </div>
                        </div>
                      )}

                      {/* Transaction list */}
                      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                        {t("Today's transactions", 'የዛሬ ግብይቶች')}
                      </div>
                      {txns.length === 0 ? (
                        <div className="text-xs text-gray-400 py-2 text-center">{t('No sales recorded today', 'ዛሬ ምንም ሽያጥ የለም')}</div>
                      ) : (
                        <div>
                          {txns.slice(0, 10).map(txn => (
                            <div key={txn.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[11px] font-bold text-gray-800 truncate">{txn.item_name || t('Sale', 'ሽያጭ')}</span>
                                {txn.quantity != null && txn.quantity > 1 && (
                                  <span className="text-[10px] text-gray-500">×{txn.quantity}</span>
                                )}
                              </div>
                              <span className="text-[11px] font-bold flex-shrink-0 ml-2" style={{ color: '#1B4332' }}>
                                {fmt(txn.amount)} {t('birr', 'ብር')}
                              </span>
                            </div>
                          ))}
                          {txns.length > 10 && (
                            <div className="text-[10px] font-bold text-gray-400 text-center py-2">
                              + {txns.length - 10} {t('more items', 'ተጨማሪ እቃዎች')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {inactiveStaff.length > 0 && (
            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              {t('Inactive', 'ያልነቃ')} · {inactiveStaff.length}
            </div>
          )}
          {inactiveStaff.map(m => (
            <div key={m.id} className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9fafb' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: '#f3f4f6', color: '#9ca3af' }}>
                  {(m.display_name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-400 truncate">{m.display_name}</div>
                  <div className="text-xs text-gray-400">{t('Inactive', 'ተሰናብቷል')}</div>
                </div>
              </div>
              {canManageTeam && (
                <button
                  onClick={() => onReactivateStaffMember?.(m.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: '#f0fdf4', color: '#166534' }}
                >
                  {t('Reactivate', 'ንቁ አድርግ')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* 3b. MY COLLECTION (staff actor)              */}
      {/* ════════════════════════════════════════════ */}
      {activeStaffMemberId != null && activeStaff.find(m => String(m.id) === String(activeStaffMemberId)) && (
        (() => {
          const myId = String(activeStaffMemberId);
          const myLastSettlement = lastSettlementPerStaff[myId];
          const alreadySubmitted = myLastSettlement?.reconciliation_status === 'staff_submitted' || myLastSettlement?.reconciliation_status === 'owner_reviewed' || myLastSettlement?.reconciliation_status === 'disputed';
          const isFinalized = myLastSettlement?.reconciliation_status === 'finalized' || (myLastSettlement && !alreadySubmitted);
          const myTodaySales = todayStaffSales[activeStaffMemberId];
          return (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#d4d4d4', background: '#fafaf9' }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#e8e2d8', background: '#fcfbf8' }}>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('My Collection', 'የእኔ ስብስብ')}
                </span>
                {myLastSettlement?.reconciliation_status && (
                  <ReconStatusBadge status={myLastSettlement.reconciliation_status} lang={lang} />
                )}
              </div>
              <div className="px-4 py-3">
                {alreadySubmitted ? (
                  <div>
                    <div className="rounded-lg border px-3 py-2.5 mb-3" style={{ borderColor: '#e0f2fe', background: '#f0f9ff' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-gray-700">{t('Submitted to owner', 'ለባለቤት ተልኳል')}</span>
                      </div>
                      <div className="text-sm font-black" style={{ color: '#1B4332' }}>
                        {t('Cash:', 'ጥሬ:')} {fmt(myLastSettlement.staff_reported_cash || 0)} ETB
                        {myLastSettlement.staff_reported_transfer > 0 && (
                          <span className="ml-3">{t('Transfer:', 'ዝውውር:')} {fmt(myLastSettlement.staff_reported_transfer)} ETB</span>
                        )}
                      </div>
                      {myLastSettlement.staff_note && (
                        <div className="text-[10px] text-gray-500 mt-1">📝 {myLastSettlement.staff_note}</div>
                      )}
                    </div>
                    {myLastSettlement?.reconciliation_status === 'disputed' && (
                      <div className="rounded-lg border px-3 py-2.5 mb-3" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
                        <div className="text-xs font-bold text-red-700 mb-1">
                          {t('Owner noted a difference', 'ባለቤት ልዩነት አስተውሏል')}
                        </div>
                        {myLastSettlement.owner_note && (
                          <div className="text-[10px] text-red-600">{myLastSettlement.owner_note}</div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setStaffCollectCash(String(myLastSettlement.staff_reported_cash || ''));
                        setStaffCollectTransfer(String(myLastSettlement.staff_reported_transfer || ''));
                        setStaffCollectNote('');
                      }}
                      className="w-full py-2 rounded-xl text-xs font-bold"
                      style={{ background: '#e8e2d8', color: '#374151' }}
                    >
                      {t('Update submission', 'አሻሽል')}
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Today's sales reference */}
                    {myTodaySales && (
                      <div className="rounded-lg border px-3 py-2 mb-3" style={{ borderColor: '#e8e2d8', background: '#fff' }}>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">
                          {t('Today recorded', 'ዛሬ የተመዘገበ')}
                        </div>
                        <div className="flex gap-3 text-xs font-bold" style={{ color: '#1B4332' }}>
                          <span>{myTodaySales.count} {t('sales', 'ሽያጮች')}</span>
                          <span>{t('Cash:', 'ጥሬ:')} {fmt(myTodaySales.cashTotal)} ETB</span>
                          <span>{t('Transfer:', 'ዝውውር:')} {fmt(myTodaySales.transferTotal)} ETB</span>
                        </div>
                      </div>
                    )}
                    {/* Form */}
                    <div className="flex gap-3 mb-3">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          {t('Cash collected', 'የተሰበሰበ ጥሬ')}
                        </label>
                        <input type="number" inputMode="decimal"
                          value={staffCollectCash}
                          onChange={e => setStaffCollectCash(e.target.value)}
                          placeholder="0"
                          className="w-full mt-1 px-3 py-2.5 border-2 rounded-xl text-lg font-black text-center focus:outline-none"
                          style={{ borderColor: '#C4883A' }}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          {t('Transfer', 'ዝውውር')}
                        </label>
                        <input type="number" inputMode="decimal"
                          value={staffCollectTransfer}
                          onChange={e => setStaffCollectTransfer(e.target.value)}
                          placeholder="0"
                          className="w-full mt-1 px-3 py-2.5 border-2 rounded-xl text-lg font-black text-center focus:outline-none"
                          style={{ borderColor: '#e8e2d8' }}
                        />
                      </div>
                    </div>
                    {/* Quick fill chips */}
                    {myTodaySales && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        <button onClick={() => setStaffCollectCash(String(Math.round(myTodaySales.cashTotal)))}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: '#f3f4f6', color: '#374151' }}>
                          {fmt(myTodaySales.cashTotal)} {t('cash', 'ጥሬ')}
                        </button>
                        <button onClick={() => { setStaffCollectCash(String(Math.round(myTodaySales.cashTotal))); setStaffCollectTransfer(String(Math.round(myTodaySales.transferTotal))); }}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: '#f3f4f6', color: '#374151' }}>
                          {t('Full amount', 'ሙሉ መጠን')}
                        </button>
                      </div>
                    )}
                    {/* Note */}
                    <textarea value={staffCollectNote}
                      onChange={e => setStaffCollectNote(e.target.value)}
                      placeholder={t('Note (optional)', 'ማስታወሻ')}
                      rows={2}
                      className="w-full mb-3 px-3 py-2 border-2 rounded-xl text-xs focus:outline-none"
                      style={{ borderColor: '#e8e2d8' }}
                    />
                    {/* Submit */}
                    <button
                      onClick={handleStaffSubmitCollection}
                      disabled={staffCollecting || (Number(staffCollectCash) === 0 && Number(staffCollectTransfer) === 0)}
                      className="w-full py-3 rounded-xl text-sm font-bold min-h-[44px]"
                      style={{
                        background: (staffCollecting || (Number(staffCollectCash) === 0 && Number(staffCollectTransfer) === 0)) ? '#e5e7eb' : '#1B4332',
                        color: (staffCollecting || (Number(staffCollectCash) === 0 && Number(staffCollectTransfer) === 0)) ? '#9ca3af' : '#fff',
                      }}
                    >
                      {staffCollecting ? '...' : t('Submit collection', 'ስብስቡን ላክ')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 4. TEAM MEMBERS + INVITE + RBAC              */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && (
        <>
          {/* Invite section — collapsible */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
            <button
              onClick={() => toggleSection('invite')}
              className="w-full px-4 py-3 flex items-center justify-between text-left"
              style={{ background: '#fcfbf8' }}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-black text-gray-900">{t('Invite Staff', 'ሰራተኛ ጋብዝ')}</span>
              </div>
              {expandedSections.invite ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {expandedSections.invite && (
              <div className="px-4 pb-4 space-y-3">
                {/* Join code — primary invite method for offline/local shops */}
                {(shopProfile?.join_code || shopProfile?.join_url) && (
                  <div className="rounded-xl border px-3 py-3" style={{ borderColor: '#C4883A', background: '#fffbeb' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-black text-gray-700">{t('Join code', 'የመቀላቀል ኮድ')}</span>
                    </div>
                    {shopProfile?.join_code && (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-lg font-black tracking-[0.3em] font-mono select-all" style={{ color: '#1B4332' }}>
                          {shopProfile.join_code}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(shopProfile.join_code);
                              fireToast(t('✓ Code copied', '✓ ኮድ ተቀድሷል'), 1500);
                            } catch {}
                          }}
                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background: '#1B4332', color: '#fff' }}
                        >
                          {t('Copy', 'ቅዳ')}
                        </button>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1.5">
                      {t('Share this code with staff to join instantly — no phone number needed.', 'ይህን ኮድ ለሰራተኞች ያጋሩ፣ ስልክ ቁጥር አያስፈልግም።')}
                    </p>
                  </div>
                )}

                {/* Online invite form */}
                <div className="rounded-xl border px-3 py-3" style={{ borderColor: '#e8e2d8', background: '#fafaf9' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('Online', 'ኦንላይን')}</span>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); handleInvite(); }} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        placeholder={t('Staff name', 'የሰራተኛ ስም')}
                        className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
                        style={{ borderColor: inviteName.trim() ? '#C4883A' : '#e8e2d8' }}
                      />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder={t('Phone number', 'ቴሌፎን ቁጥር')}
                        className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
                        style={{ borderColor: phone.trim() ? '#C4883A' : '#e8e2d8' }}
                      />
                      <select
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none bg-white"
                        style={{ borderColor: '#e8e2d8' }}
                      >
                        <option value="manager">{t('Manager', 'ማኔጀር')}</option>
                        <option value="trusted_staff">{t('Trusted Staff', 'የታመነ ሰራተኛ')}</option>
                        <option value="cashier">{t('Sales Staff', 'የሽያጭ ሠራተኛ')}</option>
                        <option value="viewer">{t('Auditor', 'ኦዲተር')}</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={!phone.trim() || !inviteName.trim() || inviting}
                      className="w-full py-2.5 rounded-xl text-sm font-bold min-h-[44px]"
                      style={{ background: (phone.trim() && inviteName.trim()) ? '#1B4332' : '#e5e7eb', color: (phone.trim() && inviteName.trim()) ? '#fff' : '#9ca3af' }}
                    >
                      {inviting ? '...' : t('Invite', 'ጥሪ ፍጠር')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkImport(true)}
                      className="w-full py-2 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2"
                      style={{ borderColor: '#e8e2d8', color: '#6b7280', background: '#fafaf9' }}
                    >
                      <Upload className="w-4 h-4" />
                      {t('Import from CSV', 'ከ CSV ፋይል አስገባ')}
                    </button>

                    {inviteLink && (
                      <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                        <p className="text-xs font-bold text-green-800 mb-1">{t('Invite link', 'ጥሪ ሊንክ')}</p>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-xs font-mono text-gray-600 truncate">{inviteLink}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(inviteLink);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              } catch { /* ignore */ }
                            }}
                            className="flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background: copied ? '#dcfce7' : '#e8e2d8', color: copied ? '#166534' : '#374151' }}
                          >
                            {copied ? t('Copied', 'ተቀድሷል') : t('Copy', 'ቅዳ')}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                      {t('Pending invites', 'በመጠባበቅ ላይ ያሉ ጥሪዎች')}
                    </div>
                    {pendingInvites.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#f0ece4' }}>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">{inv.staffName || inv.phoneNumber}</div>
                          <div className="text-xs text-gray-500">{inv.phoneNumber} · {inv.role}</div>
                        </div>
                        {!inv.acceptedAt && (
                          <button
                            onClick={() => handleCancelInvite(inv.id)}
                            className="text-xs px-3 py-2 rounded-xl font-bold"
                            style={{ background: '#fef2f2', color: '#b91c1c' }}
                          >
                            {t('Cancel', 'ሰርዝ')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* All Staff (local + cloud) */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {t('All Staff', 'ሁሉም ሰራተኞች')}
                </span>
                {membersLoading && <span className="text-xs text-gray-400">...</span>}
              </div>

              {/* Add local staff input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={localStaffName}
                  onChange={e => setLocalStaffName(e.target.value)}
                  placeholder={t('Add staff name', 'የሰራተኛ ስም ጨምር')}
                  className="flex-1 px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
                  style={{ borderColor: localStaffName.trim() ? '#C4883A' : '#e8e2d8' }}
                  onKeyDown={e => e.key === 'Enter' && handleAddLocalStaff()}
                />
                <button
                  onClick={handleAddLocalStaff}
                  disabled={!localStaffName.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px]"
                  style={{ background: localStaffName.trim() ? '#1B4332' : '#e5e7eb', color: localStaffName.trim() ? '#fff' : '#9ca3af' }}
                >
                  {t('Add', 'ጨምር')}
                </button>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white" style={{ borderColor: '#e8e2d8' }}>
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('Search staff...', 'ሰራተኞችን ፈልግ...')}
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                  style={{ border: 'none', outline: 'none' }}
                />
              </div>
            </div>
            {filteredMembers.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                {searchQuery ? t('No matches', 'አልተገኘም') : t('No staff yet', 'እስካሁን ሰራተኞች የሉም')}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#f0ece4' }}>
                {filteredMembers.map(m => {
                  const isLocal = m._source === 'local';
                  const isExpanded = expandedMember === m._source + '-' + (m.id || m.userId);
                  const perms = m.resolved_permissions || {};
                  const isOwnerRole = m.role === 'owner';
                  const mid = m.id || m.userId;
                  const memberKey = isLocal ? 'local-' + mid : 'cloud-' + mid;
                  const displayName = m.display_name || m.displayName || m.name || 'Staff';
                  const phoneStr = m.phone || m.phoneNumber || '';
                  return (
                    <div key={memberKey}>
                      <button
                        onClick={() => {
                          if (isLocal) {
                            setEditingStaffName(editingStaffName === mid ? null : mid);
                            if (editingStaffName !== mid) { setEditNameValue(displayName); setEditPhoneValue(phoneStr); }
                          } else {
                            setExpandedMember(isExpanded ? null : memberKey);
                          }
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between text-left"
                        style={{ background: m.active === false ? '#f9fafb' : '#fff' }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                            {displayName}
                            {!isLocal && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase" style={{ background: '#e0f2fe', color: '#0369a1', lineHeight: '1.2' }}>
                                {t('Cloud', 'ክላውድ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {phoneStr && <span className="text-xs" style={{ color: '#6b7280' }}>{phoneStr}</span>}
                            <RoleBadge role={m.role || 'staff'} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {!isLocal && (
                            <>
                              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5`} style={{ background: m.active !== false ? '#ecfdf5' : '#f3f4f6', color: m.active !== false ? '#166534' : '#6b7280' }}>
                                {m.active !== false ? t('Active', 'ንቁ') : t('Inactive', 'ተሰናብቷል')}
                              </span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </>
                          )}
                          {isLocal && (
                            <button
                              onClick={(e) => { e.stopPropagation(); m.active === false ? onReactivateStaffMember?.(mid) : onDeactivateStaffMember?.(mid); }}
                              className="text-xs px-2.5 py-1.5 rounded-lg font-semibold flex-shrink-0"
                              style={{ background: '#f5f5f5', color: '#6b7280' }}
                            >
                              {m.active === false ? t('Reactivate', 'ንቁ አድርግ') : t('Deactivate', 'አቁም')}
                            </button>
                          )}
                        </div>
                      </button>

                      {/* Inline rename for local staff */}
                      {isLocal && editingStaffName === mid && (
                        <div className="px-4 pb-4 space-y-2" style={{ background: '#fafaf9' }}>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={e => setEditNameValue(e.target.value)}
                              placeholder={t('Name', 'ስም')}
                              className="flex-1 px-2 py-1.5 border-2 rounded-lg text-sm font-bold focus:outline-none"
                              style={{ borderColor: '#C4883A' }}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  onUpdateStaffMember?.(mid, { display_name: editNameValue.trim() || displayName });
                                  setEditingStaffName(null);
                                }
                                if (e.key === 'Escape') setEditingStaffName(null);
                              }}
                            />
                            <input
                              type="tel"
                              value={editPhoneValue}
                              onChange={e => setEditPhoneValue(e.target.value)}
                              placeholder={t('Phone', 'ስልክ')}
                              className="w-28 px-2 py-1.5 border-2 rounded-lg text-sm focus:outline-none"
                              style={{ borderColor: '#e8e2d8' }}
                            />
                            <button
                              onClick={() => {
                                onUpdateStaffMember?.(mid, {
                                  display_name: editNameValue.trim() || displayName,
                                  phone: editPhoneValue.trim() || undefined,
                                });
                                setEditingStaffName(null);
                              }}
                              className="px-2 py-1.5 rounded-lg text-[11px] font-bold"
                              style={{ background: '#1B4332', color: '#fff' }}
                            >
                              {t('Save', 'አስቀምጥ')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Permissions + deactivate for cloud members */}
                      {!isLocal && isExpanded && (
                        <div className="px-4 pb-4" style={{ background: '#fafaf9' }}>
                          <div className="flex items-center gap-1.5 mb-2 mt-1">
                            <Shield className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                              {t('Permissions', 'ፍቃዶች')}
                            </span>
                          </div>
                          {(isOwnerRole ? ['can_manage_team'] : [...new Set([...Object.keys(perms), ...Object.keys(localPermOverrides[mid] || {})])]).map(key => {
                            const overrideVal = localPermOverrides[mid]?.[key];
                            const effectiveVal = overrideVal !== undefined ? overrideVal : (perms[key] ?? false);
                            return (
                              <PermissionToggle
                                key={key}
                                keyName={key}
                                value={isOwnerRole ? true : effectiveVal}
                                onChange={isOwnerRole ? () => {} : (key, val) => handleTogglePermission(m, key, val)}
                                lang={lang}
                              />
                            );
                          })}
                          {isOwnerRole && (
                            <div className="text-[10px] text-gray-400 mt-1">
                              {t('Owner permissions are full and cannot be edited', 'የባለቤት ፍቃዶች ሁሉም ሲሆኑ አይቀየሩም')}
                            </div>
                          )}
                          {!isOwnerRole && m.active !== false && (
                            <button
                              onClick={() => onDeactivateStaffMember?.(m.userId)}
                              className="mt-3 w-full py-2 rounded-xl text-xs font-bold"
                              style={{ background: '#fef2f2', color: '#b91c1c' }}
                            >
                              {t('Deactivate', 'አቁም')}
                            </button>
                          )}
                          {!isOwnerRole && m.active === false && (
                            <button
                              onClick={() => onReactivateStaffMember?.(m.userId)}
                              className="mt-3 w-full py-2 rounded-xl text-xs font-bold"
                              style={{ background: '#f0fdf4', color: '#166534' }}
                            >
                              {t('Reactivate', 'ንቁ አድርግ')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 5. SETTLEMENT SECTION                       */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {t('Staff Settlement', 'የሰራተኛ ማስተካከያ')}
            </span>
          </div>
          <div className="px-4 py-3">
            {activeSettlement ? (
              <SettlementSheet
                staff={activeSettlementStaff}
                existingSettlement={viewingSettlement ? viewingSettlement.settlement : null}
                lang={lang}
                onSaved={handleSettlementSaved}
                onCancel={() => { setSettling(null); setViewingSettlement(null); }}
              />
            ) : (
              <StaffSettlementList
                staffRows={activeStaff}
                lang={lang}
                onSettle={(staff) => { setSettling(staff); setViewingSettlement(null); }}
                onViewSettlement={(settlement, staff) => {
                  if (!staff) {
                    const found = activeStaff.find(s => String(s.id) === String(settlement.staff_id));
                    setViewingSettlement({ settlement, staff: found || { id: settlement.staff_id, displayName: `#${settlement.staff_id}` } });
                  } else {
                    setViewingSettlement({ settlement, staff });
                  }
                }}
                currentSettlingStaff={settling?.id ? String(settling.id) : null}
              />
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 6. ACTIVITY FEED (collapsible)              */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <button
            onClick={() => toggleSection('activity')}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
            style={{ background: '#fcfbf8' }}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {t('Activity Feed', 'የእንቅስቃሴ መረጃ')}
            </span>
            {expandedSections.activity ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.activity && (
            <div className="px-4 py-3">
              <StaffActivityFeed />
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 7. MORE TOOLS (collapsible)                 */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <button
            onClick={() => toggleSection('more')}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
            style={{ background: '#fcfbf8' }}
          >
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {t('More Tools', 'ተጨማሪ መሳሪያዎች')}
            </span>
            {expandedSections.more ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.more && (
            <div className="px-4 py-3 space-y-3">
              {/* Device Management */}
              <div>
                <div className="text-xs font-bold text-gray-700 mb-2">{t('Device Management', 'የመሳሪያ አስተዳደር')}</div>
                {pendingDevices.length === 0 ? (
                  <div className="text-xs text-gray-400">{t('No pending devices', 'በመጠባበቅ ላይ ያሉ መሳሪያዎች የሉም')}</div>
                ) : (
                  <div className="space-y-2">
                    {pendingDevices.map(d => (
                      <div key={d.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">{d.device_label || 'Device'}</div>
                          <div className="text-xs text-gray-500">{d.staffName} · {t('pending', 'በመጠባበቅ')}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => onApproveDevice?.(d.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#1B4332' }}>
                            {t('Approve', 'አረጋግጥ')}
                          </button>
                          <button onClick={() => onRejectDevice?.(d.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                            {t('Reject', 'አቁም')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CSV Bulk Import */}
              <div>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2"
                  style={{ borderColor: '#e8e2d8', color: '#6b7280', background: '#fafaf9' }}
                >
                  <Upload className="w-4 h-4" />
                  {t('Bulk Import CSV', 'በቡድን ከ CSV አስገባ')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* MODALS                                      */}
      {/* ════════════════════════════════════════════ */}
      {showBulkImport && (
        <BulkInviteModal
          onClose={() => setShowBulkImport(false)}
          onImported={() => { loadPending(); loadMembers(); }}
          lang={lang}
        />
      )}

      <ConfirmDialog
        open={pendingNoPerms != null}
        tone="danger"
        title={t('Remove all permissions?', 'ሁሉም ፍቃዶች ይቺርዳሉ?')}
        message={t(
          'This staff member will not be able to do anything in the app. Proceed?',
          'ይህ ሰራተኛ በቀላሉ ምንም አይችልም። ሙሉ?'
        )}
        confirmLabel={t('Proceed', 'ሙሉ')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => { const p = pendingNoPerms; setPendingNoPerms(null); if (p) applyTogglePermission(p.member, p.key, p.nextValue); }}
        onCancel={() => setPendingNoPerms(null)}
      />

      <ConfirmDialog
        open={pendingPermChange != null}
        tone="default"
        title={pendingPermChange ? (
          pendingPermChange.nextValue
            ? t(`Grant "${pendingPermChange.label}"?`, `"${pendingPermChange.label}" ይስጡ?`)
            : t(`Revoke "${pendingPermChange.label}"?`, `"${pendingPermChange.label}" ያስወግዱ?`)
        ) : ''}
        message={pendingPermChange ? t(
          `Change permission for ${pendingPermChange.member.displayName || pendingPermChange.member.display_name || 'this member'}?`,
          `ለ${pendingPermChange.member.displayName || pendingPermChange.member.display_name || 'ይህ አባል'} ፍቃድ ይቀየር?`
        ) : ''}
        confirmLabel={t('Confirm', 'አረጋግጥ')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => { const p = pendingPermChange; setPendingPermChange(null); if (p) applyTogglePermission(p.member, p.key, p.nextValue); }}
        onCancel={() => setPendingPermChange(null)}
      />

      {/* Quick-collect bottom sheet */}
      {quickCollectStaff && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="w-full max-w-md rounded-2xl bg-white px-5 pb-6 pt-3">
            <div className="w-9 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
            <div className="text-base font-black text-gray-900 mb-1">
              {t('Quick collect', 'ፈጣን መሰብሰብ')}
            </div>
            <div className="text-xs text-gray-500 mb-4">
              {quickCollectStaff.display_name}
              {todayStaffSales[quickCollectStaff.id] && (
                <span> · {t('Today:', 'ዛሬ:')} {fmt(todayStaffSales[quickCollectStaff.id].total)} {t('birr sales', 'ብር ሽያጭ')}</span>
              )}
            </div>

            <div className="flex items-center border-2 rounded-xl px-4 mb-3" style={{ borderColor: '#C4883A' }}>
              <span className="text-lg font-black text-gray-500 mr-2">ETB</span>
              <input
                type="number"
                inputMode="decimal"
                value={quickCollectAmount}
                onChange={e => setQuickCollectAmount(e.target.value)}
                className="flex-1 border-none text-xl font-black py-3 focus:outline-none bg-transparent"
                style={{ outline: 'none' }}
                autoFocus
                placeholder="0"
              />
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {todayStaffSales[quickCollectStaff.id] && (
                <>
                  <button
                    onClick={() => setQuickCollectAmount(String(Math.round(todayStaffSales[quickCollectStaff.id].cashTotal)))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: '#f3f4f6', color: '#374151' }}
                  >
                    {fmt(todayStaffSales[quickCollectStaff.id].cashTotal)} {t('cash', 'ጥሬ')}
                  </button>
                  <button
                    onClick={() => setQuickCollectAmount(String(Math.round(todayStaffSales[quickCollectStaff.id].total)))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: '#f3f4f6', color: '#374151' }}
                  >
                    {t('Full amount', 'ሙሉ መጠን')}
                  </button>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setQuickCollectStaff(null); setQuickCollectAmount(''); }}
                className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: '#f3f4f6', color: '#374151' }}
              >
                {t('Cancel', 'ሰርዝ')}
              </button>
              <button
                onClick={handleQuickCollectConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: '#1B4332' }}
              >
                {t('Record collection', 'መዝግብ')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
