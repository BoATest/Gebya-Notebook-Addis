import { useEffect, useRef, useState, useCallback } from 'react';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isChrome() {
  return /Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent);
}

function isEdge() {
  return /Edg/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function DownloadAppBanner() {
  const deferredInstallPromptRef = useRef(null);
  const [showGuide, setShowGuide] = useState(null); // 'ios' | 'android' | 'desktop' | null
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('gebya-download-banner-dismissed') === 'true'; } catch { return false; }
  });
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredInstallPromptRef.current = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredInstallPromptRef.current = null;
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Retry: some browsers fire beforeinstallprompt after a delay
    const retryTimer = setTimeout(() => {
      if (!deferredInstallPromptRef.current && !isStandalone()) {
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(retryTimer);
    };
  }, []);

  if (dismissed || isStandalone()) return null;

  const handleDownloadClick = async () => {
    if (deferredInstallPromptRef.current) {
      // Native install prompt available — trigger it
      deferredInstallPromptRef.current.prompt();
      const { outcome } = await deferredInstallPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredInstallPromptRef.current = null;
      setCanInstall(false);
    } else if (isIOS()) {
      setShowGuide('ios');
    } else if (isAndroid()) {
      setShowGuide('android');
    } else if (isChrome() || isEdge()) {
      setShowGuide('desktop');
    } else {
      // Unsupported browser — just open the app
      window.open(window.location.origin, '_blank');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('gebya-download-banner-dismissed', 'true'); } catch {}
  };

  if (showGuide === 'ios') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade" onClick={() => setShowGuide(null)} role="dialog" aria-modal="true" aria-label="Install Gebya on iPhone">
        <div className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>Install Gebya on iPhone</h3>
          <ol className="space-y-3 text-sm" style={{ color: 'var(--color-text)' }}>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>1</span>
              <span>Tap the <strong>Share</strong> button &#x2191; in Safari's bottom toolbar</span>
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
          <button onClick={() => setShowGuide(null)} className="w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-all" style={{ background: 'var(--color-primary)', color: '#fff' }}>Got it</button>
        </div>
      </div>
    );
  }

  if (showGuide === 'android') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade" onClick={() => setShowGuide(null)} role="dialog" aria-modal="true" aria-label="Install Gebya on Android">
        <div className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>Install Gebya on Android</h3>
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
          <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>The app works offline and syncs when connected.</p>
          <button onClick={() => setShowGuide(null)} className="w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-all" style={{ background: 'var(--color-primary)', color: '#fff' }}>Got it</button>
        </div>
      </div>
    );
  }

  if (showGuide === 'desktop') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade" onClick={() => setShowGuide(null)} role="dialog" aria-modal="true" aria-label="Install Gebya">
        <div className="w-full max-w-md bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-base font-bold mb-3" style={{ color: 'var(--color-text)' }}>Install Gebya on your computer</h3>
          <ol className="space-y-3 text-sm" style={{ color: 'var(--color-text)' }}>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>1</span>
              <span>Look for the <strong>install icon</strong> &#x2B07; in the address bar (right side)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-primary)', color: '#fff' }}>2</span>
              <span>Click it and tap <strong>Install</strong></span>
            </li>
          </ol>
          <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>Or use the three-dot menu &rarr; "Install Gebya" / "Apps" &rarr; "Install this site as an app"</p>
          <button onClick={() => setShowGuide(null)} className="w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-all" style={{ background: 'var(--color-primary)', color: '#fff' }}>Got it</button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full px-4 sm:px-6 py-0 shadow-md" style={{ background: '#1E4D3B', paddingTop: 'env(safe-area-inset-top)', height: '56px', minHeight: '56px', maxHeight: '64px' }}>
      <div className="h-full flex items-center justify-between" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/icon-192.png" alt="Gebya" className="w-8 h-8 rounded flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-white truncate text-sm">
              {canInstall ? 'Add Gebya to your phone' : 'Get the Gebya app'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadClick}
            className="bg-[rgb(246,215,118)] hover:bg-[rgb(246,215,118)/90] px-3 py-1.5 rounded-full text-sm font-medium text-[rgb(27,67,50)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,67,50)] focus:ring-offset-2 transition-all"
            aria-label="Get the Gebya app"
          >
            {canInstall ? 'Install' : 'Download'}
          </button>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white p-1 transition-colors" aria-label="Dismiss">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
