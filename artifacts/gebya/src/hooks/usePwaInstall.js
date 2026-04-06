import { useCallback, useEffect, useMemo, useState } from 'react';

const INSTALL_DISMISS_KEY = 'gebya_install_prompt_dismissed_v1';

if (typeof window !== 'undefined' && !window.__gebyaTestConnection) {
  window.__gebyaTestConnection = null;
}

function getNavigatorStandalone() {
  if (typeof navigator === 'undefined') return false;
  return Boolean(navigator.standalone);
}

function getDisplayModeStandalone() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

function getIsStandalone() {
  return getNavigatorStandalone() || getDisplayModeStandalone();
}

function getUserAgent() {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

function getConnectionDetails() {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('gebya_test_connection');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            effectiveType: parsed.effectiveType || 'unknown',
            saveData: Boolean(parsed.saveData),
          };
        }
      }
    } catch {
      /* ignore test override parse issues */
    }
  }

  if (typeof window !== 'undefined' && window.__gebyaTestConnection) {
    return {
      effectiveType: window.__gebyaTestConnection.effectiveType || 'unknown',
      saveData: Boolean(window.__gebyaTestConnection.saveData),
    };
  }

  if (typeof navigator === 'undefined') {
    return { effectiveType: 'unknown', saveData: false };
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return {
    effectiveType: connection?.effectiveType || 'unknown',
    saveData: Boolean(connection?.saveData),
  };
}

export function usePwaInstall() {
  const userAgent = getUserAgent();
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => getIsStandalone());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState(() => getConnectionDetails());
  const [installDismissed, setInstallDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const syncStandalone = () => setIsStandalone(getIsStandalone());
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallDismissed(true);
      window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
      syncStandalone();
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleOfflineReady = () => setOfflineReady(true);
    const handleUpdateReady = () => setUpdateReady(true);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const handleConnectionChange = () => setConnectionDetails(getConnectionDetails());

    syncStandalone();
    handleConnectionChange();

    if (typeof standaloneQuery.addEventListener === 'function') {
      standaloneQuery.addEventListener('change', syncStandalone);
    } else if (typeof standaloneQuery.addListener === 'function') {
      standaloneQuery.addListener(syncStandalone);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('gebya:pwa-offline-ready', handleOfflineReady);
    window.addEventListener('gebya:pwa-update-ready', handleUpdateReady);
    if (typeof connection?.addEventListener === 'function') {
      connection.addEventListener('change', handleConnectionChange);
    } else if (typeof connection?.addListener === 'function') {
      connection.addListener(handleConnectionChange);
    }

    return () => {
      if (typeof standaloneQuery.removeEventListener === 'function') {
        standaloneQuery.removeEventListener('change', syncStandalone);
      } else if (typeof standaloneQuery.removeListener === 'function') {
        standaloneQuery.removeListener(syncStandalone);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('gebya:pwa-offline-ready', handleOfflineReady);
      window.removeEventListener('gebya:pwa-update-ready', handleUpdateReady);
      if (typeof connection?.removeEventListener === 'function') {
        connection.removeEventListener('change', handleConnectionChange);
      } else if (typeof connection?.removeListener === 'function') {
        connection.removeListener(handleConnectionChange);
      }
    };
  }, []);

  const canPromptInstall = !!deferredPrompt;
  const needsManualInstall = !isStandalone && !canPromptInstall && isMobile;
  const shouldShowInstallPrompt = !isStandalone && !installDismissed && (canPromptInstall || needsManualInstall);

  const dismissInstallPrompt = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    }
    setInstallDismissed(true);
  }, []);

  const openInstallGuide = useCallback(() => {
    setShowManualGuide(true);
  }, []);

  const closeInstallGuide = useCallback(() => {
    setShowManualGuide(false);
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          dismissInstallPrompt();
        }
      } catch {
        setShowManualGuide(true);
      }
      setDeferredPrompt(null);
      return;
    }

    setShowManualGuide(true);
  }, [deferredPrompt, dismissInstallPrompt]);

  const applyUpdate = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const updateServiceWorker = window.__gebyaUpdateServiceWorker;
    if (typeof updateServiceWorker === 'function') {
      await updateServiceWorker(true);
      return;
    }

    window.location.reload();
  }, []);

  const installMode = useMemo(() => {
    if (isStandalone) return 'installed';
    if (canPromptInstall) return 'prompt';
    if (needsManualInstall && isIOS && isSafari) return 'ios-manual';
    if (needsManualInstall && isAndroid) return 'android-manual';
    if (needsManualInstall) return 'manual';
    return 'browser';
  }, [canPromptInstall, isAndroid, isIOS, isSafari, isStandalone, needsManualInstall]);

  const isSlowConnection = useMemo(
    () => connectionDetails.saveData || ['slow-2g', '2g', '3g'].includes(connectionDetails.effectiveType),
    [connectionDetails]
  );

  return {
    applyUpdate,
    canPromptInstall,
    closeInstallGuide,
    dismissInstallPrompt,
    installMode,
    isAndroid,
    isIOS,
    isMobile,
    isOnline,
    isSafari,
    isSlowConnection,
    isStandalone,
    networkEffectiveType: connectionDetails.effectiveType,
    saveDataEnabled: connectionDetails.saveData,
    needsManualInstall,
    offlineReady,
    openInstallGuide,
    promptInstall,
    setOfflineReady,
    setUpdateReady,
    shouldShowInstallPrompt,
    showManualGuide,
    updateReady,
  };
}
