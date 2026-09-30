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
4. `የእርስዎ መለያ` (MY ACCOUNT — staff group header, Slice 2/3)
5. `የእኔ ማስታወቂያዎች` (My alerts)
6. `የእኔ ስልክ` (My phone)
7. `የእኔ የሚስጥር ቃል` (My password)
8. **Sign-out guard block** (Slice 2) — all five at once, since they are read
   as one message by the shopkeeper:
   `ያልተመሳሰሉ መዝገቦች` + `N መዝገቦች አልተመሳሰሉም።` +
   `በዚህ ስልክ ላይ ይቀራሉ፤ እርስ ጊዜ በመስመር ላይ ሲሆን ይላካሉ።` +
   `አሁን አማሳይ።` / `ምንም አልተከለከለም ውጣ`
9. `አልተዋቀረም` (Not set) — the negative chip; `ተዋቅሯል` (Set) reuses the
   already-listed `configured` token but the reviewer should confirm the
   register is right for a person-facing chip.

## R2.3 Slice 1 — grouped page strings (implementation record)

The grouped page consumes `src/components/settings/groupedLabels.js` — a DRAFT
module (⚠ composed strings are NOT approved). It is deliberately NOT in
`src/labels/*` so the R2.1 byte-identity contract stays untouched until the
shopkeeper/Merkato sign-off lands; after sign-off the module is deleted and its
entries move into `src/labels/settings.js` verbatim.

| Key | EN | Amharic | Source / status |
|---|---|---|---|
| groups.shop | SHOP | ሱቅ | ✅ dictionary `shop` |
| groups.money | MONEY & CREDIT | ገንዘብ እና ዱቤ | ⚠ composed — shortlist |
| groups.myApp | MY APP | የእርስዎ መተግበሪያ | ⚠ composed — shortlist |
| groups.myAccount (Slice 2/3) | MY ACCOUNT | የእርስዎ መለያ | ⚠ composed — shortlist |
| rows.alerts | Alerts & reminders | ማስታወቂያዎች | ⚠ EN new; AM = existing token |
| rows.remindCustomers | Remind customers | ለደንበኞች ማስታወቂያ | ⚠ composed |
| rows.backupSync | Backup & sync | መጠባበቂያ እና ማመሳሰል | ⚠ composed |
| rows.passwordDevices | Password & devices | የሚስጥር ቃል እና መሣሪያዎች | ⚠ MUST-FIX (`የሚስጥር`) applied |
| rows.appearance | Appearance | መልክ | ✅ dictionary |
| rows.language | Language | ቋንቋ | ✅ dictionary |
| rows.help | Help & Support | እርዳታ እና ድጋፍ | ✅ DataTab bytes |
| rows.about | About Gebya | ስለ ገበያ | ✅ DataTab bytes |
| rows.signOut | Sign out | ውጣ | ⚠ shortlist |
| chrome.signOutTitle / Body | Sign out? / You will need your phone number to sign in again. | መውጣት? / እንደገና ለመግባት የስልክ ቁጥርዎ ያስፈልጋል። | ⚠ composed — shortlist |
| chrome.configured | configured | ተዋቅሯል | ✅ PaymentChannelsSection bytes (badge now count-only) |
| chrome.moreTaps | more taps | ተጨማሪ መታ | ✅ existing footer bytes |

Deliberate omissions (do NOT invent at sign-off):

- **No "Danger zone" heading string.** The isolated start-over card is visually
  separated (red border + spacing); a heading needs a new AM word — deferred to
  the reviewer rather than guessed.
- **Recurring Expenses naming:** the section table above says `ደጋጋሚ ወጪዎች`, but
  live source (ShopTab) renders `ወርሃዊ ወጪ`. Slice 1 uses the source bytes; the
  reviewer decides which wins.

## R2.3 Slice 2 — My Account (staff) strings

Shipped in `MyAccountPanel.jsx` behind the Slice 3 `can_edit_settings` gate.
The three **row labels** below are already listed in the Section rows table above
(lines 35-37) and are not duplicated here; this section records the NEW strings
Slice 2 introduced, all of which are composed by me and **unreviewed**.

