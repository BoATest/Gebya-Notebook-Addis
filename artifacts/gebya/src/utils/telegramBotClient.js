const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || 'Request failed');
    error.payload = data;
    throw error;
  }
  return data;
}

export function fetchTelegramBotStatus() {
  return request('/api/telegram/status');
}

export function createTelegramLinkSession(payload) {
  return request('/api/telegram/link-sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchTelegramLinkSession(token) {
  return request(`/api/telegram/link-sessions/${encodeURIComponent(token)}`);
}

export function syncTelegramCustomerState(payload) {
  return request('/api/telegram/customers/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendTelegramLedgerUpdate(payload) {
  return request('/api/telegram/send-ledger-update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resendLatestTelegramUpdate(payload) {
  return request('/api/telegram/resend-latest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

