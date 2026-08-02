import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useStaffStore } from '../../stores/staffStore';
import { RoleBadge } from '../../utils/shared-ui.jsx';
import { fmt } from '../../utils/numformat';

export default function StaffTodayTeam({
  activeStaff, inactiveStaff, canManageTeam, lastSettlementPerStaff,
  todayStaffSales, todayStaffTransactions, expandedStaffDrilldown,
  estimatedAmounts, estimatesLoading, onReactivateStaffMember, onSetSettling,
  onViewSettlement, t
}) {
  const store = useStaffStore();

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-alt)' }}>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {t("Today's Team", 'የዛሬ ቡድን')}
        </span>
        <span className="text-xs font-black" style={{ color: 'var(--color-primary)' }}>{activeStaff.length} {t('active', 'ንቁ')}</span>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
        {activeStaff.length === 0 && (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--color-bg-hover)' }}>
              <span className="text-xl font-black text-gray-400">+</span>
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
          const lastS = lastSettlementPerStaff[String(m.id)];
          const sDaysSince = lastS ? Math.floor((Date.now() - new Date(lastS.settled_at).getTime()) / 86400000) : null;
          const sStatus = lastS?.reconciliation_status;
          const isSubmitted = sStatus === 'staff_submitted';
          const isFinalized = sStatus === 'finalized' || (sStatus === 'checked' && sDaysSince === 0);
          return (
            <div key={m.id}>
              <div className="w-full px-4 py-3 flex items-center justify-between text-left">
                <button onClick={() => store.setExpandedStaffDrilldown(isDrilled ? null : m.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                    {(m.display_name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{m.display_name}</div>
                    <div className="text-xs text-gray-500">
                      <RoleBadge role={m.role || 'staff'} />
                      {isPendingDevice && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                          {t('pending', 'በመጠባበቅ')}
                        </span>
                      )}
                    </div>
                    {sales && (
                      <div className="text-xs font-bold mt-0.5" style={{ color: 'var(--color-primary)' }}>
                        {sales.count} {t('sales', 'ሽያጮች')} · {fmt(sales.total)} {t('birr', 'ብር')}
                      </div>
                    )}
                    {!sales && !canManageTeam && (
                      <div className="text-[10px] text-gray-400 mt-0.5">{t('No sales today', 'ዛሬ ሽያጥ የለም')}</div>
                    )}
                  </div>
                </button>
                {canManageTeam && (
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {isSubmitted ? (
                      <button onClick={() => onViewSettlement(m, lastS)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                        style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}
                      ><Eye className="w-3 h-3 inline" /> {t('Review', 'መርምር')}</button>
                    ) : isFinalized ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap" style={{ background: 'var(--color-success-border)', color: 'var(--color-success-text)' }}>
                        ✓ {t('Settled', 'ተቀምጧል')}
                      </span>
                    ) : (
                      <button onClick={() => onSetSettling(m)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap"
                        style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
                      >{t('Settle', 'አስተካክል')}</button>
                    )}
                  </div>
                )}
              </div>

              {isDrilled && (
                <div style={{ background: 'var(--color-surface-subtle)', borderTop: '1px solid var(--color-border-light)' }}>
                  <div className="px-4 py-3">
                    {sales && (
                      <div className="flex gap-2 mb-3">
                        <div className="flex-1 rounded-lg border px-2 py-1.5 text-center bg-white" style={{ borderColor: 'var(--color-border)' }}>
                          <div className="text-sm font-black" style={{ color: 'var(--color-primary)' }}>{sales.count}</div>
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Items', 'እቃዎች')}</div>
                        </div>
                        <div className="flex-1 rounded-lg border px-2 py-1.5 text-center bg-white" style={{ borderColor: 'var(--color-border)' }}>
                          <div className="text-sm font-black" style={{ color: 'var(--color-primary)' }}>{fmt(sales.cashTotal)}</div>
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Cash Sales', 'ጥሬ ሽያጭ')}</div>
                        </div>
                        <div className="flex-1 rounded-lg border px-2 py-1.5 text-center bg-white" style={{ borderColor: 'var(--color-border)' }}>
                          <div className="text-sm font-black" style={{ color: sales.transferTotal > 0 ? 'var(--color-primary)' : 'var(--color-text-soft)' }}>{fmt(sales.transferTotal)}</div>
                          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{t('Transfer', 'ዝውውር')}</div>
                        </div>
                      </div>
                    )}

                    {lastS && (
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 10, padding: '6px 10px',
                        background: isSubmitted ? 'var(--color-bg-accent-blue)' : isFinalized ? 'var(--color-success-bg)' : 'var(--color-bg-hover)',
                        borderRadius: 6, fontSize: 11
                      }}>
                        <span style={{ fontWeight: 700, color: isSubmitted ? 'var(--color-info)' : isFinalized ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                          {isSubmitted ? t('Awaiting review', 'ክለሳ ይጠበቃል') : isFinalized ? t('Settled today', 'ዛሬ ተቀምጧል') : t('Last settled', 'የመጨረሻ ማስተካከያ')}
                        </span>
                        <span className="text-gray-400">
                          {new Date(lastS.settled_at).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                          {isFinalized ? ` · ${fmt(lastS.actual_total || 0)} ETB` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        {t("Today's transactions", 'የዛሬ ግብይቶች')}
                        {txns.length > 0 && <span className="font-normal text-gray-400 ml-1">({txns.length})</span>}
                      </span>
                      {!sales && canManageTeam && (
                        <button onClick={() => onSetSettling(m)}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)', border: 'none', cursor: 'pointer' }}
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
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>{t('Credit', 'ዱቤ')}</span>
                                )}
                                {isTransfer && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>{t('Trans', 'ዝውውር')}</span>
                                )}
                                {!isTransfer && !isCreditSale && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>{t('Cash', 'ጥሬ')}</span>
                                )}
                                <span className="text-[12px] font-black flex-shrink-0 ml-1" style={{ color: 'var(--color-primary)' }}>{fmt(txn.amount)}</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between pt-2 mt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t('Total', 'ጠቅላላ')}</span>
                          <span className="text-sm font-black" style={{ color: 'var(--color-primary)' }}>
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
          <div key={m.id} className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--color-bg-active)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-soft)' }}>
                {(m.display_name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-400 truncate">{m.display_name}</div>
                <div className="text-xs text-gray-400">{t('Inactive', 'ተሰናብቷል')}</div>
              </div>
            </div>
            {canManageTeam && (
              <button onClick={() => onReactivateStaffMember?.(m.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}
              >{t('Reactivate', 'ንቁ አድርግ')}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
