import { Info, Download } from 'lucide-react';
import { useLang } from '../../context/LangContext';
import DangerZoneSection from './backup/DangerZoneSection';
import { exportToCSV } from './backup/useBackupData';

export default function BackupDataPanel({ transactions, customerSummaries }) {
  const { lang, t } = useLang();

  const totalEntries = (transactions || []).length;
  const totalCustomers = (customerSummaries || []).length;

  return (
    <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden divide-y divide-green-100/30">
      {/* Header: stored data summary */}
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-success-bg)' }}>
          <Info className="w-5 h-5 text-green-700" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-800">{t.storedOnDevice}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {totalEntries} {lang === 'am' ? 'መዝገብ' : 'entries'} · {totalCustomers} {lang === 'am' ? 'ደንበኞች' : 'customers in dubie'}
          </div>
        </div>
      </div>

      {/* CSV export */}
      <button
        onClick={() => exportToCSV(transactions, lang)}
        disabled={totalEntries === 0}
        className="w-full flex items-center gap-4 px-5 py-4 active:bg-gray-50 transition-colors min-h-[64px] disabled:opacity-40 text-left"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-bg-hover)' }}>
          <Download className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-800">{lang === 'am' ? 'CSV አውጣ (ለሂሳብ ቤት)' : 'Export CSV (for accountant)'}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {lang === 'am' ? 'ጠፍጣፋ ስፕሬድሺት · ፎቶ የለም' : 'Flat spreadsheet · no photos'}
          </div>
        </div>
      </button>

      {/* Restore from file + danger zone */}
      <DangerZoneSection
        totalEntries={totalEntries}
        totalCustomers={totalCustomers}
        t={t}
      />
    </div>
  );
}