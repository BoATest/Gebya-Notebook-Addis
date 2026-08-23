import { BookOpen, CreditCard, BarChart3, Users, MoreHorizontal } from 'lucide-react';
import { useLang } from '../context/LangContext';

const TABS = [
  { id: 'today', label: { en: 'Today', am: 'የዛሬ' }, icon: BookOpen },
  { id: 'credit', label: { en: 'Credit', am: 'ዱቤ' }, icon: CreditCard },
  { id: 'history', label: { en: 'Report', am: 'ሪፖርት' }, icon: BarChart3 },
  { id: 'staff', label: { en: 'Staff', am: 'ሰራተኞች' }, icon: Users },
  { id: 'settings', label: { en: 'More', am: 'ተጨማሪ' }, icon: MoreHorizontal },
];

function NavBadge({ count, color }) {
  return (
    <span style={{
      position: 'absolute', top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 999,
      background: color, color: '#fff', fontSize: '0.55rem', fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
      border: '1.5px solid var(--color-surface)',
    }}>
      {count}
    </span>
  );
}

export default function SideNav({ activeTab, onTabChange, creditMetrics, unreadNotifCount, showStaffTab }) {
  const { lang } = useLang();
  const items = TABS.filter((t) => t.id !== 'staff' || showStaffTab);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:border-r" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="px-5 py-5 flex items-center gap-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
        <span className="text-xl font-black" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent-amber))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Gebya</span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-[var(--color-bg-hover)]"
              style={isActive
                ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))', color: '#fff', boxShadow: '0 6px 16px -8px rgba(27,67,50,0.45)' }
                : { color: 'var(--color-text)' }}
            >
              <span style={{ position: 'relative' }}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {t.id === 'credit' && creditMetrics?.overdueCount > 0 && (
                  <NavBadge count={creditMetrics.overdueCount} color="var(--color-danger)" />
                )}
                {t.id === 'today' && unreadNotifCount > 0 && (
                  <NavBadge count={unreadNotifCount > 99 ? '99+' : unreadNotifCount} color="var(--color-primary)" />
                )}
              </span>
              <span>{t.label[lang]}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
