import { Suspense } from 'react';
import { Share2 } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAppStore } from '../stores/appStore';
import ProfitCard from './ProfitCard';
import TxRow from './TxRow';
import { PanelFallback } from './Fallbacks';
import { DailySuggestions, LearningInsights } from '../utils/lazyImports';
import { fmt } from '../utils/numformat';

export default function TodayTab({
  transactions,
  todayTransactions,
  yesterdayNet,
  ledgerTransactions,
  lastSavedSnapshot,
  onShareReport,
}) {
  const { lang, t } = useLang();
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const setShowForm = useAppStore(s => s.setShowForm);
  const setEditTarget = useAppStore(s => s.setEditTarget);
  const setDeleteTarget = useAppStore(s => s.setDeleteTarget);

  return (
    <div className="space-y-4">
      <ProfitCard transactions={todayTransactions} yesterdayNet={yesterdayNet} />

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
            <p className="text-sm font-medium" style={{ color: '#6b7280' }}>{lang === 'am' ? 'ገና ምንም ምዝገባ የለም' : 'No entries yet'}</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{lang === 'am' ? 'ለመጀመር ከላይ ይጫኑ' : 'Tap above to start'}</p>
            {transactions.length === 0 && ledgerTransactions.length === 0 && (
              <div style={{
                marginTop: 16,
                padding: 16,
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1B4332', marginBottom: 12 }}>
                  {lang === 'am' ? '📒 ደብተርዎን ጀምር' : '📒 Start your notebook'}
                </p>
                <p style={{ fontSize: 11, color: '#4b5563', marginBottom: 12, lineHeight: 1.5 }}>
                  {lang === 'am'
                    ? 'ሽያጭ ወይም ወጪ መዝግብ። ሁሉም መረጃ በዚህ ስልክ ላይ ይቀመጣል።'
                    : 'Record sales and expenses. All data stays on this phone.'
                  }
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('credit')}
                  className="press-scale"
                  style={{
                    background: '#1B4332',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 12, fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'am' ? 'ተጨማሪ ይያዩ' : 'View Credit Page'} →
                </button>
              </div>
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
