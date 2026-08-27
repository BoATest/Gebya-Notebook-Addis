import { useState, useEffect, lazy, Suspense } from 'react';
import { useLang } from '../context/LangContext';
import { apiFetch } from '../utils/shared-ui.jsx';
import { getAuthToken } from '../utils/syncEngine';
import { fmt } from '../utils/numformat';
import { resetSmsQuota, addShopNote, nudgeOwner, resendReminders } from '../api/admin.js';
import { formatDays, formatDaysOverdue } from '../utils/durationFormat';
import { ChevronLeft, Activity, AlertTriangle } from 'lucide-react';

const SupportPanel = lazy(() => import('./SupportPanel.jsx'));

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

function CommsRow({ label, value, tone }) {
  const color = tone === 'green' ? 'var(--color-success-text)' : tone === 'amber' ? 'var(--color-warning)' : tone === 'red' ? 'var(--color-danger-text)' : 'var(--color-text)';
  return (
    <div className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
      <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{label}</span>
      <span className="text-xs font-black" style={{ color }}>{value}</span>
    </div>
  );
}

export default function AdminShopDetail({ businessId, onBack, lang: propLang }) {
  const { lang } = useLang();
  const l = lang || propLang || 'en';
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgResult, setMsgResult] = useState(null);

  const [tab, setTab] = useState('details');
  const [activity, setActivity] = useState([]);
  const [violations, setViolations] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);

  const [nudgeMsg, setNudgeMsg] = useState('');
  const [nudgeResult, setNudgeResult] = useState(null);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const [resetResult, setResetResult] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const [resendResult, setResendResult] = useState(null);
  const [resendBusy, setResendBusy] = useState(false);

  const refreshShop = () => {
    setLoading(true);
    apiFetch(`/admin/shops/${businessId}`)
      .then(setShop)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleResetQuota = async () => {
    setResetBusy(true);
    setResetResult(null);
    try {
      const res = await resetSmsQuota(businessId);
      setResetResult({ ok: res.ok, message: res.message });
      refreshShop();
    } catch (e) {
      setResetResult({ ok: false, message: e.message });
    } finally {
      setResetBusy(false);
    }
  };

  const handleNudge = async () => {
    setNudgeBusy(true);
    setNudgeResult(null);
    try {
      const res = await nudgeOwner(businessId, nudgeMsg.trim() || null);
      setNudgeResult(res);
      setNudgeMsg('');
      refreshShop();
    } catch (e) {
      setNudgeResult({ ok: false, status: 'failed', detail: e.message });
    } finally {
      setNudgeBusy(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteBusy(true);
    setNoteError(null);
    try {
      await addShopNote(businessId, noteText.trim());
      setNoteText('');
      refreshShop();
    } catch (e) {
      setNoteError(e.message);
    } finally {
      setNoteBusy(false);
    }
  };

  const handleResend = async () => {
    setResendBusy(true);
    setResendResult(null);
    try {
      const res = await resendReminders(businessId);
      setResendResult(res);
      refreshShop();
    } catch (e) {
      setResendResult({ ok: false, error: e.message });
    } finally {
      setResendBusy(false);
    }
  };

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    apiFetch(`/admin/shops/${businessId}`)
      .then(setShop)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (tab !== 'activity' || !businessId) return;
    setActivityLoading(true);
    setActivityError(null);
    Promise.all([
      apiFetch(`/audit/activity?business_id=${encodeURIComponent(businessId)}&date_from=${encodeURIComponent(new Date(Date.now() - 30 * 864e5).toISOString())}`),
      apiFetch(`/audit/violations?business_id=${encodeURIComponent(businessId)}`),
    ])
      .then(([act, viol]) => {
        setActivity((act.activity || []).slice().reverse());
        setViolations(viol.violations || []);
      })
      .catch(err => setActivityError(err.message))
      .finally(() => setActivityLoading(false));
  }, [tab, businessId]);

  const handleSendTargeted = async () => {
    if (!msgTitle || !msgBody) return;
    setMsgSending(true);
    setMsgResult(null);
    const token = await getAuthToken();
    try {
      const res = await fetch(`${API_BASE}/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: msgTitle,
          body: msgBody,
          type: 'support_message',
          business_id: shop.shop.id,
        }),
      });
      const result = await res.json();
      setMsgResult(result);
      if (result.ok) {
        setMsgTitle('');
        setMsgBody('');
      }
    } catch (err) {
      setMsgResult({ ok: false, error: err.message });
    } finally {
      setMsgSending(false);
    }
  };

  if (loading) return <div className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'ሱፍ በመ ይሄዳል...' : 'Loading shop details...'}</div>;
  if (error) return <div className="p-6 text-sm text-red-500">Error: {error}</div>;
  if (!shop) return null;

  const s = shop.shop;
  const st = shop.stats;

  const tStatusMap = { active: { bg: 'var(--color-success-bg)', color: 'var(--color-success-text)' }, dormant: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' }, new: { bg: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' } };
  const statusStyle = tStatusMap[st.status] || tStatusMap.new;

  return (
    <div className="space-y-4 pb-8">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>
        <ChevronLeft className="w-4 h-4" />
        {l === 'am' ? 'ወደ ድርጅት ውብህ' : 'Back to Dashboard'}
      </button>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-bg-hover)' }}>
        {[{ id: 'details', label: l === 'am' ? 'ዝርዝር' : 'Details' }, { id: 'activity', label: l === 'am' ? 'እንቅስቃሴ' : 'Activity' }, { id: 'comms', label: l === 'am' ? 'መገናኛ' : 'Comms' }, { id: 'actions', label: l === 'am' ? 'ሥሮች' : 'Actions' }, { id: 'tickets', label: l === 'am' ? 'ድጋፍ' : 'Tickets' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 py-2 rounded-lg text-xs font-bold transition-all" style={tab === t.id ? { background: 'var(--color-primary)', color: '#fff' } : { color: 'var(--color-text-muted)' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'details' && (<>
      {/* Shop header */}
      <div className="flex items-center gap-3 bg-white rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg text-white" style={{ background: 'var(--color-primary)' }}>
          {s.name ? s.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-gray-900 flex items-center gap-2">
            {s.name || (l === 'am' ? 'ሱቅ' : 'Shop')}
            {st && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={statusStyle}>{st.status || (l === 'am' ? 'አկնա' : 'new')}</span>
            )}
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {s.phoneMasked} · {s.ownerTelegramLinked ? (l === 'am' ? 'ቴሌግራም ተዣረ' : 'Telegram linked') : (l === 'am' ? 'ቴሌግራም አይደለም' : 'No Telegram')}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {st && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: l === 'am' ? 'ሽያጭ' : 'Sales', value: fmt(st.totalSales) + ' ETB' },
            { label: l === 'am' ? 'በሬደር' : 'Expenses', value: fmt(st.totalExpenses) + ' ETB' },
            { label: l === 'am' ? 'የበለራ ብዬት' : 'Credit Outstanding', value: fmt(st.outstandingCredit) + ' ETB' },
            { label: l === 'am' ? 'ሁኔታ የሆነ' : 'Transactions', value: fmt(st.totalTransactions) },
            { label: l === 'am' ? 'ደንበሮች' : 'Customers', value: fmt(st.totalCustomers) },
            { label: l === 'am' ? 'ሰራተኞች' : 'Staff', value: `${fmt(st.activeStaff)}/${fmt(st.totalStaff)}` },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border text-center p-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>{item.value}</div>
              <div className="text-[10px] font-bold" style={{ color: 'var(--color-text-muted)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Overdue exposure alert */}
      {st && st.overdueCustomers > 0 && (
        <div className="bg-white rounded-xl border p-3" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }}>
          <div className="text-xs font-bold text-red-800">
            {l === 'am' ? `${st.overdueCustomers} የቆየ ደንበር ይሁዳል ${fmt(st.totalOverdueExposure)} ብር` : `${st.overdueCustomers} customers overdue — ${fmt(st.totalOverdueExposure)} ETB exposure`}
          </div>
        </div>
      )}

      {/* Payment behavior — per-customer On-time %, avg payment period.
          This is where the On-time metric lives for admins (removed from the
          shop owner's customer page, calculation unchanged). */}
      {Array.isArray(shop.creditPerformance) && shop.creditPerformance.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {l === 'am' ? 'የክፍያ ባህሪ' : 'PAYMENT BEHAVIOR'}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
            {shop.creditPerformance.map((c) => {
              const rate = c.on_time_rate_percent;
              const rateColor = rate == null
                ? 'var(--color-text-muted)'
                : rate >= 80
                  ? 'var(--color-success-text)'
                  : rate >= 50
                    ? 'var(--color-warning)'
                    : 'var(--color-danger-text)';
              return (
                <div key={c.customer_id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--color-text)' }}>
                      {c.display_name || `Customer ${c.customer_id}`}
                    </div>
                    <div className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      {c.avg_pay_days !== null && c.avg_pay_days !== undefined
                        ? (l === 'am' ? `አማካይ ክፍያ: ${formatDays(c.avg_pay_days, 'am')}` : `Avg pay: ${formatDays(c.avg_pay_days, 'en')}`)
                        : (l === 'am' ? 'ገና አልተከፈለም' : 'Nothing settled yet')}
                      {' · '}{fmt(c.outstanding_birr)} ETB
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black" style={{ color: rateColor }}>
                      {rate == null ? '—' : `${rate}% ${l === 'am' ? 'በወቅቱ' : 'on time'}`}
                    </div>
                    {c.overdue_days > 0 && (
                      <div className="text-[10px] font-bold" style={{ color: 'var(--color-danger-text)' }}>
                        {formatDaysOverdue(c.overdue_days, l === 'am' ? 'am' : 'en')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members */}
      {shop.members && shop.members.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {l === 'am' ? 'ቡድን ዳታ' : 'TEAM MEMBERS'}
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border-light)' }}>
            {shop.members.map((m, i) => (
              <div key={i} className="px-4 py-2 flex justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{m.displayName || m.role}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: m.role === 'owner' ? 'var(--color-warning-bg)' : 'var(--color-bg-hover)', color: m.role === 'owner' ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bank shares */}
      {shop.bankShares && shop.bankShares.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {l === 'am' ? 'ቦክር ዝሃመ' : 'BANK AGREEMENTS'}
            </span>
          </div>
          <div className="px-4 py-3 space-y-2">
            {shop.bankShares.map((share, i) => (
              <div key={i} className="flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>{share.bankName}</div>
                  <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {l === 'am' ? 'ስales: ' : 'Sales: '}{share.shareSalesData ? (l === 'am' ? 'አዎን' : 'Yes') : (l === 'am' ? 'አይደለም' : 'No')}
                    {' · '} {l === 'am' ? 'ቪያስ: ' : 'Credit: '}{share.shareCreditData ? (l === 'am' ? 'አዎን' : 'Yes') : (l === 'am' ? 'አይደለም' : 'No')}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                  background: share.status === 'active' ? 'var(--color-success-bg)' : share.status === 'revoked' ? 'var(--color-danger-bg)' : 'var(--color-bg-hover)',
                  color: share.status === 'active' ? 'var(--color-success-text)' : share.status === 'revoked' ? 'var(--color-danger-text)' : 'var(--color-text-muted)',
                }}>{share.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Targeted message */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {l === 'am' ? 'መልዥ መላስ' : 'SEND TARGETED MESSAGE'}
          </span>
        </div>
        <div className="px-4 py-3 space-y-3">
          <input
            type="text" value={msgTitle} onChange={e => setMsgTitle(e.target.value)}
            placeholder={l === 'am' ? 'ርዕስ' : 'Title'}
            className="w-full px-3 py-2.5 rounded-xl text-xs border-2 focus:outline-none"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <textarea
            value={msgBody} onChange={e => setMsgBody(e.target.value)}
            placeholder={l === 'am' ? 'መልእክት መረጃ' : 'Message body'}
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl text-xs border-2 resize-none focus:outline-none"
            style={{ borderColor: 'var(--color-border)' }}
          />
          {msgResult && (
            <div className="px-3 py-2 rounded-xl text-xs font-bold" style={{
              background: msgResult.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: msgResult.ok ? 'var(--color-success-text)' : 'var(--color-danger-text)',
            }}>
              {msgResult.ok
                ? (l === 'am' ? `ተላክ {msgResult.sent}/${msgResult.total} ሱቍን` : `Sent to ${msgResult.sent}/${msgResult.total} shop`)
                : (l === 'am' ? `አልተሳከም: ${msgResult.error}` : `Failed: ${msgResult.error}`)}
            </div>
          )}
          <button
            onClick={handleSendTargeted}
            disabled={msgSending || !msgTitle || !msgBody}
            className="w-full py-2.5 rounded-xl text-xs font-bold min-h-[44px]"
            style={{
              background: msgSending || !msgTitle || !msgBody ? 'var(--color-bg-disabled)' : 'var(--color-primary)',
              color: msgSending || !msgTitle || !msgBody ? 'var(--color-text-soft)' : 'var(--color-bg-white)',
            }}
          >
            {msgSending ? '...' : (l === 'am' ? 'ላውድድር መላክ' : 'Send to This Shop')}
            </button>
          </div>
        </div>
    </>)}

      {tab === 'activity' && (<>
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{l === 'am' ? 'የእንቅስቃሴ መዝለያ' : 'ACTIVITY LOG'}</span>
          </div>
          <div className="px-4 py-3">
            {activityError && <div className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#b91c1c' }}>{activityError}</div>}
            {activityLoading ? (
              <div className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'በመጫን ላይ...' : 'Loading...'}</div>
            ) : (
              <div className="space-y-2">
                {violations.length > 0 && (
                  <div className="rounded-xl border p-3 mb-2" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }}>
                    <div className="flex items-center gap-1 text-xs font-bold text-red-800 mb-1"><AlertTriangle size={14} /> {l === 'am' ? `የተከለከሉ ሙከራዎች: ${violations.length}` : `${violations.length} blocked attempts`}</div>
                    <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'የፍተና ሙከራዎች ተገኝተዋል ነገር ግን ተከልክለዋል' : 'Permission probes detected but blocked by local policy.'}</div>
                  </div>
                )}
                {activity.length === 0 && violations.length === 0 && (
                  <div className="text-xs py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'ምንም እንቅስቃሴ የለም' : 'No activity recorded'}</div>
                )}
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-[11px] border-b pb-2" style={{ borderColor: 'var(--color-border-light)' }}>
                    <Activity size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{a.action}{a.entityType ? ` · ${a.entityType}` : ''}</div>
                      {a.details && <div className="opacity-70 truncate">{a.details}</div>}
                      <div className="opacity-60">{new Date(a.createdAt).toLocaleString()}{a.actorStaffMemberId ? ` · #${a.actorStaffMemberId}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </>)}

      {tab === 'tickets' && (<>
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{l === 'am' ? 'የዚህ ሱቅ ድጋፍ' : 'THIS SHOP’S SUPPORT'}</span>
          </div>
          <div className="p-3">
            <Suspense fallback={<div className="text-xs text-gray-400 py-4">Loading...</div>}>
              <SupportPanel isAdmin businessId={businessId} />
            </Suspense>
          </div>
        </div>
      </>)}

      {tab === 'comms' && shop?.comms && (<>
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{l === 'am' ? 'የመገናኛ ጤና' : 'COMMUNICATION HEALTH'}</span>
          </div>
          <div className="px-4 py-3 space-y-1">
            <CommsRow label={l === 'am' ? 'SMS (Ethio Telecom)' : 'SMS (Ethio Telecom)'} value={shop.comms.smsEnabled ? `${l === 'am' ? 'ይሰራል' : 'Enabled'} · ${shop.comms.smsUsed}/${shop.comms.smsLimit} ${l === 'am' ? 'የተጠቀመ' : 'used'}` : (l === 'am' ? 'ዝጋውነት' : 'Disabled')} tone={shop.comms.smsEnabled ? 'green' : 'amber'} />
            <CommsRow label={l === 'am' ? 'የባለቤት ቴሌግራም' : 'Owner Telegram'} value={shop.comms.ownerTelegramLinked ? (l === 'am' ? 'ተያይዟል' : 'Linked') : (l === 'am' ? 'አይያይዝም' : 'Not linked')} tone={shop.comms.ownerTelegramLinked ? 'green' : 'amber'} />
            <CommsRow label={l === 'am' ? 'የሰራተኛ ቴሌግራም' : 'Customer Telegram'} value={`${shop.comms.customerTelegramLinked}/${shop.comms.customerTelegramTotal} (${shop.comms.customerTelegramAdoption}%)`} tone={shop.comms.customerTelegramAdoption >= 30 ? 'green' : 'amber'} />
            <CommsRow label={l === 'am' ? 'የማስታወቂያ አልተሳካም' : 'Reminder delivery failures'} value={String(shop.comms.deliveryFailures)} tone={shop.comms.deliveryFailures > 0 ? 'red' : 'green'} />
            <div className="pt-2 text-[10px]" style={{ color: 'var(--color-text-soft)' }}>{l === 'am' ? 'SMS እና ቴሌግራም ማስታወሻዎች ለዚህ ሱቅ ይላካሉ።' : 'SMS & Telegram reminders are sent to this shop’s customers.'}</div>
          </div>
        </div>
      </>)}

      {tab === 'actions' && shop && (<>
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{l === 'am' ? 'የአስተዳዳሪ ሥራዎች' : 'ADMIN ACTIONS'}</span>
          </div>
          <div className="px-4 py-3 space-y-4">
            {/* Reset SMS quota */}
            <div>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>{l === 'am' ? 'የSMS ኛዎታ ዳግም ጀምር' : 'Reset SMS quota'}</div>
              <div className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'የወር የSMS ኛዎታ ወደ ዜሮ ይመለሳል።' : 'Resets this shop’s monthly SMS usage to zero.'}</div>
              <button onClick={handleResetQuota} disabled={resetBusy} className="w-full py-2.5 rounded-xl text-xs font-bold min-h-[44px] text-white" style={{ background: 'var(--color-primary)' }}>
                {resetBusy ? '...' : (l === 'am' ? 'ኛዎታ ዳግም ጀምር' : 'Reset quota')}
              </button>
              {resetResult && <div className="mt-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: resetResult.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: resetResult.ok ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>{resetResult.message}</div>}
            </div>

            {/* Nudge owner */}
            <div className="border-t pt-3" style={{ borderColor: 'var(--color-border-light)' }}>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>{l === 'am' ? 'ወደ ባለቤት ማስታወቂያ' : 'Reach owner'}</div>
              <div className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'በተያያዘ ቴሌግራም፣ ወይም SMS ወይም በእጅጉ ማጋሪያ ሊላክ ይችላል።' : 'Sends via linked Telegram, SMS fallback, or returns a manual link.'}</div>
              <textarea value={nudgeMsg} onChange={e => setNudgeMsg(e.target.value)} placeholder={l === 'am' ? 'አማራጭ መልእክት (ባዶ ልቀ)' : 'Optional message (leave blank for default)'} rows={3} className="w-full px-3 py-2.5 rounded-xl text-xs border-2 resize-none focus:outline-none" style={{ borderColor: 'var(--color-border)' }} />
              <button onClick={handleNudge} disabled={nudgeBusy} className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold min-h-[44px] text-white" style={{ background: 'var(--color-primary)' }}>
                {nudgeBusy ? '...' : (l === 'am' ? 'ላባለቤት ላክ' : 'Send to owner')}
              </button>
              {nudgeResult && (
                <div className="mt-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: nudgeResult.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: nudgeResult.ok ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                  {l === 'am' ? `ቻናል: ${nudgeResult.channel} · ${nudgeResult.status}` : `Channel: ${nudgeResult.channel} · ${nudgeResult.status}`}
                  {nudgeResult.detail ? ` — ${nudgeResult.detail}` : ''}
                  {nudgeResult.deepLink ? ` · ${nudgeResult.deepLink}` : ''}
                </div>
              )}
            </div>

            {/* Resend failed reminders */}
            <div className="border-t pt-3" style={{ borderColor: 'var(--color-border-light)' }}>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>{l === 'am' ? 'የእላቂ ማስታወሻዎችን እንደገና ላክ' : 'Resend failed reminders'}</div>
              <div className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'ለዚህ ሱቅ የተከለከሉ የመልእክት ማስታወሻዎችን እንደገና ይላካል።' : 'Re-sends Telegram/SMS to this shop’s customers whose last reminder failed.'}</div>
              <button onClick={handleResend} disabled={resendBusy} className="w-full py-2.5 rounded-xl text-xs font-bold min-h-[44px] text-white" style={{ background: 'var(--color-primary)' }}>
                {resendBusy ? '...' : (l === 'am' ? 'እንደገና ላክ' : 'Resend failed')}
              </button>
              {resendResult && (
                <div className="mt-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: resendResult.ok ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: resendResult.ok ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>
                  {resendResult.ok
                    ? (l === 'am' ? `ተራው: ${resendResult.scanned} · ተላከ: ${resendResult.sent} · አልተሳካም: ${resendResult.failed}` : `Scanned: ${resendResult.scanned} · Sent: ${resendResult.sent} · Failed: ${resendResult.failed}`)
                    : (resendResult.error || 'Failed')}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="border-t pt-3" style={{ borderColor: 'var(--color-border-light)' }}>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>{l === 'am' ? 'የአስተዳዳሪ ማስታወሻዎች' : 'Admin notes'}</div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={l === 'am' ? 'ማስታወሻ ይጻፉ...' : 'Write a private note...'} rows={2} className="w-full px-3 py-2.5 rounded-xl text-xs border-2 resize-none focus:outline-none" style={{ borderColor: 'var(--color-border)' }} />
              <button onClick={handleAddNote} disabled={noteBusy || !noteText.trim()} className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold min-h-[44px] text-white" style={{ background: (noteBusy || !noteText.trim()) ? 'var(--color-bg-disabled)' : 'var(--color-primary)', color: (noteBusy || !noteText.trim()) ? 'var(--color-text-soft)' : 'var(--color-bg-white)' }}>
                {noteBusy ? '...' : (l === 'am' ? 'ማስታወሻ ጨምር' : 'Add note')}
              </button>
              {noteError && <div className="mt-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>{noteError}</div>}
              <div className="mt-2 space-y-2">
                {(shop.notes || []).map(n => (
                  <div key={n.id} className="text-[11px] border-b pb-2" style={{ borderColor: 'var(--color-border-light)' }}>
                    <div className="opacity-70">{n.body}</div>
                    <div className="opacity-50">{new Date(n.createdAt).toLocaleString()}{n.adminPhone ? ` · ${n.adminPhone}` : ''}</div>
                  </div>
                ))}
                {(shop.notes || []).length === 0 && <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'ምንም ማስታወሻ የለም' : 'No notes yet'}</div>}
              </div>
            </div>

            {/* Outreach / action log */}
            <div className="border-t pt-3" style={{ borderColor: 'var(--color-border-light)' }}>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text)' }}>{l === 'am' ? 'የክኢያ መዝለያ' : 'OUTREACH LOG'}</div>
              <div className="space-y-2">
                {(shop.log || []).map(ev => (
                  <div key={ev.id} className="text-[11px] border-b pb-2" style={{ borderColor: 'var(--color-border-light)' }}>
                    <div className="font-bold">{ev.title || ev.type}{ev.channel ? ` · ${ev.channel}` : ''}{ev.status ? ` · ${ev.status}` : ''}</div>
                    {ev.body && <div className="opacity-70 truncate">{ev.body}</div>}
                    <div className="opacity-50">{new Date(ev.createdAt).toLocaleString()}</div>
                  </div>
                ))}
                {(shop.log || []).length === 0 && <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{l === 'am' ? 'ምንም ክኢያ የለም' : 'No outreach yet'}</div>}
              </div>
            </div>
          </div>
        </div>
      </>)}

    </div>
  );
}
