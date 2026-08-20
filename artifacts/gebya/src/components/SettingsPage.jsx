import { Suspense, useState, lazy, useEffect, useCallback } from 'react';
import { useLang } from '../context/LangContext';
import { usePermissionsStore } from '../stores/permissionsStore';
import { useAuthStore } from '../stores/authStore';
import { fireToast } from './Toast';
import { remindersApi } from '../api/reminders';
import { getAuthToken } from '../utils/syncEngine';
import { setPassword, removePassword } from '../utils/authClient';

import ShopTab from './settings/tabs/ShopTab';
import MoneyTab from './settings/tabs/MoneyTab';
import DataTab from './settings/tabs/DataTab';
import AdminMetricsView from './AdminMetricsView';
import CrossShopCurationQueue from './CrossShopCurationQueue';
import DownloadAppBanner from './settings/DownloadAppBanner';

const AdminDashboard = lazy(() => import('./AdminDashboard.jsx'));
const AdminShopDetail = lazy(() => import('./AdminShopDetail.jsx'));
const OwnerActivityDashboard = lazy(() => import('./OwnerActivityDashboard.jsx'));
const SupportPanel = lazy(() => import('./SupportPanel.jsx'));

const TABS = [
  { id: 'shop', labelEn: 'Shop', labelAm: 'ሱቅ' },
  { id: 'money', labelEn: 'Money', labelAm: 'ገንዘብ' },
  { id: 'data', labelEn: 'Data', labelAm: 'ውሂብ' },
];

function SettingsPanelFallback({ label }) {
  return (
    <div className="bg-white rounded-2xl border border-green-100/50 px-5 py-4 text-sm font-semibold text-gray-500">
      {label}
    </div>
  );
}

