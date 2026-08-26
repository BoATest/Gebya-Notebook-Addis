/**
 * Telegram Automated Reminders — API Routes
 *
 * Endpoints:
 *   POST /run              — Cron trigger to execute daily reminders
 *   GET  /config           — Get shop default reminder frequency
 *   POST /config           — Set shop default reminder frequency
 *   GET  /config/:customerId — Get customer-specific override
 *   POST /config/:customerId — Set customer-specific override
 *   GET  /history          — Query reminder history
 *   POST /test/:customerId — Send manual test reminder
 *   POST /pause            — Pause all reminders
 *   POST /resume           — Resume all reminders
 */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { safeEqual } from "../lib/secure.js";
import {
  getShopDefault,
  setShopDefault,
  getCustomerFrequency,
  setCustomerFrequency,
  clearCustomerOverride,
  isRemindersEnabled,
  isPremiumShop,
  setLastReminderSentAt as setLastReminderSentAtImpl,
} from "../services/reminderConfiguration.js";
import { runRemindersForShop, scanCriticalOverdue } from "../services/reminderScheduler.js";
import { queryHistory } from "../services/reminderSender.js";
import { getSessionByChatId, getTelegramLinkSession } from "../services/telegramStore.js";
import { buildReminderMessage } from "../services/reminderMessageBuilder.js";
import { sendTelegramTextMessage } from "../services/telegramBotService.js";
import { createHistoryEntry } from "../services/reminderHistory.js";
import { sendPushToOwner } from "../services/pushNotificationSender.js";
import { verifyShopOwnership, requirePermission } from "./rbac.js";
import { db, requireDb } from "@workspace/db";
import { customers as customersTable, businesses as businessesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type {
  ReminderFrequency,
  EligibleCustomer,
  ReminderLanguage,
  ReminderBatchStats,
} from "../types/reminders.js";

const router = Router();

// ─── validation schemas ────────────────────────────────────────────────

const frequencySchema = z.object({
  frequency: z.enum(["daily", "weekly", "disabled"]),
});

const manualRemindSchema = z.object({
  chatId: z.string().optional(),
  customerName: z.string().optional(),
  balance: z.number().finite().optional(),
  dueDate: z.number().positive().optional(),
  language: z.enum(["am", "en"]).optional(),
  phoneNumber: z.string().optional(),
});

const runSchema = z.object({
  shopId: z.number().int().positive().optional(),
  customers: z.array(
    z.object({
      customerId: z.number().int().positive(),
      customerName: z.string().min(1),
      balance: z.number().finite(),
      dueDate: z.number().nullable().optional(),
      customerCreatedAt: z.number().positive(),
      chatId: z.string().min(1),
      updatesEnabled: z.boolean().optional(),
      telegramLanguage: z.enum(["am", "en"]).optional(),
    }),
  ).optional(),
  shopName: z.string().optional(),
});

// ─── middleware: parse shopId from request ─────────────────────────────

function getShopId(req: Request): number {
  // Try from body, then query, then header
  const shopId =
    Number(req.body?.shopId) ||
    Number(req.query?.shopId) ||
    Number(req.headers?.["x-shop-id"]) ||
    0;
  if (!Number.isInteger(shopId) || shopId <= 0) {
    throw new Error("Missing or invalid shopId");
  }
  return shopId;
}

// ─── logging helper ────────────────────────────────────────────────────

function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  const logLine = [`[reminders] ${level.toUpperCase()}`, message, context ? JSON.stringify(context) : ""].join(" ");
  if (level === "error") console.error(logLine);
  else if (level === "warn") console.warn(logLine);
  else console.log(logLine);
}

// ─── endpoints ─────────────────────────────────────────────────────────

/**
 * POST /run — Cron trigger: execute daily reminders for a shop.
 * Callable by Vercel Cron Jobs or external scheduler.
 *
 * Body: { shopId, customers?: [...], shopName?: string }
 * If customers is not provided, the scheduler auto-fetches from the ledger.
 */
