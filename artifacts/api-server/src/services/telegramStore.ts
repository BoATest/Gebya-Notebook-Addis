type TelegramLinkSession = {
  token: string;
  customerId: string;
  customerName: string;
  shopName: string;
  currentBalance: number;
  createdAt: number;
  expiresAt: number;
  requestedAt: number;
  linkedAt: number | null;
  chatId: string | null;
  telegramUsername: string | null;
  updatesEnabled: boolean;
  lastMessage: string | null;
  lastReference: string | null;
  lastUpdatedAt: number | null;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const sessions = new Map<string, TelegramLinkSession>();
const chatToToken = new Map<string, string>();

function normalizeAmount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export function upsertTelegramLinkSession(payload: {
  token: string;
  customerId: string;
  customerName: string;
  shopName: string;
  currentBalance?: number;
  updatesEnabled?: boolean;
}) {
  const now = Date.now();
  const existing = sessions.get(payload.token);
  const next: TelegramLinkSession = {
    token: payload.token,
    customerId: payload.customerId,
    customerName: payload.customerName,
    shopName: payload.shopName,
    currentBalance: normalizeAmount(payload.currentBalance),
    createdAt: existing?.createdAt ?? now,
    expiresAt: now + SESSION_TTL_MS,
    requestedAt: existing?.requestedAt ?? now,
    linkedAt: existing?.linkedAt ?? null,
    chatId: existing?.chatId ?? null,
    telegramUsername: existing?.telegramUsername ?? null,
    updatesEnabled: payload.updatesEnabled ?? existing?.updatesEnabled ?? false,
    lastMessage: existing?.lastMessage ?? null,
    lastReference: existing?.lastReference ?? null,
    lastUpdatedAt: existing?.lastUpdatedAt ?? null,
  };
  sessions.set(payload.token, next);
  return next;
}

export function getTelegramLinkSession(token: string) {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    if (session.chatId) chatToToken.delete(session.chatId);
    return null;
  }
  return session;
}

export function linkTelegramChatToSession(payload: {
  token: string;
  chatId: string;
  telegramUsername?: string | null;
}) {
  const session = getTelegramLinkSession(payload.token);
  if (!session) return null;
  const next = {
    ...session,
    linkedAt: Date.now(),
    chatId: payload.chatId,
    telegramUsername: payload.telegramUsername || session.telegramUsername || null,
    lastUpdatedAt: Date.now(),
  };
  sessions.set(payload.token, next);
  chatToToken.set(payload.chatId, payload.token);
  return next;
}

export function syncTelegramCustomerState(payload: {
  token: string;
  customerName?: string;
  shopName?: string;
  currentBalance?: number;
  updatesEnabled?: boolean;
  telegramUsername?: string | null;
  chatId?: string | null;
}) {
  const session = getTelegramLinkSession(payload.token);
  if (!session) return null;
  const next = {
    ...session,
    customerName: payload.customerName || session.customerName,
    shopName: payload.shopName || session.shopName,
    currentBalance: payload.currentBalance != null ? normalizeAmount(payload.currentBalance) : session.currentBalance,
    updatesEnabled: payload.updatesEnabled ?? session.updatesEnabled,
    telegramUsername: payload.telegramUsername ?? session.telegramUsername,
    chatId: payload.chatId ?? session.chatId,
    lastUpdatedAt: Date.now(),
  };
  sessions.set(payload.token, next);
  if (next.chatId) chatToToken.set(next.chatId, next.token);
  return next;
}

export function storeTelegramDelivery(payload: {
  token: string;
  currentBalance: number;
  message: string;
  reference: string;
}) {
  const session = getTelegramLinkSession(payload.token);
  if (!session) return null;
  const next = {
    ...session,
    currentBalance: normalizeAmount(payload.currentBalance),
    lastMessage: payload.message,
    lastReference: payload.reference,
    lastUpdatedAt: Date.now(),
  };
  sessions.set(payload.token, next);
  return next;
}

export function getSessionByChatId(chatId: string) {
  const token = chatToToken.get(chatId);
  if (!token) return null;
  return getTelegramLinkSession(token);
}

export function formatTelegramSessionState(session: TelegramLinkSession | null) {
  if (!session) return 'not_linked';
  if (session.chatId) return session.updatesEnabled ? 'updates_enabled' : 'linked';
  return 'link_pending';
}
