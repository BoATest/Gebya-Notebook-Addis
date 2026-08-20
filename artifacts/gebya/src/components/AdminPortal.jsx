/**
 * AdminPortal - standalone platform-admin command center, mounted at /admin.
 * Gives the Gebya team a shareable URL to follow platform status: shops,
 * frictions, communications, support tickets, admin actions.
 * Access is server-enforced (/api/admin/* requires an allowlisted admin phone).
 * This page is only the client-side entry + UX gate.
 */
import { useEffect, useState } from 'react';
import { lazy, Suspense } from 'react';
import { LangProvider, useLang } from '../context/LangContext';
import { ThemeProvider } from '../context/ThemeContext';
import { PrivacyProvider } from '../context/PrivacyContext';
import { useAuthStore } from '../stores/authStore';
import MembersPanel from './MembersPanel.jsx';

const AdminDashboard = lazy(() => import('./AdminDashboard.jsx'));
const AdminShopDetail = lazy(() => import('./AdminShopDetail.jsx'));

function Shell({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="max-w-2xl mx-auto px-4 py-4">{children}</div>
    </div>
  );
}

function Header() {
  const { lang } = useLang();
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">Gebya</span>
        <div>
          <p className="text-sm font-black leading-tight">Command Center</p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am' ? 'የመሣሪያ ስርዓት አስተዳደር' : 'Platform admin - shops - support - comms'}
          </p>
        </div>
      </div>
      <a href="/" className="text-xs font-bold px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg-hover)' }}>
        {lang === 'am' ? 'ወደ መተግበሪያው' : 'Open app'}
      </a>
    </div>
  );
}

function Notice({ title, hint }) {
  return (
    <div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-sm font-black mb-2">{title}</p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
    </div>
  );
}

function AdminPortalInner() {
  const { user, checked, isPlatformAdmin, init } = useAuthStore();
  const { lang } = useLang();
  const [shop, setShop] = useState(null);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    if (!checked) init();
  }, [checked, init]);

  const goDashboard = () => { setView('dashboard'); setShop(null); };

  return (
    <Shell>
      <Header />
      {!checked ? (
        <div className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : !user ? (
        <Notice
          title={lang === 'am' ? 'መግባት ያስፈልጋል' : 'Sign in required'}
          hint={lang === 'am' ? 'መጀመሪያ ወደ መተግበሪያው ይግቡ።' : 'Sign in to the app first, then open /admin again.'}
        />
      ) : !isPlatformAdmin ? (
        <Notice
          title={lang === 'am' ? 'የአስተዳዳሪ መዳረሻ የለም' : 'Admin access required'}
          hint="Your phone is not on the platform-admin allowlist (PLATFORM_ADMIN_PHONES)."
        />
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <button
              onClick={goDashboard}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={view === 'dashboard' ? { background: 'var(--color-primary)', color: '#fff' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
            >
              {lang === 'am' ? 'ዳሽቦርድ' : 'Dashboard'}
            </button>
            <button
              onClick={() => { setView('members'); setShop(null); }}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={view === 'members' ? { background: 'var(--color-primary)', color: '#fff' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
            >
              {lang === 'am' ? 'ቡድን' : 'Team'}
            </button>
          </div>
          {view === 'members' ? (
            <MembersPanel />
          ) : shop ? (
            <Suspense fallback={<div className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Loading shop...</div>}>
              <AdminShopDetail businessId={shop.id} onBack={goDashboard} />
            </Suspense>
          ) : (
            <Suspense fallback={<div className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Loading dashboard...</div>}>
              <AdminDashboard onShopSelect={setShop} />
            </Suspense>
          )}
        </>
      )}
    </Shell>
  );
}

export default function AdminPortal() {
  return (
    <LangProvider>
      <ThemeProvider>
        <PrivacyProvider>
          <AdminPortalInner />
        </PrivacyProvider>
      </ThemeProvider>
    </LangProvider>
  );
}