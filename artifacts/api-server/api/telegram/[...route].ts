import {
  formatTelegramSessionState,
  getSessionByChatId,
  getTelegramSessionStoreStatus,
  getTelegramLinkSession,
  linkTelegramChatToSession,
  storeTelegramDelivery,
  syncTelegramCustomerState,
  upsertTelegramLinkSession,
} from "../../src/services/telegramStore.js";
import {
  getTelegramBotUsername,
  isTelegramBotConfigured,
  sendTelegramTextMessage,
} from "../../src/services/telegramBotService.js";

function applyCors(req: any, res: any) {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = [
    process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
    ...configuredOrigins,
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (!origin) return;

  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Vary", "Origin");
  }
}

function getJsonBody(req: any) {
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }
  return req.body ?? {};
}

function getPublicApiBase(req: any) {
  const configured = process.env.GEBYA_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return host ? `${proto}://${host}` : "";
}

function createDeepLink(token: string) {
  const botUsername = getTelegramBotUsername();
  if (!botUsername) return null;
  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function asOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseLinkSessionPayload(body: any) {
  const token = asNonEmptyString(body?.token);
  const customerName = asNonEmptyString(body?.customerName);
  const shopName = asNonEmptyString(body?.shopName);
  const customerId =
    typeof body?.customerId === "string" || typeof body?.customerId === "number"
      ? String(body.customerId)
      : null;

  if (!token || token.length < 6 || !customerId || !customerName || !shopName) {
    return null;
  }

  return {
    token,
    customerId,
    customerName,
    shopName,
    currentBalance: asOptionalNumber(body?.currentBalance) ?? 0,
    updatesEnabled: asOptionalBoolean(body?.updatesEnabled) ?? false,
  };
}

function parseSyncPayload(body: any) {
  const token = asNonEmptyString(body?.token);
  if (!token || token.length < 6) return null;

  return {
    token,
    customerName: asOptionalString(body?.customerName) ?? undefined,
    shopName: asOptionalString(body?.shopName) ?? undefined,
    currentBalance: asOptionalNumber(body?.currentBalance),
    updatesEnabled: asOptionalBoolean(body?.updatesEnabled),
    telegramUsername:
      body?.telegramUsername === null ? null : asOptionalString(body?.telegramUsername) ?? undefined,
    chatId: body?.chatId === null ? null : asOptionalString(body?.chatId) ?? undefined,
  };
}

function parseSendPayload(body: any) {
  const token = asNonEmptyString(body?.token);
  const message = asNonEmptyString(body?.message);
  const reference = asNonEmptyString(body?.reference);
  const currentBalance = asOptionalNumber(body?.currentBalance);

  if (!token || token.length < 6 || message == null || reference == null || currentBalance == null) {
    return null;
  }

  return {
    token,
    currentBalance,
    message,
    reference,
  };
}

function buildStartReply(session: ReturnType<typeof getTelegramLinkSession>) {
  if (!session) {
    return [
      "Gebya",
      "",
      "This link is no longer valid.",
      "Ask the shop owner to generate a new Telegram link.",
    ].join("\n");
  }

  return [
    `${session.shopName}`,
    "",
    `Borrower linked for ${session.customerName}.`,
    "You can now receive Dubie and payment updates here.",
    "",
    "Use /balance any time to check your latest balance.",
  ].join("\n");
}

function buildBalanceReply(session: ReturnType<typeof getTelegramLinkSession>) {
  if (!session) {
    return [
      "Gebya",
      "",
      "No linked customer record was found for this chat.",
      "Ask the shop owner to share the Telegram QR link again.",
    ].join("\n");
  }

  return [
    `${session.shopName}`,
    "",
    `${session.customerName}`,
    `Current balance: ${session.currentBalance.toFixed(2)} ETB`,
    session.lastReference ? `Latest ref: ${session.lastReference}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req: any, res: any) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  const route = pathname.replace(/^\/api\/telegram\/?/, "");

  try {
    if (req.method === "GET" && route === "status") {
      const store = getTelegramSessionStoreStatus();
      return res.status(200).json({
        configured: isTelegramBotConfigured(),
        bot_username: getTelegramBotUsername() || null,
        linking_available: store.linkingAvailable,
        updates_available: isTelegramBotConfigured(),
        session_store: store.mode,
        session_persistent: store.persistent,
        warning: store.reason,
      });
    }

    if (req.method === "POST" && route === "link-sessions") {
      const store = getTelegramSessionStoreStatus();
      if (!store.linkingAvailable) {
        return res.status(503).json({
          error: store.reason || "Telegram linking is unavailable",
          session_store: store.mode,
        });
      }

      const input = parseLinkSessionPayload(getJsonBody(req));
      if (!input) {
        return res.status(400).json({ error: "Invalid link session payload" });
      }

      const session = upsertTelegramLinkSession({
        token: input.token,
        customerId: input.customerId,
        customerName: input.customerName,
        shopName: input.shopName,
        currentBalance: input.currentBalance,
        updatesEnabled: input.updatesEnabled,
      });
      const deepLink = createDeepLink(session.token);

      return res.status(200).json({
        token: session.token,
        state: formatTelegramSessionState(session),
        deep_link: deepLink,
        qr_value: deepLink,
        webhook_url: getPublicApiBase(req) ? `${getPublicApiBase(req)}/api/telegram/webhook` : null,
        bot_username: getTelegramBotUsername() || null,
        requested_at: session.requestedAt,
        linked_at: session.linkedAt,
        telegram_username: session.telegramUsername,
        chat_id: session.chatId,
        current_balance: session.currentBalance,
      });
    }

    if (req.method === "GET" && route.startsWith("link-sessions/")) {
      const token = decodeURIComponent(route.slice("link-sessions/".length));
      const session = getTelegramLinkSession(token);
      if (!session) {
        return res.status(404).json({ error: "Link session not found" });
      }

      return res.status(200).json({
        token: session.token,
        state: formatTelegramSessionState(session),
        deep_link: createDeepLink(session.token),
        qr_value: createDeepLink(session.token),
        requested_at: session.requestedAt,
        linked_at: session.linkedAt,
        telegram_username: session.telegramUsername,
        chat_id: session.chatId,
        current_balance: session.currentBalance,
        last_reference: session.lastReference,
      });
    }

    if (req.method === "POST" && route === "customers/sync") {
      const input = parseSyncPayload(getJsonBody(req));
      if (!input) {
        return res.status(400).json({ error: "Invalid sync payload" });
      }

      const session = syncTelegramCustomerState(input);
      if (!session) {
        return res.status(404).json({ error: "Customer link session not found" });
      }

      return res.status(200).json({
        token: session.token,
        state: formatTelegramSessionState(session),
        linked_at: session.linkedAt,
        chat_id: session.chatId,
        telegram_username: session.telegramUsername,
        current_balance: session.currentBalance,
      });
    }

    if (req.method === "POST" && route === "send-ledger-update") {
      const input = parseSendPayload(getJsonBody(req));
      if (!input) {
        return res.status(400).json({ error: "Invalid Telegram message payload" });
      }

      const session = getTelegramLinkSession(input.token);
      if (!session) {
        return res.status(404).json({ error: "Customer link session not found" });
      }

      storeTelegramDelivery({
        token: input.token,
        currentBalance: input.currentBalance,
        message: input.message,
        reference: input.reference,
      });

      if (!session.chatId) {
        return res.status(200).json({
          delivered: false,
          delivery: "unlinked",
          state: formatTelegramSessionState(session),
        });
      }

      try {
        await sendTelegramTextMessage(session.chatId, input.message);
        return res.status(200).json({
          delivered: true,
          delivery: "bot",
          state: formatTelegramSessionState(getTelegramLinkSession(input.token)),
        });
      } catch (error) {
        return res.status(502).json({
          delivered: false,
          delivery: "bot",
          error: error instanceof Error ? error.message : "Telegram send failed",
          state: formatTelegramSessionState(getTelegramLinkSession(input.token)),
        });
      }
    }

    if (req.method === "POST" && route === "resend-latest") {
      const body = getJsonBody(req);
      const token = String(body?.token || "");
      const session = getTelegramLinkSession(token);
      if (!session) {
        return res.status(404).json({ error: "Customer link session not found" });
      }
      if (!session.chatId || !session.lastMessage) {
        return res.status(400).json({ error: "No linked borrower message to resend" });
      }

      try {
        await sendTelegramTextMessage(session.chatId, session.lastMessage);
        return res.status(200).json({
          delivered: true,
          delivery: "bot",
          state: formatTelegramSessionState(session),
        });
      } catch (error) {
        return res.status(502).json({
          delivered: false,
          delivery: "bot",
          error: error instanceof Error ? error.message : "Telegram resend failed",
          state: formatTelegramSessionState(session),
        });
      }
    }

    if (req.method === "POST" && route === "webhook") {
      const update = getJsonBody(req) ?? {};
      const message = update.message ?? update.edited_message ?? null;
      const chatId = message?.chat?.id ? String(message.chat.id) : null;
      const text = String(message?.text || "").trim();
      const username = message?.from?.username ? `@${message.from.username}` : null;

      if (!chatId || !text) {
        return res.status(200).json({ ok: true });
      }

      if (text.startsWith("/start")) {
        const token = text.split(/\s+/)[1] || "";
        const session = linkTelegramChatToSession({
          token,
          chatId,
          telegramUsername: username,
        });

        try {
          await sendTelegramTextMessage(chatId, buildStartReply(session));
        } catch {}

        return res.status(200).json({
          ok: true,
          linked: Boolean(session),
        });
      }

      if (text.startsWith("/balance")) {
        const session = getSessionByChatId(chatId);
        try {
          await sendTelegramTextMessage(chatId, buildBalanceReply(session));
        } catch {}
        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
