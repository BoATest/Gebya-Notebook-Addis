const AUTH_API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';

export { getAuthToken } from './syncEngine';

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
