import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Bell, Moon } from 'lucide-react';
import { fireToast } from '../Toast';
import { getAuthToken } from '../../utils/syncEngine';
import { ensureFreshToken } from '../../utils/authClient';
import { useAuthStore } from '../../stores/authStore';
import {
  NOTIFICATION_GROUPS,
  getNotificationType,
  isNotificationGroupEnabled,
  normalizeLockedNotificationPreferences,
  setNotificationGroupPreference,
} from './notificationGroups';

// Type labels and group metadata live in notificationGroups.js.

async function resolveAuthToken(cachedToken) {
  if (cachedToken) return cachedToken;
  const storedToken = await getAuthToken();
  if (storedToken) return storedToken;

  try {
    const refreshed = await ensureFreshToken();
    return refreshed?.token || await getAuthToken();
  } catch {
    return null;
  }
}

function PreferenceSwitch({ checked, disabled = false, label, onChange, saving }) {
  const isDisabled = disabled || saving;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={isDisabled}
      onClick={() => onChange?.(!checked)}
      className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
      style={{
        background: checked ? 'var(--color-primary)' : 'var(--color-border)',
        opacity: disabled ? 0.55 : 1,
        cursor: isDisabled ? 'default' : 'pointer',
      }}
    >
      <span
        className="block h-4 w-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

function GroupHeader({ group, isExpanded, checked, onToggle, onCheckedChange, lang, saving }) {
  const titleId = `notification-group-title-${group.key}`;
  const panelId = `notification-group-panel-${group.key}`;

  return (
    <div className="flex items-center gap-2 py-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="min-w-0 flex items-center gap-2 flex-1 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-soft)' }} />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-soft)' }} />
        )}
        <span id={titleId} className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>
          {group.title[lang] || group.title.en}
        </span>
        {group.locked && (
          <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--color-success)' }}>
            {lang === 'am' ? 'የተወሠነ' : 'Locked ON'}
          </span>
        )}
      </button>
      <PreferenceSwitch
        checked={checked}
        disabled={group.locked}
        saving={saving}
        label={`${group.title.en} notifications`}
        onChange={onCheckedChange}
      />
    </div>
  );
}

function NotificationTypeList({ group, lang }) {
  return (
    <div className="pb-2">
      {group.types.map((typeKey) => {
        const type = getNotificationType(typeKey);
        if (!type) return null;
        return (
          <div
            key={typeKey}
            className="flex items-center gap-3 py-1.5 px-6"
            style={{ borderBottom: '1px solid var(--color-border-light)' }}
          >
            <span className="text-sm flex-shrink-0">{type.icon}</span>
            <p className="text-[12px]" style={{ color: 'var(--color-text)' }}>
              {type.label[lang] || type.label.en}
            </p>
          </div>
        );
      })}
      {group.lockNote && (
        <p className="text-[10px] mt-1 px-6 pt-1" style={{ color: 'var(--color-text-muted)' }}>
          {group.lockNote[lang] || group.lockNote.en}
        </p>
      )}
    </div>
  );
}

function SecurityRow({ type, lang, saving }) {
  return (
    <div
      className="flex items-center gap-3 py-2 px-6"
      style={{ borderTop: '1px solid var(--color-border-light)' }}
    >
      <span className="text-sm flex-shrink-0">{type.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold" style={{ color: 'var(--color-text)' }}>
          {type.label[lang] || type.label.en}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'am' ? 'መዝጋት አይቻልም' : 'Cannot disable'}
        </p>
      </div>
      <PreferenceSwitch checked disabled saving={saving} label="Security alerts" />
    </div>
  );
}

