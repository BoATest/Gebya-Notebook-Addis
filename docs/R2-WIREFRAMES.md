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
│     Money in · [App][Push]                   │
│     Credit–Dubie · [App][Push]        ‡      │  ← locked ON (Q6)
│     Money out · [App][Push]                  │
│     Team · [App][Push]                       │
│     Gebya & support · [App][Push]            │
│     Security alerts · ‡ (no row toggle)      │  ← locked ON (Q6)
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

```
┌──────────────────────────────────────────────┐
│ [AB] Ashenafi          +251 9xx xxx xxx      │
├──────────────────────────────────────────────┤
│ MY ACCOUNT                                   │
│  🌐 Language                                 │
│  🎨 Dark mode / Hide amounts                 │
│  📱 My phone                                 │
│  🔒 My password                              │
│  🔔 My alerts     [App][Push] per-type       │  ← per-user prefs (server-keyed)
│  ℹ️ About · Help & Support                   │
│  🚪 Sign out                                 │
└──────────────────────────────────────────────┘
```
- No SHOP or MONEY & CREDIT headers at all — not collapsed, absent.
- No setup checklist (owner concept).
- "My alerts" includes the per-device push permission prompt (R2 scope).
