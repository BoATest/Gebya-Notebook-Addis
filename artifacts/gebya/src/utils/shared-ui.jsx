import { getAuthToken } from './syncEngine';
import { useAuthStore } from '../stores/authStore';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

export async function apiFetch(path, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const bizId = useAuthStore.getState?.().currentBusinessId;
    if (bizId) headers['x-business-id'] = String(bizId);
  } catch {}

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
      credentials: 'include',
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function initialsOf(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const AVATAR_GRADIENTS = {
  A: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  B: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  C: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
  D: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  E: 'linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)',
  F: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
  G: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
  H: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
  I: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
  J: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
  K: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
  L: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
  M: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  N: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
  O: 'linear-gradient(135deg, #d946ef 0%, #a21caf 100%)',
  P: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
  Q: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
  R: 'linear-gradient(135deg, #6366f1 0%, #3730a3 100%)',
  S: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  T: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  U: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  V: 'linear-gradient(135deg, #f43f5e 0%, #9f1239 100%)',
  W: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
  X: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
  Y: 'linear-gradient(135deg, #f97316 0%, #9a3412 100%)',
  Z: 'linear-gradient(135deg, #ec4899 0%, #831843 100%)',
};

export function gradientFor(name) {
  const init = initialsOf(name);
  return AVATAR_GRADIENTS[init[0]] || AVATAR_GRADIENTS.A;
}

export function handleNumericInput(e, setter) {
  let raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = raw.split('.');
  if (parts.length > 2) raw = `${parts[0]}.${parts.slice(1).join('')}`;
  setter(raw);
}

export function bigramSimilarity(a, b) {
  if (!a || !b) return 0;
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\u1200-\u137f\u1380-\u139f\u2d80-\u2ddf\uab00-\uab2f]/gu, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigrams = (s) => {
    const set = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.substring(i, i + 2);
      set.set(bg, (set.get(bg) || 0) + 1);
    }
    return set;
  };

  const aBi = bigrams(na);
  const bBi = bigrams(nb);
  let intersection = 0;
  for (const [bg, count] of aBi) {
    if (bBi.has(bg)) intersection += Math.min(count, bBi.get(bg));
  }
  return (2 * intersection) / (na.length - 1 + (nb.length - 1));
}

export const ROLE_BADGE = {
  owner: { label: 'Owner', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  manager: { label: 'Manager', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  cashier: { label: 'Sales Staff', bg: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' },
  viewer: { label: 'Auditor', bg: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' },
};

export function RoleBadge({ role }) {
  const style = ROLE_BADGE[role] || ROLE_BADGE.viewer;
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: style.bg, color: style.color }}>
      {style.label}
    </span>
  );
}