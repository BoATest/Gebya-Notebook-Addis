// Portal.jsx — Render children into document.body via React portal.
//
// Why: when the inline capture strip is mounted inside the Today tab's
// scrollable container, modal/sheet overlays clipped by ancestor
// overflow:hidden / stacking-context rules. On iOS Safari the
// `RecentSalesSheet` header would render behind the page header and the
// camera full-screen surface would be cropped at the top.
//
// createPortal escapes those ancestors and mounts into document.body, so
// the overlay sits at the top of the document stacking context and is
// unaffected by the host's overflow/transform/filter.
//
// Safety: returns null during SSR (no document) — this app is a client-
// side PWA so the guard only matters for the initial render before
// hydration completes.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function Portal({ children, container }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  const target = container || (typeof document !== 'undefined' ? document.body : null);
  if (!target) return null;
  return createPortal(children, target);
}
