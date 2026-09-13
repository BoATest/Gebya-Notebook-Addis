import { Suspense, useState, lazy, useCallback } from 'react';
import { useLang } from '../context/LangContext';
import { usePermissionsStore } from '../stores/permissionsStore';
import { useAuthStore } from '../stores/authStore';
import { fireToast } from './Toast';
import { trackEvent } from '../utils/eventTracking';
import { PERMISSIONS, ROLES, canAccessDevMode } from '../constants/permissions';

import ShopTab from './settings/tabs/ShopTab';
import MoneyTab from './settings/tabs/MoneyTab';
import DataTab from './settings/tabs/DataTab';
import DownloadAppBanner from './settings/DownloadAppBanner';
import { InstallGuideModal } from './PwaInstallPanel';
import ReminderSettings from './settings/ReminderSettings';
import NotificationPreferences from './settings/NotificationPreferences';
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
  pwa,
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
  const usePermStore = usePermissionsStore();
  const hasPermission = usePermStore.hasPermission;
  const role = usePermStore.role || ROLES.STAFF;
  const isAdminFlag = useAuthStore(s => s.isPlatformAdmin);

  const roleBadge = (() => {
    if (!role) return null;
    if (role === ROLES.OWNER) return lang === 'am' ? 'ባለቤት' : 'Owner';
    if (role === ROLES.MANAGER) return lang === 'am' ? 'ሥራ አስኪያጅ' : 'Manager';
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

  const isOwner = role === ROLES.OWNER;
  const isPlatformAdmin = isAdminFlag || role === ROLES.PLATFORM_ADMIN || role === ROLES.SYSTEM_ADMIN;
  const canViewDevMode = canAccessDevMode(role);
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
    if (!canViewDevMode) return;

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
      
      // Audit log: track dev mode activation locally
      trackEvent('dev_mode_enabled', {
        role,
        shop_id: shopId,
        method: 'about_tap_5x',
        session_duration_ms: Date.now() - (aboutTapStart || Date.now()),
      }).catch(() => { /* analytics failure is non-critical */ });
      
      // Server-side validation + audit log
      if (shopId) {
        fetch('/api/audit/dev-mode/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: shopId }),
        }).catch(() => { /* server-side logging failure is non-critical */ });
      }
      
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
      <DownloadAppBanner pwa={pwa} />
      <InstallGuideModal pwa={pwa} />

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

        {/* Language Toggle */}
        <div className="lang-toggle">
          <button
            onClick={() => lang !== 'en' && toggleLang()}
            className={`lang-toggle__btn ${lang === 'en' ? 'lang-toggle__btn--active' : 'lang-toggle__btn--inactive'}`}
            aria-label={lang === 'en' ? 'English selected' : 'Switch to English'}
          >
            EN
          </button>
          <button
            onClick={() => lang !== 'am' && toggleLang()}
            className={`lang-toggle__btn ${lang === 'am' ? 'lang-toggle__btn--active' : 'lang-toggle__btn--inactive'}`}
            aria-label={lang === 'am' ? 'አማር\u{200c}ኛ በመረጡት' : 'Switch to አማር\u{200c}ኛ'}
          >
            አማ
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-list">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            aria-label={lang === 'am' ? tab.labelAm : tab.labelEn}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : 'tab-btn--inactive'}`}
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
          >
            {lang === 'am' ? tab.labelAm : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4">
        <ErrorBoundary fallback="Failed to load settings. Please refresh.">
        <Suspense fallback={<SettingsPanelFallback label={t.loading} />}>
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
                pwa={pwa}
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

        {/* Notification Preferences */}
        <div className="mt-4">
          <NotificationPreferences lang={lang} />
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
