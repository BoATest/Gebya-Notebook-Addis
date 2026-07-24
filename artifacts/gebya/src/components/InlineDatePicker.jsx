import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { toEthiopian, toGregorian } from 'ethiopian-date';

const dvhSupported = typeof window !== 'undefined' && window.CSS?.supports?.('height', '100dvh');

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
const WEEKDAY_HEADERS = {
  am: ['ሰኞ', 'ማክሰ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ', 'እሑድ'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

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

  const isModal = open !== undefined;
  const [pending, setPending] = useState(() => gregorianISOToEthiopianParts(value));
  const [viewMonth, setViewMonth] = useState(pending.month);
  const [viewYear, setViewYear] = useState(pending.year);

  const parts = useMemo(() => gregorianISOToEthiopianParts(value), [value]);
  const [inlineMonth, setInlineMonth] = useState(parts.month);
  const [inlineDay, setInlineDay] = useState(parts.day);

  useEffect(() => {
    const p = gregorianISOToEthiopianParts(value);
    setInlineMonth(p.month);
    setInlineDay(p.day);
  }, [value]);

  useEffect(() => {
    if (isModal && open) {
      const p = gregorianISOToEthiopianParts(value);
      setPending(p);
      setViewMonth(p.month);
      setViewYear(p.year);
    }
  }, [open, value]);

  useEffect(() => {
    if (!isModal && dayScrollRef.current) {
      const selectedBtn = dayScrollRef.current.querySelector('[data-selected="true"]');
      if (selectedBtn) {
        selectedBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [inlineMonth, inlineDay]);

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

  function getMonthGrid(year, month) {
    const maxDay = daysInEthiopianMonth(year, month);
    const [gy, gm, gd] = toGregorian(year, month, 1);
    const firstDay = new Date(gy, gm - 1, gd);
    const startCol = (firstDay.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startCol; i++) cells.push(null);
    for (let d = 1; d <= maxDay; d++) {
      const [gy2, gm2, gd2] = toGregorian(year, month, d);
      const iso = `${gy2}-${String(gm2).padStart(2,'0')}-${String(gd2).padStart(2,'0')}`;
      cells.push({ day: d, isToday: iso === todayGregStr, gregISO: iso });
    }
    return cells;
  }

  function isCellSelected(cell) {
    return cell && cell.day === pending.day && pending.month === viewMonth && pending.year === viewYear;
  }

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

  function goToday() {
    const t = gregorianISOToEthiopianParts('');
    setViewMonth(t.month);
    setViewYear(t.year);
    setPending(t);
  }

  function goPrevMonth() {
    if (viewMonth === 1) { setViewMonth(13); setViewYear(viewYear - 1); }
    else { setViewMonth(viewMonth - 1); }
  }

  function goNextMonth() {
    if (viewMonth === 13) { setViewMonth(1); setViewYear(viewYear + 1); }
    else { setViewMonth(viewMonth + 1); }
  }

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

  // --- Modal render ---
  if (isModal) {
    if (!open) return null;

    const maxDayForMonth = daysInEthiopianMonth(pending.year, pending.month);
    const pendingGregISO = ethiopianToGregorianISO(pending.year, pending.month, Math.min(pending.day, maxDayForMonth));
    const pendingWeekday = pendingGregISO ? new Date(`${pendingGregISO}T12:00:00`).getDay() : -1;
    const weekdayLabel = pendingWeekday >= 0 ? `${WEEKDAYS_AM[pendingWeekday]} (${WEEKDAYS_EN[pendingWeekday]})` : '';
    const pendingMonthName = months[pending.month - 1] || '';
    const weekdayHeaders = WEEKDAY_HEADERS[lang] || WEEKDAY_HEADERS.en;

    const monthCells = getMonthGrid(viewYear, viewMonth);
    const rows = [];
    for (let i = 0; i < monthCells.length; i += 7) {
      rows.push(monthCells.slice(i, i + 7));
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
            maxHeight: dvhSupported ? '100dvh' : 'calc(100vh - 24px)',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -8px 32px -8px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {/* Drag handle */}
            <div style={{ width: 38, height: 4, background: '#e5e7eb', borderRadius: 999, margin: '10px auto 6px' }} />

            {/* Header */}
            <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
                {lang === 'am' ? 'የቀን ምረጫ' : 'Pick a date'}
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

            {/* Date banner */}
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

            {/* Month/Year nav + Today */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0 16px 10px',
            }}>
              <button type="button" onClick={() => setViewYear(viewYear - 1)}
                aria-label={lang === 'am' ? 'ያለፈ ዓመት' : 'Previous year'}
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: '#f3f4f6', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>«</span>
              </button>
              <button type="button" onClick={goPrevMonth}
                aria-label={lang === 'am' ? 'ያለፈ ወር' : 'Previous month'}
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: '#f3f4f6', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#374151' }} />
              </button>
              <span style={{
                flex: 1, textAlign: 'center',
                fontSize: '0.85rem', fontWeight: 800, color: '#1a1a1a',
              }}>
                {months[viewMonth - 1]} {viewYear}
              </span>
              <button type="button" onClick={goNextMonth}
                aria-label={lang === 'am' ? 'ቀጣይ ወር' : 'Next month'}
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: '#f3f4f6', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <ChevronRight className="w-3.5 h-3.5" style={{ color: '#374151' }} />
              </button>
              <button type="button" onClick={() => setViewYear(viewYear + 1)}
                aria-label={lang === 'am' ? 'ቀጣይ ዓመት' : 'Next year'}
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: '#f3f4f6', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>»</span>
              </button>
              <button type="button" onClick={goToday}
                aria-label={lang === 'am' ? 'ዛሬ' : 'Today'}
                title={lang === 'am' ? 'ዛሬ' : 'Today'}
                style={{
                  width: 30, height: 30, borderRadius: 6,
                  background: '#1B4332', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff' }}>📅</span>
              </button>
            </div>

            {/* Quick duration chips */}
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }} className="hide-scrollbar">
                {quickDurations.map(n => (
                  <button key={n} type="button" onClick={() => setDateNDaysFromToday(n)}
                    style={{
                      flexShrink: 0, padding: '7px 13px', minHeight: 34,
                      background: '#fff', color: '#1B4332',
                      border: '2px solid #d4cdc0',
                      borderRadius: 8, fontSize: '0.78rem', fontWeight: 800,
                      cursor: 'pointer',
                    }}>
                    +{n} {lang === 'am' ? 'ቀናት' : 'days'}
                  </button>
                ))}
              </div>
            </div>

            {/* Full month grid */}
            <div style={{ padding: '0 16px 14px' }}>
              {/* Weekday header row */}
              <div style={{ display: 'flex', marginBottom: 6 }}>
                {weekdayHeaders.map((h, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center',
                    fontSize: '0.6rem', fontWeight: 700, color: '#9ca3af',
                  }}>
                    {h}
                  </div>
                ))}
              </div>
              {/* Day rows */}
              {rows.map((row, ri) => (
                <div key={ri} style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                  {row.map((cell, ci) => {
                    if (!cell) {
                      return <div key={ci} style={{ flex: 1 }} />;
                    }
                    const sel = isCellSelected(cell);
                    return (
                      <button key={ci} type="button"
                        onClick={() => handleModalDaySelect(cell.day, viewMonth, viewYear)}
                        style={{
                          flex: 1, aspectRatio: '1/1', maxWidth: 44, maxHeight: 44,
                          borderRadius: 10,
                          background: sel ? '#1B4332' : 'transparent',
                          color: sel ? '#fff' : '#374151',
                          border: `1.5px solid ${sel ? '#1B4332' : 'transparent'}`,
                          fontSize: '0.82rem', fontWeight: sel ? 800 : 500,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          position: 'relative',
                          transition: 'all .08s ease',
                        }}>
                        {cell.day}
                        {cell.isToday && !sel && (
                          <span style={{
                            position: 'absolute', bottom: 1,
                            width: 4, height: 4, borderRadius: '50%',
                            background: '#1B4332',
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Sticky footer — always visible above phone nav bar */}
          <div style={{
            flexShrink: 0,
            padding: '12px 16px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 24px))',
            background: '#fff',
            borderTop: '1px solid #f0ede8',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
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
                  flex: value ? 3 : 1, padding: '12px', background: '#1B4332', color: '#fff',
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <button type="button" onClick={() => handleInlineMonthChange(-1)}
          disabled={inlineMonth <= 1} aria-label="Previous month"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fff', border: '1px solid #e8e2d8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: inlineMonth <= 1 ? 'not-allowed' : 'pointer',
            opacity: inlineMonth <= 1 ? 0.4 : 1, flexShrink: 0,
          }}>
          <ChevronLeft className="w-4 h-4" style={{ color: '#374151' }} />
        </button>
        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1B4332', textAlign: 'center' }}>
          {months[inlineMonth - 1]} {parts.year}
        </span>
        <button type="button" onClick={() => handleInlineMonthChange(1)}
          disabled={inlineMonth >= 13} aria-label="Next month"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fff', border: '1px solid #e8e2d8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: inlineMonth >= 13 ? 'not-allowed' : 'pointer',
            opacity: inlineMonth >= 13 ? 0.4 : 1, flexShrink: 0,
          }}>
          <ChevronRight className="w-4 h-4" style={{ color: '#374151' }} />
        </button>
        <button type="button" onClick={() => {
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
            cursor: 'pointer', flexShrink: 0, color: '#fff',
            fontSize: '0.65rem', fontWeight: 800,
          }}
          title={lang === 'am' ? 'ዛሬ' : 'Today'}>
          📅
        </button>
      </div>

      <div ref={dayScrollRef}
        style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
        className="hide-scrollbar">
        {days.map((d) => {
          const active = d === inlineDay;
          return (
            <button key={d} type="button" data-selected={active ? 'true' : undefined}
              onClick={() => handleInlineDaySelect(d)}
              style={{
                minWidth: 36, height: 36, borderRadius: 8,
                background: active ? '#C4883A' : '#fff',
                color: active ? '#fff' : '#374151',
                border: `1.5px solid ${active ? '#C4883A' : '#e8e2d8'}`,
                fontSize: '0.82rem', fontWeight: active ? 800 : 600,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .1s ease',
              }}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default InlineDatePicker;
