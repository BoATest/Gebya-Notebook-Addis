import { useState } from 'react';
import { Eye, EyeOff, Download, Trash2, Info, Shield, ChevronRight } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import db from '../db';

function SettingsPage({ transactions, creditRecords }) {
  const { hidden, toggle } = usePrivacy();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const exportToCSV = () => {
    const headers = ['Date (Ethiopian)', 'Type', 'Item', 'Quantity', 'Amount (birr)', 'Cost (birr)', 'Profit (birr)', 'Customer'];
    const rows = transactions.map(t => [
      formatEthiopian(t.created_at),
      t.type,
      `"${t.item_name || ''}"`,
      t.quantity || 1,
      t.amount || 0,
      t.cost_price || '',
      t.profit !== null && t.profit !== undefined ? t.profit : '',
      `"${t.customer_name || ''}"`,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gebya-backup-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllData = async () => {
    await Promise.all([
      db.transactions.clear(),
      db.credit_records.clear(),
      db.customers.clear(),
    ]);
    setCleared(true);
    setShowClearConfirm(false);
    setTimeout(() => window.location.reload(), 800);
  };

  const totalEntries = transactions.length;
  const totalCredits = creditRecords.length;

  return (
    <div className="space-y-5 pb-4">

      {/* Privacy */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">Privacy</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-amber-50 transition-colors min-h-[64px]"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: hidden ? '#fef3c7' : '#dcfce7' }}>
              {hidden
                ? <EyeOff className="w-5 h-5 text-amber-700" />
                : <Eye className="w-5 h-5 text-green-700" />
              }
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-800">Hide amounts</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {hidden ? 'Amounts are hidden everywhere — tap to show' : 'Amounts are visible — tap to hide'}
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 ${hidden ? 'bg-amber-400' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${hidden ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">Your Data</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden divide-y divide-amber-50">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
              <Info className="w-5 h-5 text-green-700" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">Stored on this device</div>
              <div className="text-xs text-gray-500 mt-0.5">{totalEntries} entries · {totalCredits} credit records</div>
            </div>
          </div>

          <button
            onClick={exportToCSV}
            disabled={totalEntries === 0}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-amber-50 transition-colors min-h-[64px] disabled:opacity-40"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#eff6ff' }}>
              <Download className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-800">Export to CSV</div>
              <div className="text-xs text-gray-500 mt-0.5">Download a spreadsheet backup</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-red-50 transition-colors min-h-[64px]"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fff1f2' }}>
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-red-600">Clear all data</div>
              <div className="text-xs text-gray-500 mt-0.5">Permanently deletes everything — export first!</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">About</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: '#fef3c7' }}>
              📒
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">ገበያ — Gebya</div>
              <div className="text-xs text-gray-500 mt-0.5">Business Notebook for Ethiopian shopkeepers</div>
              <div className="text-xs text-gray-400 mt-1">Works offline · Data stays on your phone · Free</div>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-amber-50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-gray-500">Your data never leaves this device. No account needed.</p>
          </div>
        </div>
      </section>

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-4xl text-center mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Clear all data?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently delete all {totalEntries} entries and {totalCredits} credit records. This cannot be undone.
            </p>
            <div className="space-y-2">
              <button onClick={clearAllData} className="w-full p-4 bg-red-500 text-white rounded-2xl font-bold min-h-[52px]">
                Yes, delete everything
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="w-full p-4 bg-gray-100 text-gray-700 rounded-2xl font-bold min-h-[52px]">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {cleared && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-gray-800">Data cleared</p>
            <p className="text-sm text-gray-400 mt-1">Reloading…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
