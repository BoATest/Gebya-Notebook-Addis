import { lazy, Suspense } from 'react';
import BackupDataPanel from '../BackupDataPanel';
import DisplayPrivacyPanel from '../DisplayPrivacyPanel';
import ExportPanel from '../ExportPanel';
import PwaInstallPanel from '../../PwaInstallPanel';
import TabCard from '../TabCard';
import { usePwaInstall } from '../../../hooks/usePwaInstall.js';

const SimpleAnalytics = lazy(() => import('../../analytics/SimpleAnalytics.jsx'));

export default function DataTab({
  transactions,
  customerSummaries,
  lang,
}) {
  const totalEntries = (transactions || []).length;
  const dataBadge = totalEntries > 0 ? `${totalEntries}` : (lang === 'am' ? 'ባዶ' : 'Empty');
  const dataTone = totalEntries > 0 ? 'ok' : 'neutral';

  const aboutTapHint = lang === 'am' ? 'ስሪት 1.0' : 'Version 1.0';
  const pwa = usePwaInstall();

  return (
    <div>
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
        />
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
        icon="📲"
        title={lang === 'am' ? 'መተግበሪያውን ይጫኑ' : 'Install the App'}
        subtitle={lang === 'am' ? 'እንደ መተግበሪያ ይክፈቱ — ከመስመር ውጭም ይሰራል' : 'Use it like a native app — works offline too'}
        badgeTone="neutral"
      >
        <PwaInstallPanel pwa={pwa} />
      </TabCard>

      <TabCard
        icon="📊"
        title={lang === 'am' ? 'የመተግበሪያ አጠቃቀም' : 'App Usage'}
        subtitle={lang === 'am' ? 'የእርስዎ ብቻ — ወደ ውጭ አይላክም' : 'Private — never leaves this device'}
        badgeTone="neutral"
      >
        <Suspense fallback={null}>
          <SimpleAnalytics />
        </Suspense>
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
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am' ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል' : 'All data stays on this phone only'}
          </p>
        </div>
      </TabCard>
    </div>
  );
}