| Key | EN | Amharic | Source / status |
|---|---|---|---|
| rows.myAlerts | My alerts | የእኔ ማስታወቂያዎች | ⚠ composed (see Section rows) |
| rows.myPhone | My phone | የእኔ ስልክ | ⚠ composed (see Section rows) |
| rows.myPassword | My password | የእኔ የሚስጥር ቃል | ⚠ MUST-FIX (`የሚስጥር`) applied |
| chrome.unsyncedTitle | Records not yet synced | ያልተመሳሰሉ መዝገቦች | ⚠ composed — NEW |
| chrome.unsyncedCount (n) | `` `${n} ${n === 1 ? 'record has' : 'records have'} not yet synced.` `` | `` `${n} ${n === 1 ? 'መዝገብ' : 'መዝገቦች'} አልተመሳሰሉም።` `` | ⚠ composed — NEW (singular/plural branch; `n` is interpolated as Latin digits, NOT Ethiopic numerals — see note) |
| chrome.unsyncedBody | They stay on this phone and upload next time you are online. | በዚህ ስልክ ላይ ይቀራሉ፤ እርስ ጊዜ በመስመር ላይ ሲሆን ይላካሉ። | ⚠ composed — NEW |
| chrome.syncNow | Sync now | አሁን አማሳይ። | ⚠ composed — NEW |
| chrome.signOutAnyway | Sign out anyway | ምንም አልተከለከለም ውጣ | ⚠ composed — NEW |
| chrome.set | Set | ተዋቅሯል | ⚠ composed — reused `ተዋቅሯል` from `chrome.configured` for register consistency |
| chrome.notSet | Not set | አልተዋቀረም | ⚠ composed — NEW |

### Register note for the reviewer

**`chrome.unsyncedCount` renders Latin digits.** The implementation is
`` `${n} ${n === 1 ? 'መዝገብ' : 'መዝገቦች'} አልተመሳሰሉም።` `` — so the shopkeeper
sees `3 መዝገቦች አልተመሳሰሉም።`, mixing a Western numeral into Amharic text.
This matches how the rest of the app already shows counts (e.g. "2 of 5 set
up" and the `N configured` badge), so I did not change it unilaterally. But
Ethiopic numerals (`፩` `፪` `፫`) would be the more natural register for an
Amharic shopkeeper, and the reviewer is the one who can settle that. If they
want Ethiopic numerals, this key is the only place that changes and it needs a
small numeral-mapping helper, not just a string swap.

The Slice 2 sign-out guard is the one place where **two registers meet**. The
`chrome.unsynced*` strings are declarative/explanatory ("they stay on this
phone"), while the existing approved `chrome.configured` token `ተዋቅሯል` is
stative/passive. I reused `ተዋቅሯል` for `Set` so the same word does not carry two
different registers in one panel — but the reviewer should confirm that
`ተዋቅሯሸል` (plural/polite) is not the better form for a shopkeeper address.
If they change it, `chrome.set` is the only key affected.

### Strings that are NOT in this draft (deliberately)

- **"Start over on this phone"** appears in the staff surface in source but is
  **never rendered for staff** (`includeStartOver={false}`), so it needs no
  Slice 2 review. It stays an owner-page string.
- **No PIN string.** Ruled out — no client PIN code exists.
- **No "change phone" / OTP string.** Ruling 1 upheld: the change flow is FUTURE
  (needs a new API), so there is no such copy in the bundle to review.

### Deferral ledger (Slice 2 → post-launch)

| Deferred item | Reason | Owner ruling |
|---|---|---|
| Change-phone flow (OTP re-verify) | No API endpoint mutates a user's phone number — only `POST /auth/otp` + `POST /auth/verify` | Ruling 1 UPHELD → FUTURE list |
| Staff PIN | No client code, no `staff_members` PIN column; `GEBYA_DEVELOPMENT_TEAM_QA.md:65` is wrong | Ruling 2 → doc correction in hardening PR |
- **Dubie row subtitle** is trimmed to `Overdue threshold` / `የዘገዬ ጊዜ` (both
  substrings of existing source bytes) — the legacy "reminders in Data tab" copy
  is stale on the grouped page and was NOT rewritten with fresh AM.

