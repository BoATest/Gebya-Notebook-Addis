import { useLang } from '../context/LangContext';
import { fmt } from '../utils/numformat';

const MAX_ITEMS = 5;
const INTENT_LABELS = {
  sale: 'voiceIntentSale',
  credit: 'voiceIntentCredit',
  payment: 'voiceIntentPayment',
};

function VoiceResultScreen({ transcript, detectedTotal, items = [], draft, onSave, onFix, onAddAnother, onReRecord, onTypeInstead }) {
  const { t, lang } = useLang();

  const hasMultiple = items.length > 1;
  const runningTotal = draft?.total_amount ?? items.reduce((sum, it) => sum + (it.detectedTotal || 0), 0);
  const effectiveTotal = hasMultiple ? runningTotal : (draft?.total_amount ?? detectedTotal);
  const canAddMore = items.length < MAX_ITEMS;
  const parsedItems = draft?.items || [];
  const isSaleIntent = !draft?.intent || draft.intent === 'sale';
  const summaryNote = parsedItems.length
    ? parsedItems.map((item) => `${item.quantity && item.quantity !== 1 ? `${item.quantity}x ` : ''}${item.name}`).join(', ')
    : transcript;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)]" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:px-6" style={{ background: '#1B4332' }}>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 font-sans">Gebya Voice</p>
        <h2 className="mt-2 text-2xl font-black text-white font-sans">{t.voiceResultTitle}</h2>
        <p className="mt-1 text-sm text-white/75 font-sans">
          {lang === 'am' ? 'የናገሩትን እዚህ ይመልከቱ፣ ካስፈለገም ያስተካክሉ።' : 'Here is what Gebya heard. Save it or fix it before it goes into your notebook.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 sm:px-6">
        <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 font-sans">{t.voiceTranscript}</p>
          {hasMultiple ? (
            <div className="mt-3 space-y-2">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl border p-3" style={{ background: '#FAF8F5', borderColor: '#e8e2d8' }}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed text-gray-800 font-sans flex-1 min-w-0">"{item.transcript}"</p>
                    {item.detectedTotal != null ? (
                      <span className="text-sm font-black flex-shrink-0" style={{ color: '#1B4332' }}>{fmt(item.detectedTotal)}</span>
                    ) : (
                      <span className="text-xs text-orange-500 flex-shrink-0">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-base leading-relaxed text-gray-800 font-sans">"{transcript}"</p>
          )}
        </div>

        <div className="rounded-2xl border p-5 text-center" style={{ background: effectiveTotal ? '#f0fdf4' : '#fff7ed', borderColor: effectiveTotal ? '#bbf7d0' : '#fde68a' }}>
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
            <p className="text-xs text-gray-500 mt-2 font-sans">{items.length} {t.voiceItemsRecorded || 'items recorded'}</p>
          )}
        </div>

        {(draft?.customer_name || draft?.intent || parsedItems.length > 0) && (
          <div className="rounded-2xl border bg-white p-4 shadow-xs" style={{ borderColor: 'var(--color-border)' }}>
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
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 font-sans">{t.voiceParsedItems}</p>
                {parsedItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-xl p-3" style={{ background: '#FAF8F5' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-800 break-words">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t.voiceQuantity}: {item.quantity || 1}
                          {item.unit_price != null ? ` · ${t.voiceUnitPrice}: ${fmt(item.unit_price)}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-black flex-shrink-0" style={{ color: '#1B4332' }}>
                        {item.line_total != null ? fmt(item.line_total) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {draft?.needs_review && (
              <p className="mt-4 text-sm font-semibold" style={{ color: '#92400e' }}>
                {t.voiceNeedsReview}
              </p>
            )}

            {!isSaleIntent && (
              <p className="mt-4 text-sm font-semibold" style={{ color: '#92400e' }}>
                {lang === 'am' ? 'ይህ ድምጽ የዱቤ ወይም ክፍያ መዝገብ ሊሆን ይችላል። ከማስቀመጥዎ በፊት ያረጋግጡ።' : 'This sounded more like Dubie or a payment. Review it before saving it as a sale.'}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 space-y-3 sm:px-6">
        {effectiveTotal != null && effectiveTotal > 0 && isSaleIntent && (
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

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onReRecord}
            className="py-3 font-bold text-sm font-sans"
            style={{ background: '#f5f5f5', color: '#374151', borderRadius: 'var(--radius-md)' }}
          >
            🎤 {t.voiceReRecord}
          </button>
          <button
            onClick={onTypeInstead}
            className="py-3 font-bold text-sm font-sans"
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
