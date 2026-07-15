// ClosingSection.jsx — "Can I close today?"
//
// The owner's end-of-day ritual.
// Shows expected cash, input for actual cash, and variance.

import { useState, useEffect } from 'react';
import { fmt } from '../../utils/numformat';
import db from '../../db';
import Chapter from './Chapter';

function startOfLocalDay(ms = Date.now()) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function ClosingSection({
  metrics,
  isStaffView = false,
  timeRange = 'today',
  shopProfile,
  lang = 'en',
  onClosingChange,
}) {
  const [actualCash, setActualCash] = useState('');
  const [actualTransfer, setActualTransfer] = useState('');
  const [closings, setClosings] = useState([]);
  const [closingMessage, setClosingMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.getDailyClosings();
        if (!cancelled) {
          setClosings(rows);
          // Check if today is closed
          const todayStart = startOfLocalDay(Date.now());
          const todayClosing = rows.find(c => c.closed_at >= todayStart);
          onClosingChange?.({
            done: Boolean(todayClosing),
            cashVariance: todayClosing ? (todayClosing.actual_cash || 0) - (todayClosing.recorded_cash || 0) : 0,
          });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const cashExpected = metrics?.cashExpected || 0;
  const transferRecorded = metrics?.transferRecorded || 0;
  const actualCashVal = Number(actualCash) || 0;
  const actualTransferVal = Number(actualTransfer) || 0;
  const cashVariance = actualCashVal - cashExpected;
  const transferVariance = actualTransferVal - transferRecorded;
  const isBalanced = actualCashVal > 0 && Math.abs(cashVariance) <= cashExpected * 0.05;

  const handleSave = async () => {
    if (actualCashVal === 0 && actualTransferVal === 0) return;
    try {
      await db.saveDailyClosing({
        recorded_sold: metrics?.totalSold || 0,
        recorded_spent: metrics?.spentToday || 0,
        recorded_collected: metrics?.creditCollected || 0,
        recorded_cash: cashExpected,
        recorded_transfer: transferRecorded,
        actual_cash: actualCashVal,
        actual_transfer: actualTransferVal,
        actor_name_snapshot: shopProfile?.name || 'Owner',
        actor_role: 'owner',
      });
      const all = await db.getDailyClosings();
      setClosings(all);
      setClosingMessage(lang === 'am' ? 'ተመጣጣኚ ሆኗል' : 'Saved successfully');
      setActualCash('');
      setActualTransfer('');
      // Notify parent that closing changed
      onClosingChange?.({
        done: true,
        cashVariance: actualCashVal - cashExpected,
      });
    } catch {}
  };

  // Staff can't see closing
  if (isStaffView) return null;

  // Only show for today view
  if (timeRange !== 'today') return null;

  // Check if today is already closed
  const todayStart = startOfLocalDay(Date.now());
  const todayClosing = closings.find(c => c.closed_at >= todayStart);

  return (
    <Chapter
      title={lang === 'am' ? 'የቀን ማጠቃለያ' : 'Shop Closing'}
      subtitle={todayClosing
        ? (lang === 'am' ? 'ቀንዎ ተጠናቅቋል' : 'Day closed successfully')
        : (lang === 'am' ? 'ቀንዎን ማጠቃለያ ይችላሉ?' : 'Can you close today?')
      }
      badge={todayClosing ? { text: '✓', color: '#16a34a' } : null}
      defaultExpanded={!todayClosing}
    >
      <div style={{ marginTop: 8 }}>
        {/* If today is already closed, show summary */}
        {todayClosing ? (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: '#dcfce7',
            border: '1px solid #bbf7d0',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 20, marginBottom: 8 }}>✅</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#16a34a' }}>
              {lang === 'am' ? 'ቀንዎ ተጠናቅቋል' : 'Day closed successfully'}
            </p>
            <p style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
              {lang === 'am' ? 'በ' : 'by'} {todayClosing.actor_name_snapshot || 'Owner'} · {fmt((todayClosing.actual_cash || 0) + (todayClosing.actual_transfer || 0))} ETB
            </p>
          </div>
        ) : (
          <>
            {/* Expected amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{
            background: '#f9fafb',
            borderRadius: 8,
            padding: 10,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'የሚጠበቅ ጥሬ' : 'Expected cash'}
            </p>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#374151', marginTop: 4 }}>
              {fmt(cashExpected)}
            </p>
          </div>
          <div style={{
            background: '#f9fafb',
            borderRadius: 8,
            padding: 10,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
              {lang === 'am' ? 'የሚጠበቅ ዝውውር' : 'Expected transfer'}
            </p>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#374151', marginTop: 4 }}>
              {fmt(transferRecorded)}
            </p>
          </div>
        </div>

        {/* Input fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>
              {lang === 'am' ? 'በእጅ ጥሬ ገንዘብ' : 'Actual cash'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={actualCash}
              onChange={e => setActualCash(e.target.value)}
              placeholder="0"
              style={{
                minHeight: 42,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 16,
                fontWeight: 900,
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>
              {lang === 'am' ? 'ትራንስፈር' : 'Actual transfer'}
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={actualTransfer}
              onChange={e => setActualTransfer(e.target.value)}
              placeholder="0"
              style={{
                minHeight: 42,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 16,
                fontWeight: 900,
                textAlign: 'center',
                outline: 'none',
              }}
            />
          </label>
        </div>

        {/* Variance display */}
        {actualCashVal > 0 && (
          <div style={{
            padding: 12,
            borderRadius: 10,
            textAlign: 'center',
            marginBottom: 12,
            background: isBalanced ? '#dcfce7' : '#fef2f2',
            border: `1px solid ${isBalanced ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280' }}>
              {lang === 'am' ? 'ልዩነት' : 'Difference'}
            </p>
            <p style={{
              fontSize: 20,
              fontWeight: 950,
              color: isBalanced ? '#16a34a' : '#dc2626',
              marginTop: 4,
            }}>
              {isBalanced
                ? (lang === 'am' ? 'ተመጣጣኚ ✓' : 'Balanced ✓')
                : `${cashVariance >= 0 ? '+' : ''}${fmt(cashVariance)} ETB`
              }
            </p>
          </div>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={actualCashVal === 0 && actualTransferVal === 0}
          style={{
            width: '100%',
            minHeight: 44,
            border: 'none',
            borderRadius: 10,
            background: (actualCashVal > 0 || actualTransferVal > 0) ? '#1B4332' : '#e5e7eb',
            color: (actualCashVal > 0 || actualTransferVal > 0) ? '#fff' : '#9ca3af',
            fontSize: 14,
            fontWeight: 900,
            cursor: (actualCashVal > 0 || actualTransferVal > 0) ? 'pointer' : 'not-allowed',
          }}
        >
          {lang === 'am' ? 'ቀን አስገምጅ' : 'Close Day'}
        </button>

        {closingMessage && (
          <p style={{ color: '#15803d', fontSize: 12, fontWeight: 800, marginTop: 8, textAlign: 'center' }}>
            {closingMessage}
          </p>
        )}

        {/* Past closings */}
        {closings.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {lang === 'am' ? 'ያለፉ ማውጫዎች' : 'Past closings'}
            </p>
            {closings.slice(0, 3).map((c, i) => (
              <div key={c.id || i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                fontWeight: 650,
                color: '#374151',
                padding: '6px 0',
                borderBottom: i < closings.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                <span>
                  {new Date(c.closed_at).toLocaleDateString()} · {c.actor_name_snapshot || ''}
                </span>
                <span style={{ color: '#15803d' }}>
                  {fmt((c.actual_cash || 0) + (c.actual_transfer || 0))} ETB
                </span>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </div>
    </Chapter>
  );
}
