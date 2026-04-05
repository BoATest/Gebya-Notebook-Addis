import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  formatTelegramSessionState,
  getSessionByChatId,
  getTelegramSessionStoreStatus,
  getTelegramLinkSession,
  linkTelegramChatToSession,
  storeTelegramDelivery,
  syncTelegramCustomerState,
  upsertTelegramLinkSession,
} from "../services/telegramStore.js";
import {
  getTelegramBotUsername,
  isTelegramBotConfigured,
  sendTelegramTextMessage,
} from "../services/telegramBotService.js";

const router = Router();

const linkSessionSchema = z.object({
  token: z.string().min(6),
  customerId: z.union([z.string(), z.number()]),
  customerName: z.string().min(1),
  shopName: z.string().min(1),
  currentBalance: z.number().optional(),
  updatesEnabled: z.boolean().optional(),
});

const syncSchema = z.object({
  token: z.string().min(6),
  customerName: z.string().optional(),
  shopName: z.string().optional(),
  currentBalance: z.number().optional(),
  updatesEnabled: z.boolean().optional(),
  telegramUsername: z.string().nullable().optional(),
  chatId: z.string().nullable().optional(),
});

const sendSchema = z.object({
  token: z.string().min(6),
  currentBalance: z.number(),
  message: z.string().min(1),
  reference: z.string().min(1),
});

function getPublicApiBase(req: Request) {
  const configured = process.env.GEBYA_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.headers.host;
  return host ? `${proto}://${host}` : "";
}

function createDeepLink(token: string) {
  const botUsername = getTelegramBotUsername();
  if (!botUsername) return null;
  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
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
    `🏪 ${session.shopName}`,
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
    `🏪 ${session.shopName}`,
    "",
    `👤 ${session.customerName}`,
    `💰 Current balance: ${session.currentBalance.toFixed(2)} ETB`,
    session.lastReference ? `🔢 Latest ref: ${session.lastReference}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

router.get("/status", (_req: Request, res: Response) => {
  const store = getTelegramSessionStoreStatus();

  res.json({
    configured: isTelegramBotConfigured(),
    bot_username: getTelegramBotUsername() || null,
    linking_available: store.linkingAvailable,
    updates_available: isTelegramBotConfigured(),
    session_store: store.mode,
    session_persistent: store.persistent,
    warning: store.reason,
  });
});

router.post("/link-sessions", (req: Request, res: Response) => {
  const store = getTelegramSessionStoreStatus();
  if (!store.linkingAvailable) {
    return res.status(503).json({
      error: store.reason || "Telegram linking is unavailable",
      session_store: store.mode,
    });
  }

  const parsed = linkSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid link session payload" });
  }

  const input = parsed.data;
  const session = upsertTelegramLinkSession({
    token: input.token,
    customerId: String(input.customerId),
    customerName: input.customerName.trim(),
    shopName: input.shopName.trim(),
    currentBalance: input.currentBalance ?? 0,
    updatesEnabled: input.updatesEnabled ?? false,
  });
  const deepLink = createDeepLink(session.token);

  return res.json({
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
});

router.get("/link-sessions/:token", (req: Request, res: Response) => {
  const session = getTelegramLinkSession(String(req.params.token || ""));
  if (!session) {
    return res.status(404).json({ error: "Link session not found" });
  }

  return res.json({
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
});

router.post("/customers/sync", (req: Request, res: Response) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid sync payload" });
  }

  const session = syncTelegramCustomerState(parsed.data);
  if (!session) {
    return res.status(404).json({ error: "Customer link session not found" });
  }

  return res.json({
    token: session.token,
    state: formatTelegramSessionState(session),
    linked_at: session.linkedAt,
    chat_id: session.chatId,
    telegram_username: session.telegramUsername,
    current_balance: session.currentBalance,
  });
});

router.post("/send-ledger-update", async (req: Request, res: Response) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid Telegram message payload" });
  }

  const input = parsed.data;
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
    return res.json({
      delivered: false,
      delivery: "unlinked",
      state: formatTelegramSessionState(session),
    });
  }

  try {
    await sendTelegramTextMessage(session.chatId, input.message);
    return res.json({
      delivered: true,
      delivery: "bot",
      state: formatTelegramSessionState(getTelegramLinkSession(input.token)),
    });
  } catch (error) {
    console.error("[telegram:send-ledger-update]", {
      token: input.token,
      requestId: res.locals.requestId,
      message: error instanceof Error ? error.message : "Telegram send failed",
    });

    return res.status(502).json({
      delivered: false,
      delivery: "bot",
      error: error instanceof Error ? error.message : "Telegram send failed",
      state: formatTelegramSessionState(getTelegramLinkSession(input.token)),
    });
  }
});

router.post("/resend-latest", async (req: Request, res: Response) => {
  const token = String(req.body?.token || "");
  const session = getTelegramLinkSession(token);
  if (!session) {
    return res.status(404).json({ error: "Customer link session not found" });
  }
  if (!session.chatId || !session.lastMessage) {
    return res.status(400).json({ error: "No linked borrower message to resend" });
  }

  try {
    await sendTelegramTextMessage(session.chatId, session.lastMessage);
    return res.json({
      delivered: true,
      delivery: "bot",
      state: formatTelegramSessionState(session),
    });
  } catch (error) {
    console.error("[telegram:resend-latest]", {
      token,
      requestId: res.locals.requestId,
      message: error instanceof Error ? error.message : "Telegram resend failed",
    });

    return res.status(502).json({
      delivered: false,
      delivery: "bot",
      error: error instanceof Error ? error.message : "Telegram resend failed",
      state: formatTelegramSessionState(session),
    });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  const update = req.body ?? {};
  const message = update.message ?? update.edited_message ?? null;
  const chatId = message?.chat?.id ? String(message.chat.id) : null;
  const text = String(message?.text || "").trim();
  const username = message?.from?.username ? `@${message.from.username}` : null;

  if (!chatId || !text) {
    return res.json({ ok: true });
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
    } catch (error) {
      console.error("[telegram:webhook:start]", {
        token,
        chatId,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Telegram webhook reply failed",
      });
    }

    return res.json({
      ok: true,
      linked: Boolean(session),
    });
  }

  if (text.startsWith("/balance")) {
    const session = getSessionByChatId(chatId);
    try {
      await sendTelegramTextMessage(chatId, buildBalanceReply(session));
    } catch (error) {
      console.error("[telegram:webhook:balance]", {
        chatId,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Telegram balance reply failed",
      });
    }
    return res.json({ ok: true });
  }

  return res.json({ ok: true });
});

export default router;
