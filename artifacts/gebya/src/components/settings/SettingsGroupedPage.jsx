import { useState } from 'react';
import { useLang } from '../../context/LangContext';
import { useAuthStore } from '../../stores/authStore';
import { usePermissionsStore } from '../../stores/permissionsStore';
import ReadinessHero from './ReadinessHero';
import MyAccountPanel from './MyAccountPanel';
import ShopProfilePanel from './ShopProfilePanel';
import CatalogPanel from './CatalogPanel';
import RecurringExpensesPanel from './RecurringExpensesPanel';
import DubieRulesPanel from './DubieRulesPanel';
import PaymentChannelsSection from './PaymentChannelsSection';
import PlanPanel from './PlanPanel';
import NotificationPreferences from './NotificationPreferences';
import ReminderSettings from './ReminderSettings';
import BackupDataPanel from './BackupDataPanel';
import SyncStatusIndicator from '../SyncStatusIndicator';
import PasswordSettings from './PasswordSettings';
import DisplayPrivacyPanel from './DisplayPrivacyPanel';
import DangerZoneSection from './backup/DangerZoneSection';
import TabCard from './TabCard';
import useAccordion from './useAccordion';
import ConfirmDialog from '../ConfirmDialog';
import HelpSupportPanel from './grouped/HelpSupportPanel';
import AboutPanel from './grouped/AboutPanel';
import { GROUPED_LABELS as G } from './groupedLabels';
import { APP_VERSION_LABEL } from '../../utils/appVersion';

/**
 * R2.3 grouped Settings page — the flag-ON replacement for the legacy
 * Shop/Money/Data tabs (src/utils/featureFlags.js, DEFAULT OFF).
 *
 * BINDING group membership (owner ruling, locked Frame 1):
 *   SHOP            — profile, items, recurring expenses
 *   MONEY & CREDIT  — credit rules, payment channels, plan
 *   MY APP          — alerts & reminders, remind customers, backup & sync,
 *                     password & devices, appearance, language, help, about,
 *                     sign out
 * Payment channels do NOT live under SHOP; notifications/reminders are app
 * preferences (MY APP), not money settings.
 *
 * Owner-locked items applied here:
 *   - Payment channels row shows a COUNT ONLY ("1 configured") — no "{n}/{cap}"
 *     denominator (same trust-bug class as the retired Staff 0/3 row).
 *   - Backup & sync exposes exactly ONE CSV export affordance.
 *   - "Start over on this phone" is isolated in its own danger zone at the
 *     bottom, outside the backup group.
 *   - Locked toggle colors (green ON #22c55e / gray OFF) on the switches this
 *     page owns.
 *   - Real version string (APP_VERSION) with the 5-tap dev unlock preserved.
 *
 * Role gating (Slice 3, live): `can_edit_settings` decides the whole surface.
 * True → the owner page below. False → MyAccountPanel, which renders the staff
 * rows and NO owner group (the SHOP and MONEY & CREDIT headers are absent, not
 * collapsed — docs/R2-PERMISSION-MATRIX.md:31). The read goes through
 * permissionsStore, the one app-side source of truth (matrix line 56-59).
 *
 * Labels: GROUPED_LABELS is a ⚠ DRAFT pending shopkeeper sign-off — see the
 * module banner.
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

export default function SettingsGroupedPage({
  transactions,
  customerSummaries,
  catalogEntries,
  shopProfile,
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
  onAboutTap,
  aboutTapCount,
  devModeRevealed,
  unlockTaps,
}) {
  const { lang, toggleLang, t } = useLang();
  const { openCards, toggleCard, openCard } = useAccordion();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const authUser = useAuthStore((s) => s.user);

  const L = (entry) => entry[lang] || entry.en;

  const totalEntries = (transactions || []).length;
  const totalCustomers = (customerSummaries || []).length;
  const activeItems = (catalogEntries || []).filter((e) => e.active !== false);
  const recurringCount = (recurringExpenses || []).length;

  // COUNT ONLY — the denominator was never a real cap (owner correction #2).
  const channelsConfigured = (paymentChannels || []).filter(
    (c) => c.enabled && (c.usePhoneFromShop || c.phone || c.account),
  ).length;

  const itemsBadge = activeItems.length > 0 ? `${activeItems.length}` : (lang === 'am' ? 'ባዶ' : 'Empty');
  const itemsSub = activeItems.length > 0
    ? (lang === 'am' ? `${activeItems.length} እቃዎች ተቀምጠዋል` : `${activeItems.length} saved items`)
    : (lang === 'am' ? 'ለመጀመር ይጨምሩ' : 'Add to get started');

  const recurringBadge = recurringCount > 0 ? `${recurringCount}` : (lang === 'am' ? 'ባዶ' : 'None');
  const recurringSub = recurringCount > 0
    ? (lang === 'am' ? `${recurringCount} ወርሃዊ ወጪ` : `${recurringCount} monthly bills`)
    : (lang === 'am' ? 'ኪራይ፣ ኢንተርኔት፣ ወዘተ' : 'Rent, internet, electricity, etc.');

  const channelsSub = channelsConfigured > 0
    ? `${channelsConfigured} ${L(G.chrome.configured)}`
    : (lang === 'am' ? 'አንድ መንገድ ያዋቅሩ' : 'Set up a payment channel');

  const handleSignOutConfirm = async () => {
    setSignOutOpen(false);
    await useAuthStore.getState().logout();
  };

  // R2.3 Slice 3 — the permission gate. Read through the store's hasPermission()
  // (never the raw permissions map, and never a shopProfile?.role fallback —
  // both are the split-brain pattern the matrix rules out at line 56-59).
  // Staff defaults have can_edit_settings === false (constants/permissions.js:28),
  // and a first-launch device with no cached permissions falls through to
  // STAFF_MINIMAL_SAFE which is also false — so an unverified staff phone gets
  // the staff surface rather than a flash of owner settings.
  const canEditSettings = usePermissionsStore((s) => s.hasPermission('can_edit_settings'));
  if (!canEditSettings) {
    return (
      <MyAccountPanel
        transactions={transactions}
        customerSummaries={customerSummaries}
        shopProfile={shopProfile}
      />
    );
  }

  return (
    <div className="pb-4">
      {/* Setup checklist — collapses to one line at 5/5 (owner ruling Q0). */}
      <ReadinessHero
        shopProfile={shopProfile}
        paymentChannels={paymentChannels}
        catalogEntries={catalogEntries}
        recurring={recurringExpenses}
        lang={lang}
        collapseWhenComplete
        onAction={(cardId) => openCard(cardId)}
      />

      {/* ── SHOP ─────────────────────────────────────────────────────── */}
      <GroupHeader label={L(G.groups.shop)} />

      <TabCard
        id="profile"
        icon="🏪"
        title={L(G.rows.profile)}
        subtitle={`${shopProfile?.name || (lang === 'am' ? 'ስም የለም' : 'No name')}${shopProfile?.phone ? ` · ${shopProfile.phone}` : ''}`}
        badge={shopProfile?.name && shopProfile?.phone ? (lang === 'am' ? 'ተዋቅሯል' : 'Set') : (lang === 'am' ? 'ይጨምሩ' : 'Partial')}
        badgeTone={shopProfile?.name && shopProfile?.phone ? 'ok' : 'warn'}
        open={openCards.has('profile')}
        onToggle={() => toggleCard('profile')}
      >
        <ShopProfilePanel shopProfile={shopProfile} onProfileSave={onProfileSave} />
      </TabCard>

      <TabCard
        id="items"
        icon="🧺"
        title={L(G.rows.items)}
        subtitle={itemsSub}
        badge={itemsBadge}
        badgeTone={activeItems.length > 0 ? 'ok' : 'neutral'}
        open={openCards.has('items')}
        onToggle={() => toggleCard('items')}
      >
        <CatalogPanel
          catalogEntries={catalogEntries}
          onSaveCatalogEntry={onSaveCatalogEntry}
          onToggleCatalogEntryActive={onToggleCatalogEntryActive}
        />
      </TabCard>

      <TabCard
        id="recurring"
        icon="🔁"
        title={L(G.rows.recurring)}
        subtitle={recurringSub}
        badge={recurringBadge}
        badgeTone={recurringCount > 0 ? 'ok' : 'neutral'}
        open={openCards.has('recurring')}
        onToggle={() => toggleCard('recurring')}
      >
        <RecurringExpensesPanel recurring={recurringExpenses} onRecurringChange={onRecurringChange} />
      </TabCard>

      {/* ── MONEY & CREDIT ───────────────────────────────────────────── */}
      <GroupHeader label={L(G.groups.money)} />

      <TabCard
        id="dubie-rules"
        icon="⚖️"
        title={L(G.rows.dubieRules)}
        subtitle={lang === 'am' ? 'የዘገዬ ጊዜ' : 'Overdue threshold'}
        badgeTone="neutral"
        open={openCards.has('dubie-rules')}
        onToggle={() => toggleCard('dubie-rules')}
      >
        <DubieRulesPanel onNavigate={() => openCard('alerts')} />
      </TabCard>

      <TabCard
        id="channels"
        icon="💳"
        title={L(G.rows.paymentChannels)}
        subtitle={channelsSub}
        badge={`${channelsConfigured} ${L(G.chrome.configured)}`}
        badgeTone={channelsConfigured > 0 ? 'ok' : 'warn'}
        open={openCards.has('channels')}
        onToggle={() => toggleCard('channels')}
      >
        <PaymentChannelsSection
          channels={paymentChannels}
          shopPhone={shopProfile?.phone || ''}
          enabledCount={(paymentChannels || []).filter((c) => c.enabled).length}
          configuredCount={channelsConfigured}
          onChange={(next) => onSavePaymentChannels?.(next)}
          lang={lang}
        />
      </TabCard>

      {/* Plan — slim card (Gate D: staff quota row never renders). */}
      <PlanPanel
        tier={planTier}
        entitlements={entitlements}
        staffCount={staffCount}
        transactionCount={transactionCount}
      />

      {/* ── MY APP ───────────────────────────────────────────────────── */}
      <GroupHeader label={L(G.groups.myApp)} />

      <TabCard
        id="alerts"
        icon="🔔"
        title={L(G.rows.alerts)}
        subtitle={lang === 'am' ? 'የማስጠንቂያ ምርጫ' : 'Notification preferences'}
        badgeTone="neutral"
        open={openCards.has('alerts')}
        onToggle={() => toggleCard('alerts')}
      >
        <NotificationPreferences lang={lang} />
      </TabCard>

      <TabCard
        id="reminders"
        icon="⏰"
        title={L(G.rows.remindCustomers)}
        subtitle={lang === 'am' ? 'ራስ-ሰር ማስታወቂያ' : 'AUTO REMINDERS'}
        badgeTone="neutral"
        open={openCards.has('reminders')}
        onToggle={() => toggleCard('reminders')}
      >
        <ReminderSettings shopId={shopId} lang={lang} />
      </TabCard>

      <TabCard
        id="backup-sync"
        icon="📦"
        title={L(G.rows.backupSync)}
        subtitle={lang === 'am'
          ? `${totalEntries} መዝገብ · ምትኬ እና ውጤት`
          : `${totalEntries} entries · backup & export`}
        badge={totalEntries > 0 ? `${totalEntries}` : (lang === 'am' ? 'ባዶ' : 'Empty')}
        badgeTone={totalEntries > 0 ? 'ok' : 'neutral'}
        open={openCards.has('backup-sync')}
        onToggle={() => toggleCard('backup-sync')}
      >
        <SyncStatusIndicator onSyncNow />
        <div className="mt-3">
          {/* R2.3 locked: ONE CSV affordance — BackupDataPanel carries the single
              export row; the legacy tab's duplicate ExportPanel card is NOT
              rendered here. Start-over is excluded and lives in the isolated
              danger zone at the bottom of the page. */}
          <BackupDataPanel
            transactions={transactions}
            customerSummaries={customerSummaries}
            includeStartOver={false}
          />
        </div>
      </TabCard>

      <TabCard
        id="password"
        icon="🔒"
        title={L(G.rows.passwordDevices)}
        badgeTone="neutral"
        open={openCards.has('password')}
        onToggle={() => toggleCard('password')}
      >
        <PasswordSettings lang={lang} />
      </TabCard>

      <TabCard
        id="appearance"
        icon="🎨"
        title={L(G.rows.appearance)}
        subtitle={lang === 'am' ? 'ጨለማ/ብርሃን ሁነታ፣ መጠኖችን ደብቅ' : 'Dark/light mode, hide amounts'}
        badgeTone="neutral"
        open={openCards.has('appearance')}
        onToggle={() => toggleCard('appearance')}
      >
        <DisplayPrivacyPanel />
      </TabCard>

      <TabCard
        id="language"
        icon="🌐"
        title={L(G.rows.language)}
        subtitle={lang === 'am' ? 'አማ' : 'EN'}
        badgeTone="neutral"
        open={openCards.has('language')}
        onToggle={() => toggleCard('language')}
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
        id="help"
        icon="❓"
        title={L(G.rows.help)}
        subtitle={lang === 'am' ? 'ጥያቄዎችን ያግኙ፡ ችግር ያመልክቱ' : 'Get answers, report a problem'}
        badgeTone="neutral"
        open={openCards.has('help')}
        onToggle={() => toggleCard('help')}
      >
        <HelpSupportPanel />
      </TabCard>

      <TabCard
        id="about"
        icon="ℹ️"
        title={L(G.rows.about)}
        subtitle={APP_VERSION_LABEL}
        badgeTone="neutral"
        open={openCards.has('about')}
        onToggle={() => toggleCard('about')}
      >
        {/* Version element hosts the 5-tap dev unlock — unchanged handler. */}
        <AboutPanel
          onVersionTap={onAboutTap}
          aboutTapCount={aboutTapCount}
          devModeRevealed={devModeRevealed}
          unlockTaps={unlockTaps}
        />
      </TabCard>

      {/* Sign out — only when a real auth session exists. A local-only shop has
          no account to return through, so the row must never offer a lockout. */}
      {authUser ? (
        <button
          type="button"
          onClick={() => setSignOutOpen(true)}
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

      {/* ── DANGER ZONE — isolated at the bottom, outside the backup group
          (owner-locked: "Start over on this phone" moves out of Backup & sync). */}
      <div className="mt-6" data-testid="danger-zone">
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-danger-border)' }}>
          <DangerZoneSection
            totalEntries={totalEntries}
            totalCustomers={totalCustomers}
            t={t}
            includeRestore={false}
          />
        </div>
      </div>

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
    </div>
  );
}



