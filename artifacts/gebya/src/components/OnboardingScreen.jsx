import { useState } from 'react';
import db from '../db';

function OnboardingScreen({ onComplete }) {
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const canProceed = shopName.trim().length > 0;

  const handleStart = async () => {
    if (!canProceed || saving) return;
    setSaving(true);
    await db.settings.put({ key: 'shop_name', value: shopName.trim() });
    await db.settings.put({ key: 'shop_phone', value: phone.trim() });
    onComplete({ name: shopName.trim(), phone: phone.trim() });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-12"
      style={{ background: '#7c3d12' }}>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-4">📒</div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1">ገበያ</h1>
          <p className="text-base font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            የሱቅ ማስታወሻ ደብተር
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Your business notebook
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-black text-gray-900 mb-1">Welcome!</h2>
          <p className="text-sm text-gray-500 mb-5">
            Let's set up your shop. You can change these any time in Settings.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-sm">
                Shop name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder="e.g. Tigist's Store"
                autoFocus
                className="w-full p-4 border-2 rounded-2xl text-base focus:outline-none"
                style={{ borderColor: shopName.trim() ? '#c47c1a' : '#e8d5b0' }}
                onKeyDown={e => { if (e.key === 'Enter') handleStart(); }}
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1.5 text-sm">
                Your phone number{' '}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 0912345678"
                className="w-full p-4 border-2 rounded-2xl text-base focus:outline-none"
                style={{ borderColor: '#e8d5b0' }}
              />
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
            {saving ? 'Setting up…' : 'ጀምር — Get Started'}
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          All data stays on your phone · No account needed · Free
        </p>
      </div>
    </div>
  );
}

export default OnboardingScreen;
