# R2 Label Draft — grouped Settings page (EN + Amharic)

Draft for owner + Merkato user review (same review pass as
NEW_AMHARIC_STRINGS.md). Amharic is composed from tokens already in the
repo (`src/context/dictionaries.js`, existing UI strings) — marked ✅ when
a token exists verbatim, ⚠ when newly composed.

## Group headers

| EN | Amharic | Source |
|---|---|---|
| SHOP | ሱቅ | ✅ dictionary `shop: 'ሱቅ'` |
| MONEY & CREDIT | ገንዘብ እና ዱቤ | ⚠ composed (`ገንዘብ` ✅ dictionary money, `ዱቤ` ✅ credit) |
| MY APP | የእርስዎ መተግበሪያ | ⚠ composed (`የእርስዎ` ✅ 'Your Data' header) |
| MY ACCOUNT (staff) | የእርስዎ መለያ | ⚠ composed |

## Section rows

| EN | Amharic | Source |
|---|---|---|
| Shop Profile | የሱቅ መገለጫ | ✅ existing ShopTab |
| Items | እቃዎች | ✅ existing ShopTab |
| Recurring Expenses | ደጋጋሚ ወጪዎች | ✅ existing ShopTab |
| Payment Channels | የክፍያ መንገዶች | ✅ existing MoneyTab |
| Plan | እቅድ | ⚠ new |
| Dubie (Credit) Rules | የዱቤ ህጎች | ✅ existing |
| Notifications | ማስታወቂያዎች | ✅ existing |
| Reminders to customers | ለደንበኞች ማስታወቂያ | ⚠ composed (`ማስታወቂያ` ✅) |
| Backup & sync | መጠባበቂያ እና ማመሳሰል | ⚠ composed (`መጠባበቂያ` ✅ BackupDataPanel) |
| Display & Privacy | ማሳያ እና ግላዊነት | ✅ existing DataTab |
| Language | ቋንቋ | ✅ dictionary |
| Password & devices | የሚስጥር ቃል እና መሣሪያዎች | ⚠ MUST FIX applied: was `የይምት ቃል` (insult) — fixed in source too |
| About Gebya | ስለ ገበያ | ✅ existing DataTab (spelling fixed: was `ጌብያ`) |
| Help & Support | እርዳታ እና ድጋፍ | ✅ existing DataTab |
| My phone | የእኔ ስልክ | ⚠ composed (`ስልክ` ✅) |
| My password | የእኔ የሚስጥር ቃል | ⚠ MUST FIX applied: was `የይምት` (insult) |
| My alerts | የእኔ ማስታወቂያዎች | ⚠ composed |
| Sign out | ውጣ | ⚠ USER-REVIEW SHORTLIST — verify against dictionary before wiring |
| Dark mode | ጨለማ ሁነታ | ✅ DisplayPrivacyPanel |
| Hide amounts | መጠኖችን ደብቅ | ✅ DisplayPrivacyPanel |

## Setup checklist items

Owner note: past-tense (perfective) forms read wrong for action items —
imperative register confirmed (e.g. "ስልክ ቁጥር ጨምር"). All ⚠ newly composed,
pending Merkato review.

| EN | Amharic (imperative) |
|---|---|
| Shop name & category | የሱቅ ስም እና ዓይነት አስገባ ⚠ |
| Payment channel added | የክፍያ መንገድ ጨምር ⚠ |
| Backup enabled | መጠባበቂያ አስቻል ⚠ |
| Language set | ቋንቋ ምረጥ ⚠ |
| First customer added | ደንበኛ ጨምር ⚠ |

## Notification groups

| EN | Amharic | Source |
|---|---|---|
| Money in | ገቢ ገንዘብ | ⚠ (`ገቢ` ✅ dictionaries income) |
| Credit–Dubie | ዱቤ–ዘገዬ | ⚠ (`ዱቤ` ✅, `ዘገዬ` ✅ MoneyTab) |
| Money out | ወጪ ገንዘብ | ⚠ (`ወጪ` ✅ NotificationPreferences) |
| Team | ቡድን | ✅ dictionary `team: 'ቡድን'` |
| Gebya & support | ገበያ እና ድጋፍ | ⚠ MUST FIX applied: was `ጌብያ` (misspelled brand); `ድጋፍ` ✅ DataTab. Brand rule: shell brand stays "Gebya" (Latin); `ገበያ` allowed inside Amharic copy |
| Credit (Dubie) | ዱቤ | ⚠ OWNER DECISION logged, pending Merkato review — was `ዱቤ–ዘገዬ` (EN/AM mismatched; ዘገዬ awkward as noun) |
| Locked on note | መዝጋት አይቻልም | ⚠ OWNER PICKS ONE: `መዝጋት አይቻልም` (explains why locked) vs `ሁልጊዜ በርቷል` |
| Locked on note | ሁልጊዜ በርቷል | ⚠ new — confirm wording with owner |

Toast copy (final destination): `Settings → Plan` / `ቅንብሮች → እቅድ` ⚠

## Evidence table — label errors caught in review (same class as mojibake)

| Error | Where found | Count | Resolution |
|---|---|---|---|
| `የይምት` (insult) used for "password" | LIVE UI: PasswordSettings.jsx ×14, AuthRequiredPrompt.jsx ×4 | 18 | Replaced with `የሚስጥር` in source + this draft |
| `ጌብያ` (misspelled brand) | LIVE UI: OnboardingScreen.jsx, PwaInstallPanel.jsx, DataTab.jsx | 3 | Replaced with `ገበያ` in source + this draft |
| Gibberish `መዲዛ`, `አስudya` | LIVE UI: PasswordSettings.jsx, AuthRequiredPrompt.jsx | many | NOT auto-fixable — needs Merkato reviewer pass (flagged in NEW_AMHARIC_STRINGS.md) |

**PROCESS RULE (binding):** hand-composed Amharic gets byte-checked against a
reviewer pass before wiring — no exceptions. The two MUST-FIX rows above prove
the label doc's "✅ existing" citations can themselves carry insults/typos;
existing strings are evidence, not approval.

## Open term decision — "More" vs "Settings"

EN nav currently says "More"; toasts/tests say "Settings" — pick ONE word for
nav/title/toasts. AM toast follows the winner: `ማስተካከያ` recommended over
`ቅንብሮች` if "Settings" wins. Toast row above updates on decision.

## User-review shortlist (short pass, before wiring)

1. `መጠባበቂያ እና ማመሳሰል` (Backup & sync)
2. `እቅድ` (Plan)
3. `ውጣ` (Sign out)
