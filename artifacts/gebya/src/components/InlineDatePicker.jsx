// InlineDatePicker.jsx — Standard Ethiopian calendar picker for all Gebya screens.
//
// Supports two modes:
//   1. Inline mode (no `open` prop) — compact card that sits directly in the form.
//      Month is navigated with arrows, days are a horizontal scroll.
//   2. Modal mode (`open` + `onClose` props) — bottom-sheet modal with year
//      stepper, Cancel/Set buttons.  Drop-in replacement for EthiopianDatePicker.
//
// Props:
//   value     — Gregorian ISO string ('YYYY-MM-DD') or empty
//   onChange   — (iso) => void
//   lang      — 'am' | 'en'
//   open      — (optional) boolean for modal mode
//   onClose   — (optional) () => void for modal mode

import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { toEthiopian, toGregorian } from 'ethiopian-date';

const MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታህሳስ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ',
];
const MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
  'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
];
const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function gregorianISOToEthiopianParts(iso) {
  if (!iso) {
    const d = new Date();
    const [y, m, day] = toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { year: y, month: m, day };
  }
  const d = new Date(`${iso}T12:00:00`);
  const [y, m, day] = toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { year: y, month: m, day };
}

function ethiopianToGregorianISO(year, month, day) {
  try {
    const [gy, gm, gd] = toGregorian(year, month, day);
    const mm = String(gm).padStart(2, '0');
    const dd = String(gd).padStart(2, '0');
    return `${gy}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

function daysInEthiopianMonth(year, month) {
  if (month < 13) return 30;
  return year % 4 === 3 ? 6 : 5;
}

function InlineDatePicker({ value, onChange, lang = 'am', open, onClose }) {
  const months = lang === 'am' ? MONTHS_AM : MONTHS_EN;
  const dayScrollRef = useRef(null);

  // Modal mode: pending state so changes only apply on "Set"
  const isModal = open !== undefined;
  const [pending, setPending] = useState(() => gregorianISOToEthiopianParts(value));

  // Inline mode: direct state
  const parts = useMemo(() => gregorianISOToEthiopianParts(value), [value]);
  const [inlineMonth, setInlineMonth] = useState(parts.month);
  const [inlineDay, setInlineDay] = useState(parts.day);

  // Sync from external value in inline mode
  useEffect(() => {
    const p = gregorianISOToEthiopianParts(value);
    setInlineMonth(p.month);
    setInlineDay(p.day);
  }, [value]);

  // Sync pending from prop when modal opens
  useEffect(() => {
    if (isModal && open) setPending(gregorianISOToEthiopianParts(value));
  }, [open, value]);

  // Scroll to selected day when month changes (inline mode)
  useEffect(() => {
    if (!isModal && dayScrollRef.current) {
      const selectedBtn = dayScrollRef.current.querySelector('[data-selected="true"]');
      if (selectedBtn) {
        selectedBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [inlineMonth, inlineDay]);

  // --- Modal mode state ---
  const [weekOffset, setWeekOffset] = useState(0);

  // --- Modal mode handlers ---
  const handleModalDaySelect = (ethDay, ethMonth, ethYear) => {
    const maxDay = daysInEthiopianMonth(ethYear, ethMonth);
    setPending({ year: ethYear, month: ethMonth, day: Math.min(ethDay, maxDay) });
  };

  const handleModalSet = () => {
    const maxDay = daysInEthiopianMonth(pending.year, pending.month);
    const safeDay = Math.min(pending.day, maxDay);
    const iso = ethiopianToGregorianISO(pending.year, pending.month, safeDay);
    if (iso) onChange?.(iso);
    onClose?.();
  };

  const todayGregStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }, []);

  const quickDurations = useMemo(() => [7, 10, 15, 30], []);

  function setDateNDaysFromToday(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const [ey, em, ed] = toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
    handleModalDaySelect(ed, em, ey);
  }

  function getWeekDays(offset) {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
    const result = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const [ey, em, ed] = toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      result.push({ ethDay: ed, ethMonth: em, ethYear: ey, gregISO: iso, isToday: iso === todayGregStr });
    }
    return { week1: result.slice(0, 7), week2: result.slice(7, 14) };
  }

  function weekLabel(week) {
    if (!week || week.length === 0) return '';
    const first = week[0];
    const last = week[week.length - 1];
    const m1 = months[first.ethMonth - 1] || '';
    const m2 = months[last.ethMonth - 1] || '';
    if (first.ethMonth === last.ethMonth) {
      return `${m1} ${first.ethDay}-${last.ethDay}`;
    }
    return `${m1} ${first.ethDay} - ${m2} ${last.ethDay}`;
  }

  // --- Inline mode handlers ---
  const handleInlineMonthChange = (delta) => {
    const newMonth = inlineMonth + delta;
    if (newMonth < 1 || newMonth > 13) return;
    const newMax = daysInEthiopianMonth(parts.year, newMonth);
    const safeDay = Math.min(inlineDay, newMax);
    setInlineMonth(newMonth);
    setInlineDay(safeDay);
    const iso = ethiopianToGregorianISO(parts.year, newMonth, safeDay);
    if (iso) onChange?.(iso);
  };

  const handleInlineDaySelect = (d) => {
    setInlineDay(d);
    const iso = ethiopianToGregorianISO(parts.year, inlineMonth, d);
    if (iso) onChange?.(iso);
  };

  // --- Modal mode render ---
  if (isModal) {
    if (!open) return null;

    const maxDayForMonth = daysInEthiopianMonth(pending.year, pending.month);
    const pendingGregISO = ethiopianToGregorianISO(pending.year, pending.month, Math.min(pending.day, maxDayForMonth));
    const pendingWeekday = pendingGregISO ? new Date(`${pendingGregISO}T12:00:00`).getDay() : -1;
    const weekdayLabel = pendingWeekday >= 0 ? (lang === 'am' ? WEEKDAYS_AM[pendingWeekday] : WEEKDAYS_EN[pendingWeekday]) : '';
    const pendingMonthName = months[pending.month - 1] || '';

    const { week1, week2 } = getWeekDays(weekOffset);
    const w1Label = weekLabel(week1);
    const w2Label = weekLabel(week2);

    function isSelected(dayInfo) {
      return dayInfo.ethDay === pending.day && dayInfo.ethMonth === pending.month && dayInfo.ethYear === pending.year;
    }

    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <div
          style={{
            background: '#fff',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflowY: 'auto',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -8px 32px -8px rgba(0,0,0,0.25)',
          }}
        >
          {/* Drag handle */}
          <div style={{ width: 38, height: 4, background: '#e5e7eb', borderRadius: 999, margin: '10px auto 6px' }} />

          {/* Header: title + close */}
          <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
              {lang === 'am' ? 'ቀን ይምረጡ' : 'Pick a date'}
            </h3>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#f3f4f6', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
              <X className="w-4 h-4" style={{ color: '#6b7280' }} />
            </button>
          </div>

          {/* Large date display */}
          <div style={{
            margin: '0 16px 10px', padding: '10px 14px',
            background: '#fafaf5', borderRadius: 10,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1B4332', lineHeight: 1.3 }}>
              {pending.day} {pendingMonthName} {pending.year}
            </div>
            {weekdayLabel && (
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280', marginTop: 2 }}>
                {weekdayLabel}
              </div>
            )}
          </div>

          {/* Quick duration chips */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }} className="hide-scrollbar">
              {quickDurations.map(n => {
                const active = false;
                return (
                  <button key={n} type="button" onClick={() => setDateNDaysFromToday(n)}
                    style={{
                      flexShrink: 0, padding: '8px 14px', minHeight: 36,
                      background: active ? '#1B4332' : '#fff',
                      color: active ? '#fff' : '#1B4332',
                      border: `2px solid ${active ? '#1B4332' : '#d4cdc0'}`,
                      borderRadius: 8, fontSize: '0.8rem', fontWeight: 800,
                      cursor: 'pointer',
                    }}>
                    +{n} {lang === 'am' ? 'ቀናት' : 'days'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week 1 */}
          <div style={{ padding: '0 16px 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <button type="button" onClick={() => setWeekOffset(w => w - 1)}
                aria-label="Previous week"
                style={{
                  width: 28, height: 28, border: '1px solid #e8e2d8', borderRadius: 6,
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#374151' }} />
              </button>
              <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: '#6b7280' }}>
                {w1Label}
              </span>
              <button type="button" onClick={() => setWeekOffset(w => w + 1)}
                aria-label="Next week"
                style={{
                  width: 28, height: 28, border: '1px solid #e8e2d8', borderRadius: 6,
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: '#374151' }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }} className="hide-scrollbar">
              {week1.map((di, idx) => {
                const sel = isSelected(di);
                return (
                  <button key={idx} type="button" onClick={() => handleModalDaySelect(di.ethDay, di.ethMonth, di.ethYear)}
                    style={{
                      minWidth: 40, height: 40, borderRadius: 8,
                      background: sel ? '#1B4332' : '#fff',
                      color: sel ? '#fff' : '#374151',
                      border: `1.5px solid ${sel ? '#1B4332' : '#e8e2d8'}`,
                      fontSize: '0.85rem', fontWeight: sel ? 800 : 600,
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                    {di.ethDay}
                    {di.isToday && !sel && (
                      <span style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: '50%', background: '#1B4332' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Week 2 */}
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <button type="button" onClick={() => setWeekOffset(w => w - 1)}
                aria-label="Previous week"
                style={{
                  width: 28, height: 28, border: '1px solid #e8e2d8', borderRadius: 6,
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, visibility: 'hidden',
                }}>
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#374151' }} />
              </button>
              <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: '#6b7280' }}>
                {w2Label}
              </span>
              <button type="button" onClick={() => setWeekOffset(w => w + 1)}
                aria-label="Next week"
                style={{
                  width: 28, height: 28, border: '1px solid #e8e2d8', borderRadius: 6,
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0, visibility: 'hidden',
                }}>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: '#374151' }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }} className="hide-scrollbar">
              {week2.map((di, idx) => {
                const sel = isSelected(di);
                return (
                  <button key={idx} type="button" onClick={() => handleModalDaySelect(di.ethDay, di.ethMonth, di.ethYear)}
                    style={{
                      minWidth: 40, height: 40, borderRadius: 8,
                      background: sel ? '#1B4332' : '#fff',
                      color: sel ? '#fff' : '#374151',
                      border: `1.5px solid ${sel ? '#1B4332' : '#e8e2d8'}`,
                      fontSize: '0.85rem', fontWeight: sel ? 800 : 600,
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      position: 'relative',
                    }}>
                    {di.ethDay}
                    {di.isToday && !sel && (
                      <span style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: '50%', background: '#1B4332' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action row */}
          <div style={{ padding: '0 16px', display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose}
              style={{
                flex: 1, padding: '12px', background: '#f3f4f6', color: '#374151',
                border: 'none', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700,
                cursor: 'pointer', minHeight: 48,
              }}>
              {lang === 'am' ? 'ይቅር' : 'Cancel'}
            </button>
            {value && (
              <button type="button" onClick={() => { onChange?.(''); onClose?.(); }}
                style={{
                  flex: 1, padding: '12px', background: '#fef2f2', color: '#dc2626',
                  border: '1px solid #fecaca', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700,
                  cursor: 'pointer', minHeight: 48,
                }}>
                {lang === 'am' ? 'አጥፋ' : 'Clear'}
              </button>
            )}
            <button type="button" onClick={handleModalSet}
              style={{
                flex: 3, padding: '12px', background: '#1B4332', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: '0.95rem', fontWeight: 800,
                cursor: 'pointer', minHeight: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(27,67,50,0.3)',
              }}>
              <Check className="w-5 h-5" />
              {lang === 'am' ? 'አስቀምጥ' : 'Set date'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Inline mode render ---
  const maxDay = daysInEthiopianMonth(parts.year, inlineMonth);
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay]);

  return (
    <div style={{
      padding: '10px 12px',
      background: '#fafaf5',
      border: '1px solid #e8e2d8',
      borderRadius: 10,
    }}>
      {/* Month navigation */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <button
          type="button"
          onClick={() => handleInlineMonthChange(-1)}
          disabled={inlineMonth <= 1}
          aria-label="Previous month"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fff', border: '1px solid #e8e2d8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: inlineMonth <= 1 ? 'not-allowed' : 'pointer',
            opacity: inlineMonth <= 1 ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: '#374151' }} />
        </button>
        <span style={{
          fontSize: '0.82rem', fontWeight: 800, color: '#1B4332',
          textAlign: 'center',
        }}>
          {months[inlineMonth - 1]} {parts.year}
        </span>
        <button
          type="button"
          onClick={() => handleInlineMonthChange(1)}
          disabled={inlineMonth >= 13}
          aria-label="Next month"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fff', border: '1px solid #e8e2d8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: inlineMonth >= 13 ? 'not-allowed' : 'pointer',
            opacity: inlineMonth >= 13 ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: '#374151' }} />
        </button>
        <button
          type="button"
          onClick={() => {
            const today = gregorianISOToEthiopianParts('');
            setInlineMonth(today.month);
            setInlineDay(today.day);
            const iso = ethiopianToGregorianISO(today.year, today.month, today.day);
            if (iso) onChange?.(iso);
          }}
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#1B4332', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
          }}
          title={lang === 'am' ? 'ዛሬ' : 'Today'}
        >
          📅
        </button>
      </div>

      {/* Day horizontal scroll */}
      <div
        ref={dayScrollRef}
        style={{
          display: 'flex', gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="hide-scrollbar"
      >
        {days.map((d) => {
          const active = d === inlineDay;
          return (
            <button
              key={d}
              type="button"
              data-selected={active ? 'true' : undefined}
              onClick={() => handleInlineDaySelect(d)}
              style={{
                minWidth: 36, height: 36, borderRadius: 8,
                background: active ? '#C4883A' : '#fff',
                color: active ? '#fff' : '#374151',
                border: `1.5px solid ${active ? '#C4883A' : '#e8e2d8'}`,
                fontSize: '0.82rem', fontWeight: active ? 800 : 600,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .1s ease',
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default InlineDatePicker;
