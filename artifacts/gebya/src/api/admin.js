import { apiFetch } from '../utils/shared-ui.jsx';

export function resetSmsQuota(businessId) {
  return apiFetch(`/admin/shops/${businessId}/reset-sms-quota`, { method: 'POST' });
}

export function addShopNote(businessId, note) {
  return apiFetch(`/admin/shops/${businessId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
}

export function nudgeOwner(businessId, message) {
  return apiFetch(`/admin/shops/${businessId}/nudge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message ? { message } : {}),
  });
}

export function resendReminders(businessId) {
  return apiFetch(`/admin/shops/${businessId}/resend-reminders`, {
    method: 'POST',
  });
}

export function listAdminMembers() {
  return apiFetch('/admin/members');
}

export function addAdminMember({ phone, email, note } = {}) {
  return apiFetch('/admin/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone || null, email: email || null, note: note || null }),
  });
}

export function removeAdminMember(id) {
  return apiFetch(`/admin/members/${id}`, { method: 'DELETE' });
}

export function listAdminLogs({ limit = 50, offset = 0 } = {}) {
  return apiFetch(`/admin/logs?limit=${limit}&offset=${offset}`);
}
