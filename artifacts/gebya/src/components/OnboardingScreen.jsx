import { useState } from 'react';
import { useLang } from '../context/LangContext';
import db from '../db';

function isValidPhone(digits) {
  return /^[79]\d{8}$/.test(digits);
}

function OnboardingScreen({ onComplete }) {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });

  const nameValid = name.trim().length > 0;
  const phoneValid = isValidPhone(phoneDigits);
  const canProceed = nameValid && phoneValid;

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 9) setPhoneDigits(raw);
  };

  const handleStart = async () => {
    if (!canProceed || saving) return;
    setSaving(true);
    const fullPhone = '+251' + phoneDigits;
    await db.settings.put({ key: 'shop_name', value: name.trim() });
    await db.settings.put({ key: 'shop_phone', value: fullPhone });
    onComplete({ name: name.trim(), phone: fullPhone });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-12"
      style={{ background: '#7c3d12' }}>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">📒</div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1">ገበያ</h1>
          <p className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {t.onboardTagline}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {t.onboardSubtitle}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-black text-gray-900 mb-1">{t.onboardWelcome}</h2>
          <p className="text-sm text-gray-500 mb-5">
            {t.onboardDesc}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-sm">
                {t.userName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => setTouched(p => ({ ...p, name: true }))}
                placeholder={t.onboardNamePlaceholder}
                autoFocus
                className="w-full p-4 border-2 rounded-2xl text-base focus:outline-none"
                style={{ borderColor: (touched.name && !nameValid) ? '#dc2626' : (nameValid ? '#c47c1a' : '#e8d5b0') }}
                onKeyDown={e => { if (e.key === 'Enter' && canProceed) handleStart(); }}
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-sm">
                {t.phoneNumber} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-0">
                <div
                  className="flex items-center justify-center px-3 py-4 rounded-l-2xl border-2 border-r-0 text-base font-bold"
                  style={{ background: '#f5f0e8', borderColor: (touched.phone && !phoneValid) ? '#dc2626' : '#e8d5b0', color: '#7c3d12', minWidth: '72px' }}
                >
                  +251
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneDigits}
                  onChange={handlePhoneChange}
                  onBlur={() => setTouched(p => ({ ...p, phone: true }))}
                  placeholder="9XXXXXXXX"
                  maxLength={9}
                  className="flex-1 p-4 border-2 rounded-r-2xl text-base focus:outline-none"
                  style={{ borderColor: (touched.phone && !phoneValid) ? '#dc2626' : (phoneValid ? '#c47c1a' : '#e8d5b0') }}
                  onKeyDown={e => { if (e.key === 'Enter' && canProceed) handleStart(); }}
                />
              </div>
              {touched.phone && phoneDigits.length > 0 && !phoneValid && (
                <p className="text-xs text-red-500 mt-1 font-medium">{t.phoneInvalid}</p>
              )}
              {touched.phone && phoneDigits.length === 0 && (
                <p className="text-xs text-red-500 mt-1 font-medium">{t.phoneRequired}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!canProceed || saving}
            className="w-full mt-5 p-4 rounded-2xl font-black text-white text-base min-h-[56px] transition-all active:scale-95"
            style={{
              background: canProceed ? '#c47c1a' : '#e5e7eb',
              color: canProceed ? '#fff' : '#9ca3af',
              boxShadow: canProceed ? '0 4px 0 #92400e' : 'none',
            }}
          >
            {saving ? t.onboardSettingUp : t.onboardGetStarted}
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {t.onboardFooter}
        </p>
      </div>
    </div>
  );
}

export default OnboardingScreen;
