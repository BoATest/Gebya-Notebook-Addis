## Test coverage handoff

- The seeded design-regression smoke intentionally bypasses onboarding
  (`intro_seen`) and verifies the Amharic shell/settings view. First-run Amharic
  coverage is tracked for R2's three-state spec:
  - owner-first-run
  - owner-complete
  - staff
- `AM_OVERRIDES.appName = 'ገበያ'` is currently dead: no seeded-shell JSX renders
  `t('appName')` as visible text. Keep the brand `Gebya` in English and remove
  this unused override during R2 cleanup.

# R2 Wireframes — grouped single-page Settings (three states)

Owner-approved direction (Phase 1 answers Q0/Q2/Q6/Q7/Q8). Single scrolling
page, grouped headers, tabs removed. Checklist collapses at 5/5.

## Checklist additions (owner screenshot review — binding for R2 build)

- Your Data: the two CSV export affordances merge into ONE row; "Start over
  on this phone" moves OUT of the backup group into a separate danger zone.
- Quiet Hours: ship defaults (e.g. 22:00–06:00) when enabled, or hide the
  section until enabled — empty `----` pickers read as broken.
- Header "No phone added" becomes a tappable action (opens add-phone flow).
- Plan row: "Staff 0/3" is permanently excluded from the spec (limit not
  enforced — displaying it is a trust bug). Tx 0/500 only.

```
Legend:  [ ] unchecked item · [x] done · ‡ locked ON (user cannot switch off)
         (owner only) = hidden for staff · [⚠ n] = readiness badge
```

## State 1 — Owner, incomplete setup

```
┌──────────────────────────────────────────────┐
│ [DS] Design Smoke Shop      [EN|አማ]         │
│      +251 9xx xxx xxx      OWNER             │
├──────────────────────────────────────────────┤
│ ▸ SETUP CHECKLIST                    2/5 [⚠] │   ← collapsed <5/5? no: expanded
│   [x] Shop name & category                   │
│   [x] Payment channel added                  │
│   [ ] Backup enabled                         │
│   [ ] Language set (Amharic default)         │
│   [ ] First customer added                   │
├──────────────────────────────────────────────┤
│ SHOP                                         │
│  🏪 Shop Profile                    [⚠ 2/5]  │
│  🧺 Items                            (1)     │
│  🔁 Recurring Expenses               (1)     │
│  💳 Payment Channels — ONE row       [1/3]   │  ← merge of old duplicate rows (Q6)
├──────────────────────────────────────────────┤
│ MONEY & CREDIT                               │
│  ⭐ Plan (slim row)             0/500 tx     │  ← no "Staff 0/3" (not enforced; Q4)
│  ⚖️ Dubie (Credit) Rules       [Auto: ON]   │
│  🔔 Notifications                            │
│     (ONE model for all roles — 5 collapsible │
│      groups, one switch per group; per-type  │
│      App/Push columns are BANNED)            │
│     Money in                          ›      │
│     Credit (Dubie)                    ‡      │  ← locked ON (Q6); label per owner
│     Money out                         ›      │     decision (pending Merkato)
│     Team                              ›      │
│     Gebya & support                   ›      │
│     Security alerts                   ‡      │  ← locked ON (Q6)
│  ⏰ Reminders to customers      (owner only) │  ← Telegram-first; NO SMS quota (Q7)
├──────────────────────────────────────────────┤
│ MY APP                                       │
│  📦 Backup & sync         [Last: 3d ago]     │  ← Sync Status merged (Q5)
│  🎨 Display & Privacy                       │
│  🌐 Language                                 │
│  🔒 Password & devices                       │  ← renamed (Q5)
│  ℹ️ About Gebya            v1.2.0  (5-tap)   │  ← dev unlock lives here
│  ❓ Help & Support                           │
│  🚪 Sign out                                 │
└──────────────────────────────────────────────┘
```

## State 2 — Owner, complete setup (5/5)

Identical to State 1 except:

```
│ ▸ SETUP CHECKLIST                    5/5 ✓   │   ← COLLAPSED to one line (Q0)
```
- All 5 rows hidden; header alone remains, tappable to re-expand.
- All badges read [✓] tone (no warn).

## State 3 — Staff ("My Account")

Shop group and Money & Credit group are FULLY hidden (Q2 — gated by
`can_edit_settings`, currently 0 consumers; R2 makes it live).

**Owner review corrections applied (5):** (a) one notification model for all
roles — 5 collapsible groups, per-type App/Push columns BANNED; (b) Appearance
is a subpage (dark + hide amounts + TEXT SIZE), About and Help split into
separate rows — one row = one destination; (c) sign out guarded by
unsynced-records dialog; (d) header shows shop context, no-phone state is a
tappable action; (e) My phone change requires OTP re-verification, My password
row shows set/not-set state.

```
┌──────────────────────────────────────────────┐
│ [AB] Ashenafi          +251 9xx xxx xxx      │
│ Staff · Design Smoke Shop     [EN|አማ]        │ ← (d) shop context
├──────────────────────────────────────────────┤
│ MY ACCOUNT                                   │
│  🎨 Appearance                               │ ← (b) subpage: dark, hide amounts,
│                                              │    TEXT SIZE (shared-phone legibility)
│  🔔 My alerts                                │ ← (a) same 5 collapsible groups as
│                                              │    owner; per-user server keying
│  📱 My phone                         [Set]   │ ← (e) change = OTP re-verify
│  🔒 My password                  [Not set]   │ ← (e) set/not-set chip
│  ℹ️ About                                    │ ← (b) separate row
│  ❓ Help & Support                           │ ← (b) separate row
│  🚪 Sign out                                 │ ← (c) guarded, see dialog below
└──────────────────────────────────────────────┘
```

(c) Sign-out guard — shown when records are unsynced:

```
┌──────────────────────────────────────────────┐
│ ⚠ 3 records not yet synced                   │
│   They stay on this phone.                   │
│                                              │
│   [ Sync now ]        [ Sign out anyway ]    │
└──────────────────────────────────────────────┘
```

- No SHOP or MONEY & CREDIT headers at all — not collapsed, absent.
- No setup checklist (owner concept).
- (d) No-phone state in the header renders as a tappable action (opens the
  add-phone flow), same rule as the owner header.
- (a) "My alerts" subpage = the SAME 5 groups as the owner's Notifications
  (Money in / Credit–Dubie / Money out / Team / Gebya & support), collapsible,
  one switch per group — one notification model for every role; the per-user
  server keying already supports it. Includes the per-device push permission
  prompt (R2 scope).
