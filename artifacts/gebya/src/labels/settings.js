/**
 * settings.* labels — R2.1 pilot extraction (ReadinessHero + PlanPanel).
 * Byte-identity is unit-locked in tests/labels-settings.spec.ts against the
 * exact inline strings these entries replaced. Consumers: ReadinessHero.jsx,
 * PlanPanel.jsx.
 */
export const settings = {
  readiness: {
    setName: { en: 'Set shop name', am: 'የሱቅ ስም ያስገቡ' },
    setPhone: { en: 'Add shop phone number', am: 'የስልክ ቁጥር ያስገቡ' },
    setUpChannel: { en: 'Set up a payment channel', am: 'የክፍያ መንገድ ያዋቅሩ' },
    addItems: { en: 'Add items to catalog', am: 'እቃዎች ያስገቡ' },
    addRecurring: { en: 'Add recurring expenses', am: 'ወርሃዊ ወጪ ይመዝግቡ' },
    ctaAdd: { en: 'Add ›', am: 'ያስገቡ ›' },
    ctaSetup: { en: 'Setup ›', am: 'ያዋቅሩ ›' },
    // ZERO TERM DECISIONS: the EN side of the recurring CTA is the Amharic
    // verb — shipped that way inline; fixed in the post-R2.1 labels PR only.
    ctaRecord: { en: 'ይመዝግቡ ›', am: 'ይመዝግቡ ›' },
    allSetUp: { en: 'All set up', am: 'ሁሉም ተዋቅሯል' },
    details: { en: 'Details', am: 'ተጨማሪ' },
    shopFallback: { en: 'Shop', am: 'ሱቅ' },
    // Parameterized entry (extraction rules 2 + 6): values in → byte-identical
    // string out. This is the `${doneCount} ከ ${totalCount}` template ternary.
    // Rule 6 (Batch 2 ruling): >1 interpolation → single named object param,
    // never positional args.
    progressOf: {
      en: ({ done, total }) => `${done} of ${total} set up`,
      am: ({ done, total }) => `${done} ከ ${total} ተዋቅሯል`,
    },
  },
  plan: {
    plusStaff: { en: 'Unlimited staff members', am: 'ያልተገደበ ሰራተኞች' },
    plusTx: { en: 'Unlimited monthly transactions', am: 'ያልተገደበ ወርሃዊ ግብይቶች' },
    plusReports: { en: 'Advanced reports & analytics', am: 'የላቀ ሪፖርቶች እና ትንታኔ' },
    plusMulti: { en: 'Multi-shop management', am: 'ባለብዙ ሱቅ አስተዳደር' },
    plusSupport: { en: 'Priority support', am: 'ቅድሚያ ድጋፍ' },
    freeTitle: { en: 'Free Plan', am: 'ነፃ ፕላን' },
    freeSubtitle: { en: 'Limited staff and reports', am: 'የሰራተኞች እና የሪፖርት ገደቦች አሉ' },
    staffLabel: { en: 'Staff', am: 'ሰራተኞች' },
    txLabel: { en: 'Monthly tx', am: 'ወርሃዊ ግብይቶች' },
    upgradeCta: { en: 'Upgrade to Plus', am: 'ወደ Plus አሻሽል' },
    // Same AM string as upgradeCta — pre-existing, byte-identical, no fix here.
    upgradeNow: { en: 'Upgrade Now', am: 'ወደ Plus አሻሽል' },
    upgrading: { en: 'Upgrading...', am: 'በመስራት ላይ...' },
    upgradedToast: { en: 'Upgraded to Gebya Plus! 🎉', am: 'ወደ Gebya Plus ተሻሽሏል! 🎉' },
    upgradeFailedToast: { en: 'Something went wrong', am: 'እባክዎ እንደገና ይሞክሩ' },
    modalTagline: { en: 'Unlock everything and scale your business', am: 'ሁሉንም ገደቦች ይክፈቱ እና የንግድዎን አቅም ይጨምሩ' },
    deviceNote: { en: 'Tied to this device. No payment is taken.', am: 'ከዚህ ስልክ ጋር የተያያዘ ነው። ምንም ክፍያ አይጠየቅም።' },
  },
};
