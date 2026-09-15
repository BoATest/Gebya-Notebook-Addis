import { useState, useEffect, useCallback } from 'react';
import { fireToast } from '../Toast';
import { remindersApi } from '../../api/reminders';
import { getAuthToken } from '../../utils/syncEngine';

// The reminder engine understands EXACTLY these three values — verified against
// artifacts/api-server/src/routes/reminders.ts (frequencySchema =
// z.enum(['daily','weekly','disabled'])) and services/reminderScheduler.ts
// (bails out on 'disabled'; otherwise uses a 24h window for 'daily' and a
// 7-day window for 'weekly'). There is no 'monthly' anywhere in the engine,
// so the UI must never offer it.
const SELECTABLE_FREQUENCIES = [
  { key: 'daily', label: { en: 'Daily', am: 'በየቀኑ' } },
  { key: 'weekly', label: { en: 'Weekly', am: 'በየሳምንቱ' } },
];

function ReminderSettings({ shopId, lang }) {
  const [frequency, setFrequency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Last non-disabled frequency — remembered so re-enabling the toggle
  // restores the user's Daily/Weekly choice instead of always resetting to daily.
  const [lastEnabledFreq, setLastEnabledFreq] = useState('daily');

  const loadConfig = useCallback(async () => {
    if (!shopId) return;
    const token = await getAuthToken();
    if (!token) {
      setFrequency('daily');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await remindersApi.getShopDefault(shopId);
      setFrequency(data?.frequency || 'daily');
    } catch (err) {
      console.error('Failed to load reminder config:', err);
      setFrequency('daily');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleToggle = async (enabled) => {
    if (!shopId) return;
    if (!enabled && frequency && frequency !== 'disabled') {
      setLastEnabledFreq(frequency); // remember choice for re-enable
    }
    const newFreq = enabled
      ? (lastEnabledFreq && lastEnabledFreq !== 'disabled' ? lastEnabledFreq : 'daily')
      : 'disabled';
    try {
      setSaving(true);
      await remindersApi.setShopDefault(shopId, newFreq);
      setFrequency(newFreq);
      fireToast(
        enabled
          ? (lang === 'am' ? 'ራስ-ሰር ማስታወቂያ ተከፍቷል' : 'Auto-reminders enabled')
          : (lang === 'am' ? 'ራስ-ሰር ማስታወቂያ ተዘግቷል' : 'Auto-reminders paused'),
        2000
      );
    } catch (err) {
      console.error('Failed to update reminder config:', err);
      fireToast(lang === 'am' ? 'ማስተካከል አልተሳካም' : 'Failed to update', 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleFrequency = async (next) => {
    if (!shopId || next === frequency) return;
    if (!SELECTABLE_FREQUENCIES.some((f) => f.key === next)) return;

    const previous = frequency;
    try {
      setSaving(true);
      await remindersApi.setShopDefault(shopId, next);
      setFrequency(next);
      fireToast(
        lang === 'am' ? 'ድግግሞሽ ተስተካክሏል' : 'Reminder frequency updated',
        2000
      );
    } catch (err) {
      console.error('Failed to update reminder frequency:', err);
      setFrequency(previous);
      fireToast(lang === 'am' ? 'ማስተካከል አልተሳካም' : 'Failed to update', 2500);
    } finally {
      setSaving(false);
    }
  };

  const isEnabled = frequency && frequency !== 'disabled';

  return (
    <div className="card">
      <div className="card-header">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {lang === 'am' ? 'ራስ-ሰር ማስታወቂያ' : 'AUTO REMINDERS'}
        </span>
      </div>
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900">
              {lang === 'am' ? 'ተገዢ ማስታወቂያ' : 'Reminder Notifications'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {isEnabled
                ? (lang === 'am'
                  ? (frequency === 'weekly' ? 'በየሳምንቱ ማስታወቂያ ይላካል' : 'በየቀኑ ማስታወቂያ ይላካል')
                  : (frequency === 'weekly'
                    ? 'Sends weekly reminders to customers'
                    : 'Sends daily reminders to customers'))
                : (lang === 'am' ? 'ማስታወቂያ ተዘግቷል' : 'Reminders are paused')}
            </div>
          </div>
          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={loading || saving}
              aria-label={isEnabled
                ? (lang === 'am' ? 'ማስታወቂያ አልተሰጠም' : 'Pause reminders')
                : (lang === 'am' ? 'ማስታወቂያ አድረጹ' : 'Enable reminders')
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>
        {isEnabled ? (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {lang === 'am' ? 'ድግግሞሽ:' : 'Frequency:'}
              </span>
              {/* Segmented Daily/Weekly control — the ONLY values the reminder
                  engine supports (besides "disabled", handled by the toggle).
                  No 'monthly' option is offered because the engine ignores it. */}
              <div
                className="flex rounded-lg overflow-hidden flex-shrink-0"
                style={{ border: '1px solid var(--color-border)' }}
                role="group"
                aria-label={lang === 'am' ? 'ድግግሞሽ' : 'Reminder frequency'}
              >
                {SELECTABLE_FREQUENCIES.map((f) => {
                  const active = frequency === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => handleFrequency(f.key)}
                      disabled={saving || loading}
                      aria-pressed={active}
                      className="px-3 py-1.5 text-xs font-bold transition-colors"
                      style={{
                        background: active ? 'var(--color-primary, #1B4332)' : 'var(--color-surface, #fff)',
                        color: active ? '#fff' : 'var(--color-text-muted)',
                      }}
                    >
                      {lang === 'am' ? f.label.am : f.label.en}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-[0.65rem] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'am'
                ? 'ከዘገዬ ቀን በ1-7 ቀን ውስጥ ይላካል'
                : 'Sends based on credit due date — 1-7 days before/after due'}
            </div>
          </div>
        ) : (
          /* Why reminders are off — an off state with no explanation reads
             like a bug (owner request, Gate A fold-in). */
          <p className="text-[0.65rem] mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am'
              ? 'ራስ-ሰር ማስታወቂያ ተዘግቷል። ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ።'
              : 'Automatic reminders are off. You can still remind a customer from their page.'}
          </p>
        )}
      </div>
    </div>
  );
}

export default ReminderSettings;
