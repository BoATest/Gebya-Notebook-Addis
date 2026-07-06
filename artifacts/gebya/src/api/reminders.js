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

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const remindersApi = {
  async getHistory({
    shopId,
    customerId,
    limit = 20,
    offset = 0,
    fromDate,
    toDate,
  }) {
    const params = new URLSearchParams();
    params.set('shopId', String(shopId));
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    if (customerId) params.set('customerId', String(customerId));
    if (fromDate != null) params.set('fromDate', String(fromDate));
    if (toDate != null) params.set('toDate', String(toDate));
    return request(`/reminders/history?${params.toString()}`);
  },
};

export default remindersApi;
