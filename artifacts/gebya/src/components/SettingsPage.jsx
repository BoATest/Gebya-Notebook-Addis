import { Suspense, useState, lazy, useCallback } from 'react';
import { useLang } from '../context/LangContext';
import { usePermissionsStore } from '../stores/permissionsStore';
import { useAuthStore } from '../stores/authStore';
import { fireToast } from './Toast';

import ShopTab from './settings/tabs/ShopTab';
import MoneyTab from './settings/tabs/MoneyTab';
import DataTab from './settings/tabs/DataTab';
import DownloadAppBanner from './settings/DownloadAppBanner';
import ReminderSettings from './settings/ReminderSettings';
import PasswordSettings from './settings/PasswordSettings';
import AdminPanel from './settings/AdminPanel';
import SettingsPanelFallback from './settings/SettingsPanelFallback';
import ErrorBoundary from './ErrorBoundary';

const TABS = [
  { id: 'shop', labelEn: 'Shop', labelAm: 'ሱቅ' },
  { id: 'money', labelEn: 'Money', labelAm: 'ገንዘብ' },
  { id: 'data', labelEn: 'Data', labelAm: 'ውሂብ' },
];

const DEV_MODE_UNLOCK_TAPS = 5;
const DEV_MODE_UNLOCK_WINDOW_MS = 10000;

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
  const isPlatformAdmin = useAuthStore(s => s.isPlatformAdmin);

  const roleBadge = (() => {
    if (!role) return null;
    if (role === 'owner') return lang === 'am' ? 'ባለቤት' : 'Owner';
    if (role === 'manager') return lang === 'am' ? 'ሥራ አስኪያጅ' : 'Manager';
    return lang === 'am' ? 'ሰራተኛ' : 'Staff';
  })();

  const [activeTab, setActiveTabState] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem('gebya_settings_tab');
      if (saved === 'shop' || saved === 'money' || saved === 'data') {
        return saved;
      }
    }
    return 'shop';
  });

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(tab);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('gebya_settings_tab', tab);
    }
  }, []);

  const [pendingCardId, setPendingCardId] = useState(null);
  const [adminSection, setAdminSection] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [aboutTapCount, setAboutTapCount] = useState(0);
  const [aboutTapStart, setAboutTapStart] = useState(null);

  const [devModeRevealed, setDevModeRevealed] = useState(() => {
    try {
      try { localStorage.removeItem('gebya_dev_mode'); } catch { /* ignore */ }
      return sessionStorage.getItem('gebya_dev_mode') === 'true';
    } catch { return false; }
  });

  const isOwner = role === 'owner';
  const showAdminSection = devModeRevealed || isOwner || isPlatformAdmin;
  const showPlatformAdmin = isPlatformAdmin;

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

    const now = Date.now();
    const count = aboutTapCount + 1;

    if (!aboutTapStart || (now - aboutTapStart > DEV_MODE_UNLOCK_WINDOW_MS)) {
      setAboutTapStart(now);
      setAboutTapCount(count);
    } else {
      setAboutTapCount(count);
    }

    if (count >= DEV_MODE_UNLOCK_TAPS && (now - (aboutTapStart || now) <= DEV_MODE_UNLOCK_WINDOW_MS)) {
      const confirmed = confirm(
        lang === 'am'
          ? 'የልማት ሁነታ እንደገና ያንብት? ይህ ለመጠበቅ ይፈልጋል'
          : 'Enable dev mode? This reveals shop-level diagnostics for this session.'
      );
      if (!confirmed) {
        setAboutTapCount(0);
        setAboutTapStart(null);
        return;
      }
      try { sessionStorage.setItem('gebya_dev_mode', 'true'); } catch { /* ignore */ }
      setDevModeRevealed(true);
      setAboutTapCount(0);
      setAboutTapStart(null);
      fireToast(
        lang === 'am'
          ? '🛠 የልማት ሁነታ ተከፍቷል (ለዚህ ክፍለ ጊዜ ብቻ)'
          : '🛠 Dev mode unlocked (this session only)',
        1800
      );
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
            aria-label={lang === 'en' ? 'English selected' : 'Switch to English'}
          >
            EN
          </button>
          <button
            onClick={() => lang !== 'am' && toggleLang()}
            className={`px-2.5 py-1 rounded-full ${lang === 'am' ? 'text-white' : ''}`}
            style={lang === 'am' ? { background: 'var(--color-primary)' } : { color: 'var(--color-text-muted)' }}
            aria-label={lang === 'am' ? 'አማር\u{200c}ኛ በመረጡት' : 'Switch to አማር\u{200c}ኛ'}
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
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            aria-label={lang === 'am' ? tab.labelAm : tab.labelEn}
            className="flex-1 py-2 text-xs font-black rounded-lg transition-all"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                const currentIndex = TABS.findIndex(t => t.id === tab.id);
                if (e.key === 'ArrowLeft') {
                  const prev = (currentIndex - 1 + TABS.length) % TABS.length;
                  setActiveTab(TABS[prev].id);
                } else if (e.key === 'ArrowRight') {
                  const next = (currentIndex + 1) % TABS.length;
                  setActiveTab(TABS[next].id);
                } else if (e.key === 'Home') {
                  setActiveTab(TABS[0].id);
                } else if (e.key === 'End') {
                  setActiveTab(TABS[TABS.length - 1].id);
                }
              }
            }}
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
        <ErrorBoundary fallback="Failed to load settings. Please refresh.">
        <Suspense fallback={<SettingsPanelFallback label={t.loading} /}>
          <div className="animate-fade">
            <div
              id="panel-shop"
              role="tabpanel"
              aria-labelledby="tab-shop"
              style={{ display: activeTab === 'shop' ? 'block' : 'none' }}
            >
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
            </div>

            <div
              id="panel-money"
              role="tabpanel"
              aria-labelledby="tab-money"
              style={{ display: activeTab === 'money' ? 'block' : 'none' }}
            >
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
            </div>

            <div
              id="panel-data"
              role="tabpanel"
              aria-labelledby="tab-data"
              style={{ display: activeTab === 'data' ? 'block' : 'none' }}
            >
              <DataTab
                transactions={transactions}
                customerSummaries={customerSummaries}
                lang={lang}
              />
            </div>
          </div>
         </Suspense>
         </ErrorBoundary>

        {/* Reminder Settings */}
        <div className="mt-4">
          <ReminderSettings shopId={shopId} lang={lang} />
        </div>

        {/* Password Settings */}
        <div className="mt-4">
          <PasswordSettings lang={lang} />
        </div>

        {/* Admin Section */}
        {showAdminSection && (
          <ErrorBoundary fallback="Failed to load admin tools. Please refresh.">
          <AdminPanel
            shopId={shopId}
            shopProfile={shopProfile}
            staffMembers={staffMembers}
            isOwner={isOwner}
            isPlatformAdmin={isPlatformAdmin}
            showPlatformAdmin={showPlatformAdmin}
           />
          </ErrorBoundary>
        )}

        {/* Version display — clean, non-promotional. Hidden dev mode trigger via tap count */}
        <div
          onClick={handleAboutTap}
          className="text-center py-3 text-xs select-none"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label={lang === 'am' ? 'መስመርቻ መረጃ' : 'App info'}
        >
          <span>
            Gebya · v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}
          </span>
          {aboutTapCount > 0 && aboutTapCount < DEV_MODE_UNLOCK_TAPS && !showAdminSection && (
            <span className="ml-2" style={{ color: 'var(--color-accent-amber)' }}>
              · {DEV_MODE_UNLOCK_TAPS - aboutTapCount} {lang === 'am' ? 'ተጨማሪ መታ' : 'more taps'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
