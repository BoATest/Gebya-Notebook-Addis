// CustomerDetail.jsx — credit detail page (Interactive Design v2)
//
// Layout (top → bottom):
//   1. White header          · back + status pill + avatar/name/phone + edit/transfer
//   2. Balance block (sticky)· owes me + stats + mark fully paid
//   3. Quick Actions         · Call + SMS + Telegram (three-button row)
//   4. Promise to pay        · inline date picker form
//   5. History               · search + filter + grouped by date with left border stripe
//   6. Trust line            · 🔒 Backed up securely. Amounts auto-hide for privacy.
//   7. Bottom action bar     · You gave / You got (fixed to bottom)
//
// Touch targets ≥44px · privacy mode · Ethiopian calendar.

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, MessageSquare, Pencil, Phone, Wallet, Search, X, ArrowRightLeft,
} from 'lucide-react';
import { fmt } from '../utils/numformat';
import { toTelUrl, isValidEthiopianPhone } from '../utils/phoneNumber';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { CUSTOMER_TRANSACTION_TYPES } from '../utils/customerTransactionTypes';
import { getCreditAllocationStatus, getPaymentSettlementCount } from '../utils/customerLedgerMutations';
import { useLang } from '../context/LangContext';
import CustomerReminderHistory from './CustomerReminderHistory';
import { TransactionRow, transactionLabel, transactionStatusBadge } from '@/components/TransactionRow';

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Telegram SVG logo ────────────────────────────────────────────────
function TelegramIcon({ className, style }) {
  return (
    <svg
      className={className}
      style={style}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}

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
  onToggleTelegramNotify,
  onOpenTelegramConnect,
  onResendTelegramUpdate,
  onRemind,
  onSmsCustomer,
  onEditCustomer,
  onSelectTransaction,
  onTransfer,
  onArchiveCustomer,
  onRecordPromise,
  onClearPromise,
  isOnline = true,
  isSlowConnection = false,
}) {
  const { t, lang } = useLang();

  if (!customer) return null;

  const balance = Number(customer.balance || 0);
  const hasBalance = balance > 0;
  const tg = telegramState(customer);
  const initials = initialsOf(customer.display_name);
  const isSettled = !hasBalance && (customer.transaction_count || 0) > 0;

  // ─── Telegram link sub-state ────────────────────────────────────────
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

  // ─── Search & Filter state ──────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'credit' | 'pay'

  // ─── Success overlay state ──────────────────────────────────────────
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

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

  // ─── Filtered history rows ──────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = historyRows;
    if (filterType !== 'all') {
      rows = rows.filter(tx => {
        if (filterType === 'credit') return tx.type === CUSTOMER_TRANSACTION_TYPES.CREDIT_ADD;
        if (filterType === 'pay') return tx.type === CUSTOMER_TRANSACTION_TYPES.PAYMENT;
        return true;
      });
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(tx => (tx.item_note || '').toLowerCase().includes(term));
    }
    return rows;
  }, [historyRows, filterType, searchTerm]);

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

  // ─── Mark fully paid handler (with success overlay) ─────────────────
  const handleMarkFullyPaid = () => {
    setShowSuccessOverlay(true);
    setTimeout(() => {
      setShowSuccessOverlay(false);
      onMarkFullyPaid?.(customer);
    }, 1500);
  };

  // ─── render ──────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 0, position: 'relative' }}>

      {/* ═══════════════════════════════════════════════════════════════
          1. WHITE HEADER · back + status pill + identity + edit/transfer
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#FFFFFF',
        color: '#171a17',
        padding: '8px 14px 12px',
        borderBottom: '1px solid #e4e6df',
      }}>
        {/* Top row: back button + status pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <button
            type="button"
            onClick={onBack}
            className="press-scale"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', color: '#171a17',
              fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', padding: '8px 10px',
              minHeight: 44, minWidth: 44,
              borderRadius: 8,
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{lang === 'am' ? 'ተመለስ · ደንበኞች' : 'Back · Customers'}</span>
          </button>

          {/* Status Pill — single source of truth for overdue state */}
          {(customer.has_overdue && customer.overdue_days > 0) && (
            <span style={{
              background: '#f5e7e1', color: '#a0402a',
              padding: '4px 10px', borderRadius: 999,
              fontSize: '0.62rem', fontWeight: 800,
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              {customer.overdue_days}{lang === 'am' ? 'ቀን ያለፈው' : 'd OVERDUE'}
            </span>
          )}
          {isSettled && (
            <span style={{
              background: '#e7f0e9', color: '#2e6a47',
              padding: '4px 10px', borderRadius: 999,
              fontSize: '0.62rem', fontWeight: 800,
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              {lang === 'am' ? 'ተከፍሏል' : 'SETTLED'}
            </span>
          )}
          {customer.promised_pay_date && customer.promised_pay_date > Date.now() && !isSettled && (
            <span style={{
              background: '#f9eed4', color: '#7a5416',
              padding: '4px 10px', borderRadius: 999,
              fontSize: '0.62rem', fontWeight: 800,
              letterSpacing: '0.04em',
              flexShrink: 0,
            }}>
              {lang === 'am' ? 'ተስፋፎ' : 'PROMISE'}
            </span>
          )}
        </div>

        {/* Identity row — avatar + name + phone + edit/transfer */}
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
                  border: '2px dashed #e4e6df',
                  background: '#1b4332',
                  padding: 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '1rem', fontWeight: 800,
                }}
              >
                {initials}
                <span style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff',
                  border: '1.5px solid #171a17',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem',
                }}>📷</span>
              </button>
              <span style={{
                fontSize: '0.6875rem',
                color: '#8b9086',
                fontWeight: 600,
              }}>
                {t.addPhoto}
              </span>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
              {customer.display_name}
            </p>
            <p style={{ fontSize: '0.7rem', color: '#5b6158', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap', margin: 0 }}>
              {customer.phone_number ? (
                <a
                  href={`tel:${customer.phone_number}`}
                  style={{ color: '#5b6158', textDecoration: 'none' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  📞 {customer.phone_number}
                </a>
              ) : customer.telegram_username ? (
                <span>💬 @{customer.telegram_username}</span>
              ) : (
                <span style={{ fontStyle: 'italic', color: '#8b9086' }}>
                  {lang === 'am' ? 'ስልክ ወይም ቴሌግራም የለም' : 'No phone or Telegram'}
                </span>
              )}
            </p>
          </div>

          {/* Edit and Transfer buttons */}
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
                background: '#f5f6f2',
                border: 'none',
                color: '#5b6158',
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
                background: '#f5f6f2',
                border: 'none',
                color: '#5b6158',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          COMPACT STICKY HEADER — shows when scrolled past main header
          ═══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 15,
          background: '#fff',
          borderBottom: isBalanceCollapsed ? '1px solid #e4e6df' : 'none',
          padding: isBalanceCollapsed ? '10px 14px' : '0',
          display: 'flex',
          alignItems: 'center',
          gap: isBalanceCollapsed ? 10 : 0,
          opacity: isBalanceCollapsed ? 1 : 0,
          pointerEvents: isBalanceCollapsed ? 'auto' : 'none',
          height: isBalanceCollapsed ? 'auto' : 0,
          overflow: 'hidden',
          transition: 'opacity 0.2s ease, padding 0.2s ease, height 0.2s ease',
        }}
      >
        {/* Small avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#1b4332', color: '#fff',
          fontSize: '0.7rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {initials}
        </div>
        {/* Name + balance */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '0.85rem', fontWeight: 700, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {customer.display_name}
          </p>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.75rem', fontWeight: 700,
            color: isSettled ? '#2e6a47' : '#a0402a',
            margin: 0,
          }}>
            {fmt(balance)} <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#8b9086' }}>{lang === 'am' ? 'ብር' : 'birr'}</span>
          </p>
        </div>
        {/* Status pill */}
        {(customer.has_overdue && customer.overdue_days > 0) && (
          <span style={{
            background: '#f5e7e1', color: '#a0402a',
            padding: '3px 8px', borderRadius: 999,
            fontSize: '0.58rem', fontWeight: 800,
            flexShrink: 0,
          }}>
            {customer.overdue_days}d
          </span>
        )}
        {isSettled && (
          <span style={{
            background: '#e7f0e9', color: '#2e6a47',
            padding: '3px 8px', borderRadius: 999,
            fontSize: '0.58rem', fontWeight: 800,
            flexShrink: 0,
          }}>
            ✓
          </span>
        )}
      </div>
      <div
        id="balanceBlock"
        style={{
          background: '#f5f6f2',
          padding: isBalanceCollapsed ? '10px 14px' : '8px 14px 14px',
          position: 'sticky',
          top: isBalanceCollapsed ? 52 : 0,
          zIndex: 10,
          transition: 'all 0.3s ease',
          boxShadow: isBalanceCollapsed ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
          display: isBalanceCollapsed ? 'flex' : 'block',
          alignItems: isBalanceCollapsed ? 'center' : undefined,
          justifyContent: isBalanceCollapsed ? 'space-between' : undefined,
          gap: isBalanceCollapsed ? 12 : undefined,
        }}
      >
        {isBalanceCollapsed ? (
          /* Collapsed state */
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 800,
                color: '#8b9086', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                {isSettled
                  ? (lang === 'am' ? 'ተከፍሏል' : 'Settled')
                  : (lang === 'am' ? 'ለእኔ ይከፍላሉ' : 'Owes me')}
              </span>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                color: isSettled ? '#2e6a47' : hasBalance ? '#a0402a' : '#8b9086',
                fontSize: '1.2rem',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'all 0.3s ease',
              }}>
                {fmt(balance)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b9086' }}>{lang === 'am' ? 'ብር' : 'birr'}</span>
              </p>
            </div>
            {hasBalance && onMarkFullyPaid && (
              <button
                type="button"
                onClick={handleMarkFullyPaid}
                className="press-scale"
                style={{
                  padding: '8px 14px',
                  background: '#1b4332',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: 36,
                }}
              >
                {lang === 'am' ? 'ክፍል' : 'Pay'}
              </button>
            )}
            {isSettled && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 6,
                fontSize: '0.7rem', fontWeight: 700,
                color: '#2e6a47',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                {lang === 'am' ? 'ተከፍሏል' : 'Paid'}
              </span>
            )}
          </>
        ) : (
          /* Expanded state */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12, transition: 'all 0.3s ease' }}>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '0.7rem', fontWeight: 800,
                  color: '#8b9086', letterSpacing: '0.08em', textTransform: 'uppercase',
                  margin: 0, transition: 'all 0.3s ease',
                }}>
                  {isSettled
                    ? (lang === 'am' ? 'ተከፍሏል' : 'Settled')
                    : (lang === 'am' ? 'ለእኔ ይከፍላሉ' : 'Owes me')}
                </p>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '1.8rem', fontWeight: 800,
                  color: isSettled ? '#2e6a47' : '#a0402a',
                  lineHeight: 1, marginTop: 4,
                  letterSpacing: '-0.02em',
                  transition: 'all 0.3s ease',
                }}>
                  {fmt(balance)}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8b9086', marginLeft: 4 }}>
                    {lang === 'am' ? 'ብር' : 'birr'}
                  </span>
                </p>
              </div>
              <div style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
                gap: 4, fontSize: '0.7rem', color: '#5b6158', transition: 'all 0.3s ease',
              }}>
                <span>
                  <span style={{ fontWeight: 700, color: '#171a17' }}>{customer.transaction_count || 0}</span>{' '}
                  {lang === 'am' ? 'መዝገብ' : 'entries'}
                </span>
                {customer.on_time_eligible > 0 && (() => {
                  const pct = Math.round((customer.on_time_count / customer.on_time_eligible) * 100);
                  return (
                    <span>
                      <span style={{ fontWeight: 700, color: pct >= 80 ? '#2e6a47' : pct >= 50 ? '#7a5416' : '#a0402a' }}>
                        {pct}%
                      </span>{' '}
                      {lang === 'am' ? 'በወቅቱ' : 'on time'}
                    </span>
                  );
                })()}
                {customer.avg_pay_days !== null && customer.avg_pay_days !== undefined && (
                  <span>
                    {lang === 'am' ? 'አማካይ ክፍያ' : 'Avg pay'}:{' '}
                    <span style={{ fontWeight: 700, color: '#171a17' }}>{customer.avg_pay_days}d</span>
                  </span>
                )}
              </div>
            </div>
            {/* Mark Fully Paid button */}
            {hasBalance && onMarkFullyPaid && (
              <button
                type="button"
                onClick={handleMarkFullyPaid}
                className="press-scale"
                style={{
                  width: '100%', padding: '12px',
                  background: '#1b4332', color: '#fff',
                  border: 'none', borderRadius: 10,
                  fontSize: '0.82rem', fontWeight: 800,
                  cursor: 'pointer', minHeight: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.3s ease',
                }}
              >
                <Wallet className="w-4 h-4" />
                {lang === 'am' ? `ሁሉንም ይክፈሉ · ${fmt(balance)} ብር` : `Mark Fully Paid · ${fmt(balance)} birr`}
              </button>
            )}
            {isSettled && (
              <div style={{
                width: '100%', padding: '12px',
                background: '#e7f0e9', color: '#2e6a47',
                border: 'none', borderRadius: 10,
                fontSize: '0.82rem', fontWeight: 800,
                minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                {lang === 'am' ? '_balance ተከፍሏል' : 'Balance Fully Paid'}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. QUICK ACTIONS · Call + SMS + Telegram (AFTER balance block)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', gap: 8, padding: '14px 14px' }}>
        {isValidEthiopianPhone(customer.phone_number) && (
          <a
            href={toTelUrl(customer.phone_number)}
            className="press-scale"
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: '#e7f0e9',
              border: '1px solid transparent',
              borderRadius: 10,
              padding: '10px 0',
              color: '#2e6a47',
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
              background: '#e6f0f7',
              border: '1px solid transparent',
              borderRadius: 10,
              padding: '10px 0',
              color: '#2a6690',
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
            background: tg === 'linked' ? '#e7f0e9' : tg === 'manual' ? '#f9eed4' : '#fff',
            border: `1px solid ${tg === 'linked' ? 'transparent' : tg === 'manual' ? 'transparent' : '#e4e6df'}`,
            borderRadius: 10,
            padding: '10px 0',
            color: tg === 'linked' ? '#2e6a47' : tg === 'manual' ? '#7a5416' : '#171a17',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: 'pointer',
            minHeight: 44,
            position: 'relative',
          }}
        >
          <TelegramIcon />
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
                top: 2,
                right: 4,
                background: 'none',
                border: 'none',
                color: '#8b9086',
                fontSize: '0.6rem',
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

      {/* ═══════════════════════════════════════════════════════════════
          4. PROMISE TO PAY
          ═══════════════════════════════════════════════════════════════ */}
      {onRecordPromise && (
        <div style={{ padding: '0 14px 12px' }}>
          {(() => {
            const promiseDateVal = customer.promised_pay_date;
            const now = Date.now();
            const isMissed = promiseDateVal && promiseDateVal < now;
            const isToday = promiseDateVal && Math.abs(promiseDateVal - now) < 86400000;

            if (promiseDateVal) {
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 10,
                  background: isMissed ? '#f5e7e1' : '#f9eed4',
                  border: `1px solid ${isMissed ? '#E7C3B7' : '#E4D5B0'}`,
                }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 600,
                    color: isMissed ? '#a0402a' : '#7a5416',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    📅 {isMissed
                      ? (lang === 'am'
                        ? `የጠበቀው ቀን አልፏል — ${formatEthiopian(promiseDateVal)}`
                        : `Missed promise — was due ${formatEthiopian(promiseDateVal)}`)
                      : isToday
                        ? (lang === 'am' ? 'ዛሬ ይከፍላል ብሏል' : 'Promised to pay today')
                        : (lang === 'am'
                          ? `እስከ ${formatEthiopian(promiseDateVal)} ይከፍላል ብሏል`
                          : `Promised to pay by ${formatEthiopian(promiseDateVal)}`)}
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
                      fontSize: '0.65rem', fontWeight: 700, color: '#8b9086',
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
                <button
                  type="button"
                  onClick={() => setShowPromiseForm(true)}
                  className="press-scale"
                  style={{
                    display: 'block', width: '100%',
                    background: '#fff',
                    border: '1px dashed #8b9086',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: '0.78rem', fontWeight: 700,
                    color: '#5b6158',
                    cursor: 'pointer',
                  }}
                >
                  + {lang === 'am' ? 'የተስፋፉበትን ቀን ይመዝግቡ' : 'Record Promise to Pay'}
                </button>
              );
            }

            return (
              <div className="promise-form-slide" style={{
                padding: 14,
                background: '#fff',
                border: '1px solid #e4e6df',
                borderRadius: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <p style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0, color: '#171a17' }}>
                  📅 {lang === 'am' ? 'የተስፋፉበትን ቀን ይመዝግቡ' : 'Record Promise to Pay'}
                </p>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="promise-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e4e6df',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    color: '#171a17',
                    background: '#fff',
                  }}
                />
                <input
                  type="text"
                  value={promiseNote}
                  onChange={(e) => setPromiseNote(e.target.value)}
                  placeholder={t.promiseNote}
                  className="promise-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e4e6df',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    color: '#171a17',
                    background: '#fff',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCancelPromise}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: '#f5f6f2',
                      border: '1px solid #e4e6df',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#171a17',
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
                      background: '#1b4332',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#fff',
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

      {/* ═══════════════════════════════════════════════════════════════
          5. REMINDER HISTORY (collapsible)
          ═══════════════════════════════════════════════════════════════ */}
      {customer.has_overdue && (
        <CustomerReminderHistory
          customerId={customer.id || customer.customer_id}
          shopId={customer.shop_id || customer.business_id}
          lang={lang}
          onResend={() => onRemind?.(customer)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          6. HISTORY · search + filter + grouped by date
          ═══════════════════════════════════════════════════════════════ */}
      <div>
        {/* History header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 8px' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 800, color: '#8b9086', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {lang === 'am' ? 'መዝገብ' : 'History'}
          </p>
          <span
            style={{
              fontSize: '0.65rem', fontWeight: 700,
              background: '#f5f6f2',
              color: '#7a5416',
              padding: '2px 8px',
              borderRadius: 999,
              border: '1px solid #e4e6df',
            }}
          >
            {lang === 'am' ? 'ለማስተካከል ይንኩ' : 'Tap row to edit'}
          </span>
        </div>

        {/* Search & Filter */}
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', border: '1px solid #e4e6df',
            borderRadius: 10, padding: '8px 12px', marginBottom: 8,
          }}>
            <Search size={14} color="#8b9086" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === 'am' ? 'እቃ ይፈልጉ...' : 'Search items...'}
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: '0.85rem', width: '100%', fontFamily: 'inherit',
                color: '#171a17',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <X size={14} color="#8b9086" />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'all', label: lang === 'am' ? 'ሁሉም' : 'All' },
              { key: 'credit', label: lang === 'am' ? 'ዱቤ' : 'Credits' },
              { key: 'pay', label: lang === 'am' ? 'ክፍያ' : 'Payments' },
            ].map(chip => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilterType(chip.key)}
                className="press-scale"
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: filterType === chip.key ? '#171a17' : '#fff',
                  border: `1px solid ${filterType === chip.key ? '#171a17' : '#e4e6df'}`,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: filterType === chip.key ? '#fff' : '#5b6158',
                  cursor: 'pointer',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger list — individual card rows */}
        {filteredRows.length === 0 ? (
          <div style={{
            margin: '0 14px',
            padding: 40,
            background: '#fff',
            border: '1px solid #e4e6df',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.85rem', color: '#8b9086', margin: 0 }}>
              {searchTerm || filterType !== 'all'
                ? (lang === 'am' ? 'ምንም ውጤት አልተገኘም' : 'No entries found')
                : (lang === 'am' ? 'መዝገብ የለም' : 'No entries yet')}
            </p>
            {!searchTerm && filterType === 'all' && (
              <p style={{ fontSize: '0.7rem', color: '#8b9086', marginTop: 8 }}>
                {lang === 'am' ? 'ለመጀመር ዱቤ ይጨምሩ' : 'Tap + Credit to start'}
              </p>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            margin: '0 14px',
          }}>
            {(() => {
              const elements = [];
              let lastDate = null;
              filteredRows.forEach((tx, idx) => {
                const txDate = formatEthiopian(tx.created_at);
                if (txDate !== lastDate) {
                  const sameDayCount = filteredRows.filter(
                    r => formatEthiopian(r.created_at) === txDate
                  ).length;
                  elements.push(
                    <div
                      key={`date_${txDate}_${idx}`}
                      style={{
                        padding: '4px 4px 0',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        color: '#8b9086',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>📅 {txDate}</span>
                      {sameDayCount > 1 && (
                        <span style={{ color: '#8b9086', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                          {sameDayCount} {lang === 'am' ? 'መዝገብ' : 'entries'}
                        </span>
                      )}
                    </div>
                  );
                  lastDate = txDate;
                }
                elements.push(
                  <TransactionRow
                    key={tx.id || idx}
                    tx={tx}
                    isLast={idx === filteredRows.length - 1}
                    lang={lang}
                    onSelectTransaction={onSelectTransaction}
                    t={t}
                  />
                );
              });
              return elements;
            })()}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          7. TRUST LINE
          ═══════════════════════════════════════════════════════════════ */}
      <p style={{
        textAlign: 'center', fontSize: '0.66rem', color: '#8b9086',
        padding: '16px 14px 4px',
      }}>
        🔒 {lang === 'am'
          ? 'በደህንነት ይቀመጣል። መጠኖች በራስ ሰር ይደብቃሉ።'
          : 'Backed up securely. Amounts auto-hide for privacy.'}
      </p>

      {/* ═══════════════════════════════════════════════════════════════
          8. ARCHIVE / RESTORE
          ═══════════════════════════════════════════════════════════════ */}
      {onArchiveCustomer && (
        <div style={{ textAlign: 'center', padding: '4px 14px 12px' }}>
          {showArchiveConfirm ? (
            <div style={{
              padding: 14,
              background: '#fff',
              border: '1px solid #e4e6df',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600, margin: 0, color: '#171a17' }}>
                {lang === 'am'
                  ? `"${customer.display_name}" አርክስ?${hasBalance ? ` ይህ ደንበኛ ${fmt(balance)} ብር ዕዳ አለበት።` : ''}`
                  : `Archive "${customer.display_name}"?${hasBalance ? ` This customer has ${fmt(balance)} birr outstanding.` : ''}`}
              </p>
              <p style={{ fontSize: '0.72rem', color: '#5b6158', margin: 0 }}>
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
                    background: '#f5f6f2',
                    border: '1px solid #e4e6df',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#171a17',
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
                    background: '#a0402a',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#fff',
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
                color: customer.archived_at ? '#2e6a47' : '#8b9086',
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

      {/* ═══════════════════════════════════════════════════════════════
          BOTTOM SPACER — enough room for the fixed AppActionBar
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ height: 80 }} />

      {/* ═══════════════════════════════════════════════════════════════
          SUCCESS OVERLAY
          ═══════════════════════════════════════════════════════════════ */}
      {showSuccessOverlay && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(255,255,255,0.95)',
          zIndex: 30,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="success-pop" style={{
            width: 80, height: 80,
            background: '#2e6a47',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 40,
          }}>✓</div>
          <p style={{ marginTop: 20, fontSize: '1.2rem', fontWeight: 800, color: '#2e6a47' }}>
            {lang === 'am' ? '_balance ተከፍሏል!' : 'Balance Settled!'}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CSS ANIMATIONS
          ═══════════════════════════════════════════════════════════════ */}
      <style>{`
        .promise-form-slide {
          animation: slideDown 0.3s ease forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .history-row-active:active {
          background: #f9f9f9 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
          transform: scale(0.98);
        }
        .new-entry-anim {
          animation: dropIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes dropIn {
          0% { opacity: 0; transform: translateY(-15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .success-pop {
          animation: popIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1.4) forwards;
        }
        @keyframes popIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        .promise-input:focus {
          outline: none;
          border-color: #1b4332;
        }
      `}</style>
    </div>
  );
}

// ─── History row — delegated to shared TransactionRow ──

export default CustomerDetail;
