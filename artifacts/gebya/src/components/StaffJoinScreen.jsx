import { useState } from 'react';
import { ChevronRight, AlertCircle, Users } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { identityApi } from '../api/identity';
import { setIdentity } from '../db';
import db from '../db';
import { setAuthToken } from '../utils/syncEngine';
import { getOrCreateCloudProofDeviceId } from '../utils/cloudProof';
import { requestOtp, verifyOtp, linkDevice } from '../utils/authClient';
import { isValidEthiopianPhone, normalizeEthiopianPhone, extractSubscriberDigits, formatEthiopianPhone } from '../utils/phoneNumber';

const BANK_COPY = 'Gebya is a notebook, not a bank. Gebya does not connect to your bank. Gebya cannot withdraw money. Never enter PIN, OTP, or password. Payment method is only a label like Cash, CBE, Telebirr, or Bank Transfer. Staff phone number is for identity/contact only, not bank/payment.';

const STEP_CODE = 0;
const STEP_NAME = 1;
const STEP_PHONE = 2;
const STEP_ERROR = 3;
const STEP_ALREADY_MEMBER = 4;
const STEP_OTP = 5;
const DEVICE_LABEL = 'Staff phone';

function BankTrustCopy({ className = '' }) {
  return (
    <div className={`bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 ${className}`}>
      <p className="text-xs font-medium text-green-800 leading-relaxed">{BANK_COPY}</p>
    </div>
  );
}

