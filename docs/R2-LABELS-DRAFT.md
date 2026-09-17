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

## Setup checklist items — REAL source of truth (FIX FIRST, owner-ruled)

**Anchor: `src/components/settings/ReadinessHero.jsx:14-46`** — the `checks`
array IS the checklist. The metric's definition = the checklist's definition;
Gate D's `setup_completed_at` (5/5) is defined on exactly these five checks and
must never diverge. The previously drafted items (shop name & category /
backup enabled / language set / first customer) do NOT exist in the app and
were replaced — zero overlap confirmed by source read.

Both EN and AM labels already exist inline in source (AM is imperative
register — matches the approved register). They are evidence, not approval:
each goes to the Merkato reviewer with its anchor (no anchor, no list).

| # | Source key | Done condition (source) | EN (source) | AM (source) | Reviewer |
|---|---|---|---|---|---|
| 1 | `profile` | `shopProfile?.name` | Set shop name | የሱቅ ስም ያስገቡ | pending |
| 2 | `profile` | `shopProfile?.phone` | Add shop phone number | የስልክ ቁጥር ያስገቡ | pending |
| 3 | `channels` | ≥1 channel enabled+configured | Set up a payment channel | የክፍያ መንገድ ያዋቅሩ | pending |
| 4 | `items` | ≥1 active catalog entry | Add items to catalog | እቃዎች ያስገቡ | pending |
| 5 | `recurring` | `recurring.length > 0` | Add recurring expenses | ወርሃዊ ወጪ ይመዝግቡ | pending |

Checklist chrome (same file): header `N of 5 set up` / `${doneCount} ከ ${totalCount} ተዋቅሯል`;
completed state `All set up` / `ሁሉም ተዋቅሯል`. CTAs: `Add ›`/`Setup ›` /
`ያስገቡ ›`/`ያዋቅሩ ›`/`ይመዝግቡ ›`.

Note: there is NO backup, language, or first-customer item in the real
checklist — those live elsewhere in setup and must NOT be added here without a
source change to ReadinessHero (which would change the metric definition;
requires a separate owner ruling).

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

**PROCESS RULE (no anchor, no string):** every AM string in this doc — and any
future string work — is recorded together with its EN key or sibling sentence.
An AM string without its EN anchor cannot enter review or wiring; re-derivation
must start from the EN meaning, never from the broken AM.

## Gibberish inventory — every occurrence with its EN sibling

`የይምት→የሚስጥር` already applied below. The reviewer re-derives the whole AM
sentence from the EN sibling; do NOT patch around `መዲዛ`/`መዲወ`/`አስudya`/
`መስከቨሪ` in place. Owner instruction: do NOT guess readings.

File: `src/components/settings/PasswordSettings.jsx`

| Line | Current AM (broken) | EN sibling |
|---|---|---|
| 16 | `የሚስጥር ቃል መዲዛ መስከቨሪ ነው 6 በላይ ከአይነት` | "Password must be at least 6 characters" |
| 31 | `የሚስጥር ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል` | "Password saved successfully" |
| 37 | `የሚስጥር ቃል መዲዛ አልተሳካም` | "Failed to save password" |
| 44 | `…የሚስጥር ቃል መዲዛ ነው ለማስወገድ?` (confirm) | "You will use OTP again. Remove password?" |
| 57 | `የሚስጥር ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል` | "Password removed successfully" |
| 62 | `የሚስጥር ቃል መዲዛ አልተለወደደም` | "Failed to remove password" |
| 75 | `የሚስጥር ቃል መዲዛ` | "PASSWORD LOGIN" |
| 81 | `የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ በማለድም OTP ይጠቀሙ` | "Set a password for faster logins, or use OTP codes." |
| 91, 93 | `የሚስጥር ቃል መዲዛ አስudya` | "Remove Password" (aria-label + button) |
| 100, 110 | `የሚስጥር ቃል መዲዛ` | "New Password" (label + aria-label) |
| 130, 134 | `የሚስጥር ቃል መዲዛ ያስገቡ` | "Set Password" (aria-label + button) |

File: `src/components/shell/AuthRequiredPrompt.jsx` (login prompt)

| Line | Current AM (broken) | EN anchor |
|---|---|---|
| 41 | `passwordLabel: የሚስጥር ቃል መዲወ` | EN dict key `passwordLabel` |
| 45 | `passwordTooShort: የሚስጥር ቃል መዲዛ ቢሆን 6 በላይ ከአይነት ነው` | EN dict key `passwordTooShort` |
| 47 | `passwordSetup: የሚስጥር ቃል መዲዛ ያስገብ` | EN dict key `passwordSetup` |
| 359 | `…የሚስጥር ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ?` | "Signed in successfully! Set a password for faster logins?" |

## R2.1 extraction — INVERTED entries (⚠ reviewer trap)

R2.1 ships strings byte-identical; the two entries below are **inverted** (the
inline branch did not follow the current-locale pattern). They are keyed the
way the code produced them, per skeleton rule 5. **Semantic reconsideration is
deferred to the post-R2.1 labels PR** — do not "fix" the orientation during R2.1.

| Entry | Keyed `am` (EN bytes) | Keyed `en` (AM bytes) | Why inverted |
|---|---|---|---|
| ⚠ `onboarding.langToggleLabel` | `Switch to English` | `ወደ አማርኛ ቀይር` | Language toggle renders the TARGET language: `lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'` |
| ⚠ `onboarding.langToggleText` | `English` | `አማርኛ` | Same toggle, target-language chip: the code shows the language you would switch TO |

Reviewer reads the EN column as "the string the Amharic UI shows" — expected,
not a bug. Any wording change here is a term decision and waits for the
post-R2.1 PR.

## Term decision — PRE-RULING (owner; ratify in Merkato session)

Two levels, each named consistently:
- **Nav tab**: "More" / `ተጨማሪ` (stays as-is)
- **Page title**: "Settings" / `ማስተካከያ` (recommended over `ቅንብሮች`)
- **Toasts** reference the title: "Settings → Plan" / `ማስተካከያ → እቅድ`
R2.1 ships byte-identical strings regardless — this lands after R2.1.

## User-review shortlist (short pass, before wiring)

1. `መጠባበቂያ እና ማመሳሰል` (Backup & sync)
2. `እቅድ` (Plan)
3. `ውጣ` (Sign out)
