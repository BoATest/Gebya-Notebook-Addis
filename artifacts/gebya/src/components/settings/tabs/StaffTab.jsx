import { useState, useEffect, useMemo } from 'react';
import TeamPage from '../../TeamPage';
import { useLang } from '../../../context/LangContext';
import { loadStaffActivityFeed } from '../../../utils/staffActivityFeed';
import TabCard from '../TabCard';

function StaffActivityFeed() {
  const { lang } = useLang();
  const [filter, setFilter] = useState('all');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="px-4 py-4 space-y-3">
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
        <p className="text-xs text-gray-400 text-center py-6">
          {lang === 'am' ? 'በመጫን ላይ…' : 'Loading…'}
        </p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          {lang === 'am' ? 'የሰራተኞች እንቅስቃሴ እዚህ ይታያል' : 'Staff activity will appear here as team members record sales, payments, and Dubie.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map(a => (
            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                {(a.staff_name || 'S').slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-800 truncate">
                  {a.staff_name}
                  <span style={{ color: '#9ca3af', fontWeight: 400 }}> · {a.summary || a.event_type}</span>
                </div>
                {a.amount != null && (
                  <div className="text-[11px]" style={{ color: '#6b7280' }}>
                    {a.amount.toLocaleString()} birr
                  </div>
                )}
              </div>
              {a.sync_state === 'needs_retry' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fef2f2', color: '#dc2626' }}>
                  {lang === 'am' ? 'እንደገና' : 'Retry'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StaffTab(props) {
  const {
    staffMembers,
    activeStaffMemberId,
    currentActorLabel,
    onSetActiveStaffMember,
    onSaveStaffMember,
    onUpdateStaffMember,
    onDeactivateStaffMember,
    onReactivateStaffMember,
    onApproveDevice,
    onRejectDevice,
    lang,
  } = props;

  const [activityOpen, setActivityOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const activeCount = (staffMembers || []).filter(m => m.active !== false).length;

  return (
    <div>
      <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden mb-2.5">
        <TeamPage
          staffMembers={staffMembers}
          activeStaffMemberId={activeStaffMemberId}
          currentActorLabel={currentActorLabel}
          onSetActiveStaffMember={onSetActiveStaffMember}
          onSaveStaffMember={onSaveStaffMember}
          onUpdateStaffMember={onUpdateStaffMember}
          onDeactivateStaffMember={onDeactivateStaffMember}
          onReactivateStaffMember={onReactivateStaffMember}
        />
      </div>

      <TabCard
        id="activity"
        icon="📋"
        title={lang === 'am' ? 'የሰራተኞች እንቅስቃሴ' : 'Staff Activity'}
        subtitle={lang === 'am' ? `${activeCount} ንቁ ሰራተኞች` : `${activeCount} active staff`}
        badgeTone="neutral"
        open={activityOpen}
        onToggle={() => setActivityOpen(!activityOpen)}
      >
        <StaffActivityFeed />
      </TabCard>

      <TabCard
        id="devices"
        icon="📱"
        title={lang === 'am' ? 'የመሳሪያ አስተዳደር' : 'Device Management'}
        subtitle={lang === 'am' ? 'የተፈቀዱ መሳሪዎችን ያስተዳድሩ' : 'Manage approved devices'}
        badgeTone="neutral"
        open={deviceOpen}
        onToggle={() => setDeviceOpen(!deviceOpen)}
      >
        <div className="px-4 pb-4 text-sm text-gray-500">
          {lang === 'am' ? 'የመሳሪያ አስተዳደር እዚህ ይታያል' : 'Device management will appear here.'}
        </div>
      </TabCard>
    </div>
  );
}
