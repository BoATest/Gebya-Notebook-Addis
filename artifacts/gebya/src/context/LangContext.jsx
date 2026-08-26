import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { EN, AM, EN_OVERRIDES, AM_OVERRIDES } from "./dictionaries.js";

// WARNING: NATIVE-SPEAKER VERIFICATION REQUIRED
// All Amharic (AM) strings in dictionaries.js were machine-translated and have NOT been
// reviewed by a native Amharic speaker. Before public launch, every string in
// the AM object must be verified and corrected by a native speaker - especially
// financial/business terminology, verb forms, and formal/informal register.
// Do NOT ship to production without completing this review.

export const LangContext = createContext(null);

export function LangProvider({ children }) {
  // Default to English for the admin/command-center audience; shopkeepers can
  // still toggle to Amharic (saved choice persists via localStorage).
  const [lang, setLang] = useState('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gebya_lang');
      if (stored === 'en' || stored === 'am') {
        setLang(stored);
      }
    } catch {
      // localStorage may be unavailable in SSR or private mode.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.body.dataset.lang = lang;
    try {
      localStorage.setItem('gebya_lang', lang);
    } catch {
      // ignore storage errors
    }
  }, [lang]);

  const toggleLang = () => {
    setLang(prev => {
      const next = prev === 'en' ? 'am' : 'en';
      return next;
    });
  };

  const t = useMemo(() => {
    return lang === 'am' ? { ...AM, ...AM_OVERRIDES } : { ...EN, ...EN_OVERRIDES };
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

// Complete English-leaning dictionary (Amharic fallback for any key not yet
// translated to English). Used to force the platform-admin Command Center to
// render in English regardless of the visitor's saved language preference.
export { ENGLISH_T } from "./dictionaries.js";



