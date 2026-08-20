import { apiFetch } from '../utils/shared-ui.jsx';

export function listTickets({ businessId } = {}) {
  const qs = businessId ? `?business_id=${encodeURIComponent(businessId)}` : '';
  return apiFetch(`/support/tickets${qs}`);
}

export function createTicket({ subject, description, priority }) {
  return apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify({ subject, description, priority }),
  });
}

export function getTicket(id) {
  return apiFetch(`/support/tickets/${id}`);
}

export function replyToTicket(id, body) {
  return apiFetch(`/support/tickets/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export function setTicketStatus(id, status) {
  return apiFetch(`/support/tickets/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}