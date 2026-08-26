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
  type TelegramLinkSession,
} from "../services/telegramStore.js";
import {
  getTelegramBotUsername,
  isTelegramBotConfigured,
  sendTelegramTextMessage,
} from "../services/telegramBotService.js";
import { getLatestQueuedReminderForCustomer, acknowledgeReminder } from "../services/reminderHistory.js";
import { sendPushToOwner } from "../services/pushNotificationSender.js";
import { setLastReminderSentAt } from "../services/reminderConfiguration.js";
import { db, requireDb } from "@workspace/db";
import { customers, businessMembers, notifications, users } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyShopOwnership } from "./rbac.js";
import { getPublicApiBase, createDeepLink, pickLang, buildStartReply, buildBalanceReply, buildHelpReply, buildPaidReply, buildFallbackReply, type Lang } from "./telegramHelpers.js";

const linkSessionSchema = z.object({
  shopId: z.number().int().positive(),
  token: z.string(),
  customerId: z.union([z.string(), z.number()]),
  customerName: z.string(),
  shopName: z.string(),
  currentBalance: z.number().optional(),
  updatesEnabled: z.boolean().optional(),
});

const syncSchema = z.object({
  token: z.string(),
  customer_id: z.union([z.string(), z.number()]),
  balance: z.number(),
  last_transaction_at: z.number().optional(),
});

const sendSchema = z.object({
  token: z.string(),
  chat_id: z.union([z.string(), z.number()]),
  message: z.string(),
  currentBalance: z.number(),
  reference: z.string(),
});

const router = Router();

// ─── secret verification ────────────────────────────────────────────────

function verifyTelegramWebhookSecret(req: Request, res: Response, next: Function) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) {
    console.error("[security] TELEGRAM_WEBHOOK_SECRET is not set — refusing unauthenticated Telegram webhook requests");
    return res.status(500).json({
      error: "Server misconfigured: TELEGRAM_WEBHOOK_SECRET environment variable is not set",
    });
  }

  const receivedSecret = req.headers["x-telegram-bot-api-secret-token"] as string | undefined | null;
  if (!receivedSecret || receivedSecret !== expectedSecret) {
    return res.status(401).json({ error: "unauthorized" });
  }

  return next();
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

router.post("/link-sessions", verifyShopOwnership, async (req: Request, res: Response) => {
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
  const session = await upsertTelegramLinkSession({
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

router.get("/link-sessions/:token", async (req: Request, res: Response) => {
  const session = await getTelegramLinkSession(String(req.params.token || ""));
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

router.post("/customers/sync",
  verifyTelegramWebhookSecret,
  async (req: Request, res: Response) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid sync payload" });
  }

  const session = await syncTelegramCustomerState(parsed.data);
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
  const session = await getTelegramLinkSession(input.token);
  if (!session) {
    return res.status(404).json({ error: "Customer link session not found" });
  }

  await storeTelegramDelivery({
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
      state: formatTelegramSessionState(await getTelegramLinkSession(input.token)),
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
      error: "Telegram send failed",
      request_id: res.locals.requestId,
      state: formatTelegramSessionState(await getTelegramLinkSession(input.token)),
    });
  }
});

router.post("/resend-latest", async (req: Request, res: Response) => {
  const token = String(req.body?.token || "");
  const session = await getTelegramLinkSession(token);
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
      error: "Telegram resend failed",
      request_id: res.locals.requestId,
      state: formatTelegramSessionState(session),
    });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  // Phase 5: Verify Telegram webhook secret token — fail closed if not configured
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) {
    console.error("[security] TELEGRAM_WEBHOOK_SECRET is not configured — rejecting webhook request");
    return res.status(500).json({ error: "Webhook not configured" });
  }
  const receivedSecret = req.headers["x-telegram-bot-api-secret-token"] as string | undefined;
  if (receivedSecret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const update = req.body ?? {};
  const message = update.message ?? update.edited_message ?? null;
  const chatId = message?.chat?.id ? String(message.chat.id) : null;
  const text = String(message?.text || "").trim();
  const username = message?.from?.username ? `@${message.from.username}` : null;
  // Q3: detect language from the user's Telegram client (am | en).
  const lang: Lang = pickLang(message?.from?.language_code);

  if (!chatId || !text) {
    return res.json({ ok: true });
  }

  // Phase 2: parse command + arg. "/start abc" → ["/start", "abc"]
  const [rawCmd, ...args] = text.split(/\s+/);
  const cmd = (rawCmd || "").toLowerCase();
  const arg = args.join(" ").trim() || null;

  // ─── /start [TOKEN] ───────────────────────────────────────────────
  if (cmd === "/start") {
    const hadToken = !!arg;
    const newlyLinkedSession = hadToken
      ? await linkTelegramChatToSession({
          token: arg as string,
          chatId,
          telegramUsername: username,
        })
      : null;
    const existingSession = await getSessionByChatId(chatId);

    // Owner deep-link: an admin-generated token that connects this Telegram chat
    // to the owner's Gebya user account (so the platform can reach them).
    let ownerLinked = false;
    if (hadToken) {
      const d = requireDb();
      const ownerRows = await d.select().from(users).where(eq(users.telegramLinkToken, arg as string)).limit(1);
      const ownerUser = ownerRows[0];
      if (ownerUser) {
        await d.update(users).set({ telegramChatId: chatId, telegramLinkToken: null }).where(eq(users.id, ownerUser.id));
        ownerLinked = true;
      }
    }

    const reply = ownerLinked
      ? (lang === "am"
          ? "✅ ከጌባያ አስተዳዳሪ ጋር ተገናኝተዋል። ከአሁን ጀምሮ ማስታወሻዎችን በቴሌግራም ይቀበላሉ።"
          : "✅ You're connected to Gebya as the shop owner. You'll now receive updates on Telegram.")
      : buildStartReply(newlyLinkedSession, existingSession, hadToken, lang);

    try {
      await sendTelegramTextMessage(chatId, reply);
    } catch (error) {
      console.error("[telegram:webhook:start]", {
        token: arg,
        chatId,
        lang,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Telegram webhook reply failed",
      });
    }

    return res.json({
      ok: true,
      linked: Boolean(newlyLinkedSession || existingSession || ownerLinked),
      ownerLinked,
    });
  }

  // ─── /balance ────────────────────────────────────────────────────
  if (cmd === "/balance") {
    const session = await getSessionByChatId(chatId);
    try {
      await sendTelegramTextMessage(chatId, buildBalanceReply(session, lang));
    } catch (error) {
      console.error("[telegram:webhook:balance]", {
        chatId,
        lang,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Telegram balance reply failed",
      });
    }
    return res.json({ ok: true });
  }

  // ─── /help ──────────────────────────────────────────────────────
  if (cmd === "/help") {
    const session = await getSessionByChatId(chatId);
    try {
      await sendTelegramTextMessage(chatId, buildHelpReply(Boolean(session), lang));
    } catch (error) {
      console.error("[telegram:webhook:help]", {
        chatId,
        lang,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Telegram help reply failed",
      });
    }
    return res.json({ ok: true });
  }

  // ─── /unsubscribe ─────────────────────────────────────────────
  if (cmd === "/unsubscribe") {
    const session = await getSessionByChatId(chatId);
    if (session) {
      try {
        await syncTelegramCustomerState({
          token: session.token,
          updatesEnabled: false,
        });
      } catch (error) {
        console.error("[telegram:webhook:unsubscribe]", {
          chatId,
          requestId: res.locals.requestId,
          message: error instanceof Error ? error.message : "Unsubscribe failed",
        });
        return res.status(500).json({
          ok: false,
          error: "Failed to unsubscribe",
          request_id: res.locals.requestId,
        });
      }
    }
    const message =
      lang === "am"
          ? "👋 ዛሬ ከዚህ በኋላ ማስታወሻዎች አንሰበርሙም። /subscribe ምትያብ ለእንደገና ማገናኘት።"
        : "👋 You won't receive reminders anymore. Type /subscribe to opt back in.";
    try {
      await sendTelegramTextMessage(chatId, message);
    } catch (error) {
      console.error("[telegram:webhook:unsubscribe:reply]", {
        chatId,
        lang,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Reply failed",
      });
    }
    return res.json({ ok: true, unsubscribed: Boolean(session) });
  }

  // ─── /subscribe ────────────────────────────────────────────────
  if (cmd === "/subscribe") {
    const session = await getSessionByChatId(chatId);
    if (session) {
      try {
        await syncTelegramCustomerState({
          token: session.token,
          updatesEnabled: true,
        });
      } catch (error) {
        console.error("[telegram:webhook:subscribe]", {
          chatId,
          requestId: res.locals.requestId,
          message: error instanceof Error ? error.message : "Subscribe failed",
        });
        return res.status(500).json({
          ok: false,
          error: "Failed to subscribe",
          request_id: res.locals.requestId,
        });
      }
    }
    const message =
      lang === "am"
        ? "✅ ዛሬ ወደ ዋናው ተሳክተዋል! ማስታወሻዎች ሊተገብሩ ይችላሉ።"
        : "✅ You're back! You'll receive reminders again.";
    try {
      await sendTelegramTextMessage(chatId, message);
    } catch (error) {
      console.error("[telegram:webhook:subscribe:reply]", {
        chatId,
        lang,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Reply failed",
      });
    }
    return res.json({ ok: true, subscribed: Boolean(session) });
  }

  // ─── /paid [amount] ────────────────────────────────────────────
  if (cmd === "/paid") {
    const session = await getSessionByChatId(chatId);
    try {
      await sendTelegramTextMessage(chatId, buildPaidReply(session, arg, lang));
    } catch (error) {
      console.error("[telegram:webhook:paid]", {
        chatId,
        lang,
        requestId: res.locals.requestId,
        message: error instanceof Error ? error.message : "Telegram paid reply failed",
      });
    }

    // Record customer acknowledgement in reminder history.
    // We intentionally do not modify balances here — that happens
    // when the shop owner records the payment in Gebya.
    let customerNameForNotify = "Customer";
    try {
      if (!db) throw new Error("Database not configured");
      if (session?.customerId) {
        customerNameForNotify = session.customerName || `Customer ${session.customerId}`;
        const latest = await getLatestQueuedReminderForCustomer(Number(session.customerId));
        if (latest && !latest.acknowledged) {
          await acknowledgeReminder(latest.id);
          console.log("[telegram:webhook:paid:ack]", {
            customerId: session.customerId,
            reminderId: latest.id,
            chatId,
          });
        }

        // Notify shop owner that customer claims to have paid
        const customerRow = await db
          .select({ businessId: customers.businessId })
          .from(customers)
          .where(eq(customers.id, Number(session.customerId)))
          .limit(1);

        if (customerRow[0]?.businessId) {
          const businessId = customerRow[0].businessId;
          const amount = arg || "unknown";
          const notifName = customerNameForNotify;

          // Cooling-off grace period: pause reminders for this customer
          // so they don't get nagged while the owner confirms payment.
          // Reminders resume after the frequency window (default: 1 week).
          try {
            await setLastReminderSentAt(businessId, Number(session.customerId), Date.now());
            console.log("[telegram:webhook:paid:grace]", {
              customerId: session.customerId,
              businessId,
            });
          } catch (graceError) {
            console.error("[telegram:webhook:paid:grace]", {
              error: graceError instanceof Error ? graceError.message : String(graceError),
            });
          }

          // Look up owner userId
          const ownerRows = await db
            .select({ userId: businessMembers.userId })
            .from(businessMembers)
            .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.role, "owner"), eq(businessMembers.active, true)))
            .limit(1);
          const ownerUserId = ownerRows[0]?.userId;

          if (ownerUserId) {
            // Create in-app notification
            await db.insert(notifications).values({
              businessId,
              ownerUserId,
              type: "payment_claimed",
              title: "Payment claimed",
              body: `${notifName} says they paid ${amount} — confirm in app`,
              entityType: "customer",
              entityId: String(session.customerId),
              actorName: notifName,
              amount: amount !== "unknown" ? String(amount) : null,
              read: false,
              createdAt: new Date(),
            } as any);

            // Send web push to owner
            sendPushToOwner(businessId, {
              title: "💰 Payment claimed",
              body: `${notifName} says they paid ${amount} — tap to confirm`,
              type: "payment_claimed",
              id: Date.now(),
            }).catch(() => {});
          }
        }
      }
    } catch (ackError) {
      console.error("[telegram:webhook:paid:ack]", {
        chatId,
        error: ackError instanceof Error ? ackError.message : String(ackError),
      });
    }

    return res.json({ ok: true });
  }

  // ─── Fallback for anything else ──────────────────────────────────
  const session = await getSessionByChatId(chatId);
  try {
    await sendTelegramTextMessage(chatId, buildFallbackReply(Boolean(session), lang));
  } catch (error) {
    console.error("[telegram:webhook:fallback]", {
      chatId,
      lang,
      text: text.slice(0, 80),
      requestId: res.locals.requestId,
      message: error instanceof Error ? error.message : "Telegram fallback reply failed",
    });
  }
  return res.json({ ok: true });
});

export default router;
