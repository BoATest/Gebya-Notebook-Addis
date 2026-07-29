import { useState, useEffect } from 'react';

export default function useAccordion(initialOpen) {
  const [openCards, setOpenCards] = useState(() => {
    const init = new Set();
    if (initialOpen) init.add(initialOpen);
    return init;
  });

  useEffect(() => {
    if (initialOpen && !openCards.has(initialOpen)) {
      setOpenCards(prev => new Set(prev).add(initialOpen));
    }
  }, [initialOpen]);

  const toggleCard = (id) => setOpenCards(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const openCard = (id) => {
    if (!openCards.has(id)) toggleCard(id);
  };

  return { openCards, toggleCard, openCard };
}
