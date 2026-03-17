import { createContext, useContext, useState, useEffect } from 'react';
import db from '../db';

const PrivacyContext = createContext({ hidden: true, toggle: () => {} });

export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    db.settings.get('privacy_mode').then(s => {
      if (s) setHidden(s.value === 'hidden');
    });
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) setHidden(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const toggle = async () => {
    const next = !hidden;
    setHidden(next);
    await db.settings.put({ key: 'privacy_mode', value: next ? 'hidden' : 'visible' });
    if (!next) {
      setTimeout(() => setHidden(true), 30000);
    }
  };

  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
