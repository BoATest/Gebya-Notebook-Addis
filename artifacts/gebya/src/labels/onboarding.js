/**
 * onboarding.* labels — R2.1 batch 2 (OnboardingScreen.jsx).
 * Byte-identity is unit-locked in tests/labels-onboarding.spec.ts against the
 * exact inline strings these entries replaced (fixture captured from 05fa092
 * — the file itself was last touched at 974292b, before the pilot).
 *
 * Notes:
 *  - namePlaceholder: the AM side is the INLINE literal ('ስምዎን ያስገቡ'); the
 *    EN side replaces the t.onboardNamePlaceholder lookup ('Enter your name',
 *    dictionaries.js:173) — locked to those bytes. The dictionary AM value
 *    ('ለምሳሌ ትግስት') was dead in this slot; the now-unused dict key is
 *    cleaned up in the post-R2.1 labels PR, not here.
 *  - langToggleLabel/langToggleText are INVERTED entries: the toggle renders
 *    the TARGET language (`lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ
 *    ቀይር'`), so `en` holds the Amharic prompt and `am` holds the English one.
 *    Caught by the byte-locks against the pre-refactor fixture — exactly what
 *    they exist for.
 *  - The dual render functions (renderEnglishOptions/renderAmharicOptions)
 *    collapsed into ONE render: DOM byte-identical, strings from entries.
 *  - t.onboardTagline / t.onboardFooter / t.onboardPhoneOptional /
 *    t.onboardPhoneHelper / t.onboardPromises stay on the central dictionary —
 *    they were never ternaries, out of R2.1 scope.
 */
export const onboarding = {
  kicker: { en: 'Two ways to use Gebya', am: 'ገበያን ለመጠቀም ሁለት መንገዶች' },
  chooseType: { en: 'Select Account Type', am: 'የአጠቃቀም አይነት ይምረጡ' },
  ownerTitle: { en: 'Shop Owner', am: 'የሱቅ ባለቤት' },
  ownerSub: { en: 'Create your own notebook', am: 'የራስዎን ማስታወሻ ይፍጠሩ' },
  joinTitle: { en: 'Join a Shop', am: 'ሱቅ ይቀላቀሉ' },
  joinSub: { en: 'Connect as a staff member', am: 'እንደ ሰራተኛ ይገናኙ' },
  langToggleLabel: { en: 'ወደ አማርኛ ቀይር', am: 'Switch to English' },
  langToggleText: { en: 'አማርኛ', am: 'English' },
  back: { en: 'Back', am: 'ተመለስ' },
  formTitle: { en: 'Set up your notebook', am: 'የሱቅዎን ማስታወሻ ደብተር ያዘጋጁ' },
  nameLabel: { en: 'Your Name', am: 'ስም' },
  namePlaceholder: { en: 'Enter your name', am: 'ስምዎን ያስገቡ' },
  nameError: { en: 'Please enter your name', am: 'እባክዎ ስም ያስገቡ' },
  phoneLabel: { en: 'Phone Number', am: 'ስልክ ቁጥር' },
  phoneError: { en: 'Enter a valid phone number', am: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ' },
  saving: { en: 'Saving...', am: 'በማስቀመጥ ላይ...' },
  startCta: { en: 'Start', am: 'ጀምር' },
  offlineToast: {
    en: 'Saved on this phone — connect to internet to enable sync',
    am: 'በዚህ ስልክ ብቻ ተቀምጧል — ኢንተርኔት ሲገኝ ማገናኘት ይችላሉ',
  },
  /**
   * Phone-conflict panel: the frontend half of the POST /shops account-takeover
   * guard (409 PHONE_ALREADY_REGISTERED). These are NEW entries, not captured by
   * the pre-refactor fixture, so they sit outside the byte-lock above.
   *
   * The AM side is author-written and has NOT had a Merkato reviewer pass —
   * flag it in docs/NEW_AMHARIC_STRINGS.md before this copy goes beyond the
   * pilot (same protocol as every other R2 label).
   */
  phoneConflictTitle: {
    en: 'This phone number is already registered',
    am: 'ይህ ስልክ ቁጥር ቀድሞ ተመዝግቧል',
  },
  phoneConflictMsg: {
    en: 'Another Gebya notebook already uses this number, so this one was not created. Continue without the number, or enter a different one.',
    am: 'ይህ ቁጥር በሌላ ማስታወሻ ጥቅም ላይ ስለሚውል ይህ አልተፈጠረም። ያለ ቁጥር ይቀጥሉ፣ ወይም ሌላ ቁጥር ያስገቡ።',
  },
  phoneConflictContinue: { en: 'Continue without number', am: 'ያለ ቁጥር ቀጥሉ' },
  phoneConflictChange: { en: 'Change number', am: 'ቁጥር ይቀይሩ' },
};