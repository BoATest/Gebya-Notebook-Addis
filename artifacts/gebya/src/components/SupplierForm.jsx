// SupplierForm.jsx — add a new supplier (Khatabook-style "people I owe")
// Mirror of CustomerForm but stripped down: no Telegram (suppliers rarely need
// bot linking). Just name + phone + note.
import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useLang } from '../context/LangContext';

function SupplierForm({ onSave, onDone }) {
  const { t, lang } = useLang();
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = displayName.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = await onSave?.({
        display_name: displayName.trim(),
        phone_number: phoneNumber.trim() || null,
        note: note.trim() || null,
      });
      if (saved && saved.id != null) onDone?.(saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 animate-fade">
      <div
        className="bg-white w-full max-w-md max-h-[92vh] overflow-y-auto animate-slide-up"
        style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', boxShadow: 'var(--shadow-lg)' }}
      >
        <div
          className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b"
          style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', borderColor: 'var(--color-border-light)' }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {lang === 'am' ? 'አቅራቢ አክል' : 'Add supplier'}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
                {lang === 'am' ? 'የምትገዙበት ሰው' : 'Someone you buy from on credit'}
              </p>
            </div>
            <button
              onClick={onDone}
              aria-label={t.close}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center press-scale"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              {lang === 'am' ? 'የአቅራቢ ስም' : 'Supplier name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={lang === 'am' ? 'ለምሳሌ ቡና ቤት ኪሮስ' : 'e.g. Kiros Coffee Wholesale'}
              autoFocus
              className="w-full p-4 border-2 focus:outline-none text-base min-h-[52px]"
              style={{ borderRadius: 'var(--radius-md)', borderColor: displayName.trim() ? '#1B4332' : '#e8e2d8' }}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">
              {lang === 'am' ? 'ስልክ (አማራጭ)' : 'Phone (optional)'}
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={lang === 'am' ? '0911...' : '0911...'}
              className="w-full p-3 border-2 focus:outline-none text-sm"
              style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-sm">
              {lang === 'am' ? 'ማስታወሻ (አማራጭ)' : 'Note (optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={lang === 'am' ? 'ለምሳሌ ጥቅል ቡና አከፋፋይ' : 'e.g. wholesale coffee distributor'}
              rows={2}
              className="w-full p-3 border-2 focus:outline-none text-sm resize-none"
              style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
            />
          </div>
        </div>

        <div className="px-6 pb-8 pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full p-4 font-black text-white text-base flex items-center justify-center gap-2 min-h-[56px] press-scale"
            style={{
              background: canSave ? '#1B4332' : '#e5e7eb',
              color: canSave ? '#fff' : '#9ca3af',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Save className="w-5 h-5" />
            {saving
              ? (lang === 'am' ? 'እያስቀመጥኩ…' : 'Saving…')
              : (lang === 'am' ? 'አስቀምጥ' : 'Save supplier')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SupplierForm;
