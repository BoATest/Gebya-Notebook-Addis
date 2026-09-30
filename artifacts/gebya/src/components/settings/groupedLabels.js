/**
 * R2.3 grouped Settings — group + row labels.
 *
 * STATUS: DRAFT — pending Merkato/shopkeeper sign-off (docs/R2-LABELS-DRAFT.md).
 * ⚠ entries are composed Amharic that has NOT been signed off yet. They live
 * here — NOT in src/labels/* — so the R2.1 byte-identity contract
 * (tests/labels-settings.spec.ts) is untouched while the review is open.
 * After sign-off this module is deleted and its entries move into
 * src/labels/settings.js verbatim (one import swap in SettingsGroupedPage).
 *
 * Shape matches the labels module: every entry is `{ en, am }`.
 * "✅" rows are byte-copies of strings already live in the app source;
 * "⚠" rows are new/composed and MUST NOT be treated as approved.
 */
export const GROUPED_LABELS = {
  groups: {
    shop: { en: 'SHOP', am: 'ሱቅ' },                                   // ✅ dictionary shop
    money: { en: 'MONEY & CREDIT', am: 'ገንዘብ እና ዱቤ' },              // ⚠ composed
    myApp: { en: 'MY APP', am: 'የእርስዎ መተግበሪያ' },                    // ⚠ composed
    // Slice 2/3 (staff MyAccountPanel) — defined now so the surface can be
    // built without a second label pass.
    myAccount: { en: 'MY ACCOUNT', am: 'የእርስዎ መለያ' },                // ⚠ composed
  },

  rows: {
    profile: { en: 'Shop Profile', am: 'የሱቅ መገለጫ' },                 // ✅ ShopTab
    items: { en: 'Items', am: 'እቃዎች' },                              // ✅ ShopTab
    // ⚠ NOTE: R2-LABELS-DRAFT lists 'ደጋጋሚ ወጪዎች' for this row, but the live
    // source (ShopTab) renders 'ወርሃዊ ወጪ'. Source bytes win until sign-off.
    recurring: { en: 'Recurring Expenses', am: 'ወርሃዊ ወጪ' },          // ✅ ShopTab
    dubieRules: { en: 'Dubie (Credit) Rules', am: 'የዱቤ ህጎች' },      // ✅ MoneyTab
    paymentChannels: { en: 'Payment Channels', am: 'የክፍያ መንገዶች' }, // ✅ MoneyTab
    plan: { en: 'Plan', am: 'እቅድ' },                                 // ⚠ new
    alerts: { en: 'Alerts & reminders', am: 'ማስታወቂያዎች' },           // ⚠ EN new / AM existing token
    remindCustomers: { en: 'Remind customers', am: 'ለደንበኞች ማስታወቂያ' }, // ⚠ composed
    backupSync: { en: 'Backup & sync', am: 'መጠባበቂያ እና ማመሳሰል' },     // ⚠ composed
    passwordDevices: { en: 'Password & devices', am: 'የሚስጥር ቃል እና መሣሪያዎች' }, // ⚠ MUST-FIX applied (የሚስጥር)
    appearance: { en: 'Appearance', am: 'መልክ' },                     // ✅ dictionary appearance
    language: { en: 'Language', am: 'ቋንቋ' },                         // ✅ dictionary
    help: { en: 'Help & Support', am: 'እርዳታ እና ድጋፍ' },              // ✅ DataTab
    about: { en: 'About Gebya', am: 'ስለ ገበያ' },                      // ✅ DataTab (ገበያ spelling)
    signOut: { en: 'Sign out', am: 'ውጣ' },                            // ⚠ user-review shortlist
    // Slice 2 — staff My Account rows (R2-WIREFRAMES State 3).
    myAlerts: { en: 'My alerts', am: 'የእኔ ማስታወቂያዎች' },          // ⚠ composed
    myPhone: { en: 'My phone', am: 'የእኔ ስልክ' },                    // ⚠ composed (`ስልክ` ✅)
    myPassword: { en: 'My password', am: 'የእኔ የሚስጥር ቃል' },          // ⚠ MUST-FIX applied (was `የይምት` = insult)
  },

  chrome: {
    // ✅ existing PaymentChannelsSection token — count-only badge (no denominator)
    configured: { en: 'configured', am: 'ተዋቅሯል' },
    // ✅ existing SettingsPage footer token
    moreTaps: { en: 'more taps', am: 'ተጨማሪ መታ' },
    // ⚠ composed — the interim owner/staff sign-out confirm. MyAccountPanel
    // upgrades this to the unsynced-records guard below (wireframe correction c).
    signOutTitle: { en: 'Sign out?', am: 'መውጣት?' },
    signOutBody: {
      en: 'You will need your phone number to sign in again.',
      am: 'እንደገና ለመግባት የስልክ ቁጥርዎ ያስፈልጋል።',
    },

    // ── Slice 2: unsynced-records sign-out guard (R2-WIREFRAMES correction c) ──
    // The wireframe shows "⚠ N records not yet synced / They stay on this
    // phone." with [Sync now] [Sign out anyway]. Sign-out is NOT blocked — the
    // records are local and survive logout — but the user is told first.
    // ⚠ All composed; on the Merkato shortlist with the rest of Slice 2.
    unsyncedTitle: { en: 'Records not yet synced', am: 'ያልተመሳሰሉ መዝገቦች' },
    unsyncedCount: {
      en: (n) => `${n} ${n === 1 ? 'record has' : 'records have'} not yet synced.`,
      am: (n) => `${n} ${n === 1 ? 'መዝገብ' : 'መዝገቦች'} አልተመሳሰሉም።`,
    },
    unsyncedBody: {
      en: 'They stay on this phone and upload next time you are online.',
      am: 'በዚህ ስልክ ላይ ይቀራሉ፤ እርስ ጊዜ በመስመር ላይ ሲሆን ይላካሉ።',
    },
    syncNow: { en: 'Sync now', am: 'አሁን አማሳይ።' },
    signOutAnyway: { en: 'Sign out anyway', am: 'ምንም አልተከለከለም ውጣ' },
    // ✅ mirrored from the grouped page's plan-row vocabulary
    set: { en: 'Set', am: 'ተዋቅሯል' },
    notSet: { en: 'Not set', am: 'አልተዋቀረም' },
  },
};
