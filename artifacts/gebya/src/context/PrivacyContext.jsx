import { createContext, useContext, useState, useEffect } from 'react';
import db from '../db';

const PrivacyContext = createContext({ hidden: false, toggle: () => {} });

export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    db.settings.get('privacy_mode').then(s => {
      if (!s) {
        db.settings.put({ key: 'privacy_mode', value: 'visible' });
        setHidden(false);
      } else {
        setHidden(s.value === 'hidden');
      }
    });
  }, []);

  const toggle = async () => {
    const next = !hidden;
    setHidden(next);
    await db.settings.put({ key: 'privacy_mode', value: next ? 'hidden' : 'visible' });
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
