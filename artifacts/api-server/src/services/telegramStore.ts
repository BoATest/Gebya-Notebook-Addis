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
const sessionStoreMode = process.env.TELEGRAM_SESSION_STORE?.trim() || "memory";
const isServerlessEnvironment = process.env.VERCEL === "1";

function normalizeAmount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

export function getTelegramSessionStoreStatus() {
  const persistent = sessionStoreMode !== "memory";
  const linkingAvailable =
    persistent || !isServerlessEnvironment || process.env.ALLOW_EPHEMERAL_TELEGRAM_LINKING === "true";

  return {
    mode: sessionStoreMode,
    persistent,
    linkingAvailable,
    reason:
      linkingAvailable
        ? null
        : "Telegram QR linking is disabled on stateless deployments without persistent session storage.",
  };
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
  if (!session && !payload.chatId) return null;
  const fallback = !session && payload.chatId
    ? upsertTelegramLinkSession({
        token: payload.token,
        customerId: "unknown",
        customerName: payload.customerName || "Customer",
        shopName: payload.shopName || "Gebya",
        currentBalance: payload.currentBalance,
        updatesEnabled: payload.updatesEnabled,
      })
    : null;
  const baseSession = session || fallback;
  if (!baseSession) return null;
  const next = {
    ...baseSession,
    customerName: payload.customerName || baseSession.customerName,
    shopName: payload.shopName || baseSession.shopName,
    currentBalance: payload.currentBalance != null ? normalizeAmount(payload.currentBalance) : baseSession.currentBalance,
    updatesEnabled: payload.updatesEnabled ?? baseSession.updatesEnabled,
    telegramUsername: payload.telegramUsername ?? baseSession.telegramUsername,
    chatId: payload.chatId ?? baseSession.chatId,
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
