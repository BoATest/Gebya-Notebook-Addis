import { useState } from 'react';
import { useLang } from '../../context/LangContext';
import { useAuthStore } from '../../stores/authStore';
import { fireToast } from '../Toast';
import { getAuthToken } from '../../utils/syncEngine';
import { setPassword, removePassword } from '../../utils/authClient';

function PasswordSettings({ lang }) {
  const { t } = useLang();
  const hasPassword = useAuthStore(s => s.hasPassword);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPasswordValue] = useState('');

  const handleSetPassword = async () => {
    if (password.length < 6) {
      fireToast(
        lang === 'am' ? 'የይምት ቃል መዲዛ መስከቨሪ ነው 6 በላይ ከአይነት' : 'Password must be at least 6 characters',
        2500
      );
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      await setPassword(token, password);
      useAuthStore.setState({ hasPassword: true });
      fireToast(
        lang === 'am' ? 'የይምት ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል' : 'Password saved successfully',
        2000
      );
      setPasswordValue('');
    } catch (err) {
      console.error('Failed to set password:', err);
      fireToast(lang === 'am' ? 'የይምት ቃል መዲዛ አልተሳካም' : 'Failed to save password', 2500);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!confirm(lang === 'am' ? 'እንደገና OTP መረጃ ለማጠቃቀል ይሁኑ፣ የይምት ቃል መዲዛ ነው ለማስወገድ?' : 'You will use OTP again. Remove password?')) {
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      await removePassword(token);
      useAuthStore.setState({ hasPassword: false });
      fireToast(
        lang === 'am' ? 'የይምት ቃል መዲዛ በተሳካ ሁኔታ ተለዋዋጭ ይሆናል' : 'Password removed successfully',
        2000
      );
    } catch (err) {
      console.error('Failed to remove password:', err);
      fireToast(lang === 'am' ? 'የይምት ቃል መዲዛ አልተለወደደም' : 'Failed to remove password', 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden mt-4" style={{ borderColor: 'var(--color-border)' }}>
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-border-light)', background: 'var(--color-surface-subtle)' }}
      >
        <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {lang === 'am' ? 'የይምት ቃል መዲዛ' : 'PASSWORD LOGIN'}
        </span>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'am'
            ? 'የይምት ቃል መዲዛ ይጨምሩ ለ ፍጥነታዊ መግቢያ በማለድም OTP ይጠቀሙ'
            : 'Set a password for faster logins, or use OTP codes.'}
        </div>

        {hasPassword ? (
          <>
            <button
              onClick={handleRemovePassword}
              disabled={loading}
              className="btn btn--danger w-full"
              aria-label={lang === 'am' ? 'የይምት ቃል መዲዛ አስudya' : 'Remove Password'}
            >
              {loading ? '...' : (lang === 'am' ? 'የይምት ቃል መዲዛ አስudya' : 'Remove Password')}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {lang === 'am' ? 'የይምት ቃል መዲዛ' : 'New Password'}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder={lang === 'am' ? '6-32 ሰምዶች' : '6-32 characters'}
                maxLength={32}
                className="w-full px-3 py-2.5 border-2 text-sm focus:outline-none focus:border-primary"
                style={{ borderColor: 'var(--color-border)', borderRadius: 0 }}
                aria-label={lang === 'am' ? 'የይምት ቃል መዲዛ' : 'New Password'}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="mt-1.5 text-xs font-medium"
                style={{ color: 'var(--color-primary)' }}
                aria-label={showPassword
                  ? (lang === 'am' ? 'ዝርዝር ይመልስ' : 'Hide')
                  : (lang === 'am' ? 'ተወድህ ነው' : 'Show')
                }
              >
                {showPassword
                  ? (lang === 'am' ? 'ዝርዝር ይመልስ' : 'Hide')
                  : (lang === 'am' ? 'ተወድህ ነው' : 'Show')}
              </button>
            </div>
            <button
              onClick={handleSetPassword}
              disabled={loading || password.length < 6}
              className="btn btn--primary w-full"
              aria-label={lang === 'am' ? 'የይምት ቃል መዲዛ ያስገቡ' : 'Set Password'}
            >
              {loading
                ? (lang === 'am' ? 'በመያየዝ...' : 'Saving...')
                : (lang === 'am' ? 'የይምት ቃል መዲዛ ያስገቡ' : 'Set Password')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default PasswordSettings;
