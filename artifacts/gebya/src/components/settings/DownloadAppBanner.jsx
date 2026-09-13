export default function DownloadAppBanner({ pwa }) {
  if (!pwa || pwa.installDismissed || pwa.isStandalone) return null;

  const handleInstallClick = () => {
    pwa.promptInstall();
  };

  const handleDismiss = () => {
    pwa.dismissInstallPrompt();
  };

  return (
    <div className="sticky top-0 z-50 w-full px-4 sm:px-6 py-0 shadow-md" style={{ background: '#1E4D3B', paddingTop: 'env(safe-area-inset-top)', height: '56px', minHeight: '56px', maxHeight: '64px' }}>
      <div className="h-full flex items-center justify-between" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/icon-192.png" alt="Gebya" className="w-8 h-8 rounded flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-white truncate text-sm">
              {pwa.canPromptInstall ? 'Add Gebya to your phone' : 'Get the Gebya app'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="bg-[rgb(246,215,118)] hover:bg-[rgb(246,215,118)/90] px-3 py-1.5 rounded-full text-sm font-medium text-[rgb(27,67,50)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgb(27,67,50)] focus:ring-offset-2 transition-all"
            aria-label={pwa.canPromptInstall ? 'Install Gebya app' : 'Show Gebya install instructions'}
          >
            {pwa.canPromptInstall ? 'Install' : 'Install app'}
          </button>
          <button type="button" onClick={handleDismiss} className="text-white/70 hover:text-white p-1 transition-colors" aria-label="Dismiss">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
