import { CheckCircle2, Download, RefreshCw, Signal, SignalHigh, Smartphone, WifiOff, X } from 'lucide-react';
import { useLang } from '../context/LangContext';

function InstallGuideModal({ pwa }) {
  const { t } = useLang();

  if (!pwa.showManualGuide) return null;

  const steps = pwa.isIOS && pwa.isSafari
    ? [t.installIosStep1, t.installIosStep2, t.installIosStep3]
    : pwa.isAndroid
      ? [t.installAndroidStep1, t.installAndroidStep2, t.installAndroidStep3]
      : [t.installGenericStep1, t.installGenericStep2, t.installGenericStep3];

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 animate-fade"
      onClick={(event) => {
        if (event.target === event.currentTarget) pwa.closeInstallGuide();
      }}
    >
      <div className="bg-white w-full max-w-md pb-safe animate-slide-up" style={{ borderRadius: '24px 24px 0 0', boxShadow: 'var(--shadow-lg)' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
          <div>
            <h2 className="text-base font-black text-gray-900">{t.installGuideTitle}</h2>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{t.installGuideHint}</p>
          </div>
          <button
            onClick={pwa.closeInstallGuide}
            className="w-10 h-10 rounded-full flex items-center justify-center min-w-[44px] min-h-[44px] press-scale"
            style={{ background: '#f5f5f5' }}
            aria-label={t.close}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="p-4 border" style={{ background: '#FAF8F5', borderColor: 'var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#1B4332' }}>
              <Smartphone className="w-4 h-4" />
              {pwa.isStandalone ? t.installAlreadyInstalled : t.installGuideDeviceTitle}
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={`${index}-${step}`} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: '#1B4332' }}>
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={pwa.closeInstallGuide}
            className="w-full py-3 font-bold text-sm min-h-[48px] press-scale"
            style={{ background: '#f5f5f5', color: '#374151', borderRadius: 'var(--radius-md)' }}
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerCard({ children, tone = 'default' }) {
  const styles = {
    default: { background: '#fff', borderColor: 'var(--color-border)' },
    success: { background: '#f0fdf4', borderColor: '#bbf7d0' },
    warning: { background: '#fff7ed', borderColor: '#fed7aa' },
    offline: { background: '#fef2f2', borderColor: '#fecaca' },
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={styles[tone]}>
      {children}
    </div>
  );
}

export default function PwaInstallPanel({ pwa, variant = 'banner' }) {
  const { t } = useLang();

  if (!pwa) return null;

  const installActions = (
    <div className="flex gap-2">
      <button
        onClick={pwa.promptInstall}
        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 min-h-[44px] press-scale"
        style={{ background: '#1B4332' }}
      >
        <Download className="w-4 h-4" />
        {pwa.canPromptInstall ? t.installNow : t.installHowTo}
      </button>
      <button
        onClick={pwa.openInstallGuide}
        className="px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px] press-scale"
        style={{ background: '#f5f5f5', color: '#374151' }}
      >
        {t.installGuideButton}
      </button>
    </div>
  );

  if (variant === 'settings') {
    return (
      <>
        <section>
          <h2 className="text-xs font-bold tracking-widest uppercase text-green-800 mb-2 px-1">{t.installSectionTitle}</h2>
          <div className="bg-white rounded-2xl border border-green-100/50 overflow-hidden">
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(27,67,50,0.08)' }}>
                  <Smartphone className="w-5 h-5" style={{ color: '#1B4332' }} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-800">
                    {pwa.isStandalone ? t.installStatusInstalled : t.installStatusBrowser}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {pwa.isOnline ? t.installStatusOnline : t.installStatusOffline}
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-3 space-y-2" style={{ background: '#FAF8F5', border: '1.5px solid var(--color-border)' }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-600">{t.installChecklistOffline}</span>
                  <span className="font-black" style={{ color: '#1B4332' }}>{t.installChecklistReady}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-600">{t.installChecklistHomeScreen}</span>
                  <span className="font-black" style={{ color: pwa.isStandalone ? '#15803d' : '#C4883A' }}>
                    {pwa.isStandalone ? t.installChecklistInstalled : t.installChecklistPending}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-600">{t.installChecklistData}</span>
                  <span className="font-black" style={{ color: '#1B4332' }}>{t.installChecklistOnPhone}</span>
                </div>
              </div>

              {!pwa.isStandalone && installActions}

              {pwa.isStandalone && (
                <button
                  onClick={pwa.openInstallGuide}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 min-h-[44px] press-scale"
                  style={{ background: '#f5f5f5', color: '#374151' }}
                >
                  <CheckCircle2 className="w-4 h-4 text-green-700" />
                  {t.installAlreadyInstalled}
                </button>
              )}
            </div>
          </div>
        </section>
        <InstallGuideModal pwa={pwa} />
      </>
    );
  }

  if (pwa.updateReady) {
    return (
      <>
        <div className="mb-3">
          <BannerCard tone="success">
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 mt-0.5 text-green-700 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{t.updateReadyTitle}</p>
                  <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{t.updateReadyBody}</p>
                </div>
                <button onClick={() => pwa.setUpdateReady(false)} className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full press-scale" style={{ background: 'rgba(255,255,255,0.7)' }} aria-label={t.close}>
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <button
                onClick={pwa.applyUpdate}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 min-h-[44px] press-scale"
                style={{ background: '#1B4332' }}
              >
                <RefreshCw className="w-4 h-4" />
                {t.refreshApp}
              </button>
            </div>
          </BannerCard>
        </div>
        <InstallGuideModal pwa={pwa} />
      </>
    );
  }

  if (!pwa.isOnline) {
    return (
      <>
        <div className="mb-3">
          <BannerCard tone="offline">
            <div className="px-4 py-4 flex items-start gap-3">
              <WifiOff className="w-5 h-5 mt-0.5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-gray-900">{t.offlineNowTitle}</p>
                <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{t.offlineNowBody}</p>
              </div>
            </div>
          </BannerCard>
        </div>
        <InstallGuideModal pwa={pwa} />
      </>
    );
  }

  if (pwa.offlineReady) {
    return <InstallGuideModal pwa={pwa} />;
  }

  if (!pwa.shouldShowInstallPrompt) {
    return <InstallGuideModal pwa={pwa} />;
  }

  return (
    <>
      <div className="mb-3">
        <BannerCard>
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-start gap-3">
              {pwa.canPromptInstall ? (
                <Download className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#1B4332' }} />
              ) : (
                <Signal className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#1B4332' }} />
              )}
              <div className="flex-1">
                <p className="font-bold text-gray-900">{t.installBannerTitle}</p>
                <p className="text-sm mt-1" style={{ color: '#4b5563' }}>{t.installBannerBody}</p>
              </div>
              <button
                onClick={pwa.dismissInstallPrompt}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full press-scale"
                style={{ background: '#f5f5f5' }}
                aria-label={t.notNow}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {installActions}
          </div>
        </BannerCard>
      </div>
      <InstallGuideModal pwa={pwa} />
    </>
  );
}
