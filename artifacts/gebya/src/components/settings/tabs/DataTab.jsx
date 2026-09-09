import { lazy, Suspense } from 'react';
import BackupDataPanel from '../BackupDataPanel';
import DisplayPrivacyPanel from '../DisplayPrivacyPanel';
import ExportPanel from '../ExportPanel';
import PwaInstallPanel from '../../PwaInstallPanel';
import SyncStatusIndicator from '../../SyncStatusIndicator';
import TabCard from '../TabCard';
import { usePwaInstall } from '../../../hooks/usePwaInstall.js';

// Build info injected at bundle time by Vite
const BUILD_VERSION = import.meta.env?.VITE_APP_VERSION || 'dev';
const BUILD_DATE = import.meta.env?.VITE_BUILD_DATE || '';

export default function DataTab({
  transactions,
  customerSummaries,
  lang,
}) {
  const totalEntries = (transactions || []).length;
  const dataBadge = totalEntries > 0 ? `${totalEntries}` : (lang === 'am' ? 'ባዶ' : 'Empty');
  const dataTone = totalEntries > 0 ? 'ok' : 'neutral';

  const pwa = usePwaInstall();

  return (
    <div>
      {/* Your Data — backup + export combined */}
      <TabCard
        icon="📦"
        title={lang === 'am' ? 'የእርስዎ ውሂብ' : 'Your Data'}
        subtitle={lang === 'am'
          ? `${totalEntries} መዝገብ · ምትኬ እና ውጤት`
          : `${totalEntries} entries · backup & export`}
        badge={dataBadge}
        badgeTone={dataTone}
      >
        <BackupDataPanel
          transactions={transactions}
          customerSummaries={customerSummaries}
        />
        <div className="mt-3">
          <ExportPanel transactions={transactions} />
        </div>
      </TabCard>

      {/* Display & Privacy */}
      <TabCard
        icon="🎨"
        title={lang === 'am' ? 'ማሳያ እና ግላዊነት' : 'Display & Privacy'}
        subtitle={lang === 'am' ? 'ጨለማ/ብርሃን ሁነታ፣ መጠኖችን ደብቅ' : 'Dark/light mode, hide amounts'}
        badgeTone="neutral"
      >
        <DisplayPrivacyPanel />
      </TabCard>

      {/* Install App */}
      <TabCard
        icon="📲"
        title={lang === 'am' ? 'መተግበሪያውን ይጫኑ' : 'Install the App'}
        subtitle={lang === 'am' ? 'እንደ መተግበሪያ ይክፈቱ — ከመስመር ውጭም ይሰራል' : 'Use it like a native app — works offline too'}
        badgeTone="neutral"
      >
        <PwaInstallPanel pwa={pwa} />
      </TabCard>

      {/* Sync Status */}
      <TabCard
        icon="☁️"
        title={lang === 'am' ? 'ማስተካከያ' : 'Sync Status'}
        subtitle={lang === 'am' ? 'የውሂብ መስተካከያ ማስታወሻ' : 'Cloud sync status & backup'}
        badgeTone="neutral"
      >
        <SyncStatusIndicator onSyncNow />
      </TabCard>

      {/* Help & Support */}
      <TabCard
        icon="❓"
        title={lang === 'am' ? 'እርዳታ እና ድጋፍ' : 'Help & Support'}
        subtitle={lang === 'am' ? 'ጥያቄዎችን ያግኙ፡ ችግር ያመልክቱ' : 'Get answers, report a problem'}
        badgeTone="neutral"
      >
        <div className="space-y-3">
          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden px-5 py-4 text-sm text-gray-500">
            <p className="font-bold text-gray-800 mb-2">{lang === 'am' ? 'ተደጋጋሚ ጥያቄዎች' : 'Common Questions'}</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-bold text-gray-700">{lang === 'am' ? 'ዱቤ እንዴት ላስታውሳል?' : 'How do I remind a customer about dubie?'}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'am'
                    ? 'ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ → ቴሌግራም፣ ዋትስአፕ ወይም SMS ይምረጡ'
                    : 'Open the customer → tap "Remind" → choose Telegram, WhatsApp, or SMS'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">{lang === 'am' ? 'ሽያጭ ሲመዘገብ ቅናሽ እንዴት ልጨምር?' : 'How do I add a discount to a sale?'}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'am'
                    ? 'ሽያጭ ሲመዘገብ → "+ Add discount" ይጫኑ → መጠኑን ያስገቡ (ከሽያጭ ድምር በላይ መሆን አይችልም)'
                    : 'While recording a sale → tap "+ Add discount" → enter amount (cannot exceed sale total)'}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">{lang === 'am' ? 'ውሂቤ ወዴት ይሄዳል?' : 'Where is my data stored?'}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {lang === 'am'
                    ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል። ምንም ወደ ውጭ አይላክም።'
                    : 'All data stays on this phone only. Nothing is sent to the cloud unless you choose to backup.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabCard>

      {/* About Gebya */}
      <TabCard
        icon="ℹ️"
        title={lang === 'am' ? 'ስለ ጌብያ' : 'About Gebya'}
        subtitle={BUILD_VERSION}
        badgeTone="neutral"
      >
        <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden px-5 py-4 text-sm text-gray-500">
          <p className="font-bold text-gray-800 mb-1">Gebya · የንግድ ማስታወሻ</p>
          <p className="text-xs mb-2">Business Notebook for Ethiopian shopkeepers</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am' ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል' : 'All data stays on this phone only'}
          </p>
          {BUILD_DATE && (
            <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-soft)' }}>
              {lang === 'am' ? 'የግንባታ ቀን' : 'Built'}: {BUILD_DATE}
            </p>
          )}
        </div>
      </TabCard>
    </div>
  );
}
