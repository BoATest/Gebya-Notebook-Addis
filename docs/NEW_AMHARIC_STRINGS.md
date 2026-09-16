# NEW_AMHARIC_STRINGS.md — strings authored during Release 1

Owner + one Merkato user review these before Release 2 (Phase 1 answer Q12).
Every string below was authored or repaired in R1. Repairs are composed from
tokens already present in the repo (checked against `src/context/dictionaries.js`
and existing user-facing strings) — nothing is machine-translated.

## 1. Corrupted-string repairs (user-facing damage, fixed immediately per Q12)

| File | Repaired to | Was (damage) |
|---|---|---|
| `src/components/settings/NotificationPreferences.jsx` | `ወደ ነባሪ ተመልሷል` (reset-done toast) | `ደ砾ንን ተመልሷል` — CJK U+783E |
| `src/components/settings/NotificationPreferences.jsx` | `ተሰጠ ብር` (Credit Given) | `নISED ብር` — Bengali U+09A8 |
| `src/components/settings/NotificationPreferences.jsx` | `እስከ` (Until label; dictionary token `እስከ`) | `_until` placeholder |
| `src/components/AdminShopDetail.jsx` | `አዲስ` (new) | `አկնա` — Armenian U+056F |
| `src/components/BankDataSharing.jsx` | `ዳሸን ባንክ` (Dashen Bank) | `ዳшен ባንክ` — Cyrillic U+0448 |
| `src/components/settings/BackupDataPanel.jsx` | `መደቃቀፋ ተሳክቷል` (backup done) | `መደቃቀፋ ተሳክኩᏅ` — U+13CF |
| `src/utils/useAutoBackup.js` | `በሂሳብ ቤት መደቃቀፋ ተሳክቷል` | `... ተሳክኩᏅ` — U+13CF |
| `src/utils/customerMetrics.js` | `በጣም ጥሩ` (Excellent grade) | `ተሻшли` — Cyrillic U+0448 |
| `src/components/settings/CatalogPanel.jsx` | `+ አስቀምጥ` (ASCII plus) | `＋ አስቀምጥ` — fullwidth U+FF0B |

## 2. Reminder frequency reconciliation (verified engine set)

The reminder engine (`api-server/src/routes/reminders.ts` +
`services/reminderScheduler.ts`) supports **daily / weekly / disabled only**.
There is no `monthly` — the UI no longer shows or offers it.

| File | String | Meaning |
|---|---|---|
| `src/components/settings/ReminderSettings.jsx` | `በየቀኑ` | Daily (repaired: was `በየኑ`, missing ቀ) |
| `src/components/settings/ReminderSettings.jsx` | `በየቀኑ ማስታወቂያ ይላካል` | Daily subtitle (repaired garbled suffix) |
| `src/components/settings/ReminderSettings.jsx` | `በየሳምንቱ ማስታወቂያ ይላካል` | Weekly subtitle (new) |
| `src/components/settings/ReminderSettings.jsx` | `ድግግሞሽ:` / `ድግግሞሽ` | Frequency label (dictionary `frequency`) |
| `src/components/settings/ReminderSettings.jsx` | `ከዘገዬ ቀን በ1-7 ቀን ውስጥ ይላካል` | Sends within 1–7 days of the due date (repaired garbled description) |
| `src/components/settings/ReminderSettings.jsx` | `ድግግሞሽ ተስተካክሏል` | Frequency updated toast |
| `src/components/settings/ReminderSettings.jsx` | `ማስተካከል አልተሳካም` | Update failed toast (copied from the existing toggle-error string) |

## 3. Dubie card copy (R1 scope: copy fix only)

| File | String | Meaning |
|---|---|---|
| `src/components/settings/DubieRulesPanel.jsx` | `ራስ-ሰር ማስታወቂያ በቅንብሮች → ውሂብ ይተዳደራል።` | Automatic reminders are managed in Settings → Data. **Now a real tab-switching button** (Gate A fold-in). |
| `src/components/settings/tabs/MoneyTab.jsx` | `የዘገዬ ጊዜ · ማስታወቂያ በውሂብ ውስጥ` | Overdue threshold · reminders in Data tab (card subtitle) |

## 4. Gate A additions (Release 1.5)

| File | String | Meaning |
|---|---|---|
| `src/components/settings/ReminderSettings.jsx` | `ራስ-ሰር ማስታወቂያ ተዘግቷል። ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ።` | Shown when reminders are off: explains the consequence and points at the manual remind flow (tokens: `ራስ-ሰር ማስታወቂያ` ✅, `ተዘግቷል` ✅, `ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ` ✅ DataTab FAQ). |

English: "Automatic reminders are off. You can still remind a customer
from their page."

English counterparts for review: "Automatic reminders are managed in
Settings → Data." and "Overdue threshold · reminders in Data tab".

## Notes for reviewers

- `ተስተካክሏል` ("has been corrected/updated") is the repo's existing toast verb
  (`dictionaries.js: toastCustomerUpdated`); `ድግግሞሽ` is the dictionary's
  `frequency`. The combination in the frequency toast is new — please confirm
  it reads naturally in Merkato Amharic.
- `payment_confirmed` was removed as a separate settings row: the server maps
  both `payment` and `payment_confirmed` to the same preference column
  (`paymentPrefs`), so owners saw two rows that always changed together.

## Label-review MUST FIX — live UI corrections (owner-ordered)

Two objective errors found by the label review were live in shipped UI and
fixed byte-exactly in source (same class as the mojibake finds; process rule
now requires a reviewer pass before ANY label wires):

- `የይምት` → `የሚስጥር` ("password"): የይምት is an insult. 18 occurrences —
  `PasswordSettings.jsx` ×14, `AuthRequiredPrompt.jsx` ×4 (the login prompt —
  every Amharic user sees this).
- `ጌብያ` → `ገበያ` (brand misspelling): 3 occurrences — `OnboardingScreen.jsx`,
  `PwaInstallPanel.jsx`, `DataTab.jsx` ("About Gebya"). Brand rule: shell brand
  stays "Gebya" (Latin); `ገበያ` allowed inside Amharic copy.

### ⚠ OPEN — gibberish needing Merkato reviewer pass (NOT auto-fixable)

The password panel's Amharic strings contain non-words the fix could not
address because intent is unrecoverable without a reviewer:

- `መዲዛ` — appears throughout PasswordSettings.jsx / AuthRequiredPrompt.jsx
  (e.g. `የሚስጥር ቃል መዲዛ` for "PASSWORD LOGIN"). Not an Amharic word.
- `አስudya` — Latin characters inside an Amharic string
  (`Remove Password` aria-label + button, PasswordSettings.jsx:91,93).

Proposed intent (for reviewer confirmation): `መዲዛ` → likely `መጠቀሚያ` or
`መግቢያ` depending on sentence; `አስudya` → `አስወግድ` (remove). Do NOT wire any
of these strings until the reviewer pass rules on them.