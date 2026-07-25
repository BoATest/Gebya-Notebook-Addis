import { useState } from 'react';
import { Bell, Settings, ChevronDown, Check } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import OfflineStatusStrip from './OfflineStatusStrip';
import BusinessSelector from './BusinessSelector';

export default function AppHeader({
  shopProfile,
  currentActorLabel,
  staffMembers = [],
  activeStaffMemberId,
  onSetActiveStaffMember,
  pwa,
  unreadNotifCount,
  conflictWarning,
  conflictDetails,
  onOpenNotifications,
  onRetryTelegram,
}) {
  const { lang, toggleLang, t } = useLang();
  const T = (en, am) => lang === 'am' ? am : en;
  const setActiveTab = useAppStore(s => s.setActiveTab);
  const pendingTelegramCount = useAppStore(s => s.pendingTelegramCount);
  const retryingTelegram = useAppStore(s => s.retryingTelegram);
  const currentBusinessId = useAuthStore(s => s.currentBusinessId);
  const [showActorPicker, setShowActorPicker] = useState(false);

  const activeStaff = (staffMembers || []).filter(m => m.active !== false);

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
          <button
            onClick={() => setShowActorPicker(!showActorPicker)}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-medium mt-0.5 truncate press-scale"
            style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {T('Recording as', 'እየመዘገቡ ያሉት')} {currentActorLabel || 'Owner'}
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {showActorPicker && (
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowActorPicker(false)}
            style={{ background: 'rgba(0,0,0,0.3)' }}
          >
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white rounded-2xl overflow-hidden shadow-xl border"
              style={{ borderColor: '#e8e2d8' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500 border-b" style={{ borderColor: '#f0ece4' }}>
                {T('Switch actor', 'ተጠቃሚ ቀይር')}
              </div>
              <div className="py-1">
                <button
                  onClick={() => { onSetActiveStaffMember?.(null); setShowActorPicker(false); }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: '#1B4332' }}>
                    {shopProfile.name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">{shopProfile.name || 'Owner'}</div>
                    <div className="text-[11px] text-gray-500">{T('Owner', 'ባለቤት')}</div>
                  </div>
                  {!activeStaffMemberId && <Check className="w-4 h-4 text-green-700 flex-shrink-0" />}
                </button>
                {activeStaff.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onSetActiveStaffMember?.(m.id); setShowActorPicker(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      {(m.display_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{m.display_name}</div>
                      <div className="text-[11px] text-gray-500">{m.role || 'staff'}</div>
                    </div>
                    {String(activeStaffMemberId) === String(m.id) && <Check className="w-4 h-4 text-green-700 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
