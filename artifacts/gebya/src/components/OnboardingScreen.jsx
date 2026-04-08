import { useState } from 'react';
import { useLang } from '../context/LangContext';
import db from '../db';

const BUSINESS_TYPE_OPTIONS = {
  en: ['Shop', 'Wholesale', 'Distributor', 'Boutique', 'Cafe', 'Service', 'Other'],
  am: ['ሱቅ', 'ጅምላ', 'አከፋፋይ', 'ቡቲክ', 'ካፌ', 'አገልግሎት', 'ሌላ'],
};

const ONBOARDING_COPY = {
  en: {
    desc: 'Write your shop name, then start today\'s notes in seconds.',
    businessTypeHelp: 'What kind of business do you run? This helps Gebya suggest items faster.',
    promises: [
      'Write today\'s sales, spending, and Dubie like a notebook',
      'Start with your name first and add the rest later',
      'Your notes stay with you on this phone',
    ],
    footer: 'Your notebook stays on your phone · No account needed · You can change details later',
  },
  am: {
    desc: 'የሱቅዎን ስም ይጻፉ፣ ከዛ የዛሬን ማስታወሻ በፍጥነት ይጀምሩ።',
    businessTypeHelp: 'ምን ዓይነት ንግድ ይሰራሉ? ይህ ገበያ ተገቢ እቃዎችን በፍጥነት እንዲጠቁም ይረዳዋል።',
    promises: [
      'የዛሬን ሽያጭ፣ ወጪ እና ዱቤ እንደ ደብተር ይጻፉ',
      'በስምዎ ይጀምሩ፤ ቀሪውን በኋላ ይጨምሩ',
      'ማስታወሻዎ በዚህ ስልክ ላይ ከእርስዎ ጋር ይቆያል',
    ],
    footer: 'ደብተርዎ በስልክዎ ላይ ይቆያል · መለያ አያስፈልግም · ዝርዝሮቹን በኋላ መቀየር ይችላሉ',
  },
};

function isValidPhone(digits) {
  return /^[79]\d{8}$/.test(digits);
}

