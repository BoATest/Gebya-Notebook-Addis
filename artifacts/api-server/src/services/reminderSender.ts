/**
 * ReminderSender Service
 *
 * Sends queued reminders via Telegram with retry logic and error handling.
 * - 3 retries with exponential backoff (1s, 2s, 4s)
 * - Classifies errors: rate_limit, network_timeout, invalid_chat, invalid_token, other
 * - Marks customer as unlinked on invalid_chat/invalid_token
 * - Records delivery in history
 * - SMS fallback when Telegram fails and customer has phone number
 */
import { sendTelegramTextMessage } from "./telegramBotService.js";
import { getSessionByChatId, syncTelegramCustomerState } from "./telegramStore.js";
import { createHistoryEntry } from "./reminderHistory.js";
import { sendSms, isSmsEnabled } from "./smsSender.js";
import { incrementSmsCount, canSendSms } from "./smsQuota.js";
import type {
  QueuedReminder,
  ReminderHistoryEntry,
  SendReminderResult,
} from "../types/reminders.js";

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)?.trim();
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)?.trim();
const kvEnabled = Boolean(KV_URL && KV_TOKEN);

const memHistory: ReminderHistoryEntry[] = [];

const dataKey = (shopId: number, customerId: number, sentAt: number) =>
  `reminder:history:data:${shopId}:${customerId}:${sentAt}`;

const shopIndexKey = (shopId: number) =>
  `reminder:history:idx:shop:${shopId}`;

const shopCustIndexKey = (shopId: number, customerId: number) =>
  `reminder:history:idx:shop_cust:${shopId}:${customerId}`;

