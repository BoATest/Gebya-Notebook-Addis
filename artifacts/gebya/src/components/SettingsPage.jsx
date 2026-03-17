import { useState } from 'react';
import { Eye, EyeOff, Download, Trash2, Info, Shield, ChevronRight, Store, Phone, Check, CreditCard, RefreshCw, Plus, MessageCircle } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useLang } from '../context/LangContext';
import { formatEthiopian } from '../utils/ethiopianCalendar';
import { fmt } from '../utils/format';
import db from '../db';
import { ALL_BANKS, ALL_WALLETS } from './PaymentTypeChips';
import { BADGE_DEFINITIONS } from '../utils/badges';

const FREQ_LABELS_EN = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const FREQ_LABELS_AM = { daily: 'ዕለታዊ', weekly: 'ሳምንታዊ', monthly: 'ወርሃዊ' };

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
  earnedBadges,
}) {
  const { hidden, toggle } = usePrivacy();
  const { lang, t } = useLang();
  const FREQ_LABELS = lang === 'am' ? FREQ_LABELS_AM : FREQ_LABELS_EN;

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const [editName, setEditName] = useState(shopProfile?.name || '');
  const [editPhoneDigits, setEditPhoneDigits] = useState(() => {
    const raw = shopProfile?.phone || '';
    return raw.startsWith('+251') ? raw.slice(4) : raw.replace(/\D/g, '').slice(-9);
  });
  const [editTelegram, setEditTelegram] = useState(shopProfile?.telegram || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const phoneValid = /^[79]\d{8}$/.test(editPhoneDigits);
  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 9) setEditPhoneDigits(raw);
  };

  const [providers, setProviders] = useState(enabledProviders || { banks: [...ALL_BANKS], wallets: [...ALL_WALLETS] });

  const [recurring, setRecurring] = useState(recurringExpenses || []);
  const [reName, setReName] = useState('');
  const [reAmount, setReAmount] = useState('');
  const [reFreq, setReFreq] = useState('monthly');
  const [showReForm, setShowReForm] = useState(false);

  const handleProfileSave = async () => {
    if (!editName.trim() || !phoneValid) return;
    const fullPhone = '+251' + editPhoneDigits;
    await onProfileSave(editName.trim(), fullPhone, editTelegram.trim());
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const exportToCSV = () => {
    const headers = ['Date (Ethiopian)', 'Type', 'Item', 'Quantity', 'Amount (birr)', 'Cost (birr)', 'Profit (birr)', 'Payment', 'Customer'];
    const rows = transactions.map(tx => [
      formatEthiopian(tx.created_at),
      tx.type,
      `"${tx.item_name || ''}"`,
      tx.quantity || 1,
      tx.amount || 0,
      tx.cost_price || '',
      tx.profit !== null && tx.profit !== undefined ? tx.profit : '',
      [tx.payment_type, tx.payment_provider].filter(Boolean).join(' ') || '',
      `"${tx.customer_name || ''}"`,
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
  const currentFullPhone = '+251' + editPhoneDigits;
  const profileChanged = (
    editName.trim() !== (shopProfile?.name || '') ||
    currentFullPhone !== (shopProfile?.phone || '') ||
    editTelegram.trim() !== (shopProfile?.telegram || '')
  );

  const badgeList = (earnedBadges || []);

  return (
    <div className="space-y-5 pb-4">

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">{t.achievementBadges}</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            {badgeList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">{t.noBadges}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {BADGE_DEFINITIONS.filter(b => badgeList.includes(b.id)).map(badge => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                    style={{ background: '#fef3c7', border: '1.5px solid #fcd34d' }}
                  >
                    <span className="text-xl">{badge.emoji}</span>
                    <div>
                      <div className="text-xs font-bold text-amber-800">
                        {lang === 'am' ? badge.titleAm : badge.title}
                      </div>
                      <div className="text-xs text-amber-600">
                        {lang === 'am' ? badge.descriptionAm : badge.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {badgeList.length > 0 && badgeList.length < BADGE_DEFINITIONS.length && (
              <p className="text-xs text-gray-400 text-center mt-2">
                {badgeList.length} / {BADGE_DEFINITIONS.length} {t.badgesEarned}
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">{t.shopProfile}</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                <Store className="w-3.5 h-3.5" /> {t.userName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder={t.onboardNamePlaceholder || 'e.g. Tigist'}
                className="w-full px-4 py-3 border-2 rounded-xl text-sm font-semibold focus:outline-none"
                style={{ borderColor: editName.trim() ? '#c47c1a' : '#e8d5b0' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {t.phoneNumber} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-0">
                <div
                  className="flex items-center justify-center px-3 py-3 rounded-l-xl border-2 border-r-0 text-sm font-bold"
                  style={{ background: '#f5f0e8', borderColor: (phoneTouched && !phoneValid) ? '#dc2626' : '#e8d5b0', color: '#7c3d12', minWidth: '64px' }}
                >
                  +251
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={editPhoneDigits}
                  onChange={handlePhoneChange}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="9XXXXXXXX"
                  maxLength={9}
                  className="flex-1 px-4 py-3 border-2 rounded-r-xl text-sm focus:outline-none"
                  style={{ borderColor: (phoneTouched && !phoneValid) ? '#dc2626' : (phoneValid ? '#c47c1a' : '#e8d5b0') }}
                />
              </div>
              {phoneTouched && !phoneValid && editPhoneDigits.length > 0 && (
                <p className="text-xs text-red-500 mt-1 font-medium">{t.phoneInvalid}</p>
              )}
              {phoneTouched && editPhoneDigits.length === 0 && (
                <p className="text-xs text-red-500 mt-1 font-medium">{t.phoneRequired}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> {t.telegramLabel}
              </label>
              <input
                type="text"
                value={editTelegram}
                onChange={e => setEditTelegram(e.target.value)}
                placeholder={t.telegramPlaceholder}
                className="w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none"
                style={{ borderColor: '#e8d5b0' }}
              />
            </div>
            <button
              onClick={handleProfileSave}
              disabled={!editName.trim() || !phoneValid || (!profileChanged && !profileSaved)}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[48px]"
              style={{
                background: profileSaved ? '#15803d' : (editName.trim() && phoneValid && profileChanged ? '#c47c1a' : '#e5e7eb'),
                color: (editName.trim() && phoneValid && (profileChanged || profileSaved)) ? '#fff' : '#9ca3af',
              }}
            >
              {profileSaved ? <><Check className="w-4 h-4" /> {t.saved}</> : t.saveChanges}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">{t.privacy}</h2>
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
              <div className="font-bold text-gray-800">{t.hideAmounts}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {hidden ? t.totalsHidden : t.totalsVisible}
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 flex items-center px-1 ${hidden ? 'bg-amber-400' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${hidden ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">{t.paymentMethods}</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden divide-y divide-amber-50">
          <div className="px-5 py-3">
            <p className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> {t.banks}
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_BANKS.map(bank => {
                const enabled = (providers.banks || []).includes(bank);
                return (
                  <button
                    key={bank}
                    onClick={() => toggleBank(bank)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all min-h-[36px]"
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
            <p className="text-xs text-gray-500 mb-2 font-medium">📱 {t.mobileWallets}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_WALLETS.map(wallet => {
                const enabled = (providers.wallets || []).includes(wallet);
                return (
                  <button
                    key={wallet}
                    onClick={() => toggleWallet(wallet)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all min-h-[36px]"
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
            <p className="text-xs text-gray-400">{t.onlyEnabled}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">{t.recurringExpenses}</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs text-gray-500 mb-3">{t.recurringHint}</p>

            {recurring.length > 0 && (
              <div className="space-y-2 mb-3">
                {recurring.map(re => (
                  <div key={re.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: '#faf5eb', border: '1.5px solid #f0e6d4' }}>
                    <RefreshCw className="w-4 h-4 flex-shrink-0" style={{ color: '#c47c1a' }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{re.name}</p>
                      <p className="text-xs text-gray-500">{fmt(re.amount)} {t.birr} · {FREQ_LABELS[re.freq] || re.freq}</p>
                    </div>
                    <button
                      onClick={() => removeRecurring(re.id)}
                      className="p-1.5 rounded-full hover:bg-red-50 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
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
                <Plus className="w-4 h-4" /> {t.addRecurring}
              </button>
            ) : (
              <div className="space-y-2 p-3 rounded-xl border" style={{ background: '#faf5eb', borderColor: '#f0e6d4' }}>
                <input
                  type="text"
                  value={reName}
                  onChange={e => setReName(e.target.value)}
                  placeholder={t.expenseName}
                  className="w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
                  style={{ borderColor: '#e8d5b0' }}
                />
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={reAmount}
                    onChange={e => setReAmount(e.target.value)}
                    placeholder={t.amount}
                    className="w-full px-3 py-2.5 pr-14 border-2 rounded-xl text-sm focus:outline-none"
                    style={{ borderColor: '#e8d5b0' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">{t.birr}</span>
                </div>
                <div className="flex gap-2">
                  {['daily', 'weekly', 'monthly'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setReFreq(f)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all min-h-[40px]"
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
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold min-h-[44px]" style={{ background: '#f5f5f5', color: '#6b7280' }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={addRecurring}
                    disabled={!reName.trim() || !parseFloat(reAmount)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 min-h-[44px]"
                    style={{ background: '#c47c1a' }}
                  >
                    {t.add}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="h-2" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">{t.yourData}</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden divide-y divide-amber-50">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0fdf4' }}>
              <Info className="w-5 h-5 text-green-700" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">{t.storedOnDevice}</div>
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
              <div className="font-bold text-gray-800">{t.exportCSV}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t.exportHint}</div>
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
              <div className="font-bold text-red-600">{t.clearAll}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t.clearHint}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-2 px-1">{t.about}</h2>
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: '#fef3c7' }}>
              📒
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">ገበያ — Gebya</div>
              <div className="text-xs text-gray-500 mt-0.5">Business Notebook for Ethiopian shopkeepers</div>
              <div className="text-xs text-gray-400 mt-1">{t.worksOffline}</div>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-amber-50 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-gray-500">{t.privacyNote}</p>
          </div>
        </div>
      </section>

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-4xl text-center mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{t.clearConfirm}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t.clearConfirmMsg.replace('{count}', totalEntries).replace('{credits}', totalCredits)}
            </p>
            <div className="space-y-2">
              <button onClick={clearAllData} className="w-full p-4 bg-red-500 text-white rounded-2xl font-bold min-h-[52px]">
                {t.yesDelete}
              </button>
              <button onClick={() => setShowClearConfirm(false)} className="w-full p-4 bg-gray-100 text-gray-700 rounded-2xl font-bold min-h-[52px]">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {cleared && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-bold text-gray-800">{t.dataCleared}</p>
            <p className="text-sm text-gray-400 mt-1">{t.reloading}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
