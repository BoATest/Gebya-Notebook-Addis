# R2 Permission Matrix — role × settings section

Foundation (verified in Phase 1):
- `can_edit_settings`: staff=false, manager=true, owner=true
  (`src/constants/permissions.js`) — currently **0 consumers**; R2 makes it live.
- Staff auth is live: own phone + OTP (`AuthGate` → `/auth/otp`), server
  resolves role from `business_members` (`auth.ts:206`).
- Owner/manager both see full settings today; **manager is treated as owner**
  for now and hidden from UI (Q3).

| Section | Owner | Staff | Notes |
|---|---|---|---|
| Setup checklist | ✅ | ❌ absent | Owner concept |
| SHOP group (all rows) | ✅ | ❌ absent | Gate: `can_edit_settings` |
| MONEY & CREDIT group | ✅ | ❌ absent | Gate: `can_edit_settings` |
| — Plan row | ✅ | ❌ | tx 0/500 only |
| — Reminders to customers | ✅ | ❌ | Owner-only row (Q2) |
| — Notifications (5 groups) | ✅ (full) | partial: "My alerts" only | Staff prefs keyed per user server-side |
| MY APP › Backup & sync | ✅ | ✅ (own device) | Backup still free (Q8) |
| MY APP › Display & Privacy | ✅ | ✅ | Dark mode + hide amounts |
| MY APP › Language | ✅ | ✅ | |
| MY APP › My phone | (topbar) | ✅ | Staff surface |
| MY APP › Password & devices | ✅ | ✅ ("My password") | |
| MY APP › About (dev unlock) | ✅ 5-tap | ❌ | `canAccessDevMode` = owner/system-admin |
| MY APP › Help & support | ✅ | ✅ | |
| MY APP › Sign out | ✅ | ✅ | |
| AdminPanel (diagnostics) | ✅ | ❌ | Dev-gated; manager hidden (Q3) |
| Notification locked-ON groups | Everyone | Everyone | Credit–Dubie + Security: no OFF switch |

Enforcement rule for R2: `can_edit_settings === true` → render SHOP +
MONEY & CREDIT groups; otherwise render MyAccountPanel only. Server-side,
role comes from the JWT/business_members; the UI gate mirrors it.

---

## Consumer map (Gate D reconciliation — complete, verified)

**1. `hasPermission()` has ZERO production consumers — R2.3 introduces the
first.** Every current read bypasses the method and touches the store state
directly:

| Consumer | File | What it reads |
|---|---|---|
| `canManageTeam` / `staffTabVisible` | `AppShell.jsx:255-265` | `permissionsStore.role`, `permissionsStore.permissions.can_manage_team` (direct map read, NOT `hasPermission()`), falls back to `shopProfile?.role` |
| Staff surface role check | `StaffPage.jsx:255-256` | `permissionsStore.role`, `permissionsStore.permissions` |
| Onboarding owner stamp | `OnboardingScreen.jsx:158-159` | writes `stampOwnerPermissions(identity.permissions)` |
| Server: reports data | `api-server/src/routes/sync.ts:332-335` | `requirePermission("can_view_reports")` on `/sync/pull` |
| Server: writes | `api-server/src/routes/sync.ts:106-109` | `requirePermission("can_add_records")` on `/sync/push` |

R2.3 rule: all client gating (My Account, section visibility) routes through
the store via `hasPermission()`; the `AppShell` direct-map read and the
`shopProfile?.role` fallback are migration targets, not precedents.

**2. Role split-brain.** AppShell resolves role as
`permissionsStore.role || shopProfile?.role` — the fallback reads the identity
blob (authStore/identity), which the fix stamps into `permissionsStore`.
R2.3 declares ONE app-side source of truth: **`permissionsStore`** (loader +
onboarding stamp hydrate it); authStore keeps token/identity only. The
`shopProfile?.role` fallback must die with R2.3.

**3. Where Reports gating actually lives (reconciles the Gate C claim).**
The original Gate C claim — "owner sees Reports OFF / denied admin panels" —
was wrong about the mechanism. Reports gating is **server-side, not
client-side**:

- `/sync/pull` is guarded by `requirePermission("can_view_reports")`
  (`sync.ts:332-335`, entity `reports`). Staff default is `false`
  (`constants/permissions.js:27`) → 403 on pull; owner defaults `true`.
- The client renders the History/Report tab **un-gated** — no
  `can_view_reports` check exists anywhere in gebya `src/`. A staff device
  shows the tab shell but its data pull 403s; with a cached
  `can_view_reports: true` (permissions-store spec (b)) the tab works, by
  design.
- "Admin panels" gating is separate: `canAccessDevMode(role)` =
  owner/system_admin only (`constants/permissions.js:149-151`).

Matrix addition: Reports (History data) = Owner ✅ (server /pull), Staff ❌
(server 403, client tab un-gated).

**4. When R2.3 ships a UI discriminator (SHOP header: owner sees / staff
doesn't), extend `tests/onboarding.spec.ts` to assert it — store + UI**:
`hasPermission('can_edit_settings')` true/false in the store AND the SHOP
group header visible/absent in the DOM, in the same session, across reload.