async function kvCmd(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(KV_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV command failed (${res.status})`);
  const data = (await res.json()) as { result?: unknown };
  return data?.result ?? null;
}

async function safeKvCmd<T>(args: (string | number)[], fallback: T): Promise<T> {
  try {
    const result = await kvCmd(args);
    return (result as T) ?? fallback;
  } catch (err) {
    console.error("[ReminderSender:KV]", {
      message: err instanceof Error ? err.message : String(err),
      command: args[0],
    });
    return fallback;
  }
}

function parseEntries(rawList: unknown[]): ReminderHistoryEntry[] {
  return rawList
    .filter((x): x is string => typeof x === "string")
    .map((s) => {
      try {
        return JSON.parse(s) as ReminderHistoryEntry;
      } catch {
        return null;
      }
    })
    .filter((e): e is ReminderHistoryEntry => e !== null);
}

/**
 * Query stored history entries.
 * Uses KV sorted-set indices when KV is enabled; falls back to in-memory otherwise.
 *
 * KV key layout:
 *   Data:   reminder:history:data:{shopId}:{customerId}:{sentAt}
 *   Indices:
 *     reminder:history:idx:shop:{shopId}           — score = sentAt (all entries for the shop)
 *     reminder:history:idx:shop_cust:{shopId}:{customerId} — score = sentAt (per-customer subset)
 *
 * Pagination + filtering are implemented as ZRANGEBYSCORE + LIMIT on the sorted sets.
 */
export async function queryHistory(
  shopId: number,
  options?: { limit?: number; offset?: number; customerId?: number },
): Promise<{ total: number; entries: ReminderHistoryEntry[] }> {
  if (kvEnabled) {
    try {
      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
      const offset = Math.max(options?.offset ?? 0, 0);

      const indexKey =
        options?.customerId != null && options.customerId > 0
          ? shopCustIndexKey(shopId, options.customerId)
          : shopIndexKey(shopId);

      const customerId = options?.customerId;

      const totalRaw = await safeKvCmd<number>(["ZCARD", indexKey], -1);
      if (totalRaw === -1) {
        return { total: 0, entries: [] };
      }

      const timestamps: string[] = await safeKvCmd<string[]>([
        "ZRANGEBYSCORE",
        indexKey,
        "-inf",
        "+inf",
        "LIMIT",
        offset,
        limit,
      ], []);

      if (timestamps.length === 0) {
        return { total: totalRaw, entries: [] };
      }

      const dataKeys = timestamps.map((ts) =>
        dataKey(shopId, customerId ?? 0, Number(ts)),
      );
      const rawEntries = await safeKvCmd<string[]>(["MGET", ...dataKeys], []);
      const entries = parseEntries(rawEntries);

      entries.reverse();

      return { total: totalRaw, entries };
    } catch (err) {
      console.error("[ReminderSender:queryHistory]", {
        message: err instanceof Error ? err.message : String(err),
        shopId,
        options,
      });
      return { total: 0, entries: [] };
    }
  }

  let filtered = memHistory.filter((e) => e.shopId === shopId);
  if (options?.customerId != null && options.customerId > 0) {
    filtered = filtered.filter((e) => e.customerId === options.customerId);
  }

  const total = filtered.length;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const entries = filtered.slice(offset, offset + limit).reverse();

  return { total, entries };
}

const BACKOFF_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

// ─── rate limiter ───────────────────────────────────────────────────────

const TELEGRAM_RATE_LIMIT_PER_SEC = parseInt(
  process.env.TELEGRAM_RATE_LIMIT_PER_SEC || "30",
  10,
);

class SlidingWindowRateLimiter {
  private timestamps: number[] = [];

  isOverLimit(limit: number): boolean {
    const windowStart = Date.now() - 1000;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);
    return this.timestamps.length >= limit;
  }

  waitForSlot(limit: number): Promise<void> {
    const wait = (): Promise<void> => {
      if (!this.isOverLimit(limit)) {
        this.timestamps.push(Date.now());
        return Promise.resolve();
      }
      return sleep(50).then(wait);
    };
    return wait();
  }
}

const telegramRateLimiter = new SlidingWindowRateLimiter();

type ErrorClass =
  | "rate_limit"
  | "network_timeout"
  | "invalid_chat"
  | "invalid_token"
  | "other";

function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  const logLine = [`[ReminderSender] ${level.toUpperCase()}`, message, context ? JSON.stringify(context) : ""].join(" ");
  if (level === "error") console.error(logLine);
  else if (level === "warn") console.warn(logLine);
  else console.log(logLine);
}

function classifyError(error: unknown, httpStatus?: number): ErrorClass {
  if (httpStatus === 429) return "rate_limit";
  if (httpStatus === 401) return "invalid_token";
  if (httpStatus === 403 || httpStatus === 400) return "invalid_chat";
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "network_timeout";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("429") || msg.includes("too many")) return "rate_limit";
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("token")) return "invalid_token";
    if (msg.includes("403") || msg.includes("blocked")) return "invalid_chat";
    if (msg.includes("400") || msg.includes("chat not found") || msg.includes("not found")) return "invalid_chat";
    if (msg.includes("timeout") || msg.includes("network") || msg.includes("econnrefused") || msg.includes("econnreset")) return "network_timeout";
  }
  return "other";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// ─── public API ────────────────────────────────────────────────────────

/**
 * Send a single queued reminder with retry logic.
 * Returns a SendReminderResult describing the outcome.
 */
export async function sendReminder(
  reminder: QueuedReminder,
): Promise<SendReminderResult> {
  await telegramRateLimiter.waitForSlot(TELEGRAM_RATE_LIMIT_PER_SEC);

  let retryCount = 0;

  // Build message using the reminderMessageBuilder
  const { buildReminderMessage } = await import("./reminderMessageBuilder.js");
  const message = buildReminderMessage(
    reminder.language,
    reminder.customerName || "Customer",
    reminder.balance,
    reminder.dueDate,
    reminder.daysHeld,
  );

  log("info", "Sending reminder", { customerId: reminder.customerId, shopId: reminder.shopId });

  for (let attempt = 0; attempt <= BACKOFF_DELAYS.length; attempt++) {
    try {
      const result = await sendTelegramTextMessage(reminder.chatId, message);
      // Success
      const messageId = String(
        (result as { message_id?: string })?.message_id ?? "",
      );

      await createHistoryEntry({
        shopId: reminder.shopId,
        customerId: reminder.customerId,
        chatId: reminder.chatId,
        balanceAtSendTime: String(reminder.balance),
        dueDate: reminder.dueDate ?? undefined,
        daysHeld: reminder.daysHeld,
        sentAt: Date.now(),
        status: "sent",
        language: reminder.language,
        messageId,
        retryCount,
        lastAttemptAt: Date.now(),
        customerNameSnapshot: reminder.customerName,
      });

      return {
        success: true,
        messageId,
        retryCount,
        lastAttemptAt: Date.now(),
        shouldRetry: false,
        shouldUnlink: false,
      };
    } catch (error) {
      const httpStatus =
        error instanceof Error
          ? parseInt(error.message.match(/\b(\d{3})\b/)?.[1] ?? "", 10)
          : undefined;
      const errorClass = classifyError(error, httpStatus);
      const isLastAttempt = attempt >= BACKOFF_DELAYS.length;

      // Non-retryable errors
      if (errorClass === "invalid_chat" || errorClass === "invalid_token") {
        // Mark customer as unlinked
        try {
          const session = await getSessionByChatId(reminder.chatId);
          if (session) {
            await syncTelegramCustomerState({
              token: session.token,
              updatesEnabled: false,
            });
          }
        } catch {
          // silent — don't let unlink failure mask the original error
        }

        await createHistoryEntry({
          shopId: reminder.shopId,
          customerId: reminder.customerId,
          chatId: reminder.chatId,
          balanceAtSendTime: String(reminder.balance),
          dueDate: reminder.dueDate ?? undefined,
          daysHeld: reminder.daysHeld,
          sentAt: Date.now(),
          status: "failed",
          language: reminder.language,
          failureReason: error instanceof Error ? error.message : String(error),
          retryCount,
          lastAttemptAt: Date.now(),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          errorClass,
          retryCount,
          lastAttemptAt: Date.now(),
          shouldRetry: false,
          shouldUnlink: true,
        };
      }

      // Retryable error
      if (!isLastAttempt) {
        const delay = BACKOFF_DELAYS[attempt];
        console.log(
          `[ReminderSender] Retry ${attempt + 1}/${BACKOFF_DELAYS.length} for customer ${reminder.customerId} in ${delay}ms — ${error instanceof Error ? error.message : String(error)}`,
        );
        retryCount++;
        await sleep(delay);
        continue;
      }

      // All retries exhausted — attempt SMS fallback
      const telegramError = error instanceof Error ? error.message : String(error);

      log("info", "Telegram retries exhausted, attempting SMS fallback", {
        customerId: reminder.customerId,
        shopId: reminder.shopId,
        telegramError,
      });

      const smsResult = await attemptSmsFallback(reminder, telegramError);
      if (smsResult) {
        return smsResult;
      }

      // SMS fallback also failed or not available — record Telegram failure
      await createHistoryEntry({
        shopId: reminder.shopId,
        customerId: reminder.customerId,
        chatId: reminder.chatId,
        balanceAtSendTime: String(reminder.balance),
        dueDate: reminder.dueDate ?? undefined,
        daysHeld: reminder.daysHeld,
        sentAt: Date.now(),
        status: "failed",
        language: reminder.language,
        failureReason: `All retries exhausted: ${telegramError}`,
        retryCount,
        lastAttemptAt: Date.now(),
      });

      return {
        success: false,
        error: telegramError,
        errorClass,
        retryCount,
        lastAttemptAt: Date.now(),
        shouldRetry: false,
        shouldUnlink: false,
      };
    }
  }

  // Should never reach here, but TypeScript needs a return
  return {
    success: false,
    error: "Unexpected: loop exited without result",
    retryCount,
    lastAttemptAt: Date.now(),
    shouldRetry: false,
    shouldUnlink: false,
  };
}

/**
 * Attempt SMS fallback when Telegram fails.
 * Only tries SMS if:
 *   - SMS is enabled and configured
 *   - Customer has a phone number
 *   - Shop has SMS quota remaining
 */
async function attemptSmsFallback(
  reminder: QueuedReminder,
  telegramError: string,
): Promise<SendReminderResult | null> {
  // Check if SMS is enabled
  if (!isSmsEnabled()) {
    log("info", "SMS fallback skipped: SMS not enabled", { customerId: reminder.customerId });
    return null;
  }

  // Check if customer has phone number
  if (!reminder.phoneNumber) {
    log("info", "SMS fallback skipped: no phone number", { customerId: reminder.customerId });
    return null;
  }

  // Check quota
  const hasQuota = await canSendSms(reminder.shopId);
  if (!hasQuota) {
    log("warn", "SMS fallback skipped: quota exceeded", { shopId: reminder.shopId, customerId: reminder.customerId });
    return null;
  }

  // Build SMS message
  const { buildReminderMessage } = await import("./reminderMessageBuilder.js");
  const message = buildReminderMessage(
    reminder.language,
    reminder.customerName || "Customer",
    reminder.balance,
    reminder.dueDate,
    reminder.daysHeld,
  );

  // Truncate to 160 chars for single SMS
  const smsMessage = message.length > 160 ? message.slice(0, 157) + "..." : message;

  log("info", "Attempting SMS fallback", {
    customerId: reminder.customerId,
    shopId: reminder.shopId,
    phone: reminder.phoneNumber,
  });

  try {
    // Send SMS
    const smsResult = await sendSms(reminder.phoneNumber, smsMessage, {
      shopId: reminder.shopId,
      customerId: reminder.customerId,
    });

    if (smsResult.success) {
      // Increment quota
      await incrementSmsCount(reminder.shopId);

      // Record in history
      await createHistoryEntry({
        shopId: reminder.shopId,
        customerId: reminder.customerId,
        chatId: reminder.chatId,
        balanceAtSendTime: String(reminder.balance),
        dueDate: reminder.dueDate ?? undefined,
        daysHeld: reminder.daysHeld,
        sentAt: Date.now(),
        status: "sent",
        language: reminder.language,
        messageId: smsResult.messageId,
        retryCount: smsResult.retryCount,
        lastAttemptAt: Date.now(),
        customerNameSnapshot: reminder.customerName,
      });

      log("info", "SMS fallback succeeded", {
        customerId: reminder.customerId,
        shopId: reminder.shopId,
        messageId: smsResult.messageId,
      });

      return {
        success: true,
        messageId: smsResult.messageId,
        retryCount: smsResult.retryCount,
        lastAttemptAt: Date.now(),
        shouldRetry: false,
        shouldUnlink: false,
      };
    } else {
      // SMS failed
      log("warn", "SMS fallback failed", {
        customerId: reminder.customerId,
        shopId: reminder.shopId,
        error: smsResult.error,
        errorClass: smsResult.errorClass,
      });

      await createHistoryEntry({
        shopId: reminder.shopId,
        customerId: reminder.customerId,
        chatId: reminder.chatId,
        balanceAtSendTime: String(reminder.balance),
        dueDate: reminder.dueDate ?? undefined,
        daysHeld: reminder.daysHeld,
        sentAt: Date.now(),
        status: "failed",
        language: reminder.language,
        failureReason: `SMS failed: ${smsResult.error}. Telegram error: ${telegramError}`,
        retryCount: smsResult.retryCount,
        lastAttemptAt: Date.now(),
      });

      return {
        success: false,
        error: `SMS failed: ${smsResult.error}`,
        retryCount: smsResult.retryCount,
        lastAttemptAt: Date.now(),
        shouldRetry: false,
        shouldUnlink: false,
      };
    }
  } catch (error) {
    log("error", "SMS fallback exception", {
      customerId: reminder.customerId,
      shopId: reminder.shopId,
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

/**
 * Send a batch of queued reminders sequentially (with rate limiting).
 * Returns summary counts.
 */
export async function sendBatchReminders(
  reminders: QueuedReminder[],
): Promise<{ sent: number; failed: number; results: SendReminderResult[] }> {
  let sent = 0;
  let failed = 0;
  const results: SendReminderResult[] = [];

  for (let i = 0; i < reminders.length; i++) {
    const reminder = reminders[i];
    try {
      const result = await sendReminder(reminder);
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryCount: 0,
        lastAttemptAt: Date.now(),
        shouldRetry: false,
        shouldUnlink: false,
      });
    }
  }

  return { sent, failed, results };
}

// ─── test utilities ────────────────────────────────────────────────────

export function clearHistoryForTest(): void {
  memHistory.length = 0;
}

export function getStoredHistoryCount(): number {
  return memHistory.length;
}