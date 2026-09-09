// Web Push handlers for Gebya PWA service worker
// This file is imported by the workbox-generated service worker

// ─── Daily reminder scheduler (background) ──────────────────────────────────
// The page posts { type: 'schedule-reminder', enabled, time } where time is
// "HH:MM" in LOCAL time. The SW persists it and arms a timer that fires at the
// next occurrence, then re-arms daily — surviving app close while the SW lives.

const REMINDER_DB = 'gebya-reminder';
const REMINDER_STORE = 'schedule';

function openReminderDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) return reject(new Error('no idb'));
    const req = indexedDB.open(REMINDER_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(REMINDER_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveReminderSchedule(payload) {
  const db = await openReminderDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(REMINDER_STORE, 'readwrite');
    tx.objectStore(REMINDER_STORE).put(payload, 'current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadReminderSchedule() {
  try {
    const db = await openReminderDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(REMINDER_STORE, 'readonly');
      const req = tx.objectStore(REMINDER_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

function msUntilNext(time24) {
  const [h, m] = (time24 || '20:00').split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  let diff = target.getTime() - Date.now();
  if (diff <= 0) diff += 24 * 60 * 60 * 1000;
  return diff;
}

let reminderTimer = null;

function fireReminder() {
  // Use personalized data if available, otherwise fallback to generic
  const payload = personalizedPayload || {
    body: "Don't forget to record today's sales. ዛሬውን ሽያጭ ይመዝግቡ።",
  };

  self.registration.showNotification('Gebya', {
    body: payload.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'gebya-daily-reminder',
    vibrate: [100, 50, 100],
    data: { url: '/' },
  });
}

let personalizedPayload = null;

function armReminder(time24) {
  if (reminderTimer) clearTimeout(reminderTimer);
  const tick = () => {
    fireReminder();
    reminderTimer = setTimeout(tick, 24 * 60 * 60 * 1000);
  };
  reminderTimer = setTimeout(tick, msUntilNext(time24));
}

async function rearmFromStorage() {
  const schedule = await loadReminderSchedule();
  if (schedule && schedule.enabled && schedule.time) {
    armReminder(schedule.time);
  }
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'schedule-reminder') {
    saveReminderSchedule({ enabled: !!data.enabled, time: data.time || '20:00' })
      .then(() => {
        if (data.enabled) armReminder(data.time || '20:00');
        else if (reminderTimer) clearTimeout(reminderTimer);
      })
      .catch(() => {});
  } else if (data.type === 'update-reminder-payload') {
    // Client sends personalized reminder data
    personalizedPayload = data.payload || null;
  } else if (data.type === 'gebya-sync') {
    // Background sync request when connectivity returns
    // The sync was queued by the page via navigator.serviceWorker.ready.then(reg => reg.sync.register('gebya-sync'))
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // This handler runs in the Service Worker context
  // The page's syncEngine.js will handle the actual sync when it becomes active
  // We just acknowledge the sync event here and let the page handle it
  // Most sync handling happens in the page via syncEngine
  
  // Option: if we want SW to trigger sync without page active:
  // We can post a message to all clients to trigger sync
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length > 0) {
    // Notify all open clients to run sync
    for (const client of clients) {
      client.postMessage({ type: 'gebya-sync-trigger' });
    }
  }
  // The sync itself happens in the page's syncEngine when it receives this message
}

// Re-arm on SW lifecycle so the reminder survives SW restarts.
self.addEventListener('activate', () => {
  rearmFromStorage().catch(() => {});
});

// ─── Vibration patterns by priority ─────────────────────────────────────────

const VIBRATION_PATTERNS = {
  high: [200, 100, 200, 100, 200],
  normal: [100, 50, 100],
  low: [50],
};

// ─── Web Push ────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Gebya', body: event.data.text() };
  }

  const priority = data.priority || 'normal';
  const vibrate = VIBRATION_PATTERNS[priority] || VIBRATION_PATTERNS.normal;

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'gebya-notification',
    renotify: data.renotify !== false,
    data: data.data || { url: '/' },
    vibrate,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Gebya', options)
  );
});

// ─── Notification click with deep-link + action handling ────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  // If user tapped "Dismiss", just close (already closed above)
  if (action === 'dismiss') {
    return;
  }

  // Deep-link URL: use notification data URL or default to /
  const url = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open and on the same scope
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          // If the notification has a deep-link URL, navigate the existing client
          if (url !== '/' && 'navigate' in client) {
            return client.focus().then(() => client.navigate(url));
          }
          return client.focus();
        }
      }
      // Otherwise open new window at the deep-link URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
