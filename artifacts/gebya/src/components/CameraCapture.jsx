// CameraCapture.jsx — Gallery-first photo picker.
//
// Uses the standard <input type="file"> approach WITHOUT the capture attribute
// so that the device opens the gallery/image chooser by default instead of the
// back camera. The user can still take a live photo from within the gallery app.
//
// Usage:
//   <CameraCapture
//     open={showCamera}
//     onCapture={(dataUrl) => { setPhoto(dataUrl); setShowCamera(false); }}
//     onClose={() => setShowCamera(false)}
//     lang={lang}
//   />

import { useState } from 'react';
import { X, Image } from 'lucide-react';
import { compressPhoto } from '../utils/photoCapture';

function CameraCapture({ open, onCapture, onClose, lang = 'en' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      for (const file of files) {
        const dataUrl = await compressPhoto(file);
        onCapture?.(dataUrl);
      }
      setError(null);
    } catch {
      setError(lang === 'am' ? 'ፎቶ መምጣት አልተቻለም' : 'Could not capture photo');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', color: '#fff' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
          {lang === 'am' ? 'ፎቶ ይምረጡ' : 'Choose a photo'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === 'am' ? 'ዝጋ' : 'Close'}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <p style={{ color: '#fff', fontSize: '0.95rem', opacity: 0.7, textAlign: 'center', maxWidth: 260 }}>
          {lang === 'am' ? 'ከተንቀሳቃሽ ስልክዎ ፎቶ ይምረጡ' : 'Pick a photo from your device gallery'}
        </p>

        {/* Choose photo — opens gallery by default (no capture attribute) */}
        <label
          className="press-scale"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff', color: '#1a1a1a',
            padding: '18px 28px', borderRadius: 14,
            fontSize: '1rem', fontWeight: 800, cursor: 'pointer',
          }}
        >
          <Image className="w-6 h-6" />
          {lang === 'am' ? 'ፎቶ ይምረጡ' : 'Choose photo'}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFile}
            className="hidden"
          />
        </label>

        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{error}</p>}
        {busy && <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{lang === 'am' ? 'በማረም...' : 'Processing…'}</p>}
      </div>
    </div>
  );
}

export default CameraCapture;