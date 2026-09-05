import { useState, useEffect, useCallback } from 'react';

let toastListeners = [];
let toastQueue = [];

export function fireToast(message, duration = 2500, onUndo = null) {
  toastQueue.push({ message, id: Date.now() + crypto.randomUUID(), duration, onUndo });
  toastListeners.forEach(fn => fn([...toastQueue]));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (q) => setToasts([...q]);
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const dismiss = useCallback((id) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    setToasts([...toastQueue]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(t =>
      setTimeout(() => dismiss(t.id), t.duration || 2500)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    // bottom-24 (96px) sits ABOVE the action bar (~52px) and bottom nav (60px)
    // in both fullscreen and inline variants, so the Undo button is always
    // tappable, not occluded by the workspace's sticky bottom CTA.
    <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 z-[100] px-4" style={{ pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-white animate-slide-up"
          style={{
            background: 'rgba(27,67,50,0.95)',
            maxWidth: '380px',
            width: '100%',
            pointerEvents: 'auto',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            minHeight: '48px',
          }}
        >
          <span className="flex-1 text-center font-sans" style={{ fontSize: '13px', lineHeight: 1.3 }}>{t.message}</span>
          {t.onUndo && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); t.onUndo(); dismiss(t.id); }}
              className="flex-shrink-0 press-scale font-sans font-black"
              style={{
                background: 'var(--color-bg-white)',
                color: 'var(--color-success-text, #166534)',
                minHeight: '44px',
                minWidth: '76px',
                padding: '0 14px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 1px 0 rgba(0,0,0,0.08)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
              aria-label="Undo"
            >
              ↶ Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
