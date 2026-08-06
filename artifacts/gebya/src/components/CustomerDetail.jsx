// CustomerDetail.jsx — simplified credit detail page
//
// Layout (top → bottom):
//   1. Dark header band       · back + photo/avatar + name + phone + status pill
//   2. Quick Actions          · Call + SMS + Telegram (three-button row)
//   3. Balance block (sticky) · owes me + days late + on-time/entries/due stats
//   4. Promise to pay         · inline date picker form
//   5. History                · grouped by date with left border stripe + chevron
//   6. Trust line             · 🔒 Backed up securely. Amounts auto-hide for privacy.
//
// Touch targets ≥44px · privacy mode · Ethiopian calendar.

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, MessageCircle, MessageSquare, Pencil, Phone, Wallet, X, ArrowRightLength,
} from 'lucide-react';
import { fmt } from '../utils/numformat';
import { toTelUrl, isValidEthiopianPhone } from '../utils/phoneNumber';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';
import { getCreditAllocationStatus, getPaymentSettlementCount } from '../utils/customerLedgerMutations';
import { useLang } from '../context/LangContext';
import CustomerReminderHistory from './CustomerReminderHistory';

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── helpers ──────────────────────────────────────────────────────────
function initialsOf(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function telegramState(customer) {
  if (customer?.telegram_chat_id) return 'linked';
  if (customer?.telegram_username) return 'manual';
  return 'none';
}

// ─── component ────────────────────────────────────────────────────────
function CustomerDetail({
  customer,
  shopName,
  onBack,
  onAddCredit,
  onRecordPayment,
  onMarkFullyPaid,
  onToggleTelegramNotify,   // kept for compatibility, surfaced inside the TG block
  onOpenTelegramConnect,
  onResendTelegramUpdate,
  onRemind,
  onSmsCustomer,                // NEW · open ReminderSheet with SMS pre-selected
  onEditCustomer,              // Commit C.2 · Edit customer (name/phone/Telegram/photo)
  onSelectTransaction,         // NEW · tap transaction row → open detail sheet
  onTransfer,                  // NEW · transfer dube to another customer
  onArchiveCustomer,           // Archive / restore customer
  onRecordPromise,             // Record promise-to-pay date
  onClearPromise,              // Clear promise-to-pay
  isOnline = true,
  isSlowConnection = false,
}) {
  const { t, lang } = useLang();

  if (!customer) return null;

  const balance = Number(customer.balance || 0);
  const hasBalance = balance > 0;
  const tg = telegramState(customer);
  const initials = initialsOf(customer.display_name);

  // ─── Telegram link sub-state (from existing fields) ──────────────────
  const hasLinkedBorrower = !!customer.telegram_chat_id;
  const hasManualTelegram = !!customer.telegram_username;
  const hasPendingLink = !hasLinkedBorrower && !!customer.telegram_link_requested_at;
  const isTelegramNotifyEnabled = hasLinkedBorrower && customer.telegram_notify_enabled;

  // ─── Sticky balance collapse state ──────────────────────────────────
  const [isBalanceCollapsed, setIsBalanceCollapsed] = useState(false);

  // ─── Promise form state ─────────────────────────────────────────────
  const [showPromiseForm, setShowPromiseForm] = useState(false);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseNote, setPromiseNote] = useState('');

  // ─── Archive confirmation state ────────────────────────────────────
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // ─── History rows with running balance + settlement breadcrumb ───────
  const historyRows = useMemo(() => {
    let runningBalance = balance;
    return (customer.transactions || []).map((item) => {
      const balanceAfter = runningBalance;
      runningBalance = item.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT
        ? runningBalance + Number(item.amount || 0)
        : runningBalance - Number(item.amount || 0);
      return { ...item, balance_after: balanceAfter };
    });
  }, [customer.transactions, balance]);

  // ─── Sticky balance scroll handler ──────────────────────────────────
  useEffect(() => {
    const scrollable = document.getElementById('scrollable');
    if (!scrollable) return;

    const handleScroll = () => {
      setIsBalanceCollapsed(scrollable.scrollTop > 30);
    };

    scrollable.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollable.removeEventListener('scroll', handleScroll);
  }, []);

  // ─── Promise handlers ───────────────────────────────────────────────
  const handleRecordPromise = () => {
    if (!promiseDate) return;
    const parsed = new Date(promiseDate + 'T23:59:59').getTime();
    if (isNaN(parsed)) return;
    onRecordPromise?.(customer.id, parsed, promiseNote);
    setShowPromiseForm(false);
    setPromiseDate('');
    setPromiseNote('');
  };

  const handleCancelPromise = () => {
    setShowPromiseForm(false);
    setPromiseDate('');
    setPromiseNote('');
  };

  // ─── Archive handler ────────────────────────────────────────────────
  const handleArchive = () => {
    onArchiveCustomer?.(customer);
    setShowArchiveConfirm(false);
  };

  // ─── render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-3" style={{ paddingBottom: 16 }}>

      {/* ═══ 1. DARK HEADER BAND · compact (~80px) ══════════════════════════════════════════ */}
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 100%)',
          color: 'var(--color-bg-white)',
          padding: '8px 14px 12px',
          marginLeft: -12, marginRight: -12, marginTop: -12,
        }}
      >
        {/* Top row: back link + status pill on the right (so they share one line) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            type="button"
            onClick={onBack}
            className="press-scale"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', color: 'var(--color-bg-white)',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', padding: '8px 10px',
              minHeight: 44, minWidth: 44,
              borderRadius: 8,
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{lang === 'am' ? 'ተመለስ · ደንበኞች' : 'Back · Customers'}</span>
          </button>
        </div>

        {/* Identity row — avatar 44 + name + phone/entries one line.
            Commit C.5: When there's no photo, the avatar becomes a tappable
            button that opens the edit form so the shopkeeper can add a photo
            retroactively. Subtle 📷 hint badge nudges discovery. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          {customer.photo ? (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              position: 'relative', flexShrink: 0, overflow: 'hidden',
            }}>
              <img src={customer.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <button
                type="button"
                onClick={() => onEditCustomer?.(customer)}
                aria-label={t.addPhoto}
                className="press-scale"
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  position: 'relative', flexShrink: 0, overflow: 'hidden',
                  border: '2px dashed rgba(255,255,255,0.35)',
                  background: 'var(--color-primary)',
                  padding: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-bg-white)', fontSize: '1rem', fontWeight: 800,
                }}
              >
                {initials}
                {/* 📷 hint badge — bottom-right, signals tap-to-add */}
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem',
                  color: 'var(--color-text)',
                }}>📷</span>
              </button>
              <span style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-soft)',
                fontWeight: 600,
              }}>
                {t.addPhoto}
              </span>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.15 }}>
              {customer.display_name}
            </p>
            {/* Identity line: phone (or Telegram if no phone) — dropped redundant
                "N entries" since OWES ME card shows the same. Commit C.1 polish. */}
            <p style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {customer.phone_number ? (
                <a
                  href={`tel:${customer.phone_number}`}
                  style={{ color: 'var(--color-bg-white)', textDecoration: 'none' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  📞 {customer.phone_number}
                </a>
              ) : customer.telegram_username ? (
                <span>💬 @{customer.telegram_username}</span>
              ) : (
                <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                  {lang === 'am' ? 'ስልክ ወይም ቴሌግራም የለም' : 'No phone or Telegram'}
                </span>
              )}
            </p>
          </div>

          {/* Edit and Transfer buttons — moved beside customer name (Requirement #4) */}
          {onEditCustomer && (
            <button
              type="button"
              onClick={() => onEditCustomer(customer)}
              className="press-scale"
              aria-label={lang === 'am' ? 'አስተካክል' : 'Edit customer'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--color-bg-white)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onTransfer && (
            <button
              type="button"
              onClick={() => onTransfer(customer)}
              className="press-scale"
              aria-label={lang === 'am' ? 'ዱቤ ያስተላልፉ' : 'Transfer credit'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--color-bg-white)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══ 2. QUICK ACTIONS · Call + SMS + Telegram ═══ */}
      <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
        {isValidEthiopianPhone(customer.phone_number) && (
          <a
            href={toTelUrl(customer.phone_number)}
            className="press-scale"
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 10,
              padding: '10px 0',
              color: 'var(--color-success-text)',
              fontWeight: 700,
              fontSize: '0.78rem',
              textDecoration: 'none',
              minHeight: 44,
            }}
          >
            <Phone className="w-4 h-4" />
            {lang === 'am' ? 'ጥሪ' : 'Call'}
          </a>
        )}
        {isValidEthiopianPhone(customer.phone_number) && (
          <button
            type="button"
            onClick={() => onSmsCustomer?.(customer)}
            className="press-scale"
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'var(--color-info-bg)',
              border: '1px solid var(--color-info-border)',
              borderRadius: 10,
              padding: '10px 0',
              color: 'var(--color-info)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            <MessageSquare className="w-4 h-4" />
            SMS
          </button>
        )}
        <button
          type="button"
          onClick={onOpenTelegramConnect}
          className="press-scale"
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: tg === 'linked' ? 'var(--color-success-bg)' : tg === 'manual' ? 'var(--color-warning-bg)' : 'var(--color-bg-white)',
            border: `1px solid ${tg === 'linked' ? 'var(--color-success-border)' : tg === 'manual' ? 'var(--color-warning-border)' : 'var(--color-border)'}`,
            borderRadius: 10,
            padding: '10px 0',
            color: tg === 'linked' ? 'var(--color-success-text)' : tg === 'manual' ? 'var(--color-warning)' : 'var(--color-text)',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            minHeight: 44,
            position: 'relative',
          }}
        >
          <MessageCircle className="w-4 h-4" />
          {tg === 'linked'
            ? (lang === 'am' ? 'ተገናኝቷል' : 'Linked')
            : tg === 'manual'
              ? (lang === 'am' ? 'ቴሌግራም' : 'Telegram')
              : (lang === 'am' ? 'አገናኝ' : 'Connect')}
          {tg === 'linked' && onResendTelegramUpdate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResendTelegramUpdate?.();
              }}
              style={{
                position: 'absolute',
                top: 4,
                right: 6,
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '0.65rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              {lang === 'am' ? 'እንደገና ላክ' : 'Resend'}
            </button>
          )}
        </button>
      </div>

      {/* ═══ 3. BALANCE BLOCK (Sticky) ══════════════════════════════════════════ */}
      <div
        id="balanceBlock"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: isBalanceCollapsed ? '10px 14px' : 14,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          transition: 'padding 160ms ease',
        }}
      >
        {isBalanceCollapsed ? (
          /* Collapsed state */
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(customer.has_overdue && customer.overdue_days > 0) && (
              <span style={{
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger-text)',
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: '0.62rem',
                fontWeight: 800,
                flexShrink: 0,
              }}>
                {customer.overdue_days}d
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                color: customer.has_overdue ? 'var(--color-danger)' : hasBalance ? 'var(--color-accent-amber)' : 'var(--color-text-soft)',
                fontSize: '1.1rem',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {fmt(balance)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-soft)' }}>{lang === 'am' ? 'ብር' : 'birr'}</span>
              </p>
            </div>
            {hasBalance && onMarkFullyPaid && (
              <button
                type="button"
                onClick={() => onMarkFullyPaid(customer)}
                className="press-scale"
                style={{
                  padding: '4px 12px',
                  background: 'var(--color-primary)',
                  color: 'var(--color-bg-white)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: 32,
                }}
              >
                {lang === 'am' ? 'ክፍል' : 'Pay'}
              </button>
            )}
          </div>
        ) : (
          /* Expanded state */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              {/* Prominent OVERDUE badge above the amount — Commit C.1 polish. */}
              {customer.has_overdue && customer.overdue_days > 0 && (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'var(--color-danger)', color: 'var(--color-bg-white)',
                    fontSize: '0.62rem', fontWeight: 800,
                    padding: '3px 8px', borderRadius: 999,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    marginBottom: 5,
                  }}
                >
                  🔴 {customer.overdue_days}{lang === 'am' ? 'ቀን ያለፈው' : 'd overdue'}
                </span>
              )}
              <p style={{
                fontSize: '0.6rem', fontWeight: 800,
                color: 'var(--color-text-soft)', letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
                {lang === 'am' ? 'ለእኔ ይከፍላሉ' : 'Owes me'}
              </p>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '1.85rem', fontWeight: 800,
                color: customer.has_overdue ? 'var(--color-danger)' : hasBalance ? 'var(--color-accent-amber)' : 'var(--color-text-soft)',
                lineHeight: 1, marginTop: 4,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmt(balance)}
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-soft)', marginLeft: 4 }}>
                  {lang === 'am' ? 'ብር' : 'birr'}
                </span>
              </p>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
              gap: 4, fontSize: '0.7rem', color: 'var(--color-text-muted)',
            }}>
              <span>
                <strong style={{ color: 'var(--color-text)', fontWeight: 700 }}>{customer.transaction_count || 0}</strong>{' '}
                {lang === 'am' ? 'መዝገብ' : 'entries'}
              </span>
              {/* On-time rate as a percentage when there's enough data — clearer
                  than "0/1" fraction notation. Commit C.1 polish. */}
              {customer.on_time_eligible > 0 && (() => {
                const pct = Math.round((customer.on_time_count / customer.on_time_eligible) * 100);
                const pctColor = pct >= 80 ? 'var(--color-success-text)' : pct >= 50 ? 'var(--color-accent-amber)' : 'var(--color-danger)';
                return (
                  <span>
                    <strong style={{ color: pctColor, fontWeight: 700 }}>
                      {pct}%
                    </strong>{' '}
                    {lang === 'am' ? 'በወቅቱ' : 'on time'}
                    <span style={{ color: 'var(--color-text-soft)', marginLeft: 3, fontSize: '0.62rem' }}>
                      ({customer.on_time_count}/{customer.on_time_eligible})
                    </span>
                  </span>
                );
              })()}
              {customer.avg_pay_days !== null && customer.avg_pay_days !== undefined && (
                <span>
                  {lang === 'am' ? 'አማካይ ክፍያ' : 'Avg pay'}:{' '}
                  <strong style={{ color: 'var(--color-text)', fontWeight: 700 }}>{customer.avg_pay_days}d</strong>
                </span>
              )}
              {customer.latest_due_date && (
                <span>
                  {lang === 'am' ? 'መጨረሻ ቀን' : 'Due'}:{' '}
                  <strong style={{ color: 'var(--color-text)', fontWeight: 700 }}>
                    {formatEthiopian(customer.latest_due_date)}
                  </strong>
                </span>
              )}
            </div>
            {/* Mark Fully Paid button — single tap, no confirmation. Opens payment sheet pre-filled with full balance. */}
            {hasBalance && onMarkFullyPaid && (
              <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => onMarkFullyPaid(customer)}
                  className="press-scale"
                  style={{
                    width: '100%', padding: '12px',
                    background: 'var(--color-primary)', color: 'var(--color-bg-white)',
                    border: 'none', borderRadius: 10,
                    fontSize: '0.82rem', fontWeight: 800,
                    cursor: 'pointer', minHeight: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <Wallet className="w-4 h-4" />
                  {lang === 'am' ? `ሁሉንም ይክፈሉ · ${fmt(balance)} ብር` : `Mark Fully Paid · ${fmt(balance)} birr`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 4. PROMISE TO PAY ═══════════════════════════════════════════ */}
      {onRecordPromise && (
      <div style={{ padding: '8px 14px' }}>
          {(() => {
            const promiseDate = customer.promised_pay_date;
            const now = Date.now();
            const isMissed = promiseDate && promiseDate < now;
            const isToday = promiseDate && Math.abs(promiseDate - now) < 86400000;

            if (promiseDate) {
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: isMissed ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                  border: `1px solid ${isMissed ? 'var(--color-danger-border)' : 'var(--color-warning-border)'}`,
                }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 600,
                    color: isMissed ? 'var(--color-danger-text)' : 'var(--color-warning)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    📅 {isMissed
                      ? (lang === 'am'
                        ? `የጠበቀው ቀን አልፏል — ${formatEthiopian(promiseDate)}`
                        : `Missed promise — was due ${formatEthiopian(promiseDate)}`)
                      : isToday
                        ? (lang === 'am' ? 'ዛሬ ይከፍላል ብሏል' : 'Promised to pay today')
                        : (lang === 'am'
                          ? `እስከ ${formatEthiopian(promiseDate)} ይከፍላል ብሏል`
                          : `Promised to pay by ${formatEthiopian(promiseDate)}`)}
                    {customer.promise_note && (
                      <span style={{ fontWeight: 400, opacity: 0.8 }}>
                        — {customer.promise_note}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onClearPromise(customer.id)}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)',
                      cursor: 'pointer', padding: '4px 8px',
                    }}
                  >
                    {lang === 'am' ? 'አስወግድ' : 'Clear'}
                  </button>
                </div>
              );
            }

            if (!showPromiseForm) {
              return (
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowPromiseForm(true)}
                    style={{
                      background: 'none', border: '1px dashed var(--color-text-soft)',
                      borderRadius: 8, padding: '8px 14px',
                      fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-soft)',
                      cursor: 'pointer',
                    }}
                  >
                    📅 {lang === 'am' ? 'የተስፋፉበትን ቀን ይመዝግቡ' : 'Record Promise'}
                  </button>
                </div>
              );
            }

            return (
              <div style={{
                padding: 14,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                  📅 {lang === 'am' ? 'የተስፋፉበትን ቀን ይመዝግቡ' : 'Record Promise to Pay'}
                </p>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    color: 'var(--color-text)',
                    background: 'var(--color-bg-white)',
                  }}
                />
                <input
                  type="text"
                  value={promiseNote}
                  onChange={(e) => setPromiseNote(e.target.value)}
                  placeholder={t.promiseNote}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    color: 'var(--color-text)',
                    background: 'var(--color-bg-white)',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCancelPromise}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'var(--color-surface-muted)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleRecordPromise}
                    disabled={!promiseDate}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'var(--color-primary)',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--color-bg-white)',
                      cursor: promiseDate ? 'pointer' : 'not-allowed',
                      opacity: promiseDate ? 1 : 0.5,
                      minHeight: 44,
                    }}
                  >
                    {t.saveChanges}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══ 5. REMINDER HISTORY (collapsible) ═══════════════════════════════ */}
      {customer.has_overdue && (
        <CustomerReminderHistory
          customerId={customer.id || customer.customer_id}
          shopId={customer.shop_id || customer.business_id}
          lang={lang}
          onResend={() => onRemind?.(customer)}
        />
      )}

      {/* ═══ 6. HISTORY ══════════════════════════════════════════ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--color-text-soft)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {lang === 'am' ? 'መዝገብ' : 'History'} · {historyRows.length} {lang === 'am' ? 'መዝገብ' : 'entries'}
          </p>
          {/* Commit P: stronger discoverability hint for edit/delete */}
          <p
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              background: 'var(--color-surface-muted)',
              color: 'var(--color-warning)',
              padding: '2px 8px',
              borderRadius: 999,
              border: '1px solid var(--color-border)',
            }}
          >
            {lang === 'am' ? 'ለማስተካከል ⋮ ይንኩ ወይም ይዘմልኩ' : '⋮ or long-press to edit'}
          </p>
        </div>

        {historyRows.length === 0 ? (
          <div style={{
            padding: 24,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-soft)' }}>
              {lang === 'am' ? 'መዝገብ የለም' : 'No entries yet'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
              {lang === 'am' ? 'ለመጀመር ዱቤ ይጨምሩ' : 'Tap + Credit to start'}
            </p>
          </div>
        ) : (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Commit C.5: Same-day grouping. We emit a sticky-style date
                header whenever the row's date changes from the previous row.
                Reduces visual noise when many entries share a date. */}
            {(() => {
              const elements = [];
              let lastDate = null;
              historyRows.forEach((tx, idx) => {
                const txDate = formatEthiopian(tx.created_at);
                if (txDate !== lastDate) {
                  // Count how many entries are on this same date
                  const sameDayCount = historyRows.filter(
                    r => formatEthiopian(r.created_at) === txDate
                  ).length;
                  elements.push(
                    <div
                      key={`date_${txDate}_${idx}`}
                      style={{
                        background: 'var(--color-surface-soft)',
                        borderTop: idx === 0 ? 'none' : '1px solid var(--color-surface-muted)',
                        borderBottom: '1px solid var(--color-surface-muted)',
                        padding: '6px 14px',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>📅 {txDate}</span>
                      {sameDayCount > 1 && (
                        <span style={{ color: 'var(--color-text-soft)', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                          {sameDayCount} {lang === 'am' ? 'መዝገብ' : 'entries'}
                        </span>
                      )}
                    </div>
                  );
                  lastDate = txDate;
                }
                elements.push(
                  <HistoryRow
                    key={tx.id || idx}
                    tx={tx}
                    isLast={idx === historyRows.length - 1}
                    lang={lang}
                    onSelectTransaction={onSelectTransaction}
                  />
                );
              });
              return elements;
            })()}
          </div>
        )}
      </div>

      {/* ═══ 7. TRUST LINE ══════════════════════════════════════════ */}
      <p style={{
        textAlign: 'center', fontSize: '0.66rem', color: 'var(--color-text-soft)',
        padding: '8px 14px 4px',
      }}>
        🔒 {lang === 'am'
          ? 'በደህንነት ይቀመጣል። መጠኖች በራስ ሰር ይደብቃሉ።'
          : 'Backed up securely. Amounts auto-hide for privacy.'}
      </p>

      {/* ═══ 8. ARCHIVE / RESTORE ═══════════════════════════════════ */}
      {onArchiveCustomer && (
        <div style={{ textAlign: 'center', padding: '4px 14px 12px' }}>
          {showArchiveConfirm ? (
            <div style={{
              padding: 14,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
                {lang === 'am'
                  ? `"${customer.display_name}" አርክስ?${hasBalance ? ` ይህ ደንበኛ ${fmt(balance)} ብር ዕዳ አለበት።` : ''}`
                  : `Archive "${customer.display_name}"?${hasBalance ? ` This customer has ${fmt(balance)} birr outstanding.` : ''}`}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>
                {lang === 'am'
                  ? 'የአርክስ መዝገቦች ለታሪክ ይቀመጣሉ።'
                  : 'Archived records are preserved for history.'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowArchiveConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--color-surface-muted)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--color-danger)',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--color-bg-white)',
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  {lang === 'am' ? 'አርክስ' : 'Archive'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.7rem',
                color: customer.archived_at ? 'var(--color-success-text)' : 'var(--color-text-soft)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 8,
                opacity: 0.7,
              }}
            >
              {customer.archived_at
                ? (lang === 'am' ? 'መልስ' : 'Restore')
                : (lang === 'am' ? 'አርክስ' : 'Archive')}
            </button>
          )}
        </div>
      )}

      {/* ═══ 9. BOTTOM ACTION BAR ══════════════════════════════════════════ */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        display: 'flex',
        gap: 10,
        padding: '12px 14px 18px',
        background: 'linear-gradient(180deg, rgba(245,246,242,0) 0%, var(--color-bg) 35%)',
        marginTop: 10,
      }}>
        <button
          type="button"
          onClick={() => onAddCredit?.(customer)}
          className="press-scale"
          style={{
            flex: 1,
            height: 48,
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            fontSize: '0.82rem',
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          ↑ {t.youGave}
        </button>
        <button
          type="button"
          onClick={() => onRecordPayment?.(customer)}
          className="press-scale"
          style={{
            flex: 1,
            height: 48,
            borderRadius: 10,
            border: '1px solid var(--color-border)',
            background: 'var(--color-primary)',
            color: 'var(--color-bg-white)',
            fontSize: '0.82rem',
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          ↓ {t.youGot}
        </button>
      </div>
    </div>
  );
}

// ─── Simplified History row — date + description + amount + chevron ──
function HistoryRow({ tx, isLast, lang, onSelectTransaction }) {
  const isPayment = tx.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT;
  const isCredit = tx.type === CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD;

  const amountColor = isPayment ? 'var(--color-success-text)' : 'var(--color-accent-amber)';
  const sign = isPayment ? '−' : '+';
  const borderColor = isPayment ? 'var(--color-success-text)' : 'var(--color-accent-amber)';

  const allocationStatus = isCredit ? getCreditAllocationStatus(tx) : null;
  const settlement = isPayment ? getPaymentSettlementCount(tx) : null;

  const statusBadge = (() => {
    if (allocationStatus === 'paid') {
      return (
        <span style={{
          fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.03em',
          background: 'var(--color-success-bg)', color: 'var(--color-success-text)',
          padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
        }}>
          ✓ {lang === 'am' ? 'ተከፍሏል' : 'Paid'}
        </span>
      );
    }
    if (allocationStatus === 'partial') {
      const creditAmount = Number(tx.amount) || 0;
      const paid = Number(tx.paid_amount) || 0;
      return (
        <span style={{
          fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.03em',
          background: 'var(--color-warning-bg)', color: 'var(--color-warning)',
          padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
        }}>
          {fmt(paid)}/{fmt(creditAmount)}
        </span>
      );
    }
    if (settlement && settlement.settledCount > 0) {
      return (
        <span style={{
          fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.03em',
          background: 'var(--color-info-bg)', color: 'var(--color-info)',
          padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
        }}>
          ✓ {lang === 'am'
            ? `${settlement.settledCount} ተከፍሏል`
            : `Settled ${settlement.settledCount}`}
        </span>
      );
    }
    return null;
  })();

  return (
    <div
      onClick={() => onSelectTransaction?.(tx)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelectTransaction?.(tx); }}
      style={{
        padding: '12px 14px',
        background: 'var(--color-surface)',
        borderBottom: isLast ? 'none' : '1px solid var(--color-surface-muted)',
        borderLeft: `3px solid ${borderColor}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        minHeight: 48,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {/* Compact date */}
        <span style={{
          fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatEthiopian(tx.created_at)}
        </span>
        {/* Description + status badge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {tx.item_note || (isPayment
              ? (lang === 'am' ? 'ክፍያ' : 'Payment')
              : isCredit
                ? (lang === 'am' ? 'ዱቤ' : 'Credit')
                : (lang === 'am' ? 'ሰርዝ' : 'Reversal'))}
          </span>
          {statusBadge && (
            <span>{statusBadge}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Amount */}
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.88rem', fontWeight: 700,
          color: amountColor,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {sign}{fmt(tx.amount || 0)}
        </span>
        {/* Chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}

export default CustomerDetail;