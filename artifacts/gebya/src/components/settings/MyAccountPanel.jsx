import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../../context/LangContext';
import { useAuthStore } from '../../stores/authStore';
import { usePermissionsStore } from '../../stores/permissionsStore';
import { ROLES } from '../../constants/permissions';
import db from '../../db';
import { getSyncEngine } from '../../utils/syncEngine';
import TabCard from './TabCard';
import useAccordion from './useAccordion';
import NotificationPreferences from './NotificationPreferences';
import BackupDataPanel from './BackupDataPanel';
import SyncStatusIndicator from '../SyncStatusIndicator';
import PasswordSettings from './PasswordSettings';
import DisplayPrivacyPanel from './DisplayPrivacyPanel';
import HelpSupportPanel from './grouped/HelpSupportPanel';
import AboutPanel from './grouped/AboutPanel';
import ConfirmDialog from '../ConfirmDialog';
import { GROUPED_LABELS as G } from './groupedLabels';
import { APP_VERSION_LABEL } from '../../utils/appVersion';

/**
 * R2.3 Slice 2 — MY ACCOUNT, the staff surface of the grouped page.
 *
 * Renders when `can_edit_settings === false` (SettingsGroupedPage routes here).
 * The rule from docs/R2-PERMISSION-MATRIX.md:31 — "can_edit_settings === true →
 * render SHOP + MONEY & CREDIT groups; otherwise render MyAccountPanel only."
 * So this component must contain NO owner surface at all: no setup checklist
 * (owner concept), no SHOP/MONEY group headers (absent, not collapsed), and no
 * danger zone (a staff member cannot wipe the shop's phone).
 *
 * Wireframe State 3 (docs/R2-WIREFRAMES.md:102-118) rows, in order:
 *   Appearance · My alerts · My phone · My password · About · Help & Support ·
 *   Sign out. Backup & sync and Language come from the permission matrix
 *   (staff ✅ for both) and are included here.
 *
 * Deliberate deviations, both because the underlying capability does not exist:
 *   - "My phone" is READ-ONLY. The wireframe wants "change = OTP re-verify",
 *     but the API only exposes POST /auth/otp + POST /auth/verify
 *     (utils/authClient.js) — there is no endpoint that mutates a user's phone.
 *     A tappable row that silently did nothing is the same trust-bug class as
 *     the retired "Staff 0/3" cap, so this renders the number and its state
 *     instead of a fake affordance. The change flow needs an API first.
 *   - No PIN row. `staff_members` has no PIN column in lib/db/src/schema and no
 *     setter exists in the client, so a PIN control would be inert.
 *
 * (a) "My alerts" is the SAME NotificationPreferences component the owner sees —
 *     one notification model for every role (wireframe correction a). Preferences
 *     are keyed per user server-side, so no staff/owner fork was needed.
 *
 * Sign-out (correction c) counts the local outbox first: if records have not
 * uploaded yet, the dialog says so and offers Sync now / Sign out anyway.
 *
 * Labels: GROUPED_LABELS is a ⚠ DRAFT pending shopkeeper sign-off.
 */

