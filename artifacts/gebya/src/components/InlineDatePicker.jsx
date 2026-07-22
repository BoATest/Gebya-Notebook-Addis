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

  // --- Modal mode handlers ---
  const handleModalMonthChange = (delta) => {
    setPending(p => {
      const newMonth = p.month + delta;
      if (newMonth < 1 || newMonth > 13) return p;
      const newMax = daysInEthiopianMonth(p.year, newMonth);
      const safeDay = Math.min(p.day, newMax);
      return { ...p, month: newMonth, day: safeDay };
    });
  };

  const handleModalYearChange = (delta) => {
    setPending(p => ({ ...p, year: p.year + delta }));
  };

  const handleModalDaySelect = (d) => {
    setPending(p => ({ ...p, day: d }));
  };

  const handleModalSet = () => {
    const maxDay = daysInEthiopianMonth(pending.year, pending.month);
    const safeDay = Math.min(pending.day, maxDay);
    const iso = ethiopianToGregorianISO(pending.year, pending.month, safeDay);
    if (iso) onChange?.(iso);
    onClose?.();
  };

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
    const previewGregorianISO = ethiopianToGregorianISO(pending.year, pending.month, Math.min(pending.day, maxDayForMonth));
    const previewGregorianText = previewGregorianISO
      ? new Date(`${previewGregorianISO}T12:00:00`).toLocaleDateString(lang === 'am' ? 'en' : undefined, {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        })
      : '';

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
            paddingBottom: 24,
            boxShadow: '0 -8px 32px -8px rgba(0,0,0,0.25)',
            maxHeight: '92vh', overflowY: 'auto',
          }}
        >
          {/* Drag handle */}
          <div style={{ width: 38, height: 4, background: '#e5e7eb', borderRadius: 999, margin: '12px auto 8px' }} />

          {/* Header */}
          <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
                {lang === 'am' ? 'የመመለሻ ቀን ይምረጡ' : 'Pick due date'}
              </h3>
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>
                {lang === 'am' ? 'በኢትዮጵያ ዘመን አቆጣጠር' : 'Ethiopian calendar'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: '#f3f4f6', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X className="w-5 h-5" style={{ color: '#6b7280' }} />
            </button>
          </div>

          {/* Current selection summary */}
          <div
            style={{
              margin: '0 16px 14px',
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #1B4332 0%, #2d6a4f 100%)',
              color: '#fff',
              borderRadius: 12,
            }}
          >
            <p style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', opacity: 0.7, textTransform: 'uppercase' }}>
              {lang === 'am' ? 'የተመረጠ ቀን' : 'Selected'}
            </p>
            <p style={{ fontFamily: 'Manrope, system-ui, sans-serif', fontSize: '1.3rem', fontWeight: 800, marginTop: 2 }}>
              {pending.day} {months[pending.month - 1] || ''} {pending.year}
            </p>
            {previewGregorianText && (
              <p style={{ fontSize: '0.7rem', opacity: 0.75, marginTop: 2 }}>
                {lang === 'am' ? '(በሌላ አቆጣጠር)' : '(Gregorian)'}: {previewGregorianText}
              </p>
            )}
          </div>

          {/* Year stepper */}
          <div style={{ padding: '0 16px 12px' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {lang === 'am' ? 'ዓመት' : 'Year'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleModalYearChange(-1)}
                aria-label={lang === 'am' ? 'የቀደመ ዓመት' : 'Previous year'}
                style={{
                  width: 44, height: 44,
                  border: '2px solid #e8e2d8',
                  borderRadius: 10,
                  background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <ChevronLeft className="w-5 h-5" style={{ color: '#374151' }} />
              </button>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 14px',
                  background: '#fafaf5',
                  border: '2px solid #e8e2d8',
                  borderRadius: 10,
                  fontFamily: 'Manrope, system-ui, sans-serif',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: '#1B4332',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {pending.year}
              </div>
              <button
                type="button"
                onClick={() => handleModalYearChange(1)}
                aria-label={lang === 'am' ? 'የቀጣይ ዓመት' : 'Next year'}
                style={{
                  width: 44, height: 44,
                  border: '2px solid #e8e2d8',
                  borderRadius: 10,
                  background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <ChevronRight className="w-5 h-5" style={{ color: '#374151' }} />
              </button>
            </div>
          </div>

          {/* Month grid */}
          <div style={{ padding: '0 16px 14px' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {lang === 'am' ? 'ወር' : 'Month'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {months.map((m, i) => {
                const idx = i + 1;
                const active = pending.month === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPending(p => ({ ...p, month: idx }))}
                    style={{
                      padding: '10px 6px',
                      background: active ? '#1B4332' : '#fff',
                      color: active ? '#fff' : '#374151',
                      border: `1.5px solid ${active ? '#1B4332' : '#e8e2d8'}`,
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: active ? 800 : 600,
                      minHeight: 44,
                      cursor: 'pointer',
                      transition: 'all .12s ease',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day grid */}
          <div style={{ padding: '0 16px 14px' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
              {lang === 'am' ? 'ቀን' : 'Day'}
              <span style={{ fontWeight: 500, marginLeft: 4, textTransform: 'none', letterSpacing: 0 }}>
                · 1–{maxDayForMonth}
              </span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
              {Array.from({ length: maxDayForMonth }, (_, i) => i + 1).map((d) => {
                const active = pending.day === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleModalDaySelect(d)}
                    style={{
                      aspectRatio: '1 / 1',
                      background: active ? '#C4883A' : '#fff',
                      color: active ? '#fff' : '#374151',
                      border: `1.5px solid ${active ? '#C4883A' : '#e8e2d8'}`,
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      fontWeight: active ? 800 : 600,
                      fontVariantNumeric: 'tabular-nums',
                      minHeight: 36,
                      cursor: 'pointer',
                      transition: 'all .12s ease',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action row */}
          <div style={{ padding: '0 16px', display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: 12,
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                minHeight: 48,
              }}
            >
              {lang === 'am' ? 'ይቅር' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleModalSet}
              style={{
                flex: 2,
                padding: '12px',
                background: '#1B4332',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: 'pointer',
                minHeight: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Check className="w-4 h-4" />
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
