const AUTH_API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';

export { getAuthToken } from './syncEngine';

// ─── Silent token refresh ───
//
// Long-lived tokens (1y for owners, 30d for staff) can still go stale before
// the client knows about it (forced revocation, clock drift, server config
// change). The /api/auth/refresh endpoint accepts an expired token within
// (TTL + REFRESH_WINDOW) and returns a new one. Callers wrap any server
// fetch with `withFreshToken` so a 401 transparently renews and retries.
//
// The dedupe: if N concurrent requests all see 401 simultaneously, they all
// await the same in-flight refresh promise — not N parallel refresh calls.
let _refreshInFlight = null;
export function _resetRefreshForTest() {
  _refreshInFlight = null;
}

export async function ensureFreshToken() {
  if (_refreshInFlight) return _refreshInFlight;
  _refreshInFlight = (async () => {
    const { getAuthToken, setAuthToken } = await import('./syncEngine.js');
    const current = await getAuthToken();
    const res = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(current ? { Authorization: `Bearer ${current}` } : {}),
      },
      credentials: 'include',
    });
    if (!res.ok) {
      const err = new Error(`refresh_failed_${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    if (data?.token) await setAuthToken(data.token);
    return data;
  })().finally(() => {
    _refreshInFlight = null;
  });
  return _refreshInFlight;
}

/**
 * Wrap a fetch call: on 401, try one silent refresh and retry the original
 * request with the new bearer. Bounded — never loops. Concurrent 401s share
 * a single in-flight refresh.
 */
export async function authedFetch(url, options = {}) {
  const { getAuthToken } = await import('./syncEngine.js');
  const doFetch = async () => {
    const token = await getAuthToken();
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
  };

  const res = await doFetch();
  if (res.status !== 401) return res;
  try {
    await ensureFreshToken();
  } catch {
    return res; // refresh failed; surface the original 401
  }
  return doFetch(); // retry once with the new token
}

// ─── Request OTP ───
export async function requestOtp(phoneNumber) {
  const res = await fetch(`${AUTH_API_BASE}/auth/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Failed to send OTP');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Verify OTP ───
export async function verifyOtp(phoneNumber, otp) {
  const res = await fetch(`${AUTH_API_BASE}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, otp: String(otp).trim() }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Invalid OTP');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Link device ───
export async function linkDevice(token, deviceId, deviceName) {
  const res = await fetch(`${AUTH_API_BASE}/auth/link-device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ device_id: deviceId, device_name: deviceName || null }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Failed to link device');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Get current user ───
export async function getCurrentUser(token) {
  const res = await fetch(`${AUTH_API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Failed to get user');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Login with phone password ───
export async function loginWithPassword(phoneNumber, password) {
  const res = await fetch(`${AUTH_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Login failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Set password (requires auth token) ───
export async function setPassword(token, password) {
  const res = await fetch(`${AUTH_API_BASE}/auth/set-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Failed to set password');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Remove password (requires auth token) ───
export async function removePassword(token) {
  const res = await fetch(`${AUTH_API_BASE}/auth/remove-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Failed to remove password');
    err.status = res.status;
    throw err;
  }
  return data;
}
