import { Suspense } from 'react';
import { Share2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAppStore } from '../stores/appStore';
import ProfitCard from './ProfitCard';
import TxRow from './TxRow';
import TrustCard from './TrustCard';
import { PanelFallback } from './Fallbacks';
import { DailySuggestions, LearningInsights, SaleWorkspace } from '../utils/lazyImports';
import { fmt } from '../utils/numformat';

export default function TodayTab({
  transactions,
  todayTransactions,
  yesterdayNet,
  ledgerTransactions,
  lastSavedSnapshot,
  onShareReport,
  saleWorkspaceEnabled = false,
  saleWorkspaceProps = {},
}) {
  const { lang, t } = useLang();
  const setShowForm = useAppStore(s => s.setShowForm);
  const setEditTarget = useAppStore(s => s.setEditTarget);
  const setDeleteTarget = useAppStore(s => s.setDeleteTarget);

  return (
    <div className="space-y-4">
      <ProfitCard transactions={todayTransactions} yesterdayNet={yesterdayNet} compact={saleWorkspaceEnabled} />

      {/* Unified Sale Workspace — inline capture strip (zero-tap simple sales).
          Grows in place via "+ Add details"; full-screen variant opens from
          the action bar's "+ New Sale" button. */}
      {saleWorkspaceEnabled && (
        <Suspense fallback={<PanelFallback label={t.loading} />}>
          <SaleWorkspace variant="inline" {...saleWorkspaceProps} />
        </Suspense>
      )}

      <Suspense fallback={<PanelFallback label={t.loading} />}>
        <DailySuggestions todayTransactions={todayTransactions} onAction={(type) => setShowForm(type)} />
      </Suspense>

      <Suspense fallback={null}>
        <LearningInsights />
      </Suspense>

      {/* Today entries */}
      <div>
        <div className="flex items-center justify-between pb-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 font-sans">
            {lang === 'am' ? 'ምዝገባዎች' : 'ENTRIES'}
            <span className="ml-2 text-[11px] font-semibold text-gray-400 tracking-normal normal-case">{todayTransactions.length}</span>
          </h3>
          <button onClick={onShareReport} className="p-1.5 press-scale" aria-label={lang === 'am' ? 'አጋራ' : 'Share'}>
            <Share2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {todayTransactions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ገና ምንም ምዝገባ የለም' : 'No entries yet'}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-soft)' }}>{lang === 'am' ? 'ለመጀመር ከላይ ይጫኑ' : 'Tap above to start'}</p>
            {transactions.length === 0 && ledgerTransactions.length === 0 && (
              <TrustCard
                totalEntries={0}
                todayCount={0}
                lastSavedSnapshot={lastSavedSnapshot}
                onStartSale={() => setShowForm('sale')}
                t={t}
              />
            )}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            {todayTransactions.map(tx => (
              <TxRow
                key={tx.id}
                tx={tx}
                onTap={() => setEditTarget(tx)}
                onEdit={() => setEditTarget(tx)}
                onDelete={() => setDeleteTarget(tx)}
                t={t}
                lang={lang}
                fmt={fmt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
