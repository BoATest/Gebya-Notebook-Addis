import { useState, useEffect } from 'react';
import db, { getAllSettlements } from '../../db';
import { fmt } from '../../utils/numformat';

export default function SettlementAlertBanner({ lang = 'en', onFocus, isStaffView = false }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (isStaffView) return;
    (async () => {
      try {
        const rows = await getAllSettlements(Date.now() - 90 * 86400000, Date.now() + 86400000);

        // Group by staff, find latest per staff
        const latest = {};
        for (const s of rows) {
          const k = String(s.staff_id);
          if (!latest[k] || s.settled_at > latest[k].settled_at) {
            latest[k] = s;
          }
        }

        // Unresolved variances: checked settlements with non-zero variance
        const unresolved = Object.values(latest).filter(
          s => s.status === 'checked' && Math.abs(s.final_variance || 0) > 0
        );

        // Staff missing names — try to fetch
        const staffNames = {};
        try {
          const allStaff = await db.staff_members.toArray();
          for (const st of allStaff) staffNames[String(st.id)] = st.displayName || st.name;
        } catch {}

        const items = unresolved.slice(0, 3).map(s => ({
          staffId: s.staff_id,
          name: staffNames[String(s.staff_id)] || `#${s.staff_id}`,
          variance: s.final_variance,
          date: new Date(s.settled_at).toLocaleDateString(),
        }));

        setAlerts(items);
      } catch {}
    })();
  }, [isStaffView]);

  if (isStaffView || alerts.length === 0) return null;

  const t = (en, am) => lang === 'am' ? am : en;

  return (
    <div onClick={onFocus}
      style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
        padding: '10px 14px', marginBottom: 12, cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
      onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', margin: 0 }}>
            {t('Settlement variances need review', 'የማስተካከያ ልዩነቶች መገምገም ያስፈልጋቸዋል')}
          </p>
          {alerts.map((a, i) => (
            <p key={i} style={{ fontSize: 11, color: '#991b1b', margin: '2px 0 0' }}>
              {a.name} · {a.date} · {a.variance >= 0 ? '+' : ''}{fmt(a.variance)} ETB
            </p>
          ))}
        </div>
        <span style={{ color: '#dc2626', fontSize: 16 }}>›</span>
      </div>
    </div>
  );
}
