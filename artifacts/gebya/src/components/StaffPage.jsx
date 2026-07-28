import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, ChevronDown, ChevronUp, Shield, KeyRound, Search, Eye } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useShopStore } from '../stores/shopStore';
import { usePermissionsStore } from '../stores/permissionsStore';
import { fireToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { getCurrentEntitlements } from '../utils/entitlements';
import { loadStaffActivityFeed } from '../utils/staffActivityFeed';
import { loadSettlementFromLocalStorage, clearSettlementDraft, calculateExpected, createReconciliationEntry } from '../utils/settlementSelectors';
import { startOfLocalDay } from '../utils/reportSelectors';
import SettlementSheet from './report/SettlementSheet';
import db, { getAllSettlements, saveSettlement, updateSettlement } from '../db';
import { fmt } from '../utils/numformat';
import { isValidEthiopianPhone, normalizeEthiopianPhone, formatEthiopianPhone, extractSubscriberDigits } from '../utils/phoneNumber';
import { apiFetch, ROLE_BADGE, RoleBadge } from '../utils/shared-ui.jsx';

const ROLE_PRESETS = {
  manager: { can_manage_team: true, can_delete_records: true, can_edit_settings: true, can_add_records: true, can_view_reports: true },
  cashier: { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: true, can_view_reports: true },
  viewer: { can_manage_team: false, can_delete_records: false, can_edit_settings: false, can_add_records: false, can_view_reports: true },
};

const ROLE_OPTIONS = [
  { value: 'manager', label: { en: 'Manager', am: 'ማኔጀር' } },
  { value: 'cashier', label: { en: 'Sales Staff', am: 'ሰራተኛ' } },
  { value: 'viewer', label: { en: 'Auditor', am: 'ኦዲተር' } },
];

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



function StaffActivityFeed({ todayRefreshKey, setTodayStaffSales, setTodayStaffTransactions }) {
  const { lang } = useLang();
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPeriod, setExpandedPeriod] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      loadStaffActivityFeed()
        .then(res => { if (!cancelled) setActivities(res.activities || []); })
        .catch(() => { if (!cancelled) setActivities([]); }),
      (async () => {
        try {
          const todayStart = startOfLocalDay();
          const todayEnd = todayStart + 86400000;
          const txns = await db.transactions.where('created_at').between(todayStart, todayEnd).toArray().then(r => r.filter(t => !t.deletedAt));
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
          if (!cancelled) { setTodayStaffSales(salesMap); setTodayStaffTransactions(txnMap); }
        } catch {}
      })(),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [todayRefreshKey]);

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
  onRotateJoinCode,
  lang,
  canManageTeam,
}) {
  const t = (en, am) => lang === 'am' ? am : en;

  // ── Local staff name ──
  const [localStaffName, setLocalStaffName] = useState('');

  // ── Cloud members ──
  const [cloudMembers, setCloudMembers] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Expanded / collapsed sections ──
  const hasUnresolvedSettlements = useMemo(() =>
    settlements.some(s => s.reconciliation_status === 'staff_submitted' || s.reconciliation_status === 'disputed'),
    [settlements]
  );
  const [expandedSections, setExpandedSections] = useState({
    activity: false,
    more: false,
    pastSettlements: true,
  });

  // ── Deactivation confirm ──
  const [pendingDeactivation, setPendingDeactivation] = useState(null);

  // ── Settlement state ──
  const [settling, setSettling] = useState(null);
  const [viewingSettlement, setViewingSettlement] = useState(null);
  const [settlementRefreshKey, setSettlementRefreshKey] = useState(0);
  const [todayRefreshKey, setTodayRefreshKey] = useState(0);

  // ── Permission editing state ──
  const [expandedMember, setExpandedMember] = useState(null);
  const [pendingNoPerms, setPendingNoPerms] = useState(null);
  const [pendingPermChange, setPendingPermChange] = useState(null);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
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
        const rows = await getAllSettlements(Date.now() - 30 * 86400000, Date.now() + 86400000, bizId);
        if (!cancelled) setSettlements(rows);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [settlementRefreshKey]);

  // ── Visibility guard & periodic refresh ──
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (document.hidden) return;
      setSettlementRefreshKey(k => k + 1);
      setTodayRefreshKey(k => k + 1);
    };
    const interval = setInterval(() => { if (!cancelled) refresh(); }, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { cancelled = true; clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  // ── Escape key closes settlement sheet ──
  useEffect(() => {
    if (!settling && !viewingSettlement) return;
    const handle = (e) => { if (e.key === 'Escape') { setSettling(null); setViewingSettlement(null); } };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [settling, viewingSettlement]);

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

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // ── Handlers ──
  const handleAddLocalStaff = async () => {
    if (!localStaffName.trim()) return;
    try {
      const { entitlements } = await getCurrentEntitlements();
      if (activeStaff.length >= entitlements.max_staff) {
        fireToast(t('Staff limit reached. Upgrade to add more.', 'የሰራተኛ ገደብ ደረሰዋል'), 3000);
        return;
      }
    } catch { /* non-critical */ }
    await onSaveStaffMember?.({ display_name: localStaffName.trim(), role: 'cashier', active: true });
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

  const handleRoleChange = async (member, newRole) => {
    if (savingPerms) return;
    if (member.role === 'owner') {
      fireToast(t('Owner role cannot be changed', 'የባለቤት ሚና አይቀየርም'), 2200);
      return;
    }
    if (member.role === newRole) return;
    setSavingPerms(true);
    const preset = ROLE_PRESETS[newRole];
    if (!preset) { setSavingPerms(false); return; }
    try {
      await apiFetch(`/business/members/${member.userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify(preset),
      });
      setLocalPermOverrides(prev => {
        const next = { ...prev };
        delete next[member.id || member.userId];
        return next;
      });
      setCloudMembers(prev => {
        if (!prev) return prev;
        return prev.map(m => String(m.userId) === String(member.userId) ? { ...m, role: newRole, resolved_permissions: { ...preset } } : m);
      });
      fireToast(t(`✓ Role changed to ${ROLE_BADGE[newRole]?.label || newRole}`, `✓ ሚና ወደ ${ROLE_BADGE[newRole]?.label || newRole} ተቀይሯል`), 1800);
    } catch (err) {
      fireToast(err.message || t('Failed to change role', 'ሚና መቀየር አልተሳካም'), 2400);
    } finally {
      setSavingPerms(false);
    }
  };

  const handleViewSettlement = (staff, settlement) => {
    setViewingSettlement({ settlement, staff });
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
        reconciliation_log: [createReconciliationEntry('staff', 'submitted', staffCollectNote.trim() || t('Staff submitted collection', 'ሰራተኛ ስብስብ አስገብቷል'))],
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
    const submittedCount = settlements.filter(s => s.reconciliation_status === 'staff_submitted').length;
    const finalizedCount = settlements.filter(s => s.reconciliation_status === 'finalized' || s.reconciliation_status === 'checked').length;
    const totalCollected = settlements.reduce((sum, s) => sum + Number(s.actual_total || 0), 0);
    return { totalStaff, active, pendingDeviceCount, unsettledCount, submittedCount, finalizedCount, totalCollected };
  }, [staffMembers, activeStaff, pendingDevices, unsettledStaff, settlements]);

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
      {/* NOTIFICATION BANNER (needs review)         */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && snapshotStats.submittedCount > 0 && (
        <div className="rounded-2xl border flex items-center gap-3 px-4 py-3" style={{ borderColor: '#bae6fd', background: '#f0f9ff' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#e0f2fe' }}>
            <span className="text-sm font-black" style={{ color: '#0369a1' }}>!</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#0369a1' }}>
              {t('Staff submissions pending review', 'የሰራተኞች ስብስብ ክለሳ ይፈልጋል')}
            </p>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              {snapshotStats.submittedCount} {t('staff member(s) have submitted their collection', 'ሰራተኞች ስብስባቸውን ልከዋል')}
            </p>
          </div>
          <button onClick={() => toggleSection('pastSettlements')}
            className="text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ background: '#1B4332', color: '#fff', border: 'none', cursor: 'pointer' }}
          >{t('Review', 'ክለሳ')}</button>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 1. SNAPSHOT STATS BAR                       */}
      {/* ════════════════════════════════════════════ */}
      {canManageTeam && (
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: '#e8e2d8', background: '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: '#1B4332' }}>{snapshotStats.unsettledCount}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Unsettled', 'ያልተስተካከለ')}</div>
          </div>
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: snapshotStats.submittedCount > 0 ? '#bae6fd' : '#e8e2d8', background: snapshotStats.submittedCount > 0 ? '#f0f9ff' : '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: snapshotStats.submittedCount > 0 ? '#0369a1' : '#6b7280' }}>{snapshotStats.submittedCount}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Submitted', 'የላኩ')}</div>
          </div>
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: '#e8e2d8', background: '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: '#1B4332' }}>{snapshotStats.finalizedCount}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Finalized', 'የተጠናቀቀ')}</div>
          </div>
          <div className="flex-1 rounded-xl border px-3 py-2 text-center" style={{ borderColor: '#e8e2d8', background: '#fcfbf8' }}>
            <div className="text-lg font-black" style={{ color: '#1B4332' }}>{fmt(snapshotStats.totalCollected)}</div>
            <div className="text-[10px] font-bold text-gray-500">{t('Collected', 'የተሰበሰበ')}</div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 2. TODAY'S TEAM  (with settlement status)    */}
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
            <div className="px-4 py-8 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#f3f4f6' }}>
                <span className="text-xl font-black" style={{ color: '#9ca3af' }}>+</span>
              </div>
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
            const lastS = lastSettlementPerStaff[String(m.id)];
            const sDaysSince = lastS ? Math.floor((Date.now() - lastS.settled_at) / 86400000) : null;
            const sStatus = lastS?.reconciliation_status;
            const isSubmitted = sStatus === 'staff_submitted';
            const isFinalized = sStatus === 'finalized' || (sStatus === 'checked' && sDaysSince === 0);
            return (
              <div key={m.id}>
                <div className="w-full px-4 py-3 flex items-center justify-between text-left">
                  <button onClick={() => setExpandedStaffDrilldown(isDrilled ? null : m.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
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
                      {!sales && !isOwnerView && (
                        <div className="text-[10px] text-gray-400 mt-0.5">{t('No sales today', 'ዛሬ ሽያጥ የለም')}</div>
                      )}
                    </div>
                  </button>
                  {isOwnerView && (
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {isSubmitted ? (
                        <button onClick={() => handleViewSettlement(m, lastS)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                          style={{ background: '#e0f2fe', color: '#0369a1' }}
                        ><Eye className="w-3 h-3 inline" /> {t('Review', 'መርምር')}</button>
                      ) : isFinalized ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap" style={{ background: '#dcfce7', color: '#166534' }}>
                          ✓ {t('Settled', 'ተቀምጧል')}
                        </span>
                      ) : (
                        <button onClick={() => setSettling(m)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                          style={{ background: '#1B4332', color: '#fff' }}
                        >{t('Settle', 'አስተካክል')}</button>
                      )}
                    </div>
                  )}
                </div>

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
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Cash Sales', 'ጥሬ ሽያጭ')}</div>
                          </div>
                          <div className="flex-1 rounded-lg border px-2 py-1.5 text-center bg-white" style={{ borderColor: sales.transferTotal > 0 ? '#e8e2d8' : '#e8e2d8' }}>
                            <div className="text-sm font-black" style={{ color: sales.transferTotal > 0 ? '#1B4332' : '#9ca3af' }}>{fmt(sales.transferTotal)}</div>
                            <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Transfer', 'ዝውውር')}</div>
                          </div>
                        </div>
                      )}

                      {/* Settlement status bar */}
                      {lastS && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '6px 10px', background: isSubmitted ? '#f0f9ff' : isFinalized ? '#f0fdf4' : '#f3f4f6', borderRadius: 6, fontSize: 11 }}>
                          <span style={{ fontWeight: 700, color: isSubmitted ? '#0369a1' : isFinalized ? '#16a34a' : '#6b7280' }}>
                            {isSubmitted ? t('Awaiting review', 'ክለሳ ይጠበቃል') : isFinalized ? t('Settled today', 'ዛሬ ተቀምጧል') : t('Last settled', 'የመጨረሻ ማስተካከያ')}
                          </span>
                          <span style={{ color: '#9ca3af' }}>
                            {new Date(lastS.settled_at).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                            {isFinalized ? ` · ${fmt(lastS.actual_total || 0)} ETB` : ''}
                          </span>
                        </div>
                      )}

                      {/* Transaction list header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          {t("Today's transactions", 'የዛሬ ግብይቶች')}
                          {txns.length > 0 && <span className="font-normal text-gray-400 ml-1">({txns.length})</span>}
                        </span>
                        {!sales && isOwnerView && (
                          <button onClick={() => setSettling(m)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg"
                            style={{ background: '#1B4332', color: '#fff', border: 'none', cursor: 'pointer' }}
                          >{t('Settle', 'አስተካክል')}</button>
                        )}
                      </div>

                      {txns.length === 0 ? (
                        <div className="text-xs text-gray-400 py-3 text-center">
                          {t('No sales recorded today', 'ዛሬ ምንም ሽያጥ የለም')}
                        </div>
                      ) : (
                        <div>
                          {txns.map(txn => {
                            const txnTime = new Date(txn.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                            const isTransfer = txn.payment_type === 'transfer' || txn.payment_type === 'bank';
                            const isCreditSale = txn.is_credit || String(txn.payment_type || '').toLowerCase() === 'credit';
                            return (
                              <div key={txn.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0" style={{ gap: 8 }}>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="text-[10px] font-mono text-gray-400 flex-shrink-0 w-12">{txnTime}</span>
                                  <span className="text-[12px] font-bold text-gray-800 truncate">{txn.item_name || t('Sale', 'ሽያጭ')}</span>
                                  {txn.quantity != null && txn.quantity > 1 && (
                                    <span className="text-[10px] text-gray-500 flex-shrink-0">×{txn.quantity}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {isCreditSale && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#fef3c7', color: '#92400e' }}>
                                      {t('Credit', 'ዱቤ')}
                                    </span>
                                  )}
                                  {isTransfer && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                                      {t('Trans', 'ዝውውር')}
                                    </span>
                                  )}
                                  {!isTransfer && !isCreditSale && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#f0fdf4', color: '#166534' }}>
                                      {t('Cash', 'ጥሬ')}
                                    </span>
                                  )}
                                  <span className="text-[12px] font-black flex-shrink-0 ml-1" style={{ color: '#1B4332' }}>
                                    {fmt(txn.amount)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200" style={{ borderColor: '#e8e2d8' }}>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t('Total', 'ጠቅላላ')}</span>
                            <span className="text-sm font-black" style={{ color: '#1B4332' }}>
                              {fmt(txns.reduce((sum, t) => sum + Number(t.amount || 0), 0))} {t('birr', 'ብር')}
                            </span>
                          </div>
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
      {/* 3. PAST SETTLEMENTS (collapsible)            */}
      {/* ════════════════════════════════════════════ */}
      {settlements.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
          <button
            onClick={() => toggleSection('pastSettlements')}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
            style={{ background: hasUnresolvedSettlements ? '#fffbeb' : '#fcfbf8' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {t('Past Settlements', 'ያለፉ ማስተካከያዎች')}
              </span>
              <span className="text-xs font-bold" style={{ color: '#9ca3af' }}>{settlements.length}</span>
              {hasUnresolvedSettlements && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fef2f2', color: '#dc2626' }}>
                  {t('Needs review', 'ክለሳ ይፈልጋል')}
                </span>
              )}
            </div>
            {expandedSections.pastSettlements ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          <div style={{
            overflow: 'hidden',
            maxHeight: expandedSections.pastSettlements ? '400px' : '0',
            opacity: expandedSections.pastSettlements ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.25s ease',
          }}>
            <div className="divide-y max-h-60 overflow-y-auto" style={{ borderColor: '#f0ece4' }}>
              {settlements.slice().sort((a, b) => b.settled_at - a.settled_at).slice(0, 20).map((s, i) => {
                const staff = activeStaff.find(r => String(r.id) === String(s.staff_id));
                const rStatus = s.reconciliation_status;
                return (
                  <div key={s.id || i} className="px-4 py-2.5 flex items-center justify-between cursor-pointer"
                    style={{ background: rStatus === 'staff_submitted' ? '#f0f9ff' : 'transparent' }}
                    onClick={() => handleViewSettlement(staff || { id: s.staff_id, displayName: `#${s.staff_id}`, name: `#${s.staff_id}` }, s)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-800">
                        {new Date(s.settled_at).toLocaleDateString()} · {staff?.display_name || staff?.name || `#${s.staff_id}`}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {fmt(s.actual_cash || 0)} ETB {s.final_variance !== 0 && `(${s.final_variance >= 0 ? '+' : ''}${fmt(s.final_variance)})`}
                      </div>
                    </div>
                    {rStatus && (
                      <ReconStatusBadge status={rStatus} lang={lang} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* 4. MY COLLECTION (staff actor)               */}
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
          {/* Join code — always visible */}
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#e8e2d8' }}>
            <div className="px-4 py-3.5" style={{ background: shopProfile?.join_code ? '#fffbeb' : '#fafaf9' }}>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-black text-gray-900">{t('Join code', 'የመቀላቀል ኮድ')}</span>
              </div>
              {shopProfile?.join_code ? (
                <>
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
                    {'share' in navigator && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.share({ title: t('Join code', 'የመቀላቀል ኮድ'), text: t('Use this code to join my shop: ', 'እንደምትቀላቀሉ ኮድ: ') + shopProfile.join_code });
                          } catch { /* user cancelled */ }
                        }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: '#e8e2d8', color: '#374151' }}
                      >
                        {t('Share', 'አጋራ')}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {t('Staff install the app, enter this code, and join. You can change their role from the list below.', 'ሰራተኞች ኮዱን አስገብተው ይቀላቀላሉ። ሚናቸውን ከዚህ በታች መቀየር ይችላሉ።')}
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!onRotateJoinCode) return;
                      const result = await onRotateJoinCode(shopProfile?.shop_id || shopProfile?.id);
                      if (result) {
                        fireToast(t('✓ Join code generated', '✓ የመቀላቀል ኮድ ተፈጠረ'), 2000);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border-2 border-dashed flex items-center justify-center gap-2"
                    style={{ borderColor: '#C4883A', color: '#92400e', background: '#fffbeb' }}
                  >
                    <KeyRound className="w-4 h-4" />
                    {t('Generate join code for staff', 'የመቀላቀል ኮድ ፍጠር')}
                  </button>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {t('Generate a code to share with staff so they can join your shop.', 'ሰራተኞች እንዲቀላቀሉ ኮድ ይፍጠሩ።')}
                  </p>
                </>
              )}
            </div>
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
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 text-sm font-bold px-1">
                    ✕
                  </button>
                )}
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
                            {phoneStr && <span className="text-xs" style={{ color: '#6b7280' }}>{formatEthiopianPhone(phoneStr)}</span>}
                            <RoleBadge role={m.role || 'staff'} />
                            {!isLocal && getEffectiveRoleLabel(m, localPermOverrides, lang) !== (ROLE_BADGE[m.role]?.label || m.role) && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
                                {t('Custom', 'የተበጀ')}
                              </span>
                            )}
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
                              onClick={(e) => { e.stopPropagation(); if (m.active === false) { onReactivateStaffMember?.(mid); } else { setPendingDeactivation({ member: m, isLocal: true, id: mid, name: displayName }); } }}
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
                                  const normalizedPhone = normalizeEthiopianPhone(editPhoneValue);
                                  onUpdateStaffMember?.(mid, { display_name: editNameValue.trim() || displayName, phone: normalizedPhone || undefined });
                                  setEditingStaffName(null);
                                }
                                if (e.key === 'Escape') setEditingStaffName(null);
                              }}
                            />
                            <input
                              type="tel"
                              value={editPhoneValue}
                              onChange={e => setEditPhoneValue(extractSubscriberDigits(e.target.value))}
                              placeholder={t('Phone', 'ስልክ')}
                              className="w-28 px-2 py-1.5 border-2 rounded-lg text-sm focus:outline-none"
                              style={{ borderColor: editPhoneValue && !isValidEthiopianPhone(editPhoneValue) ? '#ef4444' : '#e8e2d8' }}
                            />
                            <button
                              onClick={() => {
                                const normalizedPhone = normalizeEthiopianPhone(editPhoneValue);
                                onUpdateStaffMember?.(mid, {
                                  display_name: editNameValue.trim() || displayName,
                                  phone: normalizedPhone || undefined,
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

                      {/* Permissions + role + deactivate for cloud members */}
                      {!isLocal && isExpanded && (
                        <div className="px-4 pb-4" style={{ background: '#fafaf9' }}>
                          {/* Role selector */}
                          {!isOwnerRole && (
                            <div className="mb-3">
                              <div className="flex items-center gap-1.5 mb-1.5 mt-1">
                                <Shield className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                  {t('Role', 'ሚና')}
                                </span>
                                {getEffectiveRoleLabel(m, localPermOverrides, lang) !== (ROLE_BADGE[m.role]?.label || m.role) && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>
                                    {t('Custom', 'የተበጀ')}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {ROLE_OPTIONS.map(opt => {
                                  const label = lang === 'am' ? opt.label.am : opt.label.en;
                                  const isActive = m.role === opt.value && getEffectiveRoleLabel(m, localPermOverrides, lang) === label;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        if (m.role === opt.value) return;
                                        setPendingRoleChange({ member: m, newRole: opt.value, label });
                                      }}
                                      disabled={savingPerms}
                                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                      style={{
                                        background: isActive ? '#1B4332' : '#f3f4f6',
                                        color: isActive ? '#fff' : '#374151',
                                        opacity: savingPerms ? 0.5 : 1,
                                      }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Permission toggles */}
                          <div className="flex items-center gap-1.5 mb-2">
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
                              onClick={() => setPendingDeactivation({ member: m, isLocal: false, id: m.userId, name: displayName })}
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
      {/* 5. SETTLEMENT SHEET (overlay)                */}
      {/* ════════════════════════════════════════════ */}
      {activeSettlement && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl bg-white px-4 pb-6 pt-2 max-h-[90vh] overflow-y-auto" style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <div className="w-9 h-1 rounded-full bg-gray-300 mx-auto mb-3" />
            <SettlementSheet
              staff={activeSettlementStaff}
              existingSettlement={viewingSettlement ? viewingSettlement.settlement : null}
              lang={lang}
              onSaved={handleSettlementSaved}
              onCancel={() => { setSettling(null); setViewingSettlement(null); }}
            />
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
          <div style={{
            overflow: 'hidden',
            maxHeight: expandedSections.activity ? '2000px' : '0',
            opacity: expandedSections.activity ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.25s ease',
          }}>
            <div className="px-4 py-3">
              <StaffActivityFeed
                todayRefreshKey={todayRefreshKey}
                setTodayStaffSales={setTodayStaffSales}
                setTodayStaffTransactions={setTodayStaffTransactions}
              />
            </div>
          </div>
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
          <div style={{
            overflow: 'hidden',
            maxHeight: expandedSections.more ? '2000px' : '0',
            opacity: expandedSections.more ? 1 : 0,
            transition: 'max-height 0.3s ease, opacity 0.25s ease',
          }}>
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

            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* MODALS                                      */}
      {/* ════════════════════════════════════════════ */}

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

      <ConfirmDialog
        open={pendingRoleChange != null}
        tone="default"
        title={pendingRoleChange ? t(`Change role to ${pendingRoleChange.label}?`, `ሚና ወደ ${pendingRoleChange.label} ይቀየር?`) : ''}
        message={pendingRoleChange ? t(
          `This will update ${pendingRoleChange.member.displayName || pendingRoleChange.member.display_name || 'this member'}'s permissions to match the ${pendingRoleChange.label} role.`,
          `የ${pendingRoleChange.member.displayName || pendingRoleChange.member.display_name || 'ይህ አባል'} ፍቃዶች ወደ ${pendingRoleChange.label} ሚና ይቀየራሉ።`
        ) : ''}
        confirmLabel={t('Change Role', 'ሚና ቀይር')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => { const p = pendingRoleChange; setPendingRoleChange(null); if (p) handleRoleChange(p.member, p.newRole); }}
        onCancel={() => setPendingRoleChange(null)}
      />

      {/* Deactivation confirm dialog */}
      <ConfirmDialog
        open={pendingDeactivation != null}
        tone="danger"
        title={pendingDeactivation ? t(`Deactivate ${pendingDeactivation.name}?`, `${pendingDeactivation.name}ን ያቁሙ?`) : ''}
        message={t(
          'They will not be able to access the shop until reactivated. Their sales history is preserved.',
          'እስኪነቁ ድረስ ሱቁን መጠቀም አይችሉም። የሽያጭ ታሪካቸው ይቆያል።'
        )}
        confirmLabel={t('Deactivate', 'አቁም')}
        cancelLabel={t('Cancel', 'ሰርዝ')}
        onConfirm={() => {
          const p = pendingDeactivation;
          setPendingDeactivation(null);
          if (p) {
            if (p.isLocal) {
              onDeactivateStaffMember?.(p.id);
            } else {
              onDeactivateStaffMember?.(p.id);
            }
          }
        }}
        onCancel={() => setPendingDeactivation(null)}
      />

      <div className="h-4" />
    </div>
  );
}
