import { useEffect, useRef, useState } from 'react';
import { useLang } from '../../context/LangContext';

export default function DownloadAppBanner() {
  const { lang } = useLang();
  const deferredInstallPromptRef = useRef(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('gebya_download_app_banner_dismissed');
    if (dismissed) {
      setShowBanner(false);
      return;
    }
    // Check if app is installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      navigator.standalone === true;
    if (isInstalled) {
      setShowBanner(false);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so we can trigger it later
      deferredInstallPromptRef.current = e;
      // Optionally, show the install button (we already show the banner)
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleDownloadClick = async () => {
    if (deferredInstallPromptRef.current) {
      deferredInstallPromptRef.current.prompt();
      const { outcome } = await deferredInstallPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      deferredInstallPromptRef.current = null;
    } else {
      // Fallback to link - replace [YOUR_LINK] with the actual URL
      window.open('[YOUR_LINK]', '_blank');
    }
  };

  const handleClose = () => {
    setShowBanner(false);
    localStorage.setItem('gebya_download_app_banner_dismissed', 'true');
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className="sticky top-0 z-50 w-full px-4 sm:px-6 py-0 shadow-md"
      style={{ 
        background: 'var(--color-primary)',
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
              {lang === 'am' ? 'Get the Gebya app' : 'Get the Gebya app'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          <button
            onClick={handleDownloadClick}
            className="bg-accent-amber text-white px-3 py-1.5 rounded-full text-sm font-medium hover:bg-accent-amber/90 focus:outline-none focus:ring-2 focus:ring-accent-amber focus:ring-offset-2 transition-all"
            style={{ color: 'var(--color-primary)' }}
          >
            Download
          </button>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1.5 rounded focus:outline-none transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
