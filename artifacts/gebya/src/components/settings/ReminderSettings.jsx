import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../../context/LangContext';
import { fireToast } from '../Toast';
import { remindersApi } from '../../api/reminders';
import { getAuthToken } from '../../utils/syncEngine';

function ReminderSettings({ shopId, lang }) {
  const { t } = useLang();
  const [frequency, setFrequency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const newFreq = enabled ? 'daily' : 'disabled';
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
                ? (lang === 'am' ? 'በየቀኑ ይላካል ከዚህ በላይ ያለበት ጊዜ' : 'Sends daily reminders to customers')
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
        {isEnabled && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {lang === 'am' ? 'ደረጃኛ:' : 'Frequency:'}
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                {frequency === 'daily'
                  ? (lang === 'am' ? 'በየቀኑ' : 'Daily')
                  : (lang === 'am' ? 'በየሳምንቱ' : 'Weekly')}
              </span>
            </div>
            <div className="text-[0.65rem] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'am'
                ? 'በመረጃ ውስጥ ይላካል — 1-7 ቀን በላይ ወይም በላይ'
                : 'Sends based on credit due date — 1-7 days before/after due'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReminderSettings;
