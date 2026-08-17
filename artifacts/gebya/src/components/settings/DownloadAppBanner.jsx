import { useEffect, useRef } from 'react';

export default function DownloadAppBanner() {
  const deferredInstallPromptRef = useRef(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredInstallPromptRef.current = e;
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
      window.open('https://gebya-notebook-addis-gebya.vercel.app/', '_blank');
    }
  };

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
        <button
          onClick={handleDownloadClick}
          className="bg-[rgb(246,215,118)] hover:bg-[rgb(246,215,118)/90] px-3 py-1.5 rounded-full text-sm font-medium text-[rgb(27,67,50)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,67,50)] focus:ring-offset-2 transition-all"
          aria-label="Get the Gebya app"
        >
          Download
        </button>
      </div>
    </div>
  );
}