import { useState, useEffect } from 'react';
import db, { getAllSettlements } from '../../db';
import { fmt } from '../../utils/numformat';

export default function StaffSettlementList({ staffRows = [], lang = 'en', onSettle, onViewSettlement, currentSettlingStaff }) {
  const [settlements, setSettlements] = useState([]);
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rows = await getAllSettlements(Date.now() - 90 * 86400000, Date.now() + 86400000);
        setSettlements(rows);
      } catch {}
    })();
    const interval = setInterval(async () => {
      try {
        const rows = await getAllSettlements(Date.now() - 90 * 86400000, Date.now() + 86400000);
        setSettlements(rows);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const t = (en, am) => lang === 'am' ? am : en;

  const lastSettlementPerStaff = {};
  for (const s of settlements) {
    const key = String(s.staff_id);
    if (!lastSettlementPerStaff[key] || s.settled_at > lastSettlementPerStaff[key].settled_at) {
      lastSettlementPerStaff[key] = s;
    }
  }

  const staffWithStatus = staffRows.map(staff => {
    const key = String(staff.id);
    const last = lastSettlementPerStaff[key];
    const daysSince = last ? Math.floor((Date.now() - last.settled_at) / 86400000) : null;
    const hasVariance = last && Math.abs(last.final_variance || 0) > 0;
    return { ...staff, lastSettlement: last, daysSince, hasVariance };
  });

  const unsettled = staffWithStatus.filter(s => s.daysSince === null || s.daysSince > 0);
  const displayed = viewAll ? settlements : settlements.slice(0, 10);

  return (
    <div>
      {/* Unsettled staff alerts */}
      {unsettled.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {t('Ready to settle', 'ለማስተካከል ዝግጁ')}
          </p>
          {unsettled.map(staff => (
            <div key={staff.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', marginBottom: 6,
              background: '#fff', borderRadius: 10,
              border: currentSettlingStaff === String(staff.id) ? '2px solid #1B4332' : '1px solid #e5e7eb',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: '#1f2937', margin: 0 }}>
                  {staff.name || staff.displayName}
                </p>
                {staff.daysSince !== null ? (
                  <p style={{ fontSize: 11, color: '#f59e0b', margin: '2px 0 0' }}>
                    {t('Last settled', 'መጨረሻ የተስተካከለ')} {staff.daysSince} {t('days ago', 'ቀናት በፊት')}
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: '#ef4444', margin: '2px 0 0' }}>
                    {t('Never settled', 'እስካሁን አልተስተካከለም')}
                  </p>
                )}
                {staff.lastSettlement && staff.lastSettlement.final_variance !== 0 && (
                  <p style={{ fontSize: 11, color: '#f59e0b', margin: '2px 0 0' }}>
                    {t('Variance:', 'ልዩነት:')} {fmt(staff.lastSettlement.final_variance)} ETB
                  </p>
                )}
              </div>
              <button onClick={() => onSettle(staff)}
                style={{
                  background: '#1B4332', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800,
                  cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 8,
                }}
              >{t('Settle', 'አስተካክል')}</button>
            </div>
          ))}
        </div>
      )}

      {/* Recent settlements */}
      {settlements.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {t('Past settlements', 'ያለፉ ማስተካከያዎች')}
          </p>
          <div style={{ maxHeight: viewAll ? 400 : 240, overflowY: 'auto' }}>
            {displayed.map((s, i) => {
              const staff = staffRows.find(r => String(r.id) === String(s.staff_id));
              const isReconciled = s.status === 'reconciled';
              const hasVariance = Math.abs(s.final_variance || 0) > 0;
              return (
                <div key={s.id || i} onClick={() => onViewSettlement?.(s, staff)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', fontSize: 11, fontWeight: 650, color: '#374151',
                    borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                    borderRadius: 6, transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <span>
                      {new Date(s.settled_at).toLocaleDateString()} · {staff?.name || staff?.displayName || `#${s.staff_id}`}
                    </span>
                    {s.reconciliation_note && (
                      <span style={{ display: 'block', fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                        📝 {s.reconciliation_note}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                      background: isReconciled ? '#dcfce7' : '#fef3c7',
                      color: isReconciled ? '#16a34a' : '#d97706',
                    }}>
                      {isReconciled ? t('R', 'ተ') : t('C', 'ተ')}
                    </span>
                    <span style={{ color: hasVariance ? '#f59e0b' : '#16a34a' }}>
                      {hasVariance ? `${fmt(s.final_variance)} ETB` : '✓'}
                    </span>
                    <span style={{ color: '#9ca3af', fontSize: 14 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
          {settlements.length > 10 && (
            <button onClick={() => setViewAll(!viewAll)}
              style={{ background: 'none', border: 'none', color: '#1B4332', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '8px 0', width: '100%', textAlign: 'center' }}
            >{viewAll ? t('Show less', 'አጠር አድርግ') : t('View all', 'ሁሉንም እይ')}</button>
          )}
        </div>
      )}

      {settlements.length === 0 && unsettled.length === 0 && (
        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: 16 }}>
          {t('No settlement data yet', 'እስካሁን ምንም የማስተካከያ መረጃ የለም')}
        </p>
      )}
    </div>
  );
}
