import { useLang } from '../context/LangContext';
import { fmt } from '../utils/numformat';

const MAX_ITEMS = 5;
const INTENT_LABELS = {
  sale: 'voiceIntentSale',
  credit: 'voiceIntentCredit',
  payment: 'voiceIntentPayment',
};

function VoiceResultScreen({ transcript, detectedTotal, items = [], draft, onSave, onFix, onAddAnother, onReRecord, onTypeInstead }) {
  const { t } = useLang();

  const hasMultiple = items.length > 1;
  const runningTotal = draft?.total_amount ?? items.reduce((sum, it) => sum + (it.detectedTotal || 0), 0);
  const effectiveTotal = hasMultiple ? runningTotal : (draft?.total_amount ?? detectedTotal);
  const canAddMore = items.length < MAX_ITEMS;
  const parsedItems = draft?.items || [];
  const summaryNote = parsedItems.length
    ? parsedItems.map((item) => `${item.quantity && item.quantity !== 1 ? `${item.quantity}x ` : ''}${item.name}`).join(', ')
    : transcript;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="px-6 pt-8 pb-4 flex-shrink-0" style={{ background: '#1B4332' }}>
        <h2 className="text-white text-xl font-black font-sans">{t.voiceResultTitle}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {hasMultiple ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 font-sans">{t.voiceTranscript}</p>
            {items.map((item, i) => (
              <div key={i} className="p-3 rounded-xl flex items-center justify-between gap-3" style={{ background: '#FAF8F5', border: '1px solid #e8e2d8' }}>
                <p className="text-gray-800 text-sm leading-relaxed font-sans flex-1 min-w-0 truncate">"{item.transcript}"</p>
                {item.detectedTotal != null ? (
                  <span className="text-sm font-black flex-shrink-0" style={{ color: '#1B4332' }}>{fmt(item.detectedTotal)}</span>
                ) : (
                  <span className="text-xs text-orange-400 flex-shrink-0">—</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl" style={{ background: '#FAF8F5', border: '1px solid #e8e2d8' }}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2 font-sans">{t.voiceTranscript}</p>
            <p className="text-gray-800 text-base leading-relaxed font-sans">"{transcript}"</p>
          </div>
        )}

        {(draft?.customer_name || draft?.intent || parsedItems.length > 0) && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: '#fff', border: '1px solid #e8e2d8' }}>
            <div className="flex gap-2 flex-wrap">
              {draft?.intent && (
                <span className="px-3 py-1 text-xs font-black" style={{ background: '#eef6f1', color: '#1B4332', borderRadius: 999 }}>
                  {t.voiceIntent}: {t[INTENT_LABELS[draft.intent]] || draft.intent}
                </span>
              )}
              {draft?.customer_name && (
                <span className="px-3 py-1 text-xs font-black" style={{ background: '#FAF8F5', color: '#6b7280', borderRadius: 999 }}>
                  {t.voiceCustomerName}: {draft.customer_name}
                </span>
              )}
            </div>

            {parsedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 font-sans">{t.voiceParsedItems}</p>
                {parsedItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="p-3 rounded-xl flex items-center justify-between gap-3" style={{ background: '#FAF8F5' }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {t.voiceQuantity}: {item.quantity || 1}
                        {item.unit_price != null ? ` · ${t.voiceUnitPrice}: ${fmt(item.unit_price)}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-black flex-shrink-0" style={{ color: '#1B4332' }}>
                      {item.line_total != null ? fmt(item.line_total) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {draft?.needs_review && (
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                {t.voiceNeedsReview}
              </p>
            )}
          </div>
        )}

        <div className="p-5 rounded-xl text-center" style={{ background: effectiveTotal ? '#f0fdf4' : '#fff7ed', border: `1px solid ${effectiveTotal ? '#bbf7d0' : '#fde68a'}` }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-2 font-sans" style={{ color: effectiveTotal ? '#166534' : '#92400e' }}>
            {hasMultiple ? t.voiceRunningTotal || 'Running Total' : t.voiceDetectedTotal}
          </p>
          {effectiveTotal != null && effectiveTotal > 0 ? (
            <p className="text-4xl font-black font-sans" style={{ color: '#1B4332' }}>
              {fmt(effectiveTotal)} <span className="text-xl font-bold text-gray-500">{t.birr}</span>
            </p>
          ) : (
            <p className="text-base font-semibold font-sans" style={{ color: '#92400e' }}>⚠️ {t.voiceNoAmount}</p>
          )}
          {hasMultiple && (
            <p className="text-xs text-gray-400 mt-1 font-sans">{items.length} {t.voiceItemsRecorded || 'items'}</p>
          )}
        </div>
      </div>

      <div className="px-6 pb-8 pt-2 space-y-3 flex-shrink-0">
        {effectiveTotal != null && effectiveTotal > 0 && (
          <button
            onClick={() => onSave({ amount: effectiveTotal, note: summaryNote, draft })}
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

        {canAddMore && (
          <button
            onClick={onAddAnother}
            className="w-full py-3 font-bold text-sm font-sans"
            style={{ background: '#f0fdf4', color: '#2d6a4f', border: '2px solid #bbf7d0', borderRadius: 'var(--radius-md)' }}
          >
            + {t.voiceAddAnotherItem || 'Add another item'}
          </button>
        )}

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