function formatJoinCode(raw) {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function formatDisplay(code) {
  const cleaned = formatJoinCode(code);
  if (cleaned.length < 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}

export default function StaffJoinScreen({ onJoined, onBack }) {
  const { t } = useLang();

  const [step, setStep] = useState(STEP_CODE);
  const [joinCode, setJoinCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  async function verifyCode() {
    const cleanCode = formatJoinCode(joinCode);
    if (cleanCode.length < 4) {
      setError(t.staffJoinCodeTooShort || 'Enter a valid shop code (at least 4 characters)');
      return false;
    }
    setVerifyingCode(true);
    setError(null);
    try {
      const res = await identityApi.verifyJoinCode(cleanCode);
      setShopName(res.shop_name);
      return true;
    } catch (err) {
      if (err.status === 404) {
        setError(t.staffJoinCodeInvalid || 'Shop code not found or expired.');
      } else if (err.status === 410) {
        setError(t.staffJoinCodeExpired || 'This code has expired. Ask the owner for a new one.');
      } else {
        setError(err.data?.error || err.message || t.staffJoinNetworkError || 'Could not verify code. Check connection.');
      }
      return false;
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleCodeSubmit() {
    const valid = await verifyCode();
    if (valid) {
      setStep(STEP_NAME);
    }
  }

  function handleCodeChange(e) {
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (raw.length <= 8) {
      setJoinCode(raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw);
    }
    setError(null);
  }

  async function handleNameSubmit() {
    const name = displayName.trim();
    if (!name || name.length < 2) {
      setError(t.staffNameTooShort || 'Display name must be at least 2 characters');
      return;
    }
    setStep(STEP_PHONE);
  }

  async function handlePhoneSubmit() {
    const normalizedPhone = normalizeEthiopianPhone(phone);
    if (!normalizedPhone) {
      setError(t.staffPhoneRequired || 'Enter a valid Ethiopian phone number (starts with 09 or 07, 9 digits)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const cleanCode = formatJoinCode(joinCode);
      const name = displayName.trim();
      const result = await identityApi.joinShop({
        join_code: cleanCode,
        display_name: name,
        phone: normalizedPhone,
        device_label: 'Staff phone',
        role: 'cashier',
        auto_approve: true,
      });

      await persistIdentity(result);

      if (result.auth_token) {
        await setAuthToken(result.auth_token);
      }
      if (onJoined) onJoined(result);
    } catch (err) {
      if (err.status === 409) {
        setLoading(false);
        setStep(STEP_ALREADY_MEMBER);
        setError(null);
        return;
      } else if (err.status === 400 && /phone/i.test(err.data?.error || err.message || '')) {
        setError(t.staffPhoneRequired || 'A valid Ethiopian phone number is required');
      } else {
        setError(err.data?.error || err.message || t.staffJoinNetworkError || 'Could not reach the server.');
      }
      setStep(STEP_PHONE);
    } finally {
      setLoading(false);
    }
  }

  async function persistIdentity(result) {
    await setIdentity({
      shop_id: result.shop_id,
      shop_name: result.shop_name || shopName,
      device_id: result.device_id,
      device_token: result.device_token,
      staff_id: result.staff_id,
      display_name: result.display_name,
      phone_number: result.phone_number || phone,
      role: result.role,
      permissions: result.permissions || {},
      device_status: result.device_status,
      phone_required: result.phone_required ?? false,
      approval_required: result.approval_required ?? false,
    });
  }

  async function handleRequestOtpRecovery() {
    const normalizedPhone = normalizeEthiopianPhone(phone);
    if (!normalizedPhone) return;
    setOtpLoading(true);
    setError(null);
    try {
      await requestOtp(normalizedPhone);
      setOtp('');
      setStep(STEP_OTP);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtpRecovery() {
    const normalizedPhone = normalizeEthiopianPhone(phone);
    if (!normalizedPhone) return;
    setOtpLoading(true);
    setError(null);
    try {
      const { token, user, role, permissions, businesses } = await verifyOtp(normalizedPhone, otp);
      await setAuthToken(token);
      const deviceId = await getOrCreateCloudProofDeviceId();
      try { await linkDevice(token, deviceId); } catch { /* non-critical */ }

      const business = businesses?.[0];
      if (business) {
        await setIdentity({
          shop_id: business.business_id,
          shop_name: business.name,
          device_id: deviceId,
          device_token: token,
          staff_id: user?.id,
          display_name: user?.display_name || displayName.trim(),
          phone_number: user?.phone_number || normalizedPhone,
          role: role || 'staff',
          permissions: permissions || {},
          device_status: 'active',
          phone_required: false,
          approval_required: false,
        });
      }

      setOtpLoading(false);
      if (onJoined) onJoined({
        auth_token: token,
        shop_id: business?.business_id,
        shop_name: business?.name,
        staff_id: user?.id,
        display_name: user?.display_name || displayName.trim(),
        role: role || 'staff',
        permissions: permissions || {},
      });
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  }
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Header */}
      <div
        className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={() => { if (step === STEP_CODE) onBack(); else setStep(STEP_CODE); }}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white press-scale"
              aria-label="Back"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-white font-serif">
              {t.staffJoinTitle || 'Join a Shop'}
            </h1>
            <p className="text-sm font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {t.staffJoinSubtitle || 'Enter the shop code you received from the owner'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-6">

        {/* STEP 0: Enter shop code */}
        {step === 0 && (
          <div className="space-y-5 animate-slide-up">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t.staffJoinCodeLabel || 'Shop Code'}
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={handleCodeChange}
                placeholder={t.staffJoinCodePlaceholder || 'e.g. AB12-CD34'}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-lg font-mono font-black tracking-wider text-center focus:border-green-500 focus:outline-none transition-colors"
                maxLength={9}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2 text-center font-medium">
                {t.staffJoinCodeHint || 'Ask your owner for the 8-character shop code'}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleCodeSubmit}
              disabled={verifyingCode || joinCode.replace(/[^A-Za-z0-9]/g, '').length < 4}
              className="w-full py-4 rounded-xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed press-scale"
              style={{ background: 'var(--color-primary)' }}
            >
              {verifyingCode ? (t.staffJoinChecking || 'Checking…') : (t.staffJoinContinue || 'Continue')}
            </button>
          </div>
        )}

        {/* STEP 1: Enter name */}
        {step === 1 && (
          <div className="space-y-5 animate-slide-up">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-green-200 text-green-800 font-black text-sm flex-shrink-0">
                {shopName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-green-700">{t.staffJoiningShop || 'Joining shop'}</p>
                <p className="text-base font-black text-green-900">{shopName}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t.staffJoinDisplayNameLabel || 'Your Display Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(null); }}
                placeholder={t.staffJoinDisplayNamePlaceholder || 'e.g. Almaz'}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-base font-semibold focus:border-green-500 focus:outline-none transition-colors"
                maxLength={40}
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleNameSubmit}
              disabled={displayName.trim().length < 2}
              className="w-full py-4 rounded-xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed press-scale"
              style={{ background: 'var(--color-primary)' }}
            >
              {t.staffJoinNext || 'Next'}
            </button>

            <button
              onClick={() => { setStep(0); setError(null); }}
              className="w-full py-3 text-sm font-semibold text-gray-500"
            >
              {t.staffJoinChangeCode || 'Change shop code'}
            </button>
          </div>
        )}

        {/* STEP 2: Enter phone */}
        {step === 2 && (
          <div className="space-y-5 animate-slide-up">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-green-200 text-green-800 font-black text-sm flex-shrink-0">
                {shopName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-green-700">{t.staffJoiningShop || 'Joining shop'}</p>
                <p className="text-base font-black text-green-900">{shopName}</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">
              {t.staffJoinAsSales || 'Joining as Sales Staff'}
            </p>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t.staffJoinPhoneLabel || 'Phone Number'} <span className="text-red-500">*</span>
              </label>
              <div style={{ display: 'flex', gap: 0 }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 12px',
                    background: 'var(--color-surface-muted)',
                    border: `2px solid ${(phoneTouched && phone && !isValidEthiopianPhone(phone)) ? 'var(--color-danger)' : 'var(--color-text-soft)'}`,
                    borderRight: 'none',
                    borderTopLeftRadius: 'var(--radius-md)',
                    borderBottomLeftRadius: 'var(--radius-md)',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                    minWidth: 64,
                    minHeight: 48,
                  }}
                >
                  +251
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => { setPhone(extractSubscriberDigits(e.target.value)); setError(null); }}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="9XXXXXXXX"
                  maxLength={9}
                  className="flex-1 px-4 py-3.5 border-2 text-base font-semibold focus:outline-none transition-colors"
                  style={{
                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                    borderColor: (phoneTouched && phone && !isValidEthiopianPhone(phone))
                      ? 'var(--color-danger)'
                      : 'var(--color-text-soft)',
                    minHeight: 48,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.04em',
                  }}
                />
              </div>
              {phoneTouched && phone && isValidEthiopianPhone(phone) && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--color-primary)' }}>
                  {formatEthiopianPhone('+251' + phone)}
                </p>
              )}
              {phoneTouched && phone && !isValidEthiopianPhone(phone) && (
                <p className="text-xs text-red-500 mt-1.5 font-medium">
                  {t.staffJoinPhoneInvalid || 'Enter a valid Ethiopian number (starts with 9 or 7, 9 digits)'}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1.5 font-medium">
                {t.staffJoinPhoneNote || 'Used for contact only, never for payment'}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed press-scale"
              style={{ background: 'var(--color-primary)' }}
            >
              {loading ? (t.staffJoinJoining || 'Joining…') : (t.staffJoinJoinBtn || 'Join Shop')}
            </button>

            <button
              onClick={() => { setStep(1); setError(null); }}
              className="w-full py-3 text-sm font-semibold text-gray-500"
            >
              {t.staffJoinGoBack || 'Go back'}
            </button>

            <BankTrustCopy />
          </div>
        )}

        {/* STEP 4: Already a member — sign in option */}
        {step === 4 && (
          <div className="space-y-5 animate-slide-up">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-200 text-amber-800 font-black text-sm flex-shrink-0">
                !
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700">Already on the team</p>
                <p className="text-sm font-medium text-amber-900">
                  {phone ? formatEthiopianPhone('+251' + phone) : ''} is already a member of {shopName}.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              You're already part of this shop. Sign in with OTP to restore your access.
            </p>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleRequestOtpRecovery}
              disabled={otpLoading}
              className="w-full py-4 rounded-xl font-bold text-base text-white disabled:opacity-40 press-scale"
              style={{ background: 'var(--color-primary)' }}
            >
              {otpLoading ? 'Sending…' : 'Sign in with OTP'}
            </button>

            <button
              onClick={() => { setStep(STEP_PHONE); setError(null); }}
              className="w-full py-3 text-sm font-semibold text-gray-500"
            >
              Back
            </button>

            <BankTrustCopy />
          </div>
        )}

        {/* STEP 5: Enter OTP */}
        {step === 5 && (
          <div className="space-y-5 animate-slide-up">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-green-200 text-green-800 font-black text-sm flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs font-semibold text-green-700">Check Telegram</p>
                <p className="text-sm font-medium text-green-900">
                  Enter the 6-digit code sent to {phone && formatEthiopianPhone('+251' + phone)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                placeholder="6-digit code"
                maxLength={6}
                className="w-full px-4 py-3.5 border-2 border-gray-200 text-xl font-mono font-black tracking-widest text-center focus:border-green-500 focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleVerifyOtpRecovery}
              disabled={otpLoading || otp.length !== 6}
              className="w-full py-4 rounded-xl font-bold text-base text-white disabled:opacity-40 press-scale"
              style={{ background: 'var(--color-primary)' }}
            >
              {otpLoading ? 'Verifying…' : 'Verify & Sign In'}
            </button>

            <button
              onClick={handleRequestOtpRecovery}
              disabled={otpLoading}
              className="w-full py-3 text-sm font-semibold text-gray-500"
            >
              Resend code
            </button>

            <BankTrustCopy />
          </div>
        )}
      </div>
    </div>
  );
}