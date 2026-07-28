import { useState } from 'react';
import { useLang } from '../../../context/LangContext';
import { fireToast } from '../../Toast';
import { Trash2 } from 'lucide-react';
import { clearAllData, restoreFromJSON } from './useBackupData';
import ConfirmDialog from '../../ConfirmDialog';

export default function DangerZoneSection({ totalEntries, totalCustomers, t }) {
  const { lang } = useLang();

  const [restoreTarget, setRestoreTarget] = useState(null);
  const [showClearStep, setShowClearStep] = useState(0);
  const [showRestoreStep, setShowRestoreStep] = useState(0);
  const [cleared, setCleared] = useState(false);

  const handleImportFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data?.gebya_backup_version !== 1) throw new Error('Not a valid Gebya backup file');
        if (!data.tables || typeof data.tables !== 'object') throw new Error('Missing tables in backup');
        if (!Array.isArray(data.tables.transactions)) throw new Error('Missing transactions table');
        setRestoreTarget(data);
        setShowRestoreStep(1);
      } catch (err) {
        fireToast(lang === 'am' ? 'የተበላሸ ምትኬ ፋይል' : 'Invalid backup file', 2400);
        if (import.meta.env.DEV) console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreConfirm = async () => {
    try {
      await restoreFromJSON(restoreTarget, () => {});
      setRestoreTarget(null);
      setShowRestoreStep(0);
      fireToast(lang === 'am' ? '✓ መልሶ ተመለሰ — በመጫን ላይ…' : '✓ Restored — reloading…', 1800);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Restore failed:', err);
      fireToast(lang === 'am' ? 'መልሶ ማስቀመጥ አልተሳካም' : 'Restore failed', 2600);
      setRestoreTarget(null);
      setShowRestoreStep(0);
    }
  };

  return (
    <>
      <label className="w-full flex items-center gap-4 px-5 py-4 active:bg-amber-50 transition-colors min-h-[64px] cursor-pointer" style={{ background: '#fff' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
          <Trash2 className="w-5 h-5" style={{ color: '#92400e' }} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-gray-800">{lang === 'am' ? 'ከምትኬ ፋይል መልሰው ይጫኑ' : 'Restore from backup file'}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {lang === 'am' ? 'ሁሉንም መረጃ ይተካል · ሁለት ጊዜ ማረጋገጫ ያስፈልጋል' : 'Replaces all data · two-step confirm'}
          </div>
        </div>
        <input type="file" accept=".json,application/json" onChange={handleImportFileSelected} className="hidden" />
      </label>

      <button
        onClick={() => setShowClearStep(1)}
        className="w-full flex items-center gap-4 px-5 py-4 active:bg-red-50 transition-colors min-h-[64px] text-left"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff1f2' }}>
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-red-600">{lang === 'am' ? 'መልሰው ጀምር' : 'Start over on this phone'}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {lang === 'am' ? 'ሁሉንም ይሰርዛል — መልሶ ማግኘት አይቻልም' : 'Deletes everything — cannot be undone'}
          </div>
        </div>
      </button>

      <ConfirmDialog
        open={showClearStep === 1}
        title={lang === 'am' ? 'በዚህ ስልክ መልሰው ይጀምሩ?' : 'Start over on this phone?'}
        message={lang === 'am'
          ? `ይህ ${totalEntries} መዝገብ፣ ${totalCustomers} ደንበኞች ይሰረዛሉ። መልሶ ማግኘት አይቻልም።`
          : `This will delete ${totalEntries} entries and ${totalCustomers} customer ledgers. Cannot be undone.`}
        confirmLabel={lang === 'am' ? 'ቀጥል →' : 'Continue →'}
        cancelLabel={t.cancel}
        tone="danger"
        onConfirm={() => { setShowClearStep(2); }}
        onCancel={() => setShowClearStep(0)}
      />

      <ConfirmDialog
        open={showClearStep === 2}
        title={lang === 'am' ? 'እርግጠኛ ነዎት?' : 'Are you sure?'}
        message={lang === 'am' ? 'ይህ የመጨረሻ ማረጋገጫ ነው። ሁሉም ውሂብ ይሰረዛል።' : 'This is your last chance. All data will be permanently deleted.'}
        confirmLabel={lang === 'am' ? 'አዎ፣ አሁን ሰርዝ' : 'Yes, delete everything'}
        cancelLabel={lang === 'am' ? 'አይ፣ ይተወው' : 'No, keep my data'}
        tone="danger"
        onConfirm={() => { setShowClearStep(0); clearAllData(setCleared, () => setShowClearStep(0)); }}
        onCancel={() => setShowClearStep(0)}
      />

      <ConfirmDialog
        open={showRestoreStep === 1}
        title={lang === 'am' ? 'ምትኬ ይመለስ?' : 'Restore from backup?'}
        message={lang === 'am'
          ? `ይህ ምትኬ ይዟል: ${restoreTarget?.counts?.transactions || 0} ሽያጭ+ወጪ, ${restoreTarget?.counts?.customers || 0} ደንበኞች, ${restoreTarget?.counts?.suppliers || 0} አቅራቢዎች`
          : `Backup contains: ${restoreTarget?.counts?.transactions || 0} sales+expenses, ${restoreTarget?.counts?.customers || 0} customers, ${restoreTarget?.counts?.suppliers || 0} suppliers`}
        confirmLabel={lang === 'am' ? 'ቀጥል →' : 'Continue →'}
        cancelLabel={t.cancel}
        tone="default"
        onConfirm={() => setShowRestoreStep(2)}
        onCancel={() => { setRestoreTarget(null); setShowRestoreStep(0); }}
      />

      <ConfirmDialog
        open={showRestoreStep === 2}
        title={lang === 'am' ? 'እርግጠኛ ነዎት?' : 'Are you sure?'}
        message={lang === 'am' ? 'ከመመለስ በፊት የአሁኑን መረጃ ምትኬ ይውሰዱ።' : 'Tip: download a backup of current data first.'}
        confirmLabel={lang === 'am' ? 'አዎ፣ መልሰው ጫን' : 'Yes, restore now'}
        cancelLabel={lang === 'am' ? 'አይ፣ ይተወው' : 'No, keep current data'}
        tone="danger"
        onConfirm={handleRestoreConfirm}
        onCancel={() => { setShowRestoreStep(0); setRestoreTarget(null); }}
      />

      {cleared && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#fff1f2' }}>
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <p className="font-bold text-gray-800">{t.dataCleared}</p>
            <p className="text-sm text-gray-500 mt-1">{t.reloading}</p>
          </div>
        </div>
      )}
    </>
  );
}
