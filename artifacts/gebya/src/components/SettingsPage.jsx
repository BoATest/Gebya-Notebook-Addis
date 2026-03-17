import { useState } from 'react';
import { Eye, EyeOff, Download, Trash2, Info, Shield, ChevronRight, Store, Phone, Check, CreditCard, RefreshCw, Plus, Share2 } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/format';
import db from '../db';
import { ALL_BANKS, ALL_WALLETS } from './PaymentTypeChips';

const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

function SettingsPage({
  transactions,
  creditRecords,
  shopProfile,
  onProfileSave,
  enabledProviders,
  onProvidersChange,
  recurringExpenses,
  onRecurringChange,
  usageStats,
}) {
  const { hidden, toggle } = usePrivacy();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const [editName, setEditName] = useState(shopProfile?.name || '');
  const [editPhone, setEditPhone] = useState(shopProfile?.phone || '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [providers, setProviders] = useState(enabledProviders || { banks: [...ALL_BANKS], wallets: [...ALL_WALLETS] });

  const [recurring, setRecurring] = useState(recurringExpenses || []);
  const [reName, setReName] = useState('');
  const [reAmount, setReAmount] = useState('');
  const [reFreq, setReFreq] = useState('monthly');
  const [showReForm, setShowReForm] = useState(false);

  const handleProfileSave = async () => {
    if (!editName.trim()) return;
    await onProfileSave(editName.trim(), editPhone.trim());
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const exportToCSV = () => {
    const headers = ['Date (Ethiopian)', 'Type', 'Item', 'Quantity', 'Amount (birr)', 'Cost (birr)', 'Profit (birr)', 'Payment', 'Customer'];
    const rows = transactions.map(t => [
      formatEthiopian(t.created_at),
      t.type,
      `"${t.item_name || ''}"`,
      t.quantity || 1,
      t.amount || 0,
      t.cost_price || '',
      t.profit !== null && t.profit !== undefined ? t.profit : '',
      [t.payment_type, t.payment_provider].filter(Boolean).join(' ') || '',
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

  const toggleBank = async (bank) => {
    const cur = providers.banks || [];
    const next = cur.includes(bank) ? cur.filter(b => b !== bank) : [...cur, bank];
    const updated = { ...providers, banks: next };
    setProviders(updated);
    await db.settings.put({ key: 'enabled_payment_methods', value: JSON.stringify(updated) });
    onProvidersChange?.(updated);
  };

  const toggleWallet = async (wallet) => {
    const cur = providers.wallets || [];
    const next = cur.includes(wallet) ? cur.filter(w => w !== wallet) : [...cur, wallet];
    const updated = { ...providers, wallets: next };
    setProviders(updated);
    await db.settings.put({ key: 'enabled_payment_methods', value: JSON.stringify(updated) });
    onProvidersChange?.(updated);
  };

  const addRecurring = async () => {
    const amt = parseFloat(reAmount);
    if (!reName.trim() || !amt) return;
    const newItem = { id: Date.now(), name: reName.trim(), amount: amt, freq: reFreq };
    const updated = [...recurring, newItem];
    setRecurring(updated);
    await db.settings.put({ key: 'recurring_expenses', value: JSON.stringify(updated) });
    onRecurringChange?.(updated);
    setReName('');
    setReAmount('');
    setReFreq('monthly');
    setShowReForm(false);
  };

  const removeRecurring = async (id) => {
    const updated = recurring.filter(r => r.id !== id);
    setRecurring(updated);
    await db.settings.put({ key: 'recurring_expenses', value: JSON.stringify(updated) });
    onRecurringChange?.(updated);
  };

  const totalEntries = transactions.length;
  const totalCredits = creditRecords.length;
  const profileChanged = editName.trim() !== (shopProfile?.name || '') || editPhone.trim() !== (shopProfile?.phone || '');

  const [shareCopied, setShareCopied] = useState(false);

  const handleShareStats = async () => {
    if (!usageStats) return;
    const { streak, longestStreak, daysActive, featureCounts, sessionCount, firstUsed } = usageStats;
    const fc = featureCounts || {};
    const text = [
      `📊 Gebya usage stats for ${shopProfile?.name || 'my shop'}:`,
      `🔥 Current streak: ${streak} day${streak !== 1 ? 's' : ''} (longest: ${longestStreak})`,
      `📅 Using since: ${firstUsed}`,
      `📈 Total days active: ${daysActive?.length || 1}`,
      `🛒 Entries: ${fc.sales || 0} sales · ${fc.expenses || 0} expenses · ${fc.credits || 0} credits`,
      `📱 Sessions opened: ${sessionCount}`,
    ].join('\n');

    if (navigator.share) {
      try { await navigator.share({ title: 'Gebya Stats', text }); return; } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-5 pb-4">

      {usageStats && (
        <section>
          <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">Usage Insights</h2>
          <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
            <div className="px-5 pt-4 pb-3 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
                  <div className="text-2xl font-black" style={{ color: '#c2410c' }}>🔥 {usageStats.streak}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-0.5">day streak</div>
                  <div className="text-xs text-gray-400">best: {usageStats.longestStreak}</div>
                </div>
                <div className="flex-1 rounded-xl p-3 text-center" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
                  <div className="text-2xl font-black text-green-700">📅 {usageStats.daysActive?.length || 1}</div>
                  <div className="text-xs font-semibold text-gray-600 mt-0.5">days active</div>
                  <div className="text-xs text-gray-400">since {usageStats.firstUsed}</div>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#faf5eb', border: '1.5px solid #f0e6d4' }}>
                <div className="text-xs font-bold text-gray-500 mb-1.5">📊 Total entries recorded</div>
                <div className="flex justify-around text-center">
                  <div>
                    <div className="text-lg font-black text-green-700">{usageStats.featureCounts?.sales || 0}</div>
                    <div className="text-xs text-gray-500">Sales</div>
                  </div>
                  <div className="w-px bg-amber-100" />
                  <div>
                    <div className="text-lg font-black text-red-600">{usageStats.featureCounts?.expenses || 0}</div>
                    <div className="text-xs text-gray-500">Expenses</div>
                  </div>
                  <div className="w-px bg-amber-100" />
                  <div>
                    <div className="text-lg font-black" style={{ color: '#c47c1a' }}>{usageStats.featureCounts?.credits || 0}</div>
                    <div className="text-xs text-gray-500">Credits</div>
                  </div>
                </div>
                <div className="mt-2 text-center text-xs text-gray-400">{usageStats.sessionCount} sessions opened</div>
              </div>
              <button
                onClick={handleShareStats}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all min-h-[48px]"
                style={{ background: shareCopied ? '#15803d' : '#c47c1a', color: '#fff' }}
              >
                <Share2 className="w-4 h-4" />
                {shareCopied ? 'Copied to clipboard!' : 'Share My Stats 📤'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">Shop Profile</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                <Store className="w-3.5 h-3.5" /> Shop Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="e.g. Tigist's Store"
                className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold focus:outline-none"
                style={{ borderColor: editName.trim() ? '#c47c1a' : '#e8d5b0' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                placeholder="e.g. 0912345678 (optional)"
                className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none"
                style={{ borderColor: '#e8d5b0' }}
              />
            </div>
            <button
              onClick={handleProfileSave}
              disabled={!editName.trim() || (!profileChanged && !profileSaved)}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px]"
              style={{
                background: profileSaved ? '#15803d' : (editName.trim() && profileChanged ? '#c47c1a' : '#e5e7eb'),
                color: (editName.trim() && (profileChanged || profileSaved)) ? '#fff' : '#9ca3af',
              }}
            >
              {profileSaved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">Privacy</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-amber-50 transition-colors min-h-[64px]"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: hidden ? '#fef3c7' : '#dcfce7' }}>
              {hidden ? <EyeOff className="w-5 h-5 text-amber-700" /> : <Eye className="w-5 h-5 text-green-700" />}
            </div>
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-800">Hide amounts</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {hidden ? 'Totals are hidden — tap to show' : 'Totals are visible — tap to hide'}
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 ${hidden ? 'bg-amber-400' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${hidden ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">Payment Methods</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden divide-y divide-amber-50">
          <div className="px-5 py-3">
            <p className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> Banks
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_BANKS.map(bank => {
                const enabled = (providers.banks || []).includes(bank);
                return (
                  <button
                    key={bank}
                    onClick={() => toggleBank(bank)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all"
                    style={{
                      borderColor: enabled ? '#c47c1a' : '#e8d5b0',
                      background: enabled ? '#fde68a' : '#f9fafb',
                      color: enabled ? '#92400e' : '#9ca3af',
                    }}
                  >
                    {enabled ? '✓ ' : ''}{bank}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-gray-500 mb-2 font-medium">📱 Mobile Wallets</p>
            <div className="flex flex-wrap gap-2">
              {ALL_WALLETS.map(wallet => {
                const enabled = (providers.wallets || []).includes(wallet);
                return (
                  <button
                    key={wallet}
                    onClick={() => toggleWallet(wallet)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all"
                    style={{
                      borderColor: enabled ? '#c47c1a' : '#e8d5b0',
                      background: enabled ? '#fde68a' : '#f9fafb',
                      color: enabled ? '#92400e' : '#9ca3af',
                    }}
                  >
                    {enabled ? '✓ ' : ''}{wallet}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-gray-400">Only enabled methods appear as options in the form</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">Recurring Expenses</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs text-gray-500 mb-3">Quick-fill shortcuts for expenses you enter often</p>

            {recurring.length > 0 && (
              <div className="space-y-2 mb-3">
                {recurring.map(re => (
                  <div key={re.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: '#faf5eb', border: '1.5px solid #f0e6d4' }}>
                    <RefreshCw className="w-4 h-4 flex-shrink-0" style={{ color: '#c47c1a' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{re.name}</p>
                      <p className="text-xs text-gray-500">{fmt(re.amount)} birr · {FREQ_LABELS[re.freq] || re.freq}</p>
                    </div>
                    <button
                      onClick={() => removeRecurring(re.id)}
                      className="p-1.5 rounded-full hover:bg-red-50 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showReForm ? (
              <button
                onClick={() => setShowReForm(true)}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 border-2 border-dashed transition-all min-h-[48px]"
                style={{ borderColor: '#e8d5b0', color: '#c47c1a', background: '#faf5eb' }}
              >
                <Plus className="w-4 h-4" /> Add recurring expense
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-xl border" style={{ background: '#faf5eb', borderColor: '#f0e6d4' }}>
                <input
                  type="text"
                  value={reName}
                  onChange={e => setReName(e.target.value)}
                  placeholder="Expense name (e.g. Rent)"
                  className="w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
                  style={{ borderColor: '#e8d5b0' }}
                />
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={reAmount}
                    onChange={e => setReAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full px-3 py-2.5 pr-14 border-2 rounded-xl text-sm focus:outline-none"
                    style={{ borderColor: '#e8d5b0' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">birr</span>
                </div>
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setReFreq(f)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all"
                      style={{
                        borderColor: reFreq === f ? '#c47c1a' : '#e8d5b0',
                        background: reFreq === f ? '#fde68a' : '#fff',
                        color: reFreq === f ? '#92400e' : '#6b7280',
                      }}
                    >
                      {FREQ_LABELS[f]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowReForm(false); setReName(''); setReAmount(''); setReFreq('monthly'); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#f5f5f5', color: '#6b7280' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addRecurring}
                    disabled={!reName.trim() || !parseFloat(reAmount)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                    style={{ background: '#c47c1a' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="h-2" />
        </div>
      </section>

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
