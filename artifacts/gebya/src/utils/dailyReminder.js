// utils/dailyReminder.js — Daily recording reminder.
//
// Delivery happens in the SERVICE WORKER (public/sw-push.js) so the notification
// fires even when the app/tab is closed. The page simply posts the schedule to the
// SW via postMessage; the SW persists it in IndexedDB and arms a timer that
// re-arms daily and survives SW restarts.
//
// If no SW controller is available (e.g. unsupported browser), we fall back to an
// in-page timer + a local Notification / toast — delivery only while the app is open.

import { toEthiopianClock, msUntilNext } from './ethiopianTime';
import { fireToast } from '../components/Toast';

let pageTimer = null;

function postToSW(message) {
  if ('serviceWorker' in navigator && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage(message);
    return true;
  }
  return false;
}

function showInAppFallback() {
  const body = "Don't forget to record today's sales. ዛሬውን ሽያጭ ይመዝግቡ።";
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Gebya', { body, icon: '/icon-192.png' });
    } else {
      fireToast(body, 4000);
    }
  } catch {
    fireToast(body, 4000);
  }
}

function armInPageFallback(time24) {
  disarmInPageFallback();
  const tick = () => {
    showInAppFallback();
    pageTimer = setTimeout(tick, 24 * 60 * 60 * 1000);
  };
  pageTimer = setTimeout(tick, msUntilNext(time24));
}

function disarmInPageFallback() {
  if (pageTimer) {
    clearTimeout(pageTimer);
    pageTimer = null;
  }
}

export function armDailyReminder(time24) {
  const sent = postToSW({ type: 'schedule-reminder', enabled: true, time: time24 });
  if (!sent) armInPageFallback(time24);
}

export function disarmDailyReminder() {
  postToSW({ type: 'schedule-reminder', enabled: false, time: '20:00' });
  disarmInPageFallback();
}

export async function requestReminderPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export { toEthiopianClock };
