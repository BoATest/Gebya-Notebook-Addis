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
| Password & devices | የይምት ቃል እና መሣሪያዎች | ⚠ composed (`የይምት ቃል` ✅ PasswordSettings) |
| About Gebya | ስለ ጌብያ | ✅ existing DataTab |
| Help & Support | እርዳታ እና ድጋፍ | ✅ existing DataTab |
| My phone | የእኔ ስልክ | ⚠ composed (`ስልክ` ✅) |
| My password | የእኔ የይምት ቃል | ⚠ composed |
| My alerts | የእኔ ማስታወቂያዎች | ⚠ composed |
| Sign out | ውጣ | ⚠ verify against dictionary before wiring |
| Dark mode | ጨለማ ሁነታ | ✅ DisplayPrivacyPanel |
| Hide amounts | መጠኖችን ደብቅ | ✅ DisplayPrivacyPanel |

## Setup checklist items

| EN | Amharic |
|---|---|
| Shop name & category | የሱቅ ስም እና ዓይነት ⚠ |
| Payment channel added | የክፍያ መንገድ ተዋቅሯል ⚠ |
| Backup enabled | መጠባበቂያ በርቷል ⚠ |
| Language set | ቋንቋ ተመርጧል ⚠ |
| First customer added | የመጀመሪያ ደንበኛ ታክሏል ⚠ |

## Notification groups

| EN | Amharic | Source |
|---|---|---|
| Money in | ገቢ ገንዘብ | ⚠ (`ገቢ` ✅ dictionaries income) |
| Credit–Dubie | ዱቤ–ዘገዬ | ⚠ (`ዱቤ` ✅, `ዘገዬ` ✅ MoneyTab) |
| Money out | ወጪ ገንዘብ | ⚠ (`ወጪ` ✅ NotificationPreferences) |
| Team | ቡድን | ✅ dictionary `team: 'ቡድን'` |
| Gebya & support | ጌብያ እና ድጋፍ | ⚠ (`ድጋፍ` ✅ DataTab) |
| Locked on note | ሁልጊዜ በርቷል | ⚠ new — confirm wording with owner |

Toast copy (final destination): `Settings → Plan` / `ቅንብሮች → እቅድ` ⚠
