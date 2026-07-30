import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLang } from '../../context/LangContext';
import { useStaffStore } from '../../stores/staffStore';
import { loadStaffActivityFeed } from '../../utils/staffActivityFeed';
import { startOfLocalDay } from '../../utils/reportSelectors';
import db from '../../db';
import { fmt } from '../../utils/numformat';

export default function StaffActivityFeed({ todayRefreshKey }) {
  const { lang } = useLang();
  const store = useStaffStore();
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
          if (!cancelled) { store.setTodayStaffSales(salesMap); store.setTodayStaffTransactions(txnMap); }
        } catch {}
      })(),
    ]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [todayRefreshKey]);

  const t = (en, am) => lang === 'am' ? am : en;

  const filters = [
    { key: 'all', label: t('All', 'ሁሉም') },
    { key: 'sale', label: t('Sales', 'ሽያጭ') },
    { key: 'customer_payment', label: t('Payments', 'ክፍያ') },
    { key: 'customer_credit', label: t('Dubie', 'ዱቤ') },
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
      today: { label: t('Today', 'ዛሬ'), items: [] },
      week: { label: t('This week', 'በዚህ ሳምንት'), items: [] },
      month: { label: t('This month', 'በዚህ ወር'), items: [] },
      older: { label: t('Older', 'ቀደም ብሎ'), items: [] },
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
                background: active ? 'var(--color-primary)' : 'var(--color-surface-muted)',
                color: active ? 'var(--color-bg-white)' : 'var(--color-text-muted)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-6">{t('Loading…', 'በመጫን ላይ…')}</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          {t('Staff activity will appear here as team members record sales, payments, and Dubie.',
            'የሰራተኞች እንቅስቃሴ እዚህ ይታያል')}
        </p>
      ) : (
        <div className="space-y-2">
          {periodOrder.filter(p => grouped[p]).map(period => {
            const group = grouped[period];
            const totalAmount = group.items.reduce((sum, a) => sum + Number(a.amount || 0), 0);
            const isExpanded = expandedPeriod === period;
            return (
              <div key={period} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setExpandedPeriod(isExpanded ? null : period)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left"
                  style={{ background: 'var(--color-surface-subtle)' }}
                >
                  <div>
                    <div className="text-xs font-black text-gray-700">{group.label}</div>
                    <div className="text-[10px] font-bold" style={{ color: 'var(--color-primary)' }}>
                      {group.items.length} {t('activities', 'እንቅስቃሴዎች')}
                      {totalAmount > 0 && ` · ${fmt(totalAmount)} ${t('birr', 'ብር')}`}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2 space-y-1">
                    {group.items.map(a => (
                      <div key={a.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)' }}>
                          {(a.staff_name || 'S').slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-gray-800 truncate">
                            {a.staff_name}
                            <span style={{ color: 'var(--color-text-soft)', fontWeight: 400 }}> · {a.summary || a.event_type}</span>
                          </div>
                          {a.amount != null && (
                            <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{a.amount.toLocaleString()} birr</div>
                          )}
                        </div>
                        {a.sync_state === 'needs_retry' && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded-full" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                            {t('Retry', 'እንደገና')}
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