function OnboardingScreen({ onComplete }) {
  const { t, lang } = useLang();
  const copy = ONBOARDING_COPY[lang] || ONBOARDING_COPY.en;
  const phoneOptionalLabel = t.onboardPhoneOptional || '(optional)';
  const phoneHelper = t.onboardPhoneHelper || 'You can add your phone later in Settings.';
  const businessTypeOptionalLabel = t.onboardBusinessTypeOptional || '(optional)';
  const businessTypeOptions = BUSINESS_TYPE_OPTIONS[lang] || BUSINESS_TYPE_OPTIONS.en;
  const businessTypeLabel = t.onboardBusinessTypeLabel || (lang === 'am' ? 'የንግድ አይነት' : 'Business type');
  const businessTypePlaceholder = t.onboardBusinessTypePlaceholder || (lang === 'am' ? 'ሱቅ፣ ጅምላ፣ አከፋፋይ...' : 'Shop, wholesale, distributor...');
  const onboardingPromises = copy.promises;
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });

  const nameValid = name.trim().length > 0;
  const phoneEntered = phoneDigits.length > 0;
  const phoneValid = !phoneEntered || isValidPhone(phoneDigits);
  const canProceed = nameValid && phoneValid;

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 9) setPhoneDigits(raw);
  };

  const handleStart = async () => {
    if (!canProceed || saving) return;
    setSaving(true);
    const fullPhone = phoneEntered ? `+251${phoneDigits}` : '';
    const normalizedBusinessType = businessType.trim();
    await db.settings.put({ key: 'intro_seen', value: 'yes' });
    await db.settings.put({ key: 'shop_name', value: name.trim() });
    await db.settings.put({ key: 'shop_phone', value: fullPhone });
    await db.settings.put({ key: 'shop_business_type', value: normalizedBusinessType });
    onComplete({ name: name.trim(), phone: fullPhone, businessType: normalizedBusinessType });
  };

  return (
    <div
      className="min-h-[100dvh] overflow-y-auto px-4 py-4 texture-noise sm:px-6 sm:py-8"
      style={{ background: '#1B4332' }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-start py-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center">
        <div className="text-center mb-4 animate-elastic sm:mb-6">
          <div className="text-4xl mb-3 font-black text-white" aria-hidden="true">GB</div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1 font-serif">Gebya</h1>
          <p className="text-base font-semibold font-sans" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {t.onboardTagline}
          </p>
        </div>

        <div
          className="bg-white p-5 animate-slide-up sm:p-6"
          style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        >
          <h2 className="text-2xl font-black text-gray-900 mb-2 font-sans">{t.onboardWelcome}</h2>
          <p className="text-sm leading-6 text-gray-500 mb-5 font-sans">
            {copy.desc}
          </p>

          <div className="space-y-2 mb-5">
            {onboardingPromises.map((promise) => (
              <div
                key={promise}
                className="flex items-start gap-3 p-3 border text-sm font-medium font-sans"
                style={{
                  background: '#FAF8F5',
                  borderColor: '#e8e2d8',
                  borderRadius: 'var(--radius-md)',
                  color: '#4b5563',
                }}
              >
                <span className="mt-0.5 text-base" style={{ color: '#1B4332' }} aria-hidden="true">•</span>
                <p>{promise}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-sm font-sans">
                {t.userName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                placeholder={t.onboardNamePlaceholder}
                autoFocus
                className="w-full p-4 border-2 text-base focus:outline-none font-sans"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: touched.name && !nameValid ? '#dc2626' : (nameValid ? '#1B4332' : '#e8e2d8'),
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && canProceed) handleStart(); }}
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-sm font-sans">
                {businessTypeLabel} <span className="text-gray-400 font-normal">{businessTypeOptionalLabel}</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {businessTypeOptions.map((option) => {
                  const isActive = businessType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBusinessType(option)}
                      className="min-h-[40px] rounded-full px-3 py-2 text-sm font-semibold transition-all"
                      style={{
                        background: isActive ? 'rgba(27,67,50,0.08)' : '#FAF8F5',
                        border: `1px solid ${isActive ? '#1B4332' : '#e8e2d8'}`,
                        color: isActive ? '#1B4332' : '#4b5563',
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder={businessTypePlaceholder}
                className="w-full p-4 border-2 text-base focus:outline-none font-sans"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: businessType.trim() ? '#1B4332' : '#e8e2d8',
                }}
              />
              <p className="text-xs mt-1.5 font-medium font-sans" style={{ color: '#6b7280' }}>
                {copy.businessTypeHelp}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-sm font-sans">
                {t.phoneNumber} <span className="text-gray-400 font-normal">{phoneOptionalLabel}</span>
              </label>
              <div className="flex gap-0">
                <div
                  className="flex items-center justify-center px-3 py-4 border-2 border-r-0 text-base font-bold font-sans"
                  style={{
                    background: 'rgba(27,67,50,0.06)',
                    borderColor: touched.phone && !phoneValid ? '#dc2626' : '#e8e2d8',
                    color: '#1B4332',
                    minWidth: '72px',
                    borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
                  }}
                >
                  +251
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneDigits}
                  onChange={handlePhoneChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  placeholder="9XXXXXXXX"
                  maxLength={9}
                  className="flex-1 p-4 border-2 text-base focus:outline-none font-sans"
                  style={{
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    borderColor: touched.phone && !phoneValid ? '#dc2626' : (phoneValid ? '#1B4332' : '#e8e2d8'),
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canProceed) handleStart(); }}
                />
              </div>
              {touched.phone && phoneEntered && !phoneValid && (
                <p className="text-xs text-red-500 mt-1 font-medium font-sans">{t.phoneInvalid}</p>
              )}
              {!phoneEntered && (
                <p className="text-xs mt-1 font-medium font-sans" style={{ color: '#9ca3af' }}>{phoneHelper}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!canProceed || saving}
            className="w-full mt-5 p-4 font-black text-white text-base min-h-[56px] transition-all active:scale-95 font-sans press-scale"
            style={{
              background: canProceed ? '#1B4332' : '#e5e7eb',
              color: canProceed ? '#fff' : '#9ca3af',
              boxShadow: canProceed ? '0 4px 0 #0f2b20, var(--shadow-sm)' : 'none',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {saving ? t.onboardSettingUp : t.onboardGetStarted}
          </button>
        </div>

        <p className="text-center text-xs mt-4 leading-5 font-sans px-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {copy.footer}
        </p>
      </div>
    </div>
  );
}

export default OnboardingScreen;
