import { useState, useEffect, useCallback } from 'react';

let toastListeners = [];
let toastQueue = [];

export function fireToast(message, duration = 2500, onUndo = null) {
  toastQueue.push({ message, id: Date.now() + Math.random(), duration, onUndo });
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
    <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center gap-2 z-[100] px-4" style={{ pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-white animate-slide-up"
          style={{
            background: 'rgba(27,67,50,0.95)',
            maxWidth: '340px',
            width: '100%',
            pointerEvents: 'auto',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <span className="flex-1 text-center font-sans">{t.message}</span>
          {t.onUndo && (
            <button
              onClick={() => { t.onUndo(); dismiss(t.id); }}
              className="flex-shrink-0 px-3 py-1 font-black text-xs press-scale font-sans"
              style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', minHeight: '32px', borderRadius: 'var(--radius-sm)' }}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