router.all("/run", async (req: Request, res: Response) => {
  try {
    const isVercelCron = req.headers?.["x-vercel-cron"] === "1";
    const cronSecret = req.headers?.["x-reminder-cron-secret"];

    if (isVercelCron) {
      // Require Vercel signature verification — do NOT trust x-vercel-cron alone
      const signingSecret = process.env.VERCEL_CRON_SIGNING_SECRET?.trim();
      if (!signingSecret) {
        console.error("[security] VERCEL_CRON_SIGNING_SECRET is not set — rejecting Vercel cron request");
        return res.status(500).json({
          error: "Server misconfigured: VERCEL_CRON_SIGNING_SECRET environment variable is not set",
        });
      }
      const signature = req.headers["x-vercel-signature"] as string | undefined;
      if (!safeEqual(signature, signingSecret)) {
        console.error("[security] Invalid Vercel cron signature");
        return res.status(401).json({ error: "unauthorized" });
      }
    } else if (!process.env.REMINDER_CRON_SECRET) {
      return res.status(500).json({
        error: "Server misconfigured: REMINDER_CRON_SECRET environment variable is not set",
      });
      } else if (!safeEqual(cronSecret, process.env.REMINDER_CRON_SECRET)) {
      return res.status(401).json({ error: "unauthorized" });
    }

    if (!db) throw new Error("Database not configured");

    // Merge body and query params so GET requests (from Vercel Cron) can pass shopId as query
    const mergedInput = { ...(req.body || {}), ...(req.query || {}) };
    const parsed = runSchema.safeParse(mergedInput);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    const { shopId: requestedShopId, customers, shopName } = parsed.data;

    // If no shopId provided (Vercel Cron), find all shops with reminder-enabled customers
    let shopIds: number[] = [];
    if (requestedShopId) {
      shopIds = [requestedShopId];
    } else {
      try {
        const { getCustomerBalances } = await import("@workspace/db/utils/customerBalance");
        // Get all distinct business IDs that have customers with positive balance
        const allBalances = await getCustomerBalances(db, { onlyPositiveBalance: true });
        shopIds = [...new Set(allBalances.map((r: any) => r.businessId).filter(Boolean))];
        log("info", "Auto-discovered shops for cron run", { shopCount: shopIds.length, shopIds });
      } catch (e) {
        log("error", "Failed to discover shops", { error: e instanceof Error ? e.message : String(e) });
        return res.status(500).json({ error: "Failed to discover shops" });
      }
    }

    const allStats: any[] = [];

    for (const shopId of shopIds) {
      // Phase 2: Gate automated (cron-triggered) reminders behind the premium tier.
      // On-demand reminders (POST /remind/:customerId) bypass this check.
      //
      // During the free-evaluation window (PREMIUM_REMINDERS_ENABLED unset/false),
      // automated reminders run for ALL shops regardless of plan so we can
      // measure real usage & value before activating paid gating. Set
      // PREMIUM_REMINDERS_ENABLED=true in production to restrict cron reminders
      // to "plus"/"premium" shops only.
      const premiumGateEnabled = process.env.PREMIUM_REMINDERS_ENABLED === "true";
      if (premiumGateEnabled) {
        const premium = await isPremiumShop(shopId);
        if (!premium) {
          log("info", "Skipping automated reminders for non-premium shop (free tier)", { shopId });
          continue;
        }
      }

      let eligibleCustomers: EligibleCustomer[];

      if (customers && customers.length > 0 && requestedShopId) {
        // Map provided customers to EligibleCustomer format (only for explicit shopId)
        eligibleCustomers = customers.map((c) => ({
          customerId: c.customerId,
          customerName: c.customerName,
          balance: c.balance,
          dueDate: c.dueDate ?? null,
          customerCreatedAt: c.customerCreatedAt,
          chatId: c.chatId,
          updatesEnabled: c.updatesEnabled ?? true,
          telegramLanguage: c.telegramLanguage ?? "en",
          reminderConfig: {
            id: "",
            shopId,
            customerId: c.customerId,
            frequency: "weekly",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }));
      } else {
        // Auto-fetch customers with balance from the transaction ledger
        // and enrich with Telegram data from the customers table.
        try {
          const { getCustomerBalances } = await import("@workspace/db/utils/customerBalance");
          const rows = await getCustomerBalances(db, { businessId: shopId, onlyPositiveBalance: true });

          // Fetch Telegram+phone info for all customers with balance
          const customerIds = rows.map((r: any) => r.customerId);
          const customerRows = customerIds.length > 0
            ? await db
                .select({
                  id: customersTable.id,
                  name: customersTable.name,
                  displayName: customersTable.displayName,
                  telegramChatId: customersTable.telegramChatId,
                  telegramNotifyEnabled: customersTable.telegramNotifyEnabled,
                  telegramUsername: customersTable.telegramUsername,
                  phoneNumber: customersTable.phoneNumber,
                })
                .from(customersTable)
                .where(eq(customersTable.businessId, shopId))
            : [];

          const customerMap = new Map(customerRows.map((c: any) => [c.id, c]));

          eligibleCustomers = rows.map((row: any) => {
            const cust = customerMap.get(row.customerId);
            const chatId = cust?.telegramChatId ?? "";
            const hasTelegram = !!chatId;
            return {
              customerId: row.customerId,
              customerName: cust?.displayName || cust?.name || `Customer ${row.customerId}`,
              balance: row.balance,
              dueDate: row.dueDate ?? null,
              customerCreatedAt: row.createdAt,
              chatId,
              updatesEnabled: hasTelegram ? Boolean(cust?.telegramNotifyEnabled) : false,
              phoneNumber: cust?.phoneNumber ?? undefined,
              telegramLanguage: "en",  // V1: English-only rollout
              reminderConfig: {
                id: `cfg-${row.customerId}`,
                shopId,
                customerId: row.customerId,
                frequency: "weekly",
                lastReminderSentAt: null,
                enabled: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            };
          });

          const withTelegram = eligibleCustomers.filter((c: any) => c.chatId).length;
          log("info", "Auto-fetched customers for reminder run", {
            shopId,
            total: eligibleCustomers.length,
            withTelegram: withTelegram,
          });
        } catch (fetchError) {
          log("error", "Failed to auto-fetch customers", { shopId, error: fetchError instanceof Error ? fetchError.message : String(fetchError) });
          continue; // Skip this shop, continue with others
        }
      }

      const stats = await runRemindersForShop(shopId, eligibleCustomers, shopName);
      if (stats) allStats.push(stats);
    }

    // Aggregate stats across all shops
    const stats = allStats.length > 0 ? {
      customersScanned: allStats.reduce((s, x) => s + x.customersScanned, 0),
      customersWithBalance: allStats.reduce((s, x) => s + x.customersWithBalance, 0),
      remindersQueued: allStats.reduce((s, x) => s + x.remindersQueued, 0),
      remindersSent: allStats.reduce((s, x) => s + x.remindersSent, 0),
      remindersFailed: allStats.reduce((s, x) => s + x.remindersFailed, 0),
      remindersSkipped: allStats.reduce((s, x) => s + x.remindersSkipped, 0),
      errors: allStats.flatMap((x) => x.errors),
      startedAt: Math.min(...allStats.map((x) => x.startedAt)),
      completedAt: Math.max(...allStats.map((x) => x.completedAt)),
    } : null;

    if (!stats) {
      return res.json({
        ok: true,
        message: "No shops with reminder-enabled customers found",
        stats: { scanned: 0, withBalance: 0, queued: 0, sent: 0, failed: 0, skipped: 0, errors: 0, completedIn: 0 },
      });
    }

    return res.json({
      ok: true,
      stats: {
        scanned: stats.customersScanned,
        withBalance: stats.customersWithBalance,
        queued: stats.remindersQueued,
        sent: stats.remindersSent,
        failed: stats.remindersFailed,
        skipped: stats.remindersSkipped,
        errors: stats.errors.length,
        completedIn: stats.completedAt - stats.startedAt,
      },
    });
  } catch (error) {
    console.error("[reminders:run]", {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /config — Get shop default reminder frequency.
 * Query: ?shopId=123
 */
router.get("/config", verifyShopOwnership, requirePermission("can_view_reports"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const frequency = await getShopDefault(shopId);
    const enabled = frequency !== "disabled";

    return res.json({ shopId, frequency, enabled });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid request",
    });
  }
});

/**
 * POST /config — Set shop default reminder frequency.
 * Body: { shopId, frequency }
 */
router.post("/config", verifyShopOwnership, requirePermission("can_edit_settings"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const parsed = frequencySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid frequency. Must be 'daily', 'weekly', or 'disabled'.",
        details: parsed.error.flatten(),
      });
    }

    await setShopDefault(shopId, parsed.data.frequency);
    return res.json({
      ok: true,
      shopId,
      frequency: parsed.data.frequency,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /config/:customerId — Get customer-specific frequency override.
 */
router.get("/config/:customerId", verifyShopOwnership, requirePermission("can_view_reports"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const customerId = parseInt(String(req.params.customerId), 10);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ error: "Invalid customerId" });
    }

    const frequency = await getCustomerFrequency(shopId, customerId);
    const enabled = await isRemindersEnabled(shopId, customerId);

    return res.json({
      shopId,
      customerId,
      frequency,
      enabled,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /config/:customerId — Set customer-specific override.
 * Body: { frequency, shopId }
 */
router.post("/config/:customerId", verifyShopOwnership, requirePermission("can_edit_settings"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const customerId = parseInt(String(req.params.customerId), 10);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ error: "Invalid customerId" });
    }

    const parsed = frequencySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid frequency. Must be 'daily', 'weekly', or 'disabled'.",
        details: parsed.error.flatten(),
      });
    }

    await setCustomerFrequency(shopId, customerId, parsed.data.frequency);
    return res.json({
      ok: true,
      shopId,
      customerId,
      frequency: parsed.data.frequency,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * DELETE /config/:customerId — Clear customer override (revert to shop default).
 */
router.delete("/config/:customerId", verifyShopOwnership, requirePermission("can_edit_settings"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const customerId = parseInt(String(req.params.customerId), 10);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ error: "Invalid customerId" });
    }

    await clearCustomerOverride(shopId, customerId);
    return res.json({
      ok: true,
      shopId,
      customerId,
      message: "Override cleared, reverting to shop default",
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /history — Query reminder history.
 * Query: ?shopId=123&limit=50&offset=0&customerId=456
 */
router.get("/history", verifyShopOwnership, requirePermission("can_view_reports"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const limit = parseInt(String(req.query?.limit ?? "50"), 10);
    const offset = parseInt(String(req.query?.offset ?? "0"), 10);
    const customerId = req.query?.customerId
      ? parseInt(String(req.query.customerId), 10)
      : undefined;

    const result = await queryHistory(shopId, {
      limit: Math.min(Math.max(limit, 1), 200),
      offset: Math.max(offset, 0),
      customerId: customerId && customerId > 0 ? customerId : undefined,
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /test/:customerId — Send a manual test reminder to a customer.
 * Body: { shopId, balance, dueDate?, language? }
 */
router.post("/test/:customerId", verifyShopOwnership, requirePermission("can_add_records"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const customerId = parseInt(String(req.params.customerId), 10);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ error: "Invalid customerId" });
    }

    const balance = Number(req.body?.balance || 0);
    const dueDate = req.body?.dueDate ? Number(req.body.dueDate) : null;
    const language: ReminderLanguage =
      req.body?.language === "am" ? "am" : "en";

    // Lookup customer session
    // For test, we need the customer's Telegram link session.
    // The caller can provide a token or we use customerId to find session.
    const token = String(req.body?.token || "");
    let session = token ? await getTelegramLinkSession(token) : null;

    if (!session) {
      return res.status(404).json({
        error: "Customer Telegram session not found. Provide a valid token.",
      });
    }

    if (!session.chatId) {
      return res.status(400).json({
        error: "Customer has not linked Telegram yet (no chatId).",
      });
    }

    // Build and send message
    const daysHeld = Math.floor(
      (Date.now() - (session.createdAt || Date.now())) / 86400000,
    );

    const message = buildReminderMessage(
      language,
      session.customerName,
      Number.isFinite(balance) ? balance : session.currentBalance,
      dueDate,
      daysHeld,
    );

    try {
      const result = await sendTelegramTextMessage(session.chatId, message);
      return res.json({
        sent: true,
        messageId: (result as { message_id?: string })?.message_id,
        message,
      });
    } catch (sendError) {
      return res.status(502).json({
        sent: false,
        error: sendError instanceof Error ? sendError.message : "Send failed",
        message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /pause — Pause all reminders for a shop.
 * Body: { shopId }
 * Sets shop default to 'disabled' (can be re-enabled via POST /config).
 */
router.post("/pause", verifyShopOwnership, requirePermission("can_edit_settings"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    await setShopDefault(shopId, "disabled");
    return res.json({
      ok: true,
      shopId,
      paused: true,
      message: "All reminders paused for this shop",
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /resume — Resume reminders for a shop.
 * Body: { shopId }
 * Sets shop default back to 'daily'.
 */
router.post("/resume", verifyShopOwnership, requirePermission("can_edit_settings"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    await setShopDefault(shopId, "daily");
    return res.json({
      ok: true,
      shopId,
      paused: false,
      message: "Reminders resumed for this shop",
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /remind/:customerId — Manually send a reminder to a customer.
 * The shop owner triggers this from the dashboard for an instant nudge.
 * Body: { chatId, customerName, balance, dueDate?, language? }
 */
router.post("/remind/:customerId", verifyShopOwnership, requirePermission("can_add_records"), async (req: Request, res: Response) => {
  try {
    const shopId = getShopId(req);
    const customerId = parseInt(String(req.params.customerId), 10);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ error: "Invalid customerId" });
    }

    const parsed = manualRemindSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    const { chatId, customerName, balance, dueDate, language, phoneNumber } = parsed.data;

    const validBalance: number = typeof balance === "number" && Number.isFinite(balance) ? balance : 0;
    if (validBalance <= 0) {
      return res.status(400).json({ error: "Customer has no outstanding balance to remind about" });
    }

    const validLanguage: ReminderLanguage = language === "am" ? "am" : "en";
    const validName = String(customerName || `Customer ${customerId}`).slice(0, 50);
    const validDueDate = dueDate ? Number(dueDate) : null;
    const daysHeld = validDueDate ? Math.floor((Date.now() - validDueDate) / 86400000) : 0;

    const message = buildReminderMessage(validLanguage, validName, validBalance, validDueDate, daysHeld);

    // SMS-only fallback: if no chatId but phoneNumber provided, send via SMS
    if (!chatId && phoneNumber) {
      const { sendSms, isSmsEnabled } = await import("../services/smsSender.js");
      const { canSendSms, incrementSmsCount } = await import("../services/smsQuota.js");

      if (!isSmsEnabled()) {
        return res.status(400).json({
          error: "SMS is not enabled. Customer needs Telegram or SMS service to be configured.",
        });
      }

      const hasQuota = await canSendSms(shopId);
      if (!hasQuota) {
        return res.status(429).json({ error: "SMS quota exceeded for this shop" });
      }

      const smsResult = await sendSms(phoneNumber, message, { shopId, customerId });
      if (smsResult.success) {
        await incrementSmsCount(shopId);
        await createHistoryEntry({
          shopId, customerId, chatId: "",
          balanceAtSendTime: String(validBalance),
          dueDate: validDueDate ?? undefined, daysHeld,
          sentAt: Date.now(), status: "sent",
          language: validLanguage,
          messageId: String(smsResult.messageId ?? ""),
          retryCount: smsResult.retryCount,
          lastAttemptAt: Date.now(),
          customerNameSnapshot: validName,
        });

        try { await setLastReminderSentAtImpl(shopId, customerId, Date.now()); } catch {}
        log("info", "SMS reminder sent (no Telegram)", { shopId, customerId, messageId: smsResult.messageId });
        return res.json({ sent: true, messageId: smsResult.messageId, channel: "sms" });
      }

      return res.status(502).json({ error: `SMS failed: ${smsResult.error ?? "Unknown error"}`, channel: "sms" });
    }

    if (!chatId) {
      return res.status(400).json({ error: "Customer has no Telegram chat linked", channel: "telegram" });
    }

    const result = await sendTelegramTextMessage(chatId, message);

    await createHistoryEntry({
      shopId,
      customerId,
      chatId,
      balanceAtSendTime: String(validBalance),
      dueDate: validDueDate ?? undefined,
      daysHeld,
      sentAt: Date.now(),
      status: "sent",
      language: validLanguage,
      messageId: String((result as { message_id?: string })?.message_id ?? ""),
      retryCount: 0,
      lastAttemptAt: Date.now(),
      customerNameSnapshot: validName,
    });

    // Prevent cron from re-sending too soon
    try {
      await setLastReminderSentAtImpl(shopId, customerId, Date.now());
    } catch {
      // non-critical — history entry already recorded
    }

    log("info", "Manual reminder sent", { shopId, customerId });

    return res.json({
      sent: true,
      messageId: (result as { message_id?: string })?.message_id,
    });
  } catch (error) {
    log("error", "Manual reminder failed", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /critical-overdue — Return customers 30+ days past due for the dashboard.
 * Shop owner can see who needs urgent attention.
 * Query: ?shopId=123
 */
router.get("/critical-overdue", verifyShopOwnership, requirePermission("can_view_reports"), async (req: Request, res: Response) => {
  try {
    if (!db) throw new Error("Database not configured");
    const shopId = getShopId(req);

    // Auto-fetch customers with balance from the transaction ledger
    const { getCustomerBalances } = await import("@workspace/db/utils/customerBalance");
    const rows = await getCustomerBalances(db, { businessId: shopId, onlyPositiveBalance: true });

    // Enrich with names from customers table
    const customerIds = rows.map((r: any) => r.customerId);
    const customerRows = customerIds.length > 0
      ? await db
          .select({ id: customersTable.id, name: customersTable.name, displayName: customersTable.displayName })
          .from(customersTable)
          .where(eq(customersTable.businessId, shopId))
      : [];
    const customerMap = new Map(customerRows.map((c: any) => [c.id, c]));

    const eligibleCustomers: EligibleCustomer[] = rows.map((row: any) => {
      const cust = customerMap.get(row.customerId);
      return {
        customerId: row.customerId,
        customerName: cust?.displayName || cust?.name || `Customer ${row.customerId}`,
        balance: row.balance,
        dueDate: row.dueDate ?? null,
        customerCreatedAt: row.createdAt,
        chatId: "",
        updatesEnabled: false,
        telegramLanguage: "en" as const,
        reminderConfig: {
          id: `cfg-${row.customerId}`,
          shopId,
          customerId: row.customerId,
          frequency: "weekly",
          lastReminderSentAt: null,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };
    });

    const critical = await scanCriticalOverdue(eligibleCustomers);

    return res.json({
      shopId,
      count: critical.length,
      customers: critical,
    });
  } catch (error) {
    log("error", "Failed to scan critical overdue", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /plan — Test-only endpoint to toggle shop plan tier (free ↔ plus).
 *
 * In production, plan changes come from a payment provider webhook. This endpoint
 * exists so shop owners and testers can evaluate both tiers without a billing
 * integration. Guarded by TEST_MODE env var so it's a no-op in production.
 *
 * Body: { shopId, plan }  — plan must be "free" or "plus"
 */
router.post("/plan", verifyShopOwnership, requirePermission("can_edit_settings"), async (req: Request, res: Response) => {
  if (process.env.TEST_MODE !== "true") {
    return res.status(404).json({ error: "Not available" });
  }

  const planSchema = z.object({
    shopId: z.number().int().positive(),
    plan: z.enum(["free", "plus"]),
  });

  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  const { shopId, plan } = parsed.data;

  if (!db) throw new Error("Database not configured");

  try {
    await db.update(businessesTable).set({ plan }).where(eq(businessesTable.id, shopId));
    log("info", "Plan tier updated", { shopId, plan });
    return res.json({ ok: true, shopId, plan });
  } catch (error) {
    log("error", "Failed to update plan tier", { shopId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: "Failed to update plan tier" });
  }
});

/**
 * POST /payment-confirmed — Called when owner records a payment in the app.
 * Stops reminders for this customer and sends a thank-you message.
 * Body: { shopId, customerId, amount }
 */
const paymentConfirmedSchema = z.object({
  shopId: z.number().int().positive(),
  customerId: z.number().int().positive(),
  amount: z.number().finite(),
  customerName: z.string().optional(),
  chatId: z.string().optional(),
  language: z.enum(["am", "en"]).optional(),
});

router.post("/payment-confirmed", verifyShopOwnership, requirePermission("can_add_records"), async (req: Request, res: Response) => {
  try {
    const parsed = paymentConfirmedSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    }

    const { shopId, customerId, amount, customerName, chatId, language } = parsed.data;

    // Prevent next cron from sending a reminder
    await setLastReminderSentAtImpl(shopId, customerId, Date.now());

    // Record in history
    await createHistoryEntry({
      shopId,
      customerId,
      chatId: chatId ?? "",
      balanceAtSendTime: String(amount),
      sentAt: Date.now(),
      status: "sent",
      language: (language && language === "am" ? "am" : "en"),  // use caller-provided language, default English
      messageId: "payment_confirmed",
      retryCount: 0,
      lastAttemptAt: Date.now(),
      customerNameSnapshot: customerName,
    });

    // Send thank-you message to customer if they have Telegram
    if (chatId) {
      const validName = customerName || `Customer ${customerId}`;
      const formattedAmt = Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
      const thankYou = `🏪 ጌባያ\n\n${validName} ሆይ፣ የ${formattedAmt} ብር ክፍያህ ተረጋግጧል። እናመሰግናለን! 🙏\n\nሂሳብህን ለማየት /balance ይጫኑ።`;
      const thankYouEn = `🏪 Gebya\n\n${validName}, your payment of ${formattedAmt} ETB has been confirmed. Thank you! 🙏\n\nType /balance to check your account.`;
      const msg = (language ?? "en") === "am" ? thankYou : thankYouEn;
      try {
        await sendTelegramTextMessage(chatId, msg);
      } catch (tgErr) {
        console.error("[reminders] thank-you Telegram send failed:", tgErr);
      }
    }

    // Notify shop owner that payment was confirmed
    try {
      const name = customerName || `Customer ${customerId}`;
      const formattedAmt = Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
      await sendPushToOwner(shopId, {
        title: "Payment confirmed",
        body: `${name} — ${formattedAmt} ETB payment recorded and reminders stopped.`,
        type: "payment_confirmed",
        id: Date.now(),
      });
    } catch (pushErr) {
      console.error("[reminders] payment push notification failed:", pushErr);
    }

    const sentAmount = amount;
    log("info", "Payment confirmed — reminders stopped", { shopId, customerId, amount: sentAmount });

    return res.json({ ok: true, shopId, customerId });
  } catch (error) {
    log("error", "Payment-confirmed webhook failed", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
});

export default router;