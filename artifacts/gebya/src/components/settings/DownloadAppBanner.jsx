import { useEffect, useRef, useState } from 'react';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function DownloadAppBanner() {
  const deferredInstallPromptRef = useRef(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('gebya-download-banner-dismissed') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (isStandalone()) return;
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredInstallPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (dismissed || isStandalone()) return null;

  const handleDownloadClick = async () => {
    if (deferredInstallPromptRef.current) {
      deferredInstallPromptRef.current.prompt();
      const { outcome } = await deferredInstallPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredInstallPromptRef.current = null;
    } else if (isIOS()) {
      setShowIOSGuide(true);
    } else if (isAndroid()) {
      setShowAndroidGuide(true);
    } else {
      window.open(window.location.origin, '_blank');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('gebya-download-banner-dismissed', 'true'); } catch {}
  };

  if (showIOSGuide) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade"
        onClick={() => setShowIOSGuide(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Install Gebya on iPhone"
      >
        <div
          className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            Install Gebya on iPhone
          </h3>
          <ol className="space-y-3 text-sm" style={{ color: 'var(--color-text)' }}>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>1</span>
              <span>Tap the <strong>Share</strong> button <span style={{ fontSize: '18px' }}>&#x2191;</span> in Safari's bottom toolbar</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>2</span>
              <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>3</span>
              <span>Tap <strong>Add</strong> in the top-right corner</span>
            </li>
          </ol>
          <button
            onClick={() => setShowIOSGuide(false)}
            className="w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (showAndroidGuide) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade"
        onClick={() => setShowAndroidGuide(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Install Gebya on Android"
      >
        <div
          className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>
            Install Gebya on Android
          </h3>
          <ol className="space-y-3 text-sm" style={{ color: 'var(--color-text)' }}>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>1</span>
              <span>Tap the <strong>three dots</strong> menu in Chrome's top-right corner</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>2</span>
              <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>3</span>
              <span>Tap <strong>Install</strong> to confirm</span>
            </li>
          </ol>
          <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
            The app works offline and syncs when connected.
          </p>
          <button
            onClick={() => setShowAndroidGuide(false)}
            className="w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-all"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-50 w-full px-4 sm:px-6 py-0 shadow-md"
      style={{
        background: '#1E4D3B',
        paddingTop: 'env(safe-area-inset-top)',
        height: '56px',
        minHeight: '56px',
        maxHeight: '64px'
      }}
    >
      <div
        className="h-full flex items-center justify-between"
        style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/icon-192.png"
            alt="Gebya"
            className="w-8 h-8 rounded flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-white truncate text-sm">
              Get the Gebya app
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadClick}
            className="bg-[rgb(246,215,118)] hover:bg-[rgb(246,215,118)/90] px-3 py-1.5 rounded-full text-sm font-medium text-[rgb(27,67,50)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,67,50)] focus:ring-offset-2 transition-all"
            aria-label="Get the Gebya app"
          >
            Download
          </button>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white p-1 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
