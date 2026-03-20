import { useState } from 'react';
import { Save } from 'lucide-react';
import { useLang } from '../context/LangContext';
import PaymentTypeChips from './PaymentTypeChips';
import { fmtInput, parseInput } from '../utils/numformat';

function handleNumericInput(e, setter) {
  let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
  setter(raw);
}

function VoiceFixScreen({ transcript, detectedTotal, onSave, onCancel, enabledProviders }) {
  const { t } = useLang();
  const [amount, setAmount] = useState(detectedTotal != null ? String(detectedTotal) : '');
  const [note, setNote] = useState(transcript || '');
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentProvider, setPaymentProvider] = useState('');

  const parsedAmount = parseFloat(parseInput(amount)) || 0;
  const canSave = parsedAmount > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      amount: parsedAmount,
      note: note.trim(),
      paymentType,
      paymentProvider: paymentType !== 'cash' ? paymentProvider : '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div
        className="sticky top-0 z-10 px-6 pt-5 pb-4 border-b flex-shrink-0"
        style={{ background: '#fff', borderColor: 'var(--color-border-light)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900 font-sans">{t.voiceFixTitle}</h2>
          <button
            onClick={onCancel}
            className="py-2 px-4 text-sm font-semibold text-gray-500 min-h-[44px] font-sans"
            style={{ background: '#f5f5f5', borderRadius: 'var(--radius-sm)' }}
          >
            {t.cancel}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <label className="block text-gray-700 font-semibold mb-2 font-sans">{t.voiceTotalLabel}</label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={fmtInput(amount)}
              onChange={e => handleNumericInput(e, setAmount)}
              placeholder="0"
              autoFocus
              className="w-full p-4 pr-16 border-2 focus:outline-none text-base min-h-[52px] font-sans"
              style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium font-sans">{t.birr}</span>
          </div>
        </div>

        <PaymentTypeChips
          paymentType={paymentType}
          provider={paymentProvider}
          onTypeChange={setPaymentType}
          onProviderChange={setPaymentProvider}
          enabledProviders={enabledProviders}
          lastProviderByType={{}}
        />

        <div>
          <label className="block text-gray-700 font-semibold mb-2 font-sans">{t.voiceNoteLabel}</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t.voiceNotePlaceholder}
            className="w-full p-4 border-2 focus:outline-none text-base min-h-[52px] font-sans"
            style={{ borderRadius: 'var(--radius-md)', borderColor: '#e8e2d8' }}
          />
        </div>
      </div>

      <div className="px-6 pb-8 pt-2 flex-shrink-0">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full p-4 font-black text-white text-base flex items-center justify-center gap-2 transition-all min-h-[56px] font-sans"
          style={{
            background: canSave ? '#2d6a4f' : '#e5e7eb',
            color: canSave ? '#fff' : '#9ca3af',
            cursor: canSave ? 'pointer' : 'not-allowed',
            borderRadius: 'var(--radius-md)',
            boxShadow: canSave ? '0 4px 0 #1B4332' : 'none',
          }}
        >
          <Save className="w-5 h-5" />
          {t.voiceSave}
        </button>
      </div>
    </div>
  );
}

export default VoiceFixScreen;