function QuietHoursRow({ startTime, endTime, onChange, lang }) {
  return (
    <div className="py-3 mt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Moon className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
          {lang === 'am' ? 'የማስጠንቂያ ሰዓት' : 'Quiet Hours'}
        </span>
      </div>
      <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {lang === 'am'
          ? 'በዚህ ጊዜ ውስጥ push ማስጠንቂያ አይልክም'
          : 'Push notifications silenced during this window'}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-soft)' }}>
            {lang === 'am' ? 'ከ' : 'From'}
          </label>
          <input
            type="time"
            value={startTime || '22:00'}
            onChange={(e) => onChange({ startTime: e.target.value, endTime })}
            className="w-full mt-1 px-2 py-1.5 text-xs rounded-lg border"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
        <span className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>—</span>
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-soft)' }}>
            {lang === 'am' ? 'እስከ' : 'Until'}
          </label>
          <input
            type="time"
            value={endTime || '06:00'}
            onChange={(e) => onChange({ startTime, endTime: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 text-xs rounded-lg border"
            style={{ borderColor: 'var(--color-border)' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function NotificationPreferences({ lang }) {
  const [preferences, setPreferences] = useState({});
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('06:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [collapsedGroups, setCollapsedGroups] = useState({});
  const authChecked = useAuthStore((state) => state.checked);
  const authTokenRef = useRef(null);

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const token = await resolveAuthToken(authTokenRef.current);
      if (!token) {
        setLoadError(true);
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in required to load preferences', 3000);
        return;
      }

      authTokenRef.current = token;
      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const loadedPreferences = data.preferences || {};
      const normalizedPreferences = normalizeLockedNotificationPreferences(loadedPreferences);
      setPreferences(normalizedPreferences);
      setQuietHoursStart(data.quietHoursStart || '22:00');
      setQuietHoursEnd(data.quietHoursEnd || '06:00');
    } catch (err) {
      setLoadError(true);
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    if (authChecked) loadPreferences();
  }, [authChecked, loadPreferences]);

  const handleGroupChange = useCallback(async (group, enabled) => {
    if (group.locked) return;
    const previous = preferences;
    const updated = setNotificationGroupPreference(group, preferences, enabled);
    setPreferences(updated);

    try {
      setSaving(true);
      const token = await resolveAuthToken(authTokenRef.current);
      if (!token) {
        setPreferences(previous);
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in to save preferences', 3000);
        return;
      }
      authTokenRef.current = token;

      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: updated }),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
    } catch (err) {
      setPreferences(previous);
      console.error('Failed to save notification group:', err);
      fireToast(lang === 'am' ? 'ማስተካከል አልተሳካም' : 'Failed to save', 2500);
    } finally {
      setSaving(false);
    }
  }, [preferences, lang]);

  const handleQuietHoursChange = useCallback(async ({ startTime, endTime }) => {
    setQuietHoursStart(startTime);
    setQuietHoursEnd(endTime);

    try {
      setSaving(true);
      const token = await resolveAuthToken(authTokenRef.current);
      if (!token) {
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in to save quiet hours', 3000);
        return;
      }
      authTokenRef.current = token;

      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quietHoursStart: startTime, quietHoursEnd: endTime }),
      });
    } catch (err) {
      console.error('Failed to save quiet hours:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    try {
      setSaving(true);
      const token = await resolveAuthToken(authTokenRef.current);
      if (!token) {
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in to reset preferences', 3000);
        return;
      }
      authTokenRef.current = token;

      await fetch('/api/notifications/preferences/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadPreferences();
      fireToast(lang === 'am' ? 'ወደ ነባሪ ተመልሷል' : 'Reset to defaults', 2000);
    } catch (err) {
      console.error('Failed to reset preferences:', err);
    } finally {
      setSaving(false);
    }
  }, [loadPreferences, lang]);

  const toggleGroup = (groupKey) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {lang === 'am' ? 'የማስጠንቂያ ምርጫ' : 'NOTIFICATION PREFERENCES'}
          </span>
        </div>
        <div className="card-body flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {lang === 'am' ? 'የማስጠንቂያ ምርጫ' : 'NOTIFICATION PREFERENCES'}
          </span>
        </div>
        <div className="card-body py-6 text-center" role="alert">
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>
            {lang === 'am' ? 'የማስጠንቂያ ምርጫዎችን መጫን አልተቻለም።' : 'Could not load notification preferences.'}
          </p>
          <button
            type="button"
            onClick={loadPreferences}
            className="mt-3 text-xs font-bold"
            style={{ color: 'var(--color-primary)' }}
          >
            {lang === 'am' ? 'እንደገና ሞክር' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {lang === 'am' ? 'የማስጠንቂያ ምርጫ' : 'NOTIFICATION PREFERENCES'}
        </span>
      </div>
      <div className="card-body">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              {lang === 'am' ? 'ምን ይላኩ' : 'What to receive'}
            </span>
          </div>
          {saving && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-soft)' }}>
              {lang === 'am' ? 'በመቀየር...' : 'Saving...'}
            </span>
          )}
        </div>

        {/* R2.2 groups — default expanded */}
        {NOTIFICATION_GROUPS.map((group) => {
          const isExpanded = collapsedGroups[group.key] !== true;
          const securityType = group.securityType ? getNotificationType(group.securityType) : null;

          return (
            <div
              key={group.key}
              className="mb-2"
              style={{ borderTop: '1px solid var(--color-border-light)' }}
            >
              <GroupHeader
                group={group}
                isExpanded={isExpanded}
                checked={isNotificationGroupEnabled(group, preferences)}
                onToggle={() => toggleGroup(group.key)}
                onCheckedChange={(enabled) => handleGroupChange(group, enabled)}
                lang={lang}
                saving={saving}
              />

              <div
                id={`notification-group-panel-${group.key}`}
                role="region"
                aria-labelledby={`notification-group-title-${group.key}`}
                hidden={!isExpanded}
                className="bg-gray-50"
              >
                <NotificationTypeList group={group} lang={lang} />
                {securityType && <SecurityRow type={securityType} lang={lang} saving={saving} />}
              </div>
            </div>
          );
        })}

        {/* Quiet hours — defaults 22:00–06:00 */}
        <QuietHoursRow
          startTime={quietHoursStart}
          endTime={quietHoursEnd}
          onChange={handleQuietHoursChange}
          lang={lang}
        />

        {/* Reset button */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={handleReset}
            disabled={saving}
            className="text-[11px] font-bold px-3 py-1.5"
            style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none' }}
          >
            {lang === 'am' ? 'ወደ ነባሪ ተመልስ' : 'Reset to defaults'}
          </button>
        </div>
      </div>
    </div>
  );
}