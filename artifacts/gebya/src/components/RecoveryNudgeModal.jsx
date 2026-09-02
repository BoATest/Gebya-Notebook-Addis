import { useState, useCallback } from 'react';
import { X, ShieldCheck, Phone, Smartphone, Check } from 'lucide-react';
import { isValidEthiopianPhone, normalizeEthiopianPhone } from '../utils/phoneNumber';

/**
 * Phone-Recovery Nudge
 * ---------------------
 * Shown to owners who have NOT yet signed in (no cloud account) once they reach
 * ~50 recorded transactions. The app's promise is "your notebook stays on this
 * phone" — which is a liability if the phone is lost, factory-reset, or sent to
 * a repair shop. This nudge converts that risk into a 15-second, warm, optional
 * action: add your phone number so the books are recoverable.
 *
 * It never blocks usage: Protect / Snooze / Dismiss all dismiss the modal.
 */
export default function RecoveryNudgeModal({ lang = 'en', onProtect, onSnooze, onDismiss }) {
  const am = lang === 'am';
  const [phone, setPhone] = useState('');
  const [invalid, setInvalid] = useState(false);

  const title = am ? 'ዳታዎ በዚህ ስልክ ላይ ብቻ ነው' : 'Your notebook lives on this phone';
  const body = am
    ? 'ስልኩን ካጡት ወይም ከተጠገነ፣ ሁሉም መዝገቦችዎ ሊጠፉ ይችላሉ። የስልክ ቁጥርዎን በማከል ደህንነትዎን ያረጋግጡ።'
    : 'If this phone is lost or sent for repair, every record could be gone. Add your phone number so your books stay safe.';
  const helper = am
    ? 'ቁጥርዎን ሲጨምሩ ውሂብዎ ወደ ክላውድ ይቀመጣል፣ በማንኛውም ስልክ ማግኘት ይችላሉ።'
    : 'When you add it, your data is kept safely in the cloud and can be opened on any phone.';
  const protectLabel = am ? 'ዳታዬን ደህንነቱን አረጋግጥ' : 'Keep my data safe';
  const snoozeLabel = am ? 'በኋላ አስታውሰኝ' : 'Remind me later';
  const phonePlaceholder = '+251 9XX XXX XXX';
  const invalidMsg = am ? 'ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ' : 'Enter a valid Ethiopian phone number';

  const handleProtect = useCallback(() => {
    const clean = phone.replace(/\s+/g, '');
    if (clean && !isValidEthiopianPhone(clean)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onProtect(clean ? normalizeEthiopianPhone(clean) : '');
  }, [phone, onProtect]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <button
            type="button"
            aria-label={am ? 'ዝጋ' : 'Close'}
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{body}</p>

        <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          <Smartphone className="mr-1.5 inline h-3.5 w-3.5" />
          {helper}
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {am ? 'የስልክ ቁጥር' : 'Phone number'}
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setInvalid(false); }}
              placeholder={phonePlaceholder}
              className="w-full bg-transparent py-2.5 text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
            />
          </div>
          {invalid && (
            <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{invalidMsg}</p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleProtect}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            {protectLabel}
          </button>
          <button
            type="button"
            onClick={onSnooze}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {snoozeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
