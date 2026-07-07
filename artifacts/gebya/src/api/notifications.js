const BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = options.token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const notificationsApi = {
  async getVapidKey() {
    return request('/push/vapid-key');
  },

  async subscribe({ endpoint, p256dh, auth }, token) {
    return request('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint, p256dh, auth }),
      token,
    });
  },

  async unsubscribe(endpoint, token) {
    return request('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
      token,
    });
  },

  async sendTest(token) {
    return request('/push/test', { method: 'POST', token });
  },

  async list({ limit = 50, offset = 0 } = {}, token) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    return request(`/notifications?${params}`, { token });
  },

  async unreadCount(token) {
    return request('/notifications/unread-count', { token });
  },

  async markRead(id, token) {
    return request(`/notifications/${id}/read`, { method: 'POST', token });
  },

  async markAllRead(token) {
    return request('/notifications/read-all', { method: 'POST', token });
  },

  // Helper: subscribe to push using the browser Push API
  async requestPushSubscription(token) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { supported: false };
    }
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await this.getVapidKey();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const subJson = sub.toJSON();
    await this.subscribe({
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
    }, token);
    return { supported: true, subscribed: true };
  },
};
