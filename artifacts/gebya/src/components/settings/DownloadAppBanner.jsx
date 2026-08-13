import { useEffect, useRef, useState } from 'react';
import { useLang } from '../context/LangContext';

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
      className="fixed inset-x-0 top-0 z-50 flex items-center px-4 sm:px-6 pb-2 shadow-md"
      style={{ background: 'var(--color-primary)' }}
    >
      <div className="flex flex-1 items-center">
        <div className="flex items-center gap-3">
          <img
            src="/icon-192.png"
            alt="Gebya"
            className="w-8 h-8 rounded"
          />
          <div>
            <div className="font-bold text-white">Gebya</div>
            <div className="text-xs text-white/80">
              {lang === 'am' ? 'Manage your business on the go' : 'Manage your business on the go'}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <button
          onClick={handleDownloadClick}
          className="bg-accent-amber text-white px-4 py-2 rounded-md hover:bg-accent-amber/90 focus:outline-none focus:ring-2 focus:ring-accent-amber focus:ring-offset-2"
          style={{ color: 'var(--color-primary)' }}
        >
          Download App
        </button>
        <button
          onClick={handleClose}
          className="text-white/80 hover:text-white px-2 rounded focus:outline-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}