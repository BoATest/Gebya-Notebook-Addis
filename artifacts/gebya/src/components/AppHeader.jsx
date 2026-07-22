import { Bell, Settings } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import OfflineStatusStrip from './OfflineStatusStrip';
import BusinessSelector from './BusinessSelector';

export default function AppHeader({
  shopProfile,
  currentActorLabel,
  pwa,
  unreadNotifCount,
  conflictWarning,
  conflictDetails,
  onOpenNotifications,
  onRetryTelegram,
}) {
  const { lang, toggleLang, t } = useLang();
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const pendingTelegramCount = useAppStore(s => s.pendingTelegramCount);
  const retryingTelegram = useAppStore(s => s.retryingTelegram);
  const currentBusinessId = useAuthStore(s => s.currentBusinessId);

  return (
    <header
      className="flex-shrink-0 px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3"
      style={{ background: 'var(--color-bg)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setActiveTab('settings')}
          className="flex-shrink-0 press-scale flex items-center justify-center rounded-full font-bold text-white"
          aria-label="Open profile"
          style={{
            width: '36px', height: '36px', background: '#6b7280',
            fontSize: '14px', letterSpacing: '0.02em',
          }}
        >
          {shopProfile.name.charAt(0).toUpperCase()}
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-bold tracking-tight leading-tight truncate" style={{ color: '#1a1a1a' }}>
            <BusinessSelector shopProfile={shopProfile} currentBusinessId={currentBusinessId} />
          </h1>
          <p className="text-[10px] sm:text-xs font-medium mt-0.5 truncate" style={{ color: '#6b7280' }}>
            Recording as {currentActorLabel || 'Owner'} · {String(shopProfile.role || 'owner').replace(/_/g, ' ')}
          </p>
        </div>

        <button
          onClick={toggleLang}
          className="flex items-center flex-shrink-0 press-scale"
          style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '2px' }}
          aria-label={lang === 'en' ? 'Switch to Amharic' : 'Switch to English'}
        >
          <span style={{
            background: lang === 'en' ? '#1B4332' : 'transparent',
            color: lang === 'en' ? '#fff' : '#9ca3af',
            fontWeight: lang === 'en' ? 700 : 600,
            padding: '3px 8px', borderRadius: '6px', fontSize: '11px', transition: 'all 0.18s',
          }}>EN</span>
          <span style={{
            background: lang === 'am' ? '#1B4332' : 'transparent',
            color: lang === 'am' ? '#fff' : '#9ca3af',
            fontWeight: lang === 'am' ? 700 : 600,
            padding: '3px 7px', borderRadius: '6px', fontSize: '11px', transition: 'all 0.18s',
          }}>አማ</span>
        </button>

        <button
          onClick={onOpenNotifications}
          className="flex-shrink-0 press-scale flex items-center justify-center"
          aria-label={lang === 'am' ? 'ማስጠንቂቾች' : 'Notifications'}
          style={{ position: 'relative', minWidth: '44px', minHeight: '44px', padding: '8px' }}
        >
          <Bell className="w-5 h-5" style={{ color: unreadNotifCount > 0 ? '#1B4332' : '#9ca3af' }} />
          {unreadNotifCount > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              minWidth: 14, height: 14, borderRadius: 999,
              background: '#dc2626', color: '#fff',
              fontSize: '0.5rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
            }}>
              {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className="flex-shrink-0 press-scale flex items-center justify-center"
          aria-label="Settings"
          style={{ minWidth: '44px', minHeight: '44px', padding: '8px' }}
        >
          <Settings className="w-5 h-5" style={{ color: '#6b7280' }} />
        </button>
      </div>
      <OfflineStatusStrip
        pwa={pwa}
        pendingTelegramCount={pendingTelegramCount}
        lang={lang}
        onRetryTelegram={onRetryTelegram}
        retryingTelegram={retryingTelegram}
        conflictWarning={conflictWarning}
        conflictDetails={conflictDetails}
      />
    </header>
  );
}
