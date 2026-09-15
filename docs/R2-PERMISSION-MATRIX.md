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
