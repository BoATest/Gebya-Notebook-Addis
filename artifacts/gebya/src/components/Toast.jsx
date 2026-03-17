import { useState, useEffect, useCallback } from 'react';

let toastListeners = [];
let toastQueue = [];

export function fireToast(message, duration = 2500) {
  toastQueue.push({ message, id: Date.now() + Math.random(), duration });
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
    <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center gap-2 z-[100] pointer-events-none px-4">
      {toasts.map(t => (
        <div
          key={t.id}
          className="px-5 py-3 rounded-2xl shadow-lg text-sm font-bold text-white"
          style={{ background: 'rgba(30,20,10,0.88)', maxWidth: '340px', textAlign: 'center' }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
