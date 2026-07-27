import { useState } from 'react';
import { requestOtp, verifyOtp } from '../../utils/authClient';
import { setAuthToken } from '../../utils/syncEngine';
import { fireToast } from '../Toast';

export default function AuthRequiredPrompt({ lang, onClose }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const t = lang === 'am' ? {
    title: 'እባክዎ ይግቡ',
    subtitle: 'መረጃዎን ለማቀነስ የስልክ ቁጥርዎን ያስገቡ',
    phoneLabel: 'ስልክ ቁጥር',
    continue: 'ቀጥል',
    otpLabel: 'የተላከውን ኮድ ያስገቡ',
    verify: 'ያረጋግጡ',
    resend: 'ኮድ እንደገና ይላኩ',
    back: 'ተመለስ',
    skip: 'ዝጋ',
    invalidPhone: 'ትክክለኛ ስልክ ቁጥር ያስገቡ',
    otpSent: 'ኮድ ተላክ!',
    success: 'በተሳካ ሁኔታ ገብተዋል',
    error: 'ችግር ተፈጥሯል',
  } : {
    title: 'Sign in',
    subtitle: 'Enter your phone number to restore cloud sync',
    phoneLabel: 'Phone number',
    continue: 'Continue',
    otpLabel: 'Enter the code we sent',
    verify: 'Verify',
    resend: 'Resend code',
    back: 'Back',
    skip: 'Dismiss',
    invalidPhone: 'Enter a valid phone number',
    otpSent: 'Code sent!',
    success: 'Signed in successfully',
    error: 'Something went wrong',
  };

  async function handleRequestOtp() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 9 || (digits[0] !== '7' && digits[0] !== '9')) {
      setError(t.invalidPhone);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestOtp(`+251${digits}`);
      setStep('otp');
      fireToast(t.otpSent, 2000);
    } catch (err) { setError(err.message || t.error); }
    finally { setLoading(false); }
  }

  async function handleVerify() {
    const digits = phone.replace(/\D/g, '');
    setError(null);
    setLoading(true);
    try {
      const { token } = await verifyOtp(`+251${digits}`, otp);
      await setAuthToken(token);
      fireToast(t.success, 2000);
      onClose();
    } catch (err) { setError(err.message || t.error); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {error && (
          <div className="mb-3 rounded-xl px-3 py-2 text-xs font-medium" style={{ background: '#fef2f2', color: '#991b1b' }}>
            {error}
          </div>
        )}

        {step === 'phone' && (
          <div className="space-y-3">
            <div className="flex gap-0">
              <div className="flex items-center justify-center px-3 py-3 rounded-l-xl border-2 border-r-0 text-sm font-bold" style={{ background: '#f5f0e8', borderColor: '#e8e2d8', color: '#1B4332', minWidth: '64px' }}>
                +251
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 9)); setError(null); }}
                placeholder="9XX XXX XXX"
                maxLength={9}
                className="flex-1 px-4 py-3 border-2 rounded-r-xl text-sm focus:outline-none"
                style={{ borderColor: error ? '#fca5a5' : '#e8e2d8' }}
                autoFocus
              />
            </div>
            <button
              onClick={handleRequestOtp}
              disabled={loading || phone.length !== 9}
              className="w-full py-3 rounded-xl font-bold text-sm min-h-[48px]"
              style={{ background: loading ? '#e5e7eb' : '#1B4332', color: loading ? '#9ca3af' : '#fff' }}
            >
              {loading ? '...' : t.continue}
            </button>
            <button onClick={onClose} className="w-full py-2.5 text-xs font-bold text-gray-400">{t.skip}</button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              maxLength={6}
              className="w-full px-4 py-3 border-2 rounded-xl text-sm font-bold tracking-widest text-center focus:outline-none"
              style={{ borderColor: '#e8e2d8' }}
              autoFocus
            />
            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl font-bold text-sm min-h-[48px]"
              style={{ background: loading ? '#e5e7eb' : '#1B4332', color: loading ? '#9ca3af' : '#fff' }}
            >
              {loading ? '...' : t.verify}
            </button>
            <div className="flex gap-2">
              <button onClick={() => { setStep('phone'); setOtp(''); setError(null); }} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: '#f5f5f5' }}>{t.back}</button>
              <button onClick={handleRequestOtp} disabled={loading} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: '#FAF8F5', border: '1px solid #e8e2d8' }}>{t.resend}</button>
            </div>
            <button onClick={onClose} className="w-full py-2.5 text-xs font-bold text-gray-400">{t.skip}</button>
          </div>
        )}
      </div>
    </div>
  );
}
