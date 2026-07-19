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
  self.registration.showNotification('Gebya', {
    body: "Don't forget to record today's sales. ዛሬውን ሽያጭ ይመዝግቡ።",
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'gebya-daily-reminder',
    vibrate: [100, 50, 100],
    data: { url: '/' },
  });
}

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
  if (!data || data.type !== 'schedule-reminder') return;
  saveReminderSchedule({ enabled: !!data.enabled, time: data.time || '20:00' })
    .then(() => {
      if (data.enabled) armReminder(data.time || '20:00');
      else if (reminderTimer) clearTimeout(reminderTimer);
    })
    .catch(() => {});
});

// Re-arm on SW lifecycle so the reminder survives SW restarts.
self.addEventListener('activate', () => {
  rearmFromStorage().catch(() => {});
});

// ─── Web Push ────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Gebya', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'gebya-notification',
    renotify: data.renotify !== false,
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Gebya', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

