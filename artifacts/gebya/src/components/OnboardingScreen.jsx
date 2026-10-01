import { useRef, useState } from 'react';
import { useLang } from '../context/LangContext';
import { LABELS } from '../labels';
import { fireToast } from './Toast';
import db, { setIdentity } from '../db';
import { identityApi } from '../api/identity';
import { setAuthToken } from '../utils/syncEngine';
import { usePermissionsStore } from '../stores/permissionsStore';
import { resolvePermissions } from '../utils/permissions';

/**
 * Gate C: stamp the owner role + permissions into the permissions store the
 * moment onboarding succeeds — before onComplete() hands control to the shell.
 *
 * Why this exists: the store starts at { permissions: null, role: null } and
 * hasPermission() then falls through to STAFF_MINIMAL_SAFE (can_add_records
 * only). A brand-new owner therefore saw Reports OFF, was labelled STAFF in
 * Settings, and was denied the owner/admin section — until an unrelated auth
 * refresh happened to land. That window is a first-session trust failure and
 * it confounded the setup-completion metric.
 *
 * resolvePermissions() mirrors authStore (role defaults merged with the
 * server payload) so the two paths cannot drift. Owned here rather than in
 * handleOnboardingComplete() so the stamp cannot be skipped by a future
 * caller that bypasses the hook.
 */
function stampOwnerPermissions(serverPermissions) {
  usePermissionsStore
    .getState()
    .setPermissions(resolvePermissions('owner', serverPermissions), 'owner');
}

function isValidPhone(digits) {
  return /^[79]\d{8}$/.test(digits);
}

