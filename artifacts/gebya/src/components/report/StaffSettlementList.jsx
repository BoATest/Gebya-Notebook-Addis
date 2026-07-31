import { useState, useEffect } from 'react';
import db, { getAllSettlements } from '../../db';
import { fmt } from '../../utils/numformat';

export default function StaffSettlementList({ staffRows = [], lang = 'en', onSettle, onViewSettlement, currentSettlingStaff }) {
  const [settlements, setSettlements] = useState([]);
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bizRow = await db.settings.get('gebya_business_id');
      const bizId = Number(bizRow?.value) || 0;
      if (cancelled) return;
      try {
        const rows = await getAllSettlements(Date.now() - 90 * 86400000, Date.now() + 86400000, bizId);
        setSettlements(rows);
      } catch {}
    })();
    const interval = setInterval(async () => {
      const bizRow = await db.settings.get('gebya_business_id');
      const bizId = Number(bizRow?.value) || 0;
      try {
        const rows = await getAllSettlements(Date.now() - 90 * 86400000, Date.now() + 86400000, bizId);
        setSettlements(rows);
      } catch {}
    }, 10000);
    return () => { cancelled = true; clearInterval(interval); };
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

  function ReconBadge({ status }) {
    const STATUSES = {
      staff_submitted: { label: t('Staff sent', 'ሰራተኛ ልኳል'), bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
      owner_reviewed: { label: t('Reviewed', 'ተመልክቷል'), bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
      disputed: { label: t('Disputed', 'አልተስማማም'), bg: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' },
      finalized: { label: t('Finalized', 'ተጠናቋል'), bg: 'var(--color-success-border)', color: 'var(--color-success-text)' },
      checked: { label: t('Checked', 'ተፈትሟል'), bg: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' },
    };
    const s = STATUSES[status] || STATUSES.checked;
    return (
      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  }

  return (
    <div>
      {/* Unsettled staff alerts */}
      {unsettled.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {t('Ready to settle', 'ለማስተካከል ዝግጁ')}
          </p>
          {unsettled.map(staff => {
            const hasStaffSubmission = staff.lastSettlement?.reconciliation_status === 'staff_submitted';
            return (
              <div key={staff.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', marginBottom: 6,
                background: hasStaffSubmission ? 'var(--color-info-bg)' : 'var(--color-bg-white)', borderRadius: 10,
                border: currentSettlingStaff === String(staff.id) ? '2px solid #1B4332' : '1px solid #e5e7eb',
                borderLeft: hasStaffSubmission ? '3px solid #0369a1' : undefined,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>
                    {staff.name || staff.displayName}
                    {hasStaffSubmission && (
                      <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--color-info)' }}>
                        📨 {t('submitted', 'ልኳል')}
                      </span>
                    )}
                  </p>
                  {staff.lastSettlement?.reconciliation_status === 'staff_submitted' ? (
                    <p style={{ fontSize: 11, color: 'var(--color-info)', margin: '2px 0 0' }}>
                      {t('Staff reported:', 'ሰራተኛ ያስረከበው:')} {fmt(staff.lastSettlement.staff_reported_cash || 0)} ETB
                      {staff.lastSettlement.staff_reported_transfer > 0 && (
                        <span> + {t('transfer:', 'ዝውውር:')} {fmt(staff.lastSettlement.staff_reported_transfer)} ETB</span>
                      )}
                    </p>
                  ) : staff.daysSince !== null ? (
                    <p style={{ fontSize: 11, color: 'var(--color-warning)', margin: '2px 0 0' }}>
                      {t('Last settled', 'መጨረሻ የተስተካከለ')} {staff.daysSince} {t('days ago', 'ቀናት በፊት')}
                    </p>
                  ) : (
                    <p style={{ fontSize: 11, color: 'var(--color-danger)', margin: '2px 0 0' }}>
                      {t('Never settled', 'እስካሁን አልተስተካከለም')}
                    </p>
                  )}
                  {staff.lastSettlement && staff.lastSettlement.final_variance !== 0 && (
                    <p style={{ fontSize: 11, color: 'var(--color-warning)', margin: '2px 0 0' }}>
                      {t('Variance:', 'ልዩነት:')} {fmt(staff.lastSettlement.final_variance)} ETB
                    </p>
                  )}
                </div>
                <button
                  onClick={() => hasStaffSubmission ? onViewSettlement?.(staff.lastSettlement, staff) : onSettle(staff)}
                  style={{
                    background: hasStaffSubmission ? 'var(--color-info)' : 'var(--color-primary)', color: 'var(--color-bg-white)', border: 'none',
                    borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 800,
                    cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 8,
                  }}
                >{hasStaffSubmission ? t('Review', 'መርምር') : t('Settle', 'አስተካክል')}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent settlements */}
      {settlements.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {t('Past settlements', 'ያለፉ ማስተካከያዎች')}
          </p>
          <div style={{ maxHeight: viewAll ? 400 : 240, overflowY: 'auto' }}>
            {displayed.map((s, i) => {
              const staff = staffRows.find(r => String(r.id) === String(s.staff_id));
              const rStatus = s.reconciliation_status;
              return (
                <div key={s.id || i} onClick={() => onViewSettlement?.(s, staff)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', fontSize: 11, fontWeight: 650, color: 'var(--color-text)',
                    borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                    borderRadius: 6, transition: 'background 0.1s',
                    background: rStatus === 'staff_submitted' ? 'var(--color-info-bg)' :
                                rStatus === 'disputed' ? 'var(--color-danger-bg)' : 'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = rStatus === 'staff_submitted' ? 'var(--color-info-bg)' : rStatus === 'disputed' ? 'var(--color-danger-bg)' : 'var(--color-bg-active)'}
                  onMouseLeave={e => e.currentTarget.style.background = rStatus === 'staff_submitted' ? 'var(--color-info-bg)' : rStatus === 'disputed' ? 'var(--color-danger-bg)' : 'transparent'}
                >
                  <div style={{ flex: 1 }}>
                    <span>
                      {new Date(s.settled_at).toLocaleDateString()} · {staff?.name || staff?.displayName || `#${s.staff_id}`}
                    </span>
                    {(s.staff_reported_cash != null || s.reconciliation_note) && (
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {s.staff_reported_cash != null && `${t('Staff:', 'ሰራተኛ:')} ${fmt(s.staff_reported_cash)} ETB`}
                        {s.reconciliation_note && ` 📝 ${s.reconciliation_note}`}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ReconBadge status={rStatus} />
                    <span style={{ color: 'var(--color-text-soft)', fontSize: 14 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
          {settlements.length > 10 && (
            <button onClick={() => setViewAll(!viewAll)}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: '8px 0', width: '100%', textAlign: 'center' }}
            >{viewAll ? t('Show less', 'አጠር አድርግ') : t('View all', 'ሁሉንም እይ')}</button>
          )}
        </div>
      )}

      {settlements.length === 0 && unsettled.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-soft)', textAlign: 'center', padding: 16 }}>
          {t('No settlement data yet', 'እስካሁን ምንም የማስተካከያ መረጃ የለም')}
        </p>
      )}
    </div>
  );
}
