import { BookOpen, CreditCard, BarChart3, MoreHorizontal, Users } from 'lucide-react';
import { useLang } from '../context/LangContext';

const TAB_LABELS = {
  today:    { en: 'Today',     am: 'የዛሬ' },
  credit:   { en: 'Credit',    am: 'ዱቤ' },
  history:  { en: 'Report',    am: 'ሪፖርት' },
  staff:    { en: 'Staff',     am: 'ሰራተኞች' },
  settings: { en: 'More',      am: 'ተጨማሪ' },
};

const TAB_ICONS = {
  today:    BookOpen,
  credit:   CreditCard,
  history:  BarChart3,
  staff:    Users,
  settings: MoreHorizontal,
};

export default function AppBottomNav({
  activeTab,
  onTabChange,
  creditMetrics,
  unreadNotifCount,
  showStaffTab = false,
}) {
  const { lang, t } = useLang();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 border-t"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border-light)',
        boxShadow: '0 -12px 32px -16px rgba(27,67,50,0.28)',
      }}
    >
      <div className="flex px-1">
        {['today', 'credit', 'history', ...(showStaffTab ? ['staff'] : []), 'settings'].map(tabId => {
          const Icon = TAB_ICONS[tabId];
          const isActive = activeTab === tabId;
          return (
            <button
              key={tabId}
              onClick={() => onTabChange(tabId)}
              className="flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] press-scale relative"
            >
              <span
                className="flex items-center justify-center w-11 h-8 rounded-full transition-all"
                style={isActive
                  ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', boxShadow: '0 6px 14px -6px rgba(27,67,50,0.5)' }
                  : {}}
              >
                <Icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{ color: isActive ? '#fff' : 'var(--color-text-soft)' }}
                />
                {tabId === 'credit' && creditMetrics?.overdueCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: 6,
                    minWidth: 16, height: 16, borderRadius: 999,
                    background: 'var(--color-danger)', color: 'var(--color-bg-white)',
                    fontSize: '0.55rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', border: '1.5px solid #fff',
                  }}>
                    {creditMetrics.overdueCount}
                  </span>
                )}
                {tabId === 'today' && unreadNotifCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -2, right: 6,
                    minWidth: 16, height: 16, borderRadius: 999,
                    background: 'var(--color-primary)', color: 'var(--color-bg-white)',
                    fontSize: '0.55rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 4px', border: '1.5px solid #fff',
                  }}>
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </span>
              <span
                className="text-[11px]"
                style={{ fontWeight: isActive ? 800 : 500, color: isActive ? 'var(--color-primary)' : 'var(--color-text-soft)' }}
              >
                {TAB_LABELS[tabId][lang]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