function GroupHeader({ label }) {
  return (
    <div className="mt-5 mb-1 px-1">
      <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </h2>
    </div>
  );
}

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function MyAccountPanel({
  transactions,
  customerSummaries,
  shopProfile,
}) {
  const { lang, toggleLang, t } = useLang();
  const { openCards, toggleCard } = useAccordion();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const authUser = useAuthStore((s) => s.user);
  const hasPassword = useAuthStore((s) => s.hasPassword);
  const role = usePermissionsStore((s) => s.role) || ROLES.STAFF;

  const L = (entry) => entry[lang] || entry.en;

  // Identity comes from /auth/me (authStore), NOT the shop profile — the shop
  // profile is the business, this is the person.
  const displayName = authUser?.display_name || authUser?.name || '';
  const phone = authUser?.phone_number || '';
  const shopName = shopProfile?.name || '';

  const roleLabel = (() => {
    if (role === ROLES.OWNER) return lang === 'am' ? 'ባለቤት' : 'Owner';
    if (role === ROLES.MANAGER) return lang === 'am' ? 'ሥራ አስኪያጅ' : 'Manager';
    return lang === 'am' ? 'ሰራተኛ' : 'Staff';
  })();

  const totalEntries = (transactions || []).length;

  // Outbox size is the honest "not yet uploaded" count (db.js:600 documents
  // why: entries are removed only after the server acknowledges the push).
  const readUnsynced = useCallback(async () => {
    try {
      const count = await db.sync_outbox.count();
      setUnsyncedCount(count);
    } catch {
      setUnsyncedCount(0); // never block sign-out on a read failure
    }
  }, []);

  useEffect(() => { readUnsynced(); }, [readUnsynced]);

  const handleSignOutClick = async () => {
    await readUnsynced();
    setSignOutOpen(true);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await getSyncEngine()?.sync();
    } catch { /* surfaced by the sync status indicator */ }
    await readUnsynced();
    setSyncing(false);
    // Once the outbox drains there is nothing to warn about — close.
    const remaining = await db.sync_outbox.count().catch(() => 0);
    if (remaining === 0) setSignOutOpen(false);
  };

  const handleSignOutConfirm = async () => {
    setSignOutOpen(false);
    await useAuthStore.getState().logout();
  };

  return (
    <div className="pb-4" data-testid="my-account-panel">
      {/* Account header — (d) shop context, so a staff member knows whose shop
          they are in on a shared phone. */}
      <div className="bg-white rounded-2xl border border-green-100/50 px-4 py-4 mt-2 flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
          style={{ background: 'var(--color-primary)' }}
        >
          {initialsOf(displayName || shopName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-gray-900 truncate">{displayName || shopName}</div>
          <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
            {phone || (lang === 'am' ? 'ስልክ አልተጨመረም' : 'No phone added')}
          </div>
          <div className="text-[11px] mt-0.5 flex items-center gap-1.5 truncate">
            <span
              className="text-[0.55rem] font-black uppercase px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-warning-border)', color: 'var(--color-primary)' }}
            >
              {roleLabel}
            </span>
            {shopName && <span style={{ color: 'var(--color-text-muted)' }}>{shopName}</span>}
          </div>
        </div>
      </div>

      <GroupHeader label={L(G.groups.myAccount)} />

      <TabCard
        id="my-appearance"
        icon="🎨"
        title={L(G.rows.appearance)}
        subtitle={lang === 'am' ? 'ጨለማ/ብርሃን ሁነታ፣ መጠኖችን ደብቅ' : 'Dark/light mode, hide amounts'}
        badgeTone="neutral"
        open={openCards.has('my-appearance')}
        onToggle={() => toggleCard('my-appearance')}
      >
        <DisplayPrivacyPanel />
      </TabCard>

      <TabCard
        id="my-alerts"
        icon="🔔"
        title={L(G.rows.myAlerts)}
        subtitle={lang === 'am' ? 'የማስጠንቂያ ምርጫ' : 'Notification preferences'}
        badgeTone="neutral"
        open={openCards.has('my-alerts')}
        onToggle={() => toggleCard('my-alerts')}
      >
        <NotificationPreferences lang={lang} />
      </TabCard>

      <TabCard
        id="my-backup"
        icon="📦"
        title={L(G.rows.backupSync)}
        subtitle={lang === 'am'
          ? `${totalEntries} መዝገብ · ምትኬ እና ውጤት`
          : `${totalEntries} entries · backup & export`}
        badge={totalEntries > 0 ? `${totalEntries}` : (lang === 'am' ? 'ባዶ' : 'Empty')}
        badgeTone={totalEntries > 0 ? 'ok' : 'neutral'}
        open={openCards.has('my-backup')}
        onToggle={() => toggleCard('my-backup')}
      >
        <SyncStatusIndicator onSyncNow />
        <div className="mt-3">
          {/* One CSV affordance; "Start over on this phone" is an owner-only
              destructive action and never appears on a staff surface. */}
          <BackupDataPanel
            transactions={transactions}
            customerSummaries={customerSummaries}
            includeStartOver={false}
          />
        </div>
      </TabCard>

      {/* Read-only: no endpoint mutates the signed-in phone number yet. */}
      <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden mb-2.5">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: 'var(--color-surface-subtle)' }}>
            📱
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-gray-900 truncate">{L(G.rows.myPhone)}</div>
            <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
              {phone || (lang === 'am' ? 'አልተጨመረም' : 'Not added')}
            </div>
          </div>
          <span
            className="flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
            style={phone
              ? { background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }
              : { background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}
          >
            {phone ? L(G.chrome.set) : L(G.chrome.notSet)}
          </span>
        </div>
      </div>

      {/* (e) set/not-set state is visible on the row itself, so the user knows
          the state before opening the panel. */}
      <TabCard
        id="my-password"
        icon="🔒"
        title={L(G.rows.myPassword)}
        badge={hasPassword ? L(G.chrome.set) : L(G.chrome.notSet)}
        badgeTone={hasPassword ? 'ok' : 'neutral'}
        open={openCards.has('my-password')}
        onToggle={() => toggleCard('my-password')}
      >
        <PasswordSettings lang={lang} />
      </TabCard>

      <TabCard
        id="my-language"
        icon="🌐"
        title={L(G.rows.language)}
        subtitle={lang === 'am' ? 'አማ' : 'EN'}
        badgeTone="neutral"
        open={openCards.has('my-language')}
        onToggle={() => toggleCard('my-language')}
      >
        <div className="px-4 pb-3">
          <div className="lang-toggle" role="group" aria-label={lang === 'am' ? 'ቋንቋ' : 'Language'}>
            <button
              type="button"
              onClick={() => lang !== 'en' && toggleLang()}
              className={`lang-toggle__btn ${lang === 'en' ? 'lang-toggle__btn--active' : 'lang-toggle__btn--inactive'}`}
              aria-label={lang === 'en' ? 'English selected' : 'Switch to English'}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => lang !== 'am' && toggleLang()}
              className={`lang-toggle__btn ${lang === 'am' ? 'lang-toggle__btn--active' : 'lang-toggle__btn--inactive'}`}
              aria-label={lang === 'am' ? 'አማር\u{200c}ኛ በመረጡት' : 'Switch to አማር\u{200c}ኛ'}
            >
              አማ
            </button>
          </div>
        </div>
      </TabCard>

      <TabCard
        id="my-about"
        icon="ℹ️"
        title={L(G.rows.about)}
        subtitle={APP_VERSION_LABEL}
        badgeTone="neutral"
        open={openCards.has('my-about')}
        onToggle={() => toggleCard('my-about')}
      >
        {/* No tap handler: the 5-tap dev unlock is owner/system-admin only
            (canAccessDevMode), and SettingsPage already refuses non-owners. */}
        <AboutPanel />
      </TabCard>

      <TabCard
        id="my-help"
        icon="❓"
        title={L(G.rows.help)}
        subtitle={lang === 'am' ? 'ጥያቄዎችን ያግኙ፡ ችግር ያመልክቱ' : 'Get answers, report a problem'}
        badgeTone="neutral"
        open={openCards.has('my-help')}
        onToggle={() => toggleCard('my-help')}
      >
        <HelpSupportPanel />
      </TabCard>

      {authUser ? (
        <button
          type="button"
          onClick={handleSignOutClick}
          className="w-full flex items-center gap-3 bg-white rounded-2xl border border-green-100/50 px-4 py-3.5 mb-2.5 text-left"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: 'var(--color-danger-bg)' }}>
            🚪
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black truncate" style={{ color: 'var(--color-danger)' }}>
              {L(G.rows.signOut)}
            </div>
          </div>
        </button>
      ) : null}

      {/* (c) Sign-out guard. Two states: records pending → warn + offer sync;
          otherwise the plain confirm. Sign-out is never blocked — the records
          are local and survive logout. */}
      {unsyncedCount > 0 ? (
        <ConfirmDialog
          open={signOutOpen}
          title={L(G.chrome.unsyncedTitle)}
          message={`${L(G.chrome.unsyncedCount)(unsyncedCount)} ${L(G.chrome.unsyncedBody)}`}
          confirmLabel={syncing ? '...' : L(G.chrome.syncNow)}
          cancelLabel={L(G.chrome.signOutAnyway)}
          tone="danger"
          onConfirm={handleSyncNow}
          onCancel={handleSignOutConfirm}
        />
      ) : (
        <ConfirmDialog
          open={signOutOpen}
          title={L(G.chrome.signOutTitle)}
          message={L(G.chrome.signOutBody)}
          confirmLabel={L(G.rows.signOut)}
          cancelLabel={t.cancel}
          tone="danger"
          onConfirm={handleSignOutConfirm}
          onCancel={() => setSignOutOpen(false)}
        />
      )}
    </div>
  );
}
