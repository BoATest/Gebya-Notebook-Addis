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
  const onboardKicker = lang === 'am' ? 'ማዋቀሪያ' : 'SETUP';

  const renderAmharicOptions = () => (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setMode('owner')}
        className="w-full text-left press-scale p-4 border-2"
        style={{ borderColor: '#1B4332', background: '#F5FBF7', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">🏪</span>
          <div>
            <p className="font-black text-gray-900">የሱቅ ባለቤት / አሰሪ ነኝ</p>
            <p className="text-xs mt-1 leading-5 text-gray-500">
              የራስዎን የሱቅ መረጃ ለመመዝገብ እና ሰራተኞችን ለማስገባት።
            </p>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onComplete({ __staff_join: true })}
        className="w-full text-left press-scale p-4 border-2"
        style={{ borderColor: '#e8e2d8', background: '#FAF8F5', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">👥</span>
          <div>
            <p className="font-black text-gray-900">አሰሪ ወደ ሱቅ ተጋብደለሁ</p>
            <p className="text-xs mt-1 leading-5 text-gray-500">
              በገባት ውስጥ ያስገቡዎትን የሱቅ ኮድ ተጠቀሉ።
            </p>
          </div>
        </div>
      </button>
    </div>
  );

  const renderEnglishOptions = () => (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setMode('owner')}
        className="w-full text-left press-scale p-4 border-2"
        style={{ borderColor: '#1B4332', background: '#F5FBF7', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">🏪</span>
          <div>
            <p className="font-black text-gray-900">I am a Shop Owner / Employer</p>
            <p className="text-xs mt-1 leading-5 text-gray-500">
              To record your shop data and manage your sales staff.
            </p>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onComplete({ __staff_join: true })}
        className="w-full text-left press-scale p-4 border-2"
        style={{ borderColor: '#e8e2d8', background: '#FAF8F5', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">👥</span>
          <div>
            <p className="font-black text-gray-900">Join as Sales Staff</p>
            <p className="text-xs mt-1 leading-5 text-gray-500">
              Enter your given code to access the shop notebook.
            </p>
          </div>
        </div>
      </button>
    </div>
  );

  const [mode, setMode] = useState('choice');

  if (mode === 'choice') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-start px-4 py-5 texture-noise overflow-y-auto"
        style={{ background: '#1B4332' }}
      >
        <div className="w-full max-w-sm">
          {/* Language toggle */}
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

          {/* Minimalist header */}
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
            <p className="text-xs font-black uppercase tracking-[0.18em] mb-2" style={{ color: '#C4883A' }}>
              {onboardKicker}
            </p>
            <h2 className="text-2xl font-black text-gray-900 mb-2 font-sans">
              {lang === 'am' ? 'የአጠቃቀም አይነት ይምረጡ' : 'Select Account Type'}
            </h2>

            {lang === 'am' ? renderAmharicOptions() : renderEnglishOptions()}

            <div className="mt-5 rounded-xl px-4 py-3 text-xs leading-5 font-medium" style={{ background: '#fff7ed', color: '#7c2d12', border: '1px solid #fed7aa' }}>
              {BANK_COPY}
            </div>
          </div>

          <p className="text-center text-xs mt-4 leading-5 font-sans" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {t.onboardFooter}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-5 texture-noise"
      style={{ background: '#1B4332' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center animate-elastic">
          <img
            src="/icon-192.png"
            alt="Gebya"
            width={80}
            height={80}
            className="mx-auto mb-4"
            style={{ borderRadius: 16, boxShadow: '0 6px 20px -4px rgba(0,0,0,0.4)' }}
          />
          <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-serif">Gebya</h1>
          <p className="text-base font-semibold font-sans" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {t.onboardTagline}
          </p>
        </div>

        <div
          className="bg-white p-8 mt-6 animate-slide-up"
          style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        >
          <h2 className="text-2xl font-black text-gray-900 mb-4 font-sans">
            {lang === 'am' ? 'የሱቅን መሰጠን ሲደል በመመጥር' : 'Setting up your Notebook'}
          </h2>

          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(27,67,50,0.08)' }}
              >
                ⏳
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {lang === 'am' ? 'በመመጥር ሲደን ሲድመር በመመጥር...'.charAt(0) + '...' : 'Setting up your notebook...'}
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-4 leading-5 font-sans" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {t.onboardFooter}
        </p>
      </div>
    </div>
  );
}

export default OnboardingScreen;

