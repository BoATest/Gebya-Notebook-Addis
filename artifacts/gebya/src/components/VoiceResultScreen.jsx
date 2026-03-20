import { useLang } from '../context/LangContext';
import { fmt } from '../utils/numformat';

function VoiceResultScreen({ transcript, detectedTotal, onSave, onFix, onReRecord, onTypeInstead }) {
  const { t } = useLang();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="px-6 pt-8 pb-4 flex-shrink-0" style={{ background: '#1B4332' }}>
        <h2 className="text-white text-xl font-black font-sans">{t.voiceResultTitle}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        <div className="p-4 rounded-xl" style={{ background: '#FAF8F5', border: '1px solid #e8e2d8' }}>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 font-sans">{t.voiceTranscript}</p>
          <p className="text-gray-800 text-base leading-relaxed font-sans">"{transcript}"</p>
        </div>

        <div className="p-5 rounded-xl text-center" style={{ background: detectedTotal ? '#f0fdf4' : '#fff7ed', border: `1px solid ${detectedTotal ? '#bbf7d0' : '#fde68a'}` }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-2 font-sans" style={{ color: detectedTotal ? '#166534' : '#92400e' }}>
            {t.voiceDetectedTotal}
          </p>
          {detectedTotal != null ? (
            <p className="text-4xl font-black font-sans" style={{ color: '#1B4332' }}>
              {fmt(detectedTotal)} <span className="text-xl font-bold text-gray-500">{t.birr}</span>
            </p>
          ) : (
            <p className="text-base font-semibold font-sans" style={{ color: '#92400e' }}>⚠️ {t.voiceNoAmount}</p>
          )}
        </div>
      </div>

      <div className="px-6 pb-8 pt-2 space-y-3 flex-shrink-0">
        {detectedTotal != null && (
          <button
            onClick={() => onSave({ amount: detectedTotal, note: transcript })}
            className="w-full py-4 font-black text-white text-base font-sans"
            style={{ background: '#2d6a4f', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #1B4332' }}
          >
            ✓ {t.voiceSave}
          </button>
        )}

        <button
          onClick={onFix}
          className="w-full py-4 font-bold text-base font-sans"
          style={{ background: '#C4883A', color: '#fff', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 0 #96662b' }}
        >
          ✏️ {t.voiceFix}
        </button>

        <div className="flex gap-3">
          <button
            onClick={onReRecord}
            className="flex-1 py-3 font-bold text-sm font-sans"
            style={{ background: '#f5f5f5', color: '#374151', borderRadius: 'var(--radius-md)' }}
          >
            🎤 {t.voiceReRecord}
          </button>
          <button
            onClick={onTypeInstead}
            className="flex-1 py-3 font-bold text-sm font-sans"
            style={{ background: '#f5f5f5', color: '#374151', borderRadius: 'var(--radius-md)' }}
          >
            ✍️ {t.typeSale}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceResultScreen;
