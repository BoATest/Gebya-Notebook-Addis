import { useEffect, useState } from 'react';
import { useLang } from '../../../context/LangContext';
import { isErrorReportingEnabled, setErrorReportingPreference } from '../../../sentry';
import { APP_VERSION } from '../../../utils/appVersion';

// Build date injected at bundle time by Vite (same lookup as DataTab).
const BUILD_DATE = import.meta.env?.VITE_BUILD_DATE || '';

/**
 * MY APP › About Gebya (grouped layout).
 *
 * R2-BLOCK-MAPPING (Q5): the About card absorbs the SettingsPage version
 * display, and the 5-tap dev-mode unlock stays bound to that version element —
 * `onVersionTap` is the SettingsPage handler, unchanged. The error-reporting
 * toggle relocates here from DataTab ("About › Privacy") with the locked
 * toggle colors (green ON #22c55e / gray OFF).
 *
 * Strings are byte-identical to the DataTab originals; the legacy DataTab copy
 * stays untouched until R2.4 deletes the old layout.
 */
export default function AboutPanel({
  onVersionTap,
  aboutTapCount = 0,
  unlockTaps = 5,
  devModeRevealed = false,
}) {
  const { lang } = useLang();

  // Error-reporting consent (Sentry). Default ON, user can switch off.
  const [errorReporting, setErrorReportingState] = useState(true);
  useEffect(() => {
    setErrorReportingState(isErrorReportingEnabled());
  }, []);

  const toggleErrorReporting = () => {
    const next = !errorReporting;
    setErrorReportingPreference(next);
    setErrorReportingState(next);
  };

  return (
    <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden px-5 py-4 text-sm text-gray-500">
      <p className="font-bold text-gray-800 mb-1">Gebya · የንግድ ማስታወሻ</p>
      <p className="text-xs mb-2">Business Notebook for Ethiopian shopkeepers</p>
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {lang === 'am' ? 'ሁሉም ውሂብ በዚህ ስልክ ላይ ብቻ ይቀመጣል' : 'All data stays on this phone only'}
      </p>
      {BUILD_DATE && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-soft)' }}>
          {lang === 'am' ? 'የግንባታ ቀን' : 'Built'}: {BUILD_DATE}
        </p>
      )}

      {/* Version + 5-tap dev unlock — one element, one handler. */}
      <div className="mt-3 pt-3 border-t text-xs select-none" style={{ borderColor: 'var(--color-border-light)' }}>
        <button
          type="button"
          onClick={onVersionTap}
          className="text-left"
          style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-label={lang === 'am' ? 'መስመርቻ መረጃ' : 'App info'}
        >
          <span>Gebya · v{APP_VERSION}</span>
          {aboutTapCount > 0 && aboutTapCount < unlockTaps && !devModeRevealed && (
            <span className="ml-2" style={{ color: 'var(--color-accent-amber)' }}>
              · {unlockTaps - aboutTapCount} {lang === 'am' ? 'ተጨማሪ መታ' : 'more taps'}
            </span>
          )}
        </button>
      </div>

      {/* Privacy — error & usage reporting (relocated from DataTab, Q5). */}
      <div
        className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'var(--color-surface-soft, #f6f6f4)', border: '1px solid var(--color-border-light)' }}
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-700">
            {lang === 'am' ? 'የስህተት እና አጠቃቀም ሪፖርት' : 'Error & usage reporting'}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {lang === 'am'
              ? 'መተግበሪያው ሲታገድ ለማስተካከል እና ለማሻሻል ይረዳል። ምንም የግል መረጃ አይላክም።'
              : 'Helps fix crashes and improve the app. Never includes personal data.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={errorReporting}
          aria-label={lang === 'am' ? 'የስህተት እና አጠቃቀም ሪፖርት' : 'Error & usage reporting'}
          onClick={toggleErrorReporting}
          className="flex-shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
          style={{ background: errorReporting ? '#22c55e' : '#d1d5db' }}
        >
          <span
            className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
            style={{ transform: errorReporting ? 'translateX(26px)' : 'translateX(3px)' }}
          />
        </button>
      </div>
    </div>
  );
}
