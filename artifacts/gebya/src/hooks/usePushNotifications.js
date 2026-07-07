import { useState, useEffect, useCallback } from 'react';
import { notificationsApi } from '../api/notifications';
import { getAuthToken } from '../utils/syncEngine';

function getIsStandalone() {
  if (typeof navigator === 'undefined') return false;
  if (navigator.standalone) return true;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(display-mode: standalone)').matches;
  }
  return false;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }
    setIsSupported(true);
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported || loading) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) { setLoading(false); return; }

      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') { setLoading(false); return; }
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPermission('denied');
        setLoading(false);
        return;
      }

      await notificationsApi.requestPushSubscription(token);
      setIsSubscribed(true);
    } catch (err) {
      console.error('[push] subscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [isSupported, loading]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || loading) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        if (token) {
          await notificationsApi.unsubscribe(endpoint, token);
        }
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('[push] unsubscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }, [isSupported, loading]);

  // Auto-subscribe when standalone (PWA mode) and permission is granted
  useEffect(() => {
    if (!isSupported || isSubscribed || loading) return;
    if (getIsStandalone() && permission === 'granted') {
      subscribe();
    }
  }, [isSupported, isSubscribed, permission, loading, subscribe]);

  return { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe };
}