function OnboardingScreen({ onComplete }) {
  const { t, lang, toggleLang } = useLang();
  const L = LABELS.onboarding;
  const phoneOptionalLabel = t.onboardPhoneOptional || '(optional)';
  const phoneHelper = t.onboardPhoneHelper || 'You can add your phone later in Settings.';
  const onboardingPromises = [
    t.onboardPromiseSimple || 'Simple notebook for sales, spending, and Dubie',
    t.onboardPromiseFast || 'Start with your name only',
    t.onboardPromisePrivate || 'Your records stay on this phone',
  ];
   const onboardKicker = L.kicker[lang];

   const handleNewShop = () => setMode('form');
  const handleJoinShop = () => onComplete({ __staff_join: true });

  // Single render — the module owns the strings, so one DOM serves both
  // languages (byte-identical output to the two functions it replaced).
  function renderOptions() {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleNewShop}
          className="w-full flex items-center gap-4 p-4 rounded-xl press-scale text-left"
          style={{ background: 'rgba(27,67,50,0.06)', border: '2px solid rgba(27,67,50,0.12)' }}
        >
          <span className="text-3xl">🏪</span>
          <div>
            <div className="font-black text-gray-900">{L.ownerTitle[lang]}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{L.ownerSub[lang]}</div>
          </div>
        </button>
        <button
          type="button"
          onClick={handleJoinShop}
          className="w-full flex items-center gap-4 p-4 rounded-xl press-scale text-left"
          style={{ background: 'rgba(196,136,58,0.08)', border: '2px solid rgba(196,136,58,0.2)' }}
        >
          <span className="text-3xl">👥</span>
          <div>
            <div className="font-black text-gray-900">{L.joinTitle[lang]}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{L.joinSub[lang]}</div>
          </div>
        </button>
      </div>
    );
  }

  const [mode, setMode] = useState('choice');
   const [name, setName] = useState('');
   const [phoneDigits, setPhoneDigits] = useState('');
   const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });
  // Set when the server rejects the number with 409 (already registered).
  // No shop exists in that case, so the form must stay open: nothing may be
  // stamped, saved, or completed behind the user's back.
  const [phoneConflict, setPhoneConflict] = useState(false);
  const phoneRef = useRef(null);

  const nameValid = name.trim().length > 0;
  const phoneEntered = phoneDigits.length > 0;
  const phoneValid = !phoneEntered || isValidPhone(phoneDigits);
  const canProceed = nameValid && phoneValid;

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 9) setPhoneDigits(raw);
    if (phoneConflict) setPhoneConflict(false);
  };

  // Submits the form. fullPhone is the number to register ('' = none); the
  // phone-conflict path reuses this with '' so the server mints a phoneless
  // account and still issues a working token.
  const submit = async (fullPhone) => {
    if (saving) return;
    setSaving(true);
    try {
       const result = await identityApi.createShop({
         display_name: name.trim(),
         phone: fullPhone || undefined,
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
      // Gate C: stamp owner role + permissions BEFORE onComplete() hands
      // control to the shell, so the first render already sees role === owner.
      // Without this the store stayed at {null, null} and hasPermission() fell
      // through to STAFF_MINIMAL_SAFE — Reports OFF, STAFF badge, no admin
      // section — until an unrelated auth refresh landed.
      stampOwnerPermissions(identity.permissions);
       await db.settings.put({ key: 'intro_seen', value: 'yes' });
       await db.settings.put({ key: 'shop_name', value: identity.shop_name });
       await db.settings.put({ key: 'shop_phone', value: fullPhone });
       // Save JWT from backend so sync engine can authenticate
      if (result.auth_token) {
        await setAuthToken(result.auth_token);
      }
       onComplete({
         id: result.shop_id,
         shop_id: result.shop_id,
         name: identity.shop_name,
         phone: fullPhone,
         role: 'owner',
         join_code: result.join_code,
         join_url: result.join_url,
         staff_id: result.staff_id,
         device_id: result.device_id,
         display_name: result.display_name || name.trim(),
         device_status: result.device_status || 'active',
       });
    } catch (err) {
      // 409 comes from the POST /shops account-takeover guard and only from
      // that guard (code PHONE_ALREADY_REGISTERED): the number belongs to an
      // existing account and NO shop was created. Falling through to the
      // offline path here would hand this person a local-only notebook they
      // could never connect to the account they already own, under an
      // 'offline' toast that blames the network. Refuse loudly instead.
      if (err && err.status === 409) {
        setPhoneConflict(true);
        return;
      }
      // Gate C (offline path): createShop failed, but a shop now exists on this
      // phone and the person who created it is its owner. Stamp the owner role
      // with role defaults (no server payload) so the very first session opens
      // owner surfaces instead of silently degrading to STAFF_MINIMAL_SAFE.
      stampOwnerPermissions();
       await db.settings.put({ key: 'intro_seen', value: 'yes' });
       await db.settings.put({ key: 'shop_name', value: name.trim() });
       await db.settings.put({ key: 'shop_phone', value: fullPhone });
       fireToast(L.offlineToast[lang], 5000);
       onComplete({ name: name.trim(), phone: fullPhone });
    } finally {
      setSaving(false);
    }
  };

  const handleStart = () => {
    if (!canProceed) return;
    submit(phoneEntered ? `+251${phoneDigits}` : '');
  };

  // Retry with the number dropped: the guard only fires on a registered phone,
  // so the server creates a phoneless owner and returns a real token. That is a
  // working cloud notebook, not the local-only dead end the offline path gives.
  const handleContinueWithoutPhone = () => {
    setPhoneConflict(false);
    submit('');
  };

  const handleClearPhoneConflict = () => {
    setPhoneConflict(false);
    setPhoneDigits('');
    if (phoneRef.current) phoneRef.current.focus();
  };

  if (mode === 'choice') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-start px-4 py-5 texture-noise overflow-y-auto"
        style={{ background: 'var(--color-primary)' }}
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
                color: 'var(--color-bg-white)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              aria-label={L.langToggleLabel[lang]}
            >
              🌐 {L.langToggleText[lang]}
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
            <p className="text-xs font-black uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--color-accent-amber)' }}>
              {onboardKicker}
            </p>
            <h2 className="text-2xl font-black text-gray-900 mb-2 font-sans">
              {L.chooseType[lang]}
            </h2>

            {renderOptions()}
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
      className="min-h-screen flex flex-col items-center justify-start px-4 py-5 texture-noise overflow-y-auto"
      style={{ background: 'var(--color-primary)' }}
    >
      <div className="w-full max-w-sm">
        {/* Back */}
        <div className="flex justify-start mb-2">
          <button
            type="button"
            onClick={() => setMode('choice')}
            className="press-scale"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 999,
              padding: '6px 12px',
              color: 'var(--color-bg-white)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← {L.back[lang]}
          </button>
        </div>

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
        </div>

        <div
          className="bg-white p-6 animate-slide-up"
          style={{ borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}
        >
          <h2 className="text-xl font-black text-gray-900 mb-4 font-sans">
            {L.formTitle[lang]}
          </h2>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-xs font-black uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {L.nameLabel[lang]} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              placeholder={L.namePlaceholder[lang]}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium"
              style={{
                background: 'var(--color-bg-active)',
                border: `2px solid ${touched.name && !nameValid ? 'var(--color-danger)' : 'var(--color-bg-disabled)'}`,
                outline: 'none',
              }}
              autoFocus
            />
            {touched.name && !nameValid && (
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-danger)' }}>
                {L.nameError[lang]}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="block text-xs font-black uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              {L.phoneLabel[lang]} <span style={{ color: 'var(--color-text-soft)', fontWeight: 500 }}>{phoneOptionalLabel}</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold px-3 py-3 rounded-xl" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>+251</span>
              <input
                type="tel"
                ref={phoneRef}
                value={phoneDigits}
                onChange={handlePhoneChange}
                onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                placeholder="912345678"
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: 'var(--color-bg-active)',
                  border: `2px solid ${touched.phone && phoneEntered && !phoneValid ? 'var(--color-danger)' : 'var(--color-bg-disabled)'}`,
                  outline: 'none',
                }}
                inputMode="numeric"
              />
            </div>
            {touched.phone && phoneEntered && !phoneValid && (
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-danger)' }}>
                {L.phoneError[lang]}
              </p>
            )}
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-soft)' }}>{phoneHelper}</p>

            {/* The number is already registered: nothing was created, so the
                person chooses what happens next instead of drifting into a
                notebook that can never sync. */}
            {phoneConflict && (
              <div
                className="mb-4 p-3 rounded-xl"
                style={{ background: 'rgba(196,136,58,0.10)', border: '2px solid rgba(196,136,58,0.35)' }}
              >
                <p className="text-xs font-black text-gray-900 mb-1">{L.phoneConflictTitle[lang]}</p>
                <p className="text-xs font-medium leading-5" style={{ color: 'var(--color-text-muted)' }}>
                  {L.phoneConflictMsg[lang]}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleContinueWithoutPhone}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black press-scale"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-bg-white)' }}
                  >
                    {L.phoneConflictContinue[lang]}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearPhoneConflict}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black press-scale"
                    style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)', border: '2px solid var(--color-bg-disabled)' }}
                  >
                    {L.phoneConflictChange[lang]}
                  </button>
                </div>
              </div>
            )}
          </div>

           {/* Promises */}
          <div className="mb-4 space-y-2">
            {onboardingPromises.map((promise, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                <span style={{ color: 'var(--color-success)' }}>✓</span>
                {promise}
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleStart}
            disabled={!canProceed || saving}
            className="w-full py-3.5 rounded-xl font-black text-sm min-h-[48px] press-scale"
            style={{
              background: canProceed && !saving ? 'var(--color-primary)' : 'var(--color-text-soft)',
              color: canProceed && !saving ? 'var(--color-bg-white)' : 'var(--color-text-soft)',
              cursor: canProceed && !saving ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? L.saving[lang] : L.startCta[lang]}
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

