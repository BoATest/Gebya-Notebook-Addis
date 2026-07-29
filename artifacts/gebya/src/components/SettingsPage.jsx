import { Suspense, useState, lazy } from 'react';
import { useLang } from '../context/LangContext';
import { usePermissionsStore } from '../stores/permissionsStore';
import { fireToast } from './Toast';

import ShopTab from './settings/tabs/ShopTab';
import MoneyTab from './settings/tabs/MoneyTab';
import DataTab from './settings/tabs/DataTab';
import AdminMetricsView from './AdminMetricsView';
import CrossShopCurationQueue from './CrossShopCurationQueue';

const AdminDashboard = lazy(() => import('./AdminDashboard.jsx'));

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
  const canManageTeam = hasPermission('can_manage_team');
  const roleBadge = (() => {
    if (!role) return null;
    if (role === 'owner') return lang === 'am' ? 'ባለቤት' : 'Owner';
    if (role === 'manager') return lang === 'am' ? 'ሥራ አስኪያጅ' : 'Manager';
    return lang === 'am' ? 'ሰራተኛ' : 'Staff';
  })();
  const [activeTab, setActiveTab] = useState('shop');
  const [pendingCardId, setPendingCardId] = useState(null);

  const [adminSection, setAdminSection] = useState(null); // null | 'metrics' | 'curation'
  const [aboutTapCount, setAboutTapCount] = useState(0);
  const [devModeRevealed, setDevModeRevealed] = useState(() => {
    try { return localStorage.getItem('gebya_dev_mode') === 'true'; } catch { return false; }
  });

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
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1" style={{ background: 'var(--cream)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white"
            style={{ background: '#1B4332' }}
          >
            {initials}
          </div>
          <div>
            <div className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              {name || (lang === 'am' ? 'ሱቅ' : 'Shop')}
              {roleBadge && (
                <span className="text-[0.55rem] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: '#fde68a', color: '#1B4332' }}>
                  {roleBadge}
                </span>
              )}
            </div>
            <div className="text-[0.68rem]" style={{ color: '#6b7280' }}>
              {shopProfile?.phone || (lang === 'am' ? 'ስልክ አልተጨመረም' : 'No phone added')}
            </div>
          </div>
        </div>
        <div className="flex rounded-full p-0.5 text-xs font-black" style={{ background: '#efece2' }}>
          <button
            onClick={() => lang !== 'en' && toggleLang()}
            className={`px-2.5 py-1 rounded-full ${lang === 'en' ? 'text-white' : ''}`}
            style={lang === 'en' ? { background: '#1B4332' } : { color: '#6b7280' }}
          >
            EN
          </button>
          <button
            onClick={() => lang !== 'am' && toggleLang()}
            className={`px-2.5 py-1 rounded-full ${lang === 'am' ? 'text-white' : ''}`}
            style={lang === 'am' ? { background: '#1B4332' } : { color: '#6b7280' }}
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
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#1B4332' : '#6b7280',
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

        {/* Admin section — only in dev mode */}
        {devModeRevealed && (
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden mt-4">
            <div className="px-4 py-3 text-xs font-black uppercase tracking-wider" style={{ color: '#92400e' }}>
              {lang === 'am' ? 'የልማት ሁነታ' : 'Dev Mode'}
            </div>
            <div className="flex gap-2 px-4 pb-3">
              <button
                onClick={() => setAdminSection(adminSection === 'metrics' ? null : 'metrics')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'metrics' ? 'text-white' : ''}`}
                style={adminSection === 'metrics' ? { background: '#1B4332' } : { background: '#f3f4f6', color: '#374151' }}
              >
                {lang === 'am' ? 'ሜትሪክስ' : 'Metrics'}
              </button>
              <button
                onClick={() => setAdminSection(adminSection === 'curation' ? null : 'curation')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'curation' ? 'text-white' : ''}`}
                style={adminSection === 'curation' ? { background: '#1B4332' } : { background: '#f3f4f6', color: '#374151' }}
              >
                {lang === 'am' ? 'ማስተካከያ ወረፋ' : 'Curation'}
              </button>
              <button
                onClick={() => setAdminSection(adminSection === 'admin' ? null : 'admin')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${adminSection === 'admin' ? 'text-white' : ''}`}
                style={adminSection === 'admin' ? { background: '#1B4332' } : { background: '#f3f4f6', color: '#374151' }}
              >
                Admin
              </button>
            </div>
            {adminSection === 'metrics' && <div className="px-4 pb-3"><AdminMetricsView shopId={shopId} /></div>}
            {adminSection === 'curation' && <div className="px-4 pb-3"><CrossShopCurationQueue /></div>}
            {adminSection === 'admin' && <div className="px-4 pb-3"><Suspense fallback={<div className="text-xs text-gray-400 py-4">Loading...</div>}><AdminDashboard /></Suspense></div>}
          </div>
        )}

        {/* My Profile card — for staff without manage_team permission */}
        {!canManageTeam && staffMembers && staffMembers.length > 0 && (
          <div className="bg-white rounded-2xl border overflow-hidden mt-4" style={{ borderColor: '#e8e2d8' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#f0ece4', background: '#fcfbf8' }}>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {lang === 'am' ? 'የእኔ መገለጫ' : 'MY PROFILE'}
              </span>
            </div>
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: '#1B4332' }}>
                  {(shopProfile?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{shopProfile?.name || 'Staff'}</div>
                  <div className="text-xs font-medium" style={{ color: '#6b7280' }}>
                    {lang === 'am' ? 'ሰራተኛ' : 'Staff'} · {shopProfile?.role || 'staff'}
                  </div>
                </div>
              </div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-2">
                {lang === 'am' ? 'የቡድን አባላት' : 'Team'}
              </div>
              {staffMembers.filter(m => m.active !== false).map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: '#f3f4f6', color: '#6b7280' }}>
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
          style={{ color: '#6b7280' }}
        >
          Gebya v1.0
          {aboutTapCount > 0 && aboutTapCount < 5 && !devModeRevealed && (
            <span className="ml-2" style={{ color: '#C4883A' }}>
              · {5 - aboutTapCount} {lang === 'am' ? 'ተጨማሪ መታ' : 'more taps'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
