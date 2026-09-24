import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Bell, Moon } from 'lucide-react';
import { fireToast } from '../Toast';
import { getAuthToken } from '../../utils/syncEngine';

// R2.2 — 5 collapsible groups. Keys verbatim from NOTIFICATION_TYPES below.
// Server contract unchanged: same endpoints, same preferences shape.
const R2_2_GROUPS = [
  {
    key: 'money_in',
    title: { en: 'Money in', am: 'ገቢ ገንዘብ' },
    locked: false,
    types: ['sale', 'payment'],
  },
  {
    key: 'credit_dubie',
    title: { en: 'Credit–Dubie', am: 'ዱቤ' },
    locked: true,
    lockNote: { en: 'Cannot disable', am: 'መዝጋት አይቻልም' },
    types: ['credit', 'overdue_alert'],
  },
  {
    key: 'money_out',
    title: { en: 'Money out', am: 'ወጪ ገንዘብ' },
    locked: false,
    types: ['supplier_payment', 'supplier_purchase', 'expense'],
  },
  {
    key: 'team_security',
    title: { en: 'Team & security', am: 'ቡድናዊ እና ደህንነት' }, // ⚠ AM draft for reviewer
    locked: true,
    lockNote: { en: 'Cannot disable', am: 'መዝጋት አይቻልም' },
    types: ['staff_joined', 'staff_submitted_collection', 'rbac_violation', 'device_approval'],
  },
  {
    key: 'gebya_support',
    title: { en: 'Gebya & support', am: 'ገበያ እና ድጋፍ' },
    locked: false,
    types: ['announcement', 'support_reply'],
  },
];

const NOTIFICATION_TYPES = [
  { key: 'sale', label: { en: 'Sales', am: 'ሽያጭ' }, icon: '💰' },
  { key: 'credit', label: { en: 'Credit Given', am: 'ተሰጠ ብር' }, icon: '👥' },
  { key: 'payment', label: { en: 'Payments Received', am: 'ክፍያ ተቀባይ' }, icon: '✅' },
  { key: 'supplier_payment', label: { en: 'Supplier Payments', am: 'የአቅራቢያ ክፍያ' }, icon: '🤝' },
  { key: 'supplier_purchase', label: { en: 'Supplier Purchases', am: 'የአቅራቢያ ግዢ' }, icon: '📦' },
  { key: 'expense', label: { en: 'Expenses', am: 'ወጪ' }, icon: '🛒' },
  { key: 'staff_joined', label: { en: 'Staff Joined', am: 'ሰራተኛ ተቀላቅሏል' }, icon: '👤' },
  { key: 'rbac_violation', label: { en: 'Security Alerts', am: 'የደህንነት ማስጠንቂያ' }, icon: '⚠️' },
  { key: 'overdue_alert', label: { en: 'Overdue Payments', am: 'የጊዜ ያለፈ ክፍያ' }, icon: '⏰' },
  { key: 'device_approval', label: { en: 'Device Approval', am: 'የስልክ ማጽደቅ' }, icon: '📱' },
  { key: 'announcement', label: { en: 'Announcements', am: 'ማስታወቂያ' }, icon: '📣' },
  { key: 'support_reply', label: { en: 'Support Replies', am: 'የድጋፍ መልስ' }, icon: '💬' },
  { key: 'staff_submitted_collection', label: { en: 'Staff Submissions', am: 'የሰራተኛ ስብስብ' }, icon: '📋' },
];

function GroupHeader({ group, isExpanded, onToggle, lang }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-2 text-left"
      style={{
        opacity: group.locked ? 0.6 : 1,
        cursor: group.locked ? 'default' : 'pointer',
      }}
    >
      {isExpanded ? (
        <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-soft)' }} />
      ) : (
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-soft)' }} />
      )}
      <span className="text-sm font-bold flex-1" style={{ color: 'var(--color-text)' }}>
        {group.title[lang] || group.title.en}
      </span>
      {group.locked && (
        <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--color-success)' }}>
          {lang === 'am' ? 'የተወሠነ' : 'Locked ON'} {/* ⚠ AM draft for reviewer */}
        </span>
      )}
    </button>
  );
}

function NotificationRow({ type, prefs, onChange, lang, disabled }) {
  const checked = disabled ? true : prefs.inApp !== false;

  const handleToggle = (value) => {
    if (disabled) return;
    onChange(type.key, { ...prefs, inApp: value });
  };

  return (
    <div className="flex items-center gap-3 py-1.5 px-6" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
      <span className="text-sm flex-shrink-0">{type.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold" style={{ color: 'var(--color-text)' }}>
          {type.label[lang] || type.label.en}
        </p>
      </div>
      <label className="toggle-switch inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={disabled}
          aria-label={`${type.label.en} toggle`}
          style={{ display: 'none' }}
        />
        <span
          className="toggle-slider"
          style={{
            width: '36px',
            height: '20px',
            background: checked ? 'var(--color-primary)' : 'var(--color-border)',
            borderRadius: '10px',
            position: 'relative',
            transition: 'background 0.2s',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <span
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: checked ? '20px' : '2px',
              transition: 'left 0.2s',
            }}
          />
        </span>
      </label>
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
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        setLoading(false);
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in required to load preferences', 3000);
        return;
      }

      const res = await fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setPreferences(data.preferences || {});
      setQuietHoursStart(data.quietHoursStart || '22:00');
      setQuietHoursEnd(data.quietHoursEnd || '06:00');
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { loadPreferences(); }, [loadPreferences]);

  const handleTypeChange = useCallback(async (typeKey, newPrefs) => {
    const updated = { ...preferences, [typeKey]: newPrefs };
    setPreferences(updated);

    // Auto-save
    try {
      setSaving(true);
      const token = await getAuthToken();
      if (!token) {
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in to save preferences', 3000);
        return;
      }

      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preferences: updated }),
      });
    } catch (err) {
      console.error('Failed to save preference:', err);
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
      const token = await getAuthToken();
      if (!token) {
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in to save quiet hours', 3000);
        return;
      }

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
      const token = await getAuthToken();
      if (!token) {
        fireToast(lang === 'am' ? 'መለያ ያስፈልጋል። ይግቡ።' : 'Sign in to reset preferences', 3000);
        return;
      }

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
        {R2_2_GROUPS.map((group) => {
          const isExpanded = collapsedGroups[group.key] !== true;

          return (
            <div key={group.key} className="mb-2" style={{ borderTop: '1px solid var(--color-border-light)' }}>
              <GroupHeader
                group={group}
                isExpanded={isExpanded}
                onToggle={() => toggleGroup(group.key)}
                lang={lang}
              />

              {isExpanded && (
                <div className="bg-gray-50">
                  {group.types.map((typeKey) => {
                    const type = NOTIFICATION_TYPES.find(t => t.key === typeKey);
                    if (!type) return null;
                    return (
                      <NotificationRow
                        key={typeKey}
                        type={type}
                        prefs={preferences[typeKey] || { inApp: true, push: true }}
                        onChange={handleTypeChange}
                        lang={lang}
                        disabled={group.locked}
                      />
                    );
                  })}
                  {group.lockNote && (
                    <p className="text-[10px] mt-1 px-6 pb-2" style={{ color: 'var(--color-text-muted)' }}>
                      {group.lockNote[lang] || group.lockNote.en}
                    </p>
                  )}
                </div>
              )}
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