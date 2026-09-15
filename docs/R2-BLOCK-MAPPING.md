# R2 Block Mapping — old Settings → new grouped page

Every block that renders today, where it lands in R2, and what changes.
(A = auto-merge; R = relocated; N = new; D = dropped)

| Old block (current location) | R2 home | Change |
|---|---|---|
| Setup/Readiness checklist (ReadinessHero) | Top of page | Collapses at 5/5 (Q0) |
| ShopTab › Shop Profile | SHOP | R |
| ShopTab › Items (CatalogPanel) | SHOP | R |
| ShopTab › Recurring Expenses | SHOP | R |
| MoneyTab › Payment Channels card | SHOP › Payment Channels | R + **merge the two payment rows into one** (Q6) |
| MoneyTab › Dubie (Credit) Rules | MONEY & CREDIT | R; full merge of dubie threshold + scheduler config (R1 deferred) |
| PlanPanel (top of Money tab) | MONEY & CREDIT › slim Plan row | Slim; **tx 0/500 only — hide "Staff 0/3"** until enforced (Q4/Q8) |
| ReminderSettings (Data tab, R1) | MONEY & CREDIT › "Reminders to customers" | **Owner-only row** (Q2); Telegram-first, no SMS quota UI (Q7); Daily/Weekly engine set (R1 verified) |
| NotificationPreferences (Data tab, R1) | MONEY & CREDIT › Notifications | **5 groups** (Q6): Money in / Credit–Dubie / Money out / Team / Gebya & support; Credit–Dubie + Security locked ON; payment_confirmed already merged (R1) |
| BackupDataPanel | MY APP › Backup & sync | R; merged with SyncStatusIndicator into one card (Q5) |
| SyncStatusIndicator (Data tab) | MY APP › Backup & sync | A (merged) |
| ExportPanel (Data tab) | MY APP › Backup & sync | R |
| DisplayPrivacyPanel (dark/hide amounts) | MY APP › Display & Privacy | R (staff: inside My Account) |
| Language toggle (topbar) | MY APP › Language row | R (also stays in topbar) |
| PasswordSettings → "PASSWORD LOGIN" | MY APP › "Password & devices" | R + **rename** (Q5) |
| Error-reporting toggle (Data tab) | About › Privacy section | R (Q5: error-report → About → Privacy) |
| About Gebya card (Data tab) | MY APP › About | R; **dev-unlock 5-tap on version string stays here** (Q5) |
| PwaInstallPanel / DownloadAppBanner | MY APP (conditional) | R |
| Help & Support card (Data tab) | MY APP › Help & support | R |
| AdminPanel (dev/owner diagnostics) | MY APP › bottom (dev-gated) | R; manager=owner for now, hidden from UI (Q3) |
| SettingsPage version display | About card | A |
| AppShell.jsx:894 toast "Settings → Money" | — | Copy → **"Settings → Plan"** (final destination label) |
| tab bar (Shop/Money/Data) | — | **D** — grouped headers replace tabs |
| New: MyAccountPanel | Staff view | **N** (0 matches today — build, Q2) |

## Test surface changes (R2 scope)

- `settings-tabs.spec.ts`: tab role/aria/arrow-key/persistence tests →
  grouped-heading navigation; keep logical focus order.
- Dev-unlock test → 5-tap on version string in About (new location).
- `design-regression-smoke.spec.ts`: three states — owner-incomplete,
  owner-complete, staff (refresh screenshots).
- Toast copy test for "Settings → Plan".

## Notification type → group mapping (14 types after R1 merge)

| Group | Types | Locked |
|---|---|---|
| Money in | sale | — |
| Credit–Dubie | credit, overdue_alert | ‡ ON |
| Money out | payment, supplier_payment, supplier_purchase, expense | — |
| Team | staff_joined, staff_submitted_collection, device_approval | — |
| Gebya & support | announcement, support_reply | — |
| Security (row inside Gebya & support header) | rbac_violation | ‡ ON |
