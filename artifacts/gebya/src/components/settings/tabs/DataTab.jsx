import { useState, useEffect } from 'react';
import db from '../../../db';
import BackupDataPanel from '../BackupDataPanel';
import DisplayPrivacyPanel from '../DisplayPrivacyPanel';
import ExportPanel from '../ExportPanel';
import PwaInstallPanel from '../../PwaInstallPanel';
import TabCard from '../TabCard';
import { toEthiopianClock, armDailyReminder, disarmDailyReminder, requestReminderPermission } from '../../../utils/dailyReminder';

const DEFAULT_REMINDER_TIME = '20:00';

export default function DataTab({
  transactions,
  customerSummaries,
  supplierSummaries,
  pwa,
  theme,
  setTheme,
  hidden,
  toggle,
  lang,
}) {
  const totalEntries = (transactions || []).length;
  const dataBadge = totalEntries > 0 ? `${totalEntries}` : (lang === 'am' ? 'ባዶ' : 'Empty');
  const dataTone = totalEntries > 0 ? 'ok' : 'neutral';

  const aboutTapHint = lang === 'am' ? 'ስሪት 1.0' : 'Version 1.0';

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(DEFAULT_REMINDER_TIME);

  useEffect(() => {
    db.settings.get('daily_reminder').then(row => {
      if (row?.value) {
        setReminderEnabled(Boolean(row.value.enabled));
        if (row.value.time) setReminderTime(row.value.time);
      }
    }).catch(() => {});
  }, []);

  // Keep an in-app scheduler armed while enabled.
  useEffect(() => {
    if (reminderEnabled) armDailyReminder(reminderTime);
    else disarmDailyReminder();
    return () => disarmDailyReminder();
  }, [reminderEnabled, reminderTime]);

  const handleReminderToggle = async (e) => {
    const next = e.target.checked;
    setReminderEnabled(next);
    try { await db.settings.put({ key: 'daily_reminder', value: { enabled: next, time: reminderTime } }); } catch { /* ignore */ }
    if (next) {
      const perm = await requestReminderPermission();
      if (perm === 'denied') {
        // Still works as an in-app toast; just note it.
      }
    }
  };

  const handleTimeChange = async (e) => {
    const next = e.target.value || DEFAULT_REMINDER_TIME;
    setReminderTime(next);
    try { await db.settings.put({ key: 'daily_reminder', value: { enabled: reminderEnabled, time: next } }); } catch { /* ignore */ }
  };

  const converted = toEthiopianClock(reminderTime);

  return (
    <div>
      <TabCard
        icon="📲"
        title={lang === 'am' ? 'መተግበሪያውን ይጫኑ' : 'Install App'}
        subtitle={pwa?.isStandalone
          ? (lang === 'am' ? 'ተጭኗል' : 'Installed')
          : (lang === 'am' ? 'ያለ ኢንተርኔት ለመስራት ይጫኑ' : 'Install for offline use')}
        badge={pwa?.isStandalone ? (lang === 'am' ? 'ተጭኗል' : 'Installed') : null}
        badgeTone={pwa?.isStandalone ? 'ok' : null}
        defaultOpen={!pwa?.isStandalone}
      >
        <PwaInstallPanel pwa={pwa} variant="settings" />
      </TabCard>

      <TabCard
        icon="☁️"
        title={lang === 'am' ? 'ምትኬ እና ውሂብ' : 'Backup & Data'}
        subtitle={lang === 'am'
          ? `${totalEntries} መዝገብ`
          : `${totalEntries} entries`}
        badge={dataBadge}
        badgeTone={dataTone}
      >
        <BackupDataPanel
          transactions={transactions}
          customerSummaries={customerSummaries}
          supplierSummaries={supplierSummaries}
        />
      </TabCard>

      <TabCard
        icon="📤"
        title={lang === 'am' ? 'ውሂብ ያስወጡ' : 'Export Data'}
        subtitle={lang === 'am' ? 'ለሂሳብ ወይም ለብድር ማመልከቻ' : 'For accountant or loan application'}
        badgeTone="neutral"
      >
        <ExportPanel
          transactions={transactions}
          customerSummaries={customerSummaries}
          supplierSummaries={supplierSummaries}
        />
      </TabCard>

      <TabCard
        icon="🔔"
        title={lang === 'am' ? 'የዕለታዊ ማስታወሻ' : 'Daily Recording Reminder'}
        subtitle={lang === 'am' ? 'የሽያጭ ማስታወሻ ደውል' : 'Get reminded to record sales'}
        badgeTone="neutral"
      >
        <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden px-5 py-4 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="text-sm font-bold text-gray-800">
              {lang === 'am' ? 'ማስታወሻ አብራ' : 'Enable daily reminder'}
            </div>
            <label className="switch">
              <input type="checkbox" checked={reminderEnabled} onChange={handleReminderToggle} />
              <span className="slider" />
            </label>
          </label>

          <div className={reminderEnabled ? '' : 'opacity-40 pointer-events-none'}>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">
              {lang === 'am' ? '��ስታወሻ ጊዜ' : 'Reminder time'}
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={handleTimeChange}
              className="w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none"
              style={{ borderColor: '#e8e2d8', color: '#374151' }}
            />
            <div className="mt-2 text-xs" style={{ color: '#6b7280' }}>
              {lang === 'am'
                ? `በኢትዮጵያ ሰዓት፡ ${converted.ethLabel} · ከ${converted.localLabel} ይድረስ`
                : `Ethiopian time: ${converted.ethLabel} · fires at ${converted.localLabel}`}
            </div>
          </div>
        </div>
      </TabCard>

      <TabCard
        icon="🎨"
        title={lang === 'am' ? 'ማሳያ እና ግላዊነት' : 'Display & Privacy'}
        subtitle={lang === 'am' ? 'ጨለማ/ብርሃን ሁነታ፣ መጠኖችን ደብቅ' : 'Dark/light mode, hide amounts'}
        badgeTone="neutral"
      >
        <DisplayPrivacyPanel />
      </TabCard>

      <TabCard
        icon="ℹ️"
        title={lang === 'am' ? 'ስለ ጌብያ' : 'About Gebya'}
        subtitle={aboutTapHint}
        badgeTone="neutral"
      >
        <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden px-5 py-4 text-sm text-gray-500">
          <p className="font-bold text-gray-800 mb-1">Gebya · የንግድ ማስታወሻ</p>
          <p className="text-xs mb-2">Business Notebook for Ethiopian shopkeepers</p>
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            {lang === 'am' ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል' : 'All data stays on this phone only'}
          </p>
        </div>
      </TabCard>
    </div>
  );
}