function ReminderSettings({ shopId, lang }) {
  const { t } = useLang();
  const [frequency, setFrequency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!shopId) return;
    const token = await getAuthToken();
    if (!token) {
      setFrequency('daily');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await remindersApi.getShopDefault(shopId);
      setFrequency(data?.frequency || 'daily');
    } catch (err) {
      console.error('Failed to load reminder config:', err);
      setFrequency('daily');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleToggle = async (enabled) => {
    if (!shopId) return;
    const newFreq = enabled ? 'daily' : 'disabled';
    try {
      setSaving(true);
      await remindersApi.setShopDefault(shopId, newFreq);
      setFrequency(newFreq);
      fireToast(
        enabled
          ? (lang === 'am' ? 'ራስ-ሰር ማስታወቂያ ተከፍቷል' : 'Auto-reminders enabled')
          : (lang === 'am' ? 'ራስ-ሰር ማስታወቂያ ተ偃ፍቷል' : 'Auto-reminders paused'),
        2000
      );
    } catch (err) {
      console.error('Failed to update reminder config:', err);
      fireToast(lang === 'am' ? 'ማስተካከል አልተሳካም' : 'Failed to update', 2500);
    } finally {
      setSaving(false);
    }
  };

  const isEnabled = frequency && frequency !== 'disabled';

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {lang === 'am' ? 'ራስ-ሰር ማስታወቂያ' : 'AUTO REMINDERS'}
        </span>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-gray-900">
              {lang === 'am' ? 'ተገዢ ማስታወቂያ' : 'Reminder Notifications'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {isEnabled
                ? (lang === 'am' ? 'በየቀኑ ለسابقة ያላቸው ተጋዦች ማስታወቂያ ይላካል' : 'Sends daily reminders to customers with overdue credit')
                : (lang === 'am' ? 'ማስታወቂያ ተ偃ፍቷል' : 'Reminders are paused')}
            </div>
          </div>
          <button
            onClick={() => handleToggle(!isEnabled)}
            disabled={loading || saving}
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            style={{
              background: isEnabled ? 'var(--color-primary)' : '#d1d5db',
              opacity: (loading || saving) ? 0.5 : 1,
            }}
          >
            <span
              className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              style={{ transform: isEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        {isEnabled && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {lang === 'am' ? 'Frequency:' : 'Frequency:'}
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                {frequency === 'daily'
                  ? (lang === 'am' ? 'በየቀኑ' : 'Daily')
                  : (lang === 'am' ? 'በየሳምንቱ' : 'Weekly')}
              </span>
            </div>
            <div className="text-[0.65rem] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'am'
                ? 'የእትው ወቅት መሰረት ይላካል — ከ1-7 ቀን ውስጥ ያልተከፈለ ብድሩ ላይ'
                : 'Sends based on credit due date — 1-7 days before/after due'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordSettings({ lang }) {
  const { t } = useLang();
  const hasPassword = useAuthStore(s => s.hasPassword);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPasswordValue] = useState('');

  const handleSetPassword = async () => {
    if (password.length < 6) {
      fireToast(
        lang === 'am' ? 'የይምት ቃል መዲዛ መስከቨሪ ነው 6 በላይ ከአይነት' : 'Password must be at least 6 characters',
        2500
      );
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      await setPassword(token, password);
      useAuthStore.setState({ hasPassword: true });
      fireToast(
        lang === 'am' ? 'የይምት ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል' : 'Password saved successfully',
        2000
      );
      setPasswordValue('');
    } catch (err) {
      console.error('Failed to set password:', err);
      fireToast(lang === 'am' ? 'የይምት ቃል መዲዛ ሊተለው አልተቻላም' : 'Failed to save password', 2500);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!confirm(lang === 'am' ? 'እንደገና OTP መረጃ ለማጠቃቀል ይሁኑ፣ የይምት ቃል መዲዛ ነው ለማስudya?' : 'You will use OTP again. Remove password?')) {
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      await removePassword(token);
      useAuthStore.setState({ hasPassword: false });
      fireToast(
        lang === 'am' ? 'የይምት ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል' : 'Password removed successfully',
        2000
      );
    } catch (err) {
      console.error('Failed to remove password:', err);
      fireToast(lang === 'am' ? 'የይምት ቃል መዲዛ አልተለወደደም' : 'Failed to remove password', 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden mt-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {lang === 'am' ? 'የይምት ቃል መዲዛ' : 'PASSWORD LOGIN'}
        </span>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'am'
            ? 'የይምት ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ በማለድም OTP ይጠቀሙ'
            : 'Set a password for faster logins, or use OTP codes.'}
        </div>

        {hasPassword ? (
          <>
            <button
              onClick={handleRemovePassword}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: loading ? 'var(--color-bg-disabled)' : 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}
            >
              {loading ? '...' : (lang === 'am' ? 'የይምት ቃል መዲዛ አስudya' : 'Remove Password')}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {lang === 'am' ? 'የይምት ቃል መዲዛ' : 'New Password'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder={lang === 'am' ? '6-32 ሰምዶች' : '6-32 characters'}
                maxLength={32}
                className="w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none"
                style={{ borderColor: 'var(--color-border)' }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="mt-1.5 text-xs font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                {showPassword
                  ? (lang === 'am' ? 'ዝርዝር ይመልስ' : 'Hide')
                  : (lang === 'am' ? 'បង្ហើត' : 'Show')}
              </button>
            </div>
            <button
              onClick={handleSetPassword}
              disabled={loading || password.length < 6}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all"
              style={{
                background: loading || password.length < 6 ? 'var(--color-bg-disabled)' : 'var(--color-primary)',
                cursor: loading || password.length < 6 ? 'default' : 'pointer',
              }}
            >
              {loading ? (lang === 'am' ? 'በመያየዝ...' : 'Saving...') : (lang === 'am' ? 'የይምት ቃል መዲዛ ያስገቡ' : 'Set Password')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SettingsPage({
  transactions,
  customerSummaries,
  catalogEntries,
  shopProfile,
  staffMembers,
  onProfileSave,
  paymentChannels,
  onSavePaymentChannels,
  recurringExpenses,
  onRecurringChange,
  onSaveCatalogEntry,
  onToggleCatalogEntryActive,
  planTier,
  entitlements,
  staffCount,
  transactionCount,
  shopId,
}) {
  const { lang, toggleLang, t } = useLang();
  const hasPermission = usePermissionsStore(s => s.hasPermission);
  const role = usePermissionsStore(s => s.role);
  const isPlatformAdmin = useAuthStore(s => s.isPlatformAdmin);
  const canManageTeam = hasPermission('can_manage_team');
  const roleBadge = (() => {
    if (!role) return null;
    if (role === 'owner') return lang === 'am' ? 'ባለቤት' : 'Owner';
    if (role === 'manager') return lang === 'am' ? 'ሥራ አስኪያጅ' : 'Manager';
    return lang === 'am' ? 'ሰራተኛ' : 'Staff';
  })();
  const [activeTab, setActiveTab] = useState('shop');
  const [pendingCardId, setPendingCardId] = useState(null);

  const [adminSection, setAdminSection] = useState(null); // null | 'metrics' | 'curation' | 'admin' | 'shopDetail'
  const [selectedShop, setSelectedShop] = useState(null); // shop object from AdminDashboard search
  const [aboutTapCount, setAboutTapCount] = useState(0);
  const [devModeRevealed, setDevModeRevealed] = useState(() => {
    try { return localStorage.getItem('gebya_dev_mode') === 'true'; } catch { return false; }
  });
  // Shop owners see their own-shop admin tools automatically; the platform-wide
  // admin dashboard is reserved for allowlisted platform admins (or dev mode).
  const isOwner = role === 'owner';
  const showAdminSection = devModeRevealed || isOwner || isPlatformAdmin;
  const showPlatformAdmin = devModeRevealed || isPlatformAdmin;

  const handleNavigate = (cardId, tabId) => {
    if (tabId) {
      setActiveTab(tabId);
      setPendingCardId(cardId);
    } else if (cardId !== 'profile' || activeTab === 'shop') {
      setActiveTab('shop');
    }
  };

  const handleAboutTap = () => {
    if (devModeRevealed) return;
    const next = aboutTapCount + 1;
    setAboutTapCount(next);
    if (next >= 5) {
      try { localStorage.setItem('gebya_dev_mode', 'true'); } catch { /* ignore */ }
      setDevModeRevealed(true);
      fireToast(lang === 'am' ? '🛠 የልማት ሁነታ ተከፍቷል' : '🛠 Dev mode unlocked', 1800);
    }
  };

  const name = shopProfile?.name || '';
  const initials = (() => {
    if (!name) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
  })();

  return (
    <div className="space-y-2 pb-4">
      {/* Download App Banner */}
      <DownloadAppBanner />

      {/* Topbar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1" style={{ background: 'var(--cream)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {initials}
          </div>
          <div>
            <div className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              {name || (lang === 'am' ? 'ሱቅ' : 'Shop')}
              {roleBadge && (
                <span className="text-[0.55rem] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: 'var(--color-warning-border)', color: 'var(--color-primary)' }}>
                  {roleBadge}
                </span>
              )}
            </div>
            <div className="text-[0.68rem]" style={{ color: 'var(--color-text-muted)' }}>
              {shopProfile?.phone || (lang === 'am' ? 'ስልክ አልተጨመረም' : 'No phone added')}
            </div>
          </div>
        </div>
        <div className="flex rounded-full p-0.5 text-xs font-black" style={{ background: 'var(--color-border-light)' }}>
          <button
            onClick={() => lang !== 'en' && toggleLang()}
            className={`px-2.5 py-1 rounded-full ${lang === 'en' ? 'text-white' : ''}`}
            style={lang === 'en' ? { background: 'var(--color-primary)' } : { color: 'var(--color-text-muted)' }}
          >
            EN
          </button>
          <button
            onClick={() => lang !== 'am' && toggleLang()}
            className={`px-2.5 py-1 rounded-full ${lang === 'am' ? 'text-white' : ''}`}
            style={lang === 'am' ? { background: 'var(--color-primary)' } : { color: 'var(--color-text-muted)' }}
          >
            አማ
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2" style={{ background: 'var(--cream)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs font-black rounded-lg transition-all"
            style={{
              background: activeTab === tab.id ? 'var(--color-bg-white)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {lang === 'am' ? tab.labelAm : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4">
        <Suspense fallback={<SettingsPanelFallback label={t.loading} />}>
          <div key={activeTab} className="animate-fade">
          {activeTab === 'shop' && (
            <ShopTab
              shopProfile={shopProfile}
              catalogEntries={catalogEntries}
              recurringExpenses={recurringExpenses}
              paymentChannels={paymentChannels}
              onProfileSave={onProfileSave}
              onSaveCatalogEntry={onSaveCatalogEntry}
              onToggleCatalogEntryActive={onToggleCatalogEntryActive}
              onRecurringChange={onRecurringChange}
              lang={lang}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'money' && (
            <MoneyTab
              paymentChannels={paymentChannels}
              shopProfile={shopProfile}
              shopId={shopId}
              onSavePaymentChannels={onSavePaymentChannels}
              lang={lang}
              planTier={planTier}
              entitlements={entitlements}
              staffCount={staffCount}
              transactionCount={transactionCount}
              pendingCardId={pendingCardId}
            />
          )}
          {activeTab === 'data' && (
            <DataTab
              transactions={transactions}
              customerSummaries={customerSummaries}
              lang={lang}
            />
          )}
          </div>
        </Suspense>

        {/* Reminder Settings */}
        <div className="mt-4">
          <ReminderSettings shopId={shopId} lang={lang} />
        </div>

        {/* Password Settings */}
        <div className="mt-4">
          <PasswordSettings lang={lang} />
        </div>

        {/* Admin section — owners see their own-shop tools; platform admins also get the platform dashboard */}
        {showAdminSection && (
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden mt-4">
            <div className="px-4 py-3 text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-warning)' }}>
              {showPlatformAdmin
                ? (lang === 'am' ? 'ፕላትፎርም አስተዳዳሪ' : 'Platform Admin')
                : (lang === 'am' ? 'የሱቅ አስተዳዳሪ' : 'Shop Admin')}
            </div>
            <div className="flex gap-2 px-4 pb-3">
              <button
                onClick={() => setAdminSection(adminSection === 'metrics' ? null : 'metrics')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'metrics' ? 'text-white' : ''}`}
                style={adminSection === 'metrics' ? { background: 'var(--color-primary)' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
              >
                {lang === 'am' ? 'ሜትሪክስ' : 'Metrics'}
              </button>
              <button
                onClick={() => setAdminSection(adminSection === 'analytics' ? null : 'analytics')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'analytics' ? 'text-white' : ''}`}
                style={adminSection === 'analytics' ? { background: 'var(--color-primary)' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
              >
                {lang === 'am' ? 'ትንተና' : 'Analytics'}
              </button>
              <button
                onClick={() => setAdminSection(adminSection === 'curation' ? null : 'curation')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'curation' ? 'text-white' : ''}`}
                style={adminSection === 'curation' ? { background: 'var(--color-primary)' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
              >
                {lang === 'am' ? 'ማስተካከያ ወረፋ' : 'Curation'}
              </button>
              <button
                onClick={() => setAdminSection(adminSection === 'activity' ? null : 'activity')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'activity' ? 'text-white' : ''}`}
                style={adminSection === 'activity' ? { background: 'var(--color-primary)' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
              >
                {lang === 'am' ? 'እንቅስቃሴ' : 'Activity'}
              </button>
              <button
                onClick={() => setAdminSection(adminSection === 'support' ? null : 'support')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'support' ? 'text-white' : ''}`}
                style={adminSection === 'support' ? { background: 'var(--color-primary)' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
              >
                {lang === 'am' ? 'ድጋፍ' : 'Support'}
              </button>
              {showPlatformAdmin && (
                <button
                  onClick={() => setAdminSection(adminSection === 'admin' ? null : 'admin')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'admin' ? 'text-white' : ''}`}
                  style={adminSection === 'admin' ? { background: 'var(--color-primary)' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
                >
                  Admin
                </button>
              )}
            </div>
            {showPlatformAdmin && (
              <div className="px-4 pb-3">
                <a
                  href="/admin"
                  className="block w-full py-2.5 rounded-xl text-xs font-bold text-center text-white"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {lang === 'am' ? 'የመሣሪያ ስርዓት ማዕከል ክፈት' : 'Open Command Center'}
                </a>
                <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--color-text-soft)' }}>
                  {lang === 'am' ? 'ለቡድኑ ተጋሩ፡ /admin' : 'Share with your team: /admin'}
                </p>
              </div>
            )}
            {adminSection === 'metrics' && <div className="px-4 pb-3"><AdminMetricsView shopId={shopId} /></div>}
            {adminSection === 'analytics' && <div className="px-4 pb-3"><Suspense fallback={<div className="text-xs text-gray-400 py-4">Loading...</div>}><SimpleAnalytics /></Suspense></div>}
            {adminSection === 'curation' && <div className="px-4 pb-3"><CrossShopCurationQueue /></div>}
            {adminSection === 'activity' && (
              <div className="px-4 pb-3">
                <Suspense fallback={<div className="text-xs text-gray-400 py-4">Loading...</div>}>
                  <OwnerActivityDashboard shopProfile={shopProfile} staffMembers={staffMembers} />
                </Suspense>
              </div>
            )}
            {adminSection === 'support' && (
              <div className="px-4 pb-3">
                <Suspense fallback={<div className="text-xs text-gray-400 py-4">Loading...</div>}>
                  <SupportPanel isAdmin={showPlatformAdmin} />
                </Suspense>
              </div>
            )}
            {showPlatformAdmin && adminSection === 'admin' && <div className="px-4 pb-3"><Suspense fallback={<div className="text-xs text-gray-400 py-4">Loading...</div>}><AdminDashboard onShopSelect={(shop) => { setSelectedShop(shop); setAdminSection('shopDetail'); }} /></Suspense></div>}
            {showPlatformAdmin && adminSection === 'shopDetail' && selectedShop && (
              <Suspense fallback={<div className="text-xs text-gray-400 py-4">Loading...</div>}>
                <AdminShopDetail businessId={selectedShop.id} onBack={() => setAdminSection('admin')} />
              </Suspense>
            )}
          </div>
        )}

        {/* My Profile card — for staff without manage_team permission */}
        {!canManageTeam && staffMembers && staffMembers.length > 0 && (
          <div className="bg-white rounded-2xl border overflow-hidden mt-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {lang === 'am' ? 'የእኔ መገለጫ' : 'MY PROFILE'}
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: 'var(--color-primary)' }}>
                  {(shopProfile?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{shopProfile?.name || 'Staff'}</div>
                  <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {lang === 'am' ? 'ሰራተኛ' : 'Staff'} · {shopProfile?.role || 'staff'}
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-2">
                {lang === 'am' ? 'የቡድን አባላት' : 'Team'}
              </div>
              {staffMembers.filter(m => m.active !== false).map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
                    {(m.display_name || 'S').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{m.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* About easter egg — hidden tap target */}
        <div
          onClick={handleAboutTap}
          className="text-center py-3 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Gebya v1.0
          {aboutTapCount > 0 && aboutTapCount < 5 && !showAdminSection && (
            <span className="ml-2" style={{ color: 'var(--color-accent-amber)' }}>
              · {5 - aboutTapCount} {lang === 'am' ? 'ተጨማሪ መታ' : 'more taps'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
