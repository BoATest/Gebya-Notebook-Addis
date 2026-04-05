import { createContext, useContext, useEffect, useState } from 'react';
import db from '../db';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  isDark: false,
});

const STORAGE_KEY = 'gebya_theme';

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    let active = true;
    db.settings.get('theme_mode').then((row) => {
      if (!active || !row?.value) return;
      setThemeState(row.value === 'dark' ? 'dark' : 'light');
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const setTheme = async (nextTheme) => {
    const normalized = nextTheme === 'dark' ? 'dark' : 'light';
    setThemeState(normalized);
    applyTheme(normalized);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, normalized);
    }
    await db.settings.put({ key: 'theme_mode', value: normalized });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
