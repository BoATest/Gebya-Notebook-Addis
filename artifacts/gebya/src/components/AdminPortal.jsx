/**
 * AdminPortal - standalone platform-admin command center, mounted at /admin.
 * Gives the Gebya team a shareable URL to follow platform status: shops,
 * frictions, communications, support tickets, admin actions.
 * Access is server-enforced (/api/admin/* requires an allowlisted admin phone OR email).
 * This page is only the client-side entry + UX gate.
 */
import { useEffect, useState } from 'react';
import { lazy, Suspense } from 'react';
import { LangProvider, useLang } from '../context/LangContext';
import { ThemeProvider } from '../context/ThemeContext';
import { PrivacyProvider } from '../context/PrivacyContext';
import { useAuthStore } from '../stores/authStore';
import MembersPanel from './MembersPanel.jsx';
import AuthGate from './AuthGate.jsx';

const AdminDashboard = lazy(() => import('./AdminDashboard.jsx'));
const AdminShopDetail = lazy(() => import('./AdminShopDetail.jsx'));

function Shell({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="max-w-6xl mx-auto px-4 py-4">{children}</div>
    </div>
  );
}

const NAV = [
  { id: 'overview', label: 'Overview', am: 'አጠቃላይ' },
  { id: 'shops', label: 'Shops', am: 'ሱቃች' },
  { id: 'frictions', label: 'Frictions', am: 'ጥርጣሬዎች' },
  { id: 'features', label: 'Features', am: 'ባህሪያት' },
  { id: 'actions', label: 'Actions', am: 'እርምጃዎች' },
  { id: 'team', label: 'Team', am: 'ቡድን' },
];

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

function GoogleAdminSignIn() {
  const { lang } = useLang();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredential = async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/google-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      useAuthStore.getState().login(data.token, data.user, data.role, data.permissions, data.businesses, true);
      await useAuthStore.getState().init();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    let script = document.getElementById('gis-client');
    if (!script) {
      script = document.createElement('script');
      script.id = 'gis-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.body.appendChild(script);
    }
    const initGis = () => window.google?.accounts?.id?.initialize({ client_id: clientId, callback: handleCredential });
    script.onload = initGis;
    if (window.google?.accounts?.id) initGis();
  }, [clientId]);

  if (!clientId) {
    return (
      <p className="text-[11px] text-center mt-3" style={{ color: 'var(--color-text-muted)' }}>
        {lang === 'am' ? 'የ Google መግቢያ አይተዋወቅም' : 'Google sign-in not configured'}
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => window.google?.accounts?.id?.prompt()}
        disabled={loading}
        className="w-full py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
        style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
      >
        {loading ? '...' : (lang === 'am' ? 'በ Google ይግቡ' : 'Sign in with Google')}
      </button>
      {error && (
        <p className="text-[11px] mt-2 text-center font-bold" style={{ color: 'var(--color-danger-text)' }}>{error}</p>
      )}
    </div>
  );
}

function AdminPortalInner() {
  const { user, checked, isPlatformAdmin, init } = useAuthStore();
  const { lang } = useLang();
  const [shop, setShop] = useState(null);
  const [section, setSection] = useState('overview');

  useEffect(() => {
    if (!checked) init();
  }, [checked, init]);

  const goBack = () => { setShop(null); };
  const selectShop = (s) => { setShop(s); };
  const navTo = (id) => { setShop(null); setSection(id); };

  const navButton = (item, active, onClick) => (
    <button
      key={item.id}
      onClick={onClick}
      className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
      style={active ? { background: 'var(--color-primary)', color: '#fff' } : { background: 'var(--color-bg-hover)', color: 'var(--color-text)' }}
    >
      {lang === 'am' ? item.am : item.label}
    </button>
  );

  return (
    <Shell>
      <Header />
      {!checked ? (
        <div className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : !user ? (
        <div className="max-w-sm mx-auto space-y-3">
          <AuthGate lang={lang} onAuthenticated={() => { useAuthStore.getState().init(); }} />
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{lang === 'am' ? 'ወይም' : 'or'}</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>
          <GoogleAdminSignIn />
        </div>
      ) : !isPlatformAdmin ? (
        <Notice
          title={lang === 'am' ? 'የአስተዳደሪ መዳረሻ የለም' : 'Admin access required'}
          hint="Your phone/email is not on the platform-admin allowlist (PLATFORM_ADMIN_PHONES / PLATFORM_ADMIN_EMAILS)."
        />
      ) : (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <aside className="hidden md:flex md:flex-col gap-1 md:w-44 md:shrink-0">
            {NAV.map((item) => navButton(item, section === item.id && !shop, () => navTo(item.id)))}
          </aside>
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1 mb-1">
            {NAV.map((item) => navButton(item, section === item.id && !shop, () => navTo(item.id)))}
          </div>
          <main className="flex-1 min-w-0">
            {shop ? (
              <Suspense fallback={<div className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Loading shop...</div>}>
                <AdminShopDetail businessId={shop.id} onBack={goBack} />
              </Suspense>
            ) : section === 'team' ? (
              <MembersPanel />
            ) : (
              <Suspense fallback={<div className="text-xs text-center py-10" style={{ color: 'var(--color-text-muted)' }}>Loading dashboard...</div>}>
                <AdminDashboard key={section} initialTab={section} onShopSelect={selectShop} />
              </Suspense>
            )}
          </main>
        </div>
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