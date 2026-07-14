import { BookOpen, CreditCard, BarChart3, MoreHorizontal } from 'lucide-react';
import { useLang } from '../context/LangContext';

const TAB_LABELS = {
  today:    { en: 'Today',     am: 'የዛሬ' },
  credit:   { en: 'Credit',    am: 'ዱቤ' },
  history:  { en: 'Report',    am: 'ሪፖርት' },
  settings: { en: 'More',      am: 'ተጨማሪ' },
};

const TAB_ICONS = {
  today:    BookOpen,
  credit:   CreditCard,
  history:  BarChart3,
  settings: MoreHorizontal,
};

export default function AppBottomNav({
  activeTab,
  onTabChange,
  creditMetrics,
  unreadNotifCount,
}) {
  const { lang, t } = useLang();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 border-t"
      style={{ background: '#ffffff', borderColor: '#e5e7eb' }}
    >
      <div className="flex">
        {['today', 'credit', 'history', 'settings'].map(tabId => {
          const Icon = TAB_ICONS[tabId];
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              onClick={() => onTabChange(tabId)}
              className="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] press-scale"
              style={{ color: isActive ? '#1B4332' : '#9ca3af' }}
            >
              <div style={{ position: 'relative' }}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {tabId === 'credit' && creditMetrics?.overdueCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, borderRadius: 999,
                    background: '#dc2626', color: '#fff',
                    fontSize: '0.55rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', border: '1.5px solid #fff',
                  }}>
                    {creditMetrics.overdueCount}
                  </span>
                )}
                {tabId === 'today' && unreadNotifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -8,
                    minWidth: 16, height: 16, borderRadius: 999,
                    background: '#1B4332', color: '#fff',
                    fontSize: '0.55rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', border: '1.5px solid #fff',
                  }}>
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </div>
              <span className="text-[11px]" style={{ fontWeight: isActive ? 700 : 500 }}>
                {TAB_LABELS[tabId][lang]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
