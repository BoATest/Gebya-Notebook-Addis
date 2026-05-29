// CustomerForm.jsx — Cockpit Synthesis v0.3 · adds photo capture
//
// Photo: optional, big circle at top (camera + gallery buttons), reuses
// photoCapture.js (~80KB JPEG). Initials fallback when no photo.
// The photo gets stored on the customers row as a base64 data URL.
//
// Other fields preserved: name (required), note/phone/Telegram (collapsed).

import { useState } from 'react';
import { Camera, CheckCircle2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { useLang } from '../context/LangContext';
import { normalizeTelegram } from '../utils/customerTelegram';
import { compressPhoto, photoSizeBytes } from '../utils/photoCapture';

function initialsOf(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function CustomerForm({ onSave, onDone, existing }) {
  const { t, lang } = useLang();
  const isEditing = !!existing;
  const [displayName, setDisplayName] = useState(existing?.display_name || '');
  const [note, setNote] = useState(existing?.note || '');
  const [phoneNumber, setPhoneNumber] = useState(existing?.phone_number || '');
  const [telegramUsername, setTelegramUsername] = useState(existing?.telegram_username || '');
  const [photo, setPhoto] = useState(existing?.photo || null);
  const [photoError, setPhotoError] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showMore, setShowMore] = useState(!!(existing?.note || existing?.phone_number || existing?.telegram_username));
  const [saving, setSaving] = useState(false);

  const normalizedTelegram = normalizeTelegram(telegramUsername);
  const telegramValid = !telegramUsername.trim() || !!normalizedTelegram;
  const canSave = displayName.trim().length > 0 && telegramValid;

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const dataUrl = await compressPhoto(file);
      setPhoto(dataUrl);
    } catch (err) {
      setPhotoError(err.message || 'Photo capture failed');
    } finally {
      setPhotoLoading(false);
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const didSave = await onSave?.({
        ...(isEditing ? { id: existing.id } : {}),
        display_name: displayName.trim(),
        note: note.trim() || null,
        phone_number: phoneNumber.trim() || null,
        telegram_username: normalizedTelegram || null,
        telegram_notify_enabled: existing?.telegram_notify_enabled ?? false,
        photo: photo || null,
      });
      if (didSave) onDone?.(didSave === true ? null : didSave);
    } finally {
      setSaving(false);
    }
  };

  const initials = initialsOf(displayName || existing?.display_name);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade">
      <div className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto animate-slide-up" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}>

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', borderColor: 'var(--color-border-light)' }}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {isEditing
                  ? (lang === 'am' ? 'ደንበኛ አስተካክል' : 'Edit customer')
                  : t.addCustomer}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{t.customerHelperText}</p>
            </div>
            <button onClick={onDone} aria-label={t.close} className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center press-scale">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Photo section · sits above the form fields, big and inviting */}
        <div
          className="px-6 py-5 border-b flex flex-col items-center gap-3"
          style={{ borderColor: 'var(--color-border-light)' }}
        >
          <div
            style={{
              width: 100, height: 100, borderRadius: '50%',
              position: 'relative',
              overflow: 'hidden',
              border: photo ? '3px solid #047857' : '3px dashed #c9bfa8',
              background: photo ? '#fff' : '#f5f1ea',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {photo ? (
              <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#b8842c',
                fontSize: displayName.trim() ? '2rem' : '2.5rem',
                fontWeight: 800,
              }}>
                {displayName.trim() ? initials : '👤'}
              </div>
            )}
            {/* Floating "edit" badge when photo is set */}
            {photo && (
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 32, height: 32, borderRadius: '50%',
                background: '#047857', color: '#fff',
                border: '3px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem',
              }}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
          </div>

          {photo ? (
            <div className="text-center">
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857' }}>
                {lang === 'am' ? '✓ ፎቶ ተጨምሯል' : '✓ Photo added'}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>
                {Math.round(photoSizeBytes(photo) / 1024)} KB · {lang === 'am' ? 'በዚህ ስልክ ብቻ' : 'on this phone only'}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <label className="cursor-pointer press-scale" style={{
                  padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700,
                  background: '#fff', border: '1px solid #ece6d6',
                  borderRadius: 8, color: '#1a1a1a',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Camera className="w-3.5 h-3.5" />
                  {lang === 'am' ? 'ቀይር' : 'Replace'}
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" disabled={photoLoading} />
                </label>
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="press-scale"
                  style={{
                    padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 8, color: '#dc2626',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  {lang === 'am' ? 'አስወግድ' : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-center" style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: 240 }}>
                {lang === 'am'
                  ? <><strong style={{ color: '#1a1a1a' }}>ፎቶ ይያዙ</strong> (አማራጭ) — በቆጣሪው ላይ ለማወቅ ይረዳዎታል</>
                  : <><strong style={{ color: '#1a1a1a' }}>Take a photo</strong> (optional) — recognize them faster at the counter</>}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="cursor-pointer press-scale" style={{
                  padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700,
                  background: '#1a1a1a', color: '#fff',
                  borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  minHeight: 36,
                }}>
                  <Camera className="w-4 h-4" />
                  {lang === 'am' ? 'ካሜራ' : 'Camera'}
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" disabled={photoLoading} />
                </label>
                <label className="cursor-pointer press-scale" style={{
                  padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700,
                  background: '#fff', color: '#1a1a1a',
                  border: '1px solid #ece6d6',
                  borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  minHeight: 36,
                }}>
                  🖼 {lang === 'am' ? 'ጋለሪ' : 'Gallery'}
                  <input type="file" accept="image/*" onChange={handlePhotoCapture} className="hidden" disabled={photoLoading} />
                </label>
              </div>
            </>
          )}

          {photoLoading && (
            <p style={{ fontSize: '0.7rem', color: '#b8842c' }}>
              {lang === 'am' ? 'ፎቶ እያዘጋጀ…' : 'Compressing…'}
            </p>
          )}
          {photoError && (
            <p style={{ fontSize: '0.7rem', color: '#dc2626' }}>
              {photoError}
            </p>
          )}
        </div>

        {/* Form fields */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {t.customerIdentifier} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t.customerIdentifierPlaceholder}
              autoFocus={!isEditing}
              className="w-full p-4 border-2 focus:outline-none text-base min-h-[52px]"
              style={{ borderRadius: 'var(--radius-md)', borderColor: displayName.trim() ? '#1B4332' : '#e8e2d8' }}
            />
          </div>

          <div>
            <button type="button" onClick={() => setShowMore((v) => !v)} className="flex items-center gap-1 text-sm font-semibold py-1 min-h-[44px]" style={{ color: '#C4883A' }}>
              {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {t.moreOptional}
            </button>

            {showMore && (
              <div className="mt-2 p-4 border animate-slide-up space-y-3" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">{t.noteLabel}</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.customerNotePlaceholder} rows={3} className="w-full p-3 border-2 focus:outline-none text-sm resize-none" style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }} />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">{t.customerPhoneOptional}</label>
                  <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder={t.customerPhonePlaceholder} className="w-full p-3 border-2 focus:outline-none text-sm" style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }} />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 text-sm">{t.customerTelegramOptional}</label>
                  <input type="text" value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} placeholder={t.customerTelegramPlaceholder} className="w-full p-3 border-2 focus:outline-none text-sm" style={{ borderRadius: 'var(--radius-md)', borderColor: telegramValid ? '#e8e2d8' : '#dc2626' }} />
                  {!telegramValid && (
                    <p className="text-xs font-medium mt-2 text-red-600">
                      {t.telegramFormatHint}
                    </p>
                  )}
                  <p className="text-xs mt-2" style={{ color: '#6b7280' }}>
                    Link the borrower from the customer page to enable bot updates later.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-8 pt-2">
          <button onClick={handleSave} disabled={!canSave || saving} className="w-full p-4 font-black text-white text-base flex items-center justify-center gap-2 min-h-[56px] press-scale" style={{ background: canSave ? '#1B4332' : '#e5e7eb', color: canSave ? '#fff' : '#9ca3af', borderRadius: 'var(--radius-md)', boxShadow: canSave ? '0 4px 0 #0f2b20, var(--shadow-sm)' : 'none' }}>
            <Save className="w-5 h-5" />
            {saving ? t.saving : (isEditing ? (lang === 'am' ? 'አስተካክል' : 'Update') : t.saveCustomer)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerForm;
