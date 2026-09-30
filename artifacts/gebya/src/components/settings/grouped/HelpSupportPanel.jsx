import { useLang } from '../../../context/LangContext';

/**
 * MY APP › Help & Support.
 *
 * Extracted from DataTab's inline card so the R2.3 grouped layout can reuse it
 * as one row. All strings are BYTE-IDENTICAL to the DataTab originals and are
 * listed for the R2.3 sign-off pass in docs/R2-LABELS-DRAFT.md (legacy DataTab
 * keeps its own inline copy until R2.4 deletes the old layout).
 */
export default function HelpSupportPanel() {
  const { lang } = useLang();

  return (
    <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden px-5 py-4 text-sm text-gray-500">
      <p className="font-bold text-gray-800 mb-2">{lang === 'am' ? 'ተደጋጋሚ ጥያቄዎች' : 'Common Questions'}</p>
      <div className="space-y-2">
        <div>
          <p className="text-xs font-bold text-gray-700">{lang === 'am' ? 'ዱቤ እንዴት ላስታውሳል?' : 'How do I remind a customer about dubie?'}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am'
              ? 'ደንበኛውን ይምረጡ → "አስታውስ" ይጫኑ → ቴሌግራም፣ ዋትስአፕ ወይም SMS ይምረጡ'
              : 'Open the customer → tap "Remind" → choose Telegram, WhatsApp, or SMS'}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-700">{lang === 'am' ? 'ሽያጭ ሲመዘገብ ቅናሽ እንዴት ልጨምር?' : 'How do I add a discount to a sale?'}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am'
              ? 'ሽያጭ ሲመዘገብ → "+ Add discount" ይጫኑ → መጠኑን ያስገቡ (ከሽያጭ ድምር በላይ መሆን አይችልም)'
              : 'While recording a sale → tap "+ Add discount" → enter amount (cannot exceed sale total)'}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-700">{lang === 'am' ? 'ውሂቤ ወዴት ይሄዳል?' : 'Where is my data stored?'}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am'
              ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል። ምንም ወደ ውጭ አይላክም።'
              : 'All data stays on this phone only. Nothing is sent to the cloud unless you choose to backup.'}
          </p>
        </div>
      </div>
    </div>
  );
}
