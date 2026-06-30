import { useState } from 'react';
import { useLang } from '../context/LangContext';
import db, { setIdentity } from '../db';
import { identityApi } from '../api/identity';

const BANK_COPY = 'Gebya is a notebook, not a bank. Gebya does not connect to your bank. Gebya cannot withdraw money. Never enter PIN, OTP, or password. Payment method is only a label like Cash, CBE, Telebirr, or Bank Transfer.';

function isValidPhone(digits) {
  return /^[79]\d{8}$/.test(digits);
}

const BUSINESS_TYPE_OPTIONS_EN = [
  { value: 'retail-shop', label: 'Retail shop' },
  { value: 'shoe-market', label: 'Shoe market' },
  { value: 'flower-shop', label: 'Flower shop' },
  { value: 'women-dress-shop', label: 'Women dress shop' },
  { value: 'grocery', label: 'Grocery / minimarket' },
  { value: 'electronics', label: 'Electronics / accessories' },
  { value: 'pharmacy', label: 'Pharmacy / cosmetics' },
  { value: 'other', label: 'Other' },
];

const BUSINESS_TYPE_OPTIONS_AM = [
  { value: 'retail-shop', label: 'የችርቻሮ ሱቅ' },
  { value: 'shoe-market', label: 'የጫማ መሸጫ' },
  { value: 'flower-shop', label: 'የአበባ ሱቅ' },
  { value: 'women-dress-shop', label: 'የሴቶች ልብስ ሱቅ' },
  { value: 'grocery', label: 'ግሮሰሪ / ሚኒማርኬት' },
  { value: 'electronics', label: 'ኤሌክትሮኒክስ / መለዋወጫ' },
  { value: 'pharmacy', label: 'ፋርማሲ / መዋቢያ' },
  { value: 'other', label: 'ሌላ' },
];

function OnboardingScreen({ onComplete }) {
  const { t, lang, toggleLang } = useLang();
  const phoneOptionalLabel = t.onboardPhoneOptional || '(optional)';
  const phoneHelper = t.onboardPhoneHelper || 'You can add your phone later in Settings.';
  const onboardingPromises = [
    t.onboardPromiseSimple || 'Simple notebook for sales, spending, and Dubie',
    t.onboardPromiseFast || 'Start with your name only',
    t.onboardPromisePrivate || 'Your records stay on this phone',
  ];
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
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
    try {
      const result = await identityApi.createShop({
        display_name: name.trim(),
        phone: fullPhone || undefined,
        business_type: 'retail-shop',
      });
      const identity = {
        shop_id: result.shop_id,
        shop_name: result.shop_name || name.trim(),
        join_code: result.join_code,
        join_url: result.join_url,
        device_id: result.device_id,
        device_token: result.device_token,
        staff_id: result.staff_id,
        display_name: result.display_name || name.trim(),
        phone_number: fullPhone,
        role: 'owner',
        permissions: result.permissions || {},
        device_status: result.device_status || 'active',
        phone_required: result.phone_required ?? false,
        approval_required: result.approval_required ?? false,
      };
      await setIdentity(identity);
      await db.settings.put({ key: 'intro_seen', value: 'yes' });
      await db.settings.put({ key: 'shop_name', value: identity.shop_name });
      await db.settings.put({ key: 'shop_phone', value: fullPhone });
      onComplete({
        id: result.shop_id,
        shop_id: result.shop_id,
        name: identity.shop_name,
        phone: fullPhone,
        businessType: 'retail-shop',
        role: 'owner',
        join_code: result.join_code,
        join_url: result.join_url,
        staff_id: result.staff_id,
        device_id: result.device_id,
        display_name: result.display_name || name.trim(),
        device_status: result.device_status || 'active',
      });
    } catch {
      await db.settings.put({ key: 'intro_seen', value: 'yes' });
      await db.settings.put({ key: 'shop_name', value: name.trim() });
      await db.settings.put({ key: 'shop_phone', value: fullPhone });
      onComplete({ name: name.trim(), phone: fullPhone, businessType: 'retail-shop' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 py-5 texture-noise overflow-y-auto"
      style={{ background: '#1B4332' }}
    >
      <div className="w-full max-w-sm">
        {/* Language toggle — new users default to Amharic; this is the escape
            hatch for English speakers right on the first screen. */}
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={toggleLang}
            className="press-scale"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999,
              padding: '6px 12px',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            aria-label={lang === 'am' ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
          >
            🌐 {lang === 'am' ? 'English' : 'አማርኛ'}
          </button>
        </div>
        {/* Compact header — uses the real app icon (was a plain 'GB' text) */}
        <div className="text-center mb-4 animate-elastic">
          <img
            src="/icon-192.png"
            alt="Gebya"
            width={56}
            height={56}
            className="mx-auto mb-2"
            style={{ borderRadius: 14, boxShadow: '0 4px 12px -4px rgba(0,0,0,0.4)' }}
          />
          <h1 className="text-2xl font-black text-white tracking-tight mb-0.5 font-serif">Gebya</h1>
          <p className="text-sm font-semibold font-sans" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {t.onboardTagline}
          </p>
        </div>

        <div
          className="bg-white p-6 animate-slide-up"
          style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        >
          <h2 className="text-2xl font-black text-gray-900 mb-2 font-sans">{t.onboardWelcome}</h2>
          <p className="text-sm leading-6 text-gray-500 mb-5 font-sans">
            {t.onboardDesc}
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
                  size={1}
                  className="flex-1 min-w-0 p-4 border-2 text-base focus:outline-none font-sans"
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

        <p className="text-center text-xs mt-4 leading-5 font-sans" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t.onboardFooter}
        </p>
      </div>
    </div>
  );
}

export default OnboardingScreen;

