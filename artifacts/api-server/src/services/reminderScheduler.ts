/**
 * ReminderScheduler Service
 *
 * Daily job to identify eligible customers and queue reminders.
 * - Queries customers with outstanding balance
 * - Checks frequency windows (24h for daily, 7d for weekly)
 * - Checks updatesEnabled from Telegram session
 * - Deduplicates customers (max 1 reminder per window)
 * - Passes eligible reminders to ReminderSender for delivery
 */
import { getSessionByChatId, getTelegramLinkSession } from "./telegramStore.js";
import { getCustomerFrequency, isRemindersEnabled, setLastReminderSentAt } from "./reminderConfiguration.js";
import { sendPushToOwner } from "./pushNotificationSender.js";
import type { MessageUrgency } from "./reminderMessageBuilder.js";
import type {
  EligibleCustomer,
  QueuedReminder,
  ReminderBatchStats,
  ReminderLanguage,
} from "../types/reminders.js";

function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  const logLine = [`[ReminderScheduler] ${level.toUpperCase()}`, message, context ? JSON.stringify(context) : ""].join(" ");
  if (level === "error") console.error(logLine);
  else if (level === "warn") console.warn(logLine);
  else console.log(logLine);
}

// ─── helper: language detection ────────────────────────────────────────

// V1: English-only rollout. Language detection from Telegram username is
// intentionally disabled — it was checking username prefixes (e.g., @am_*)
// which do not reliably indicate language. Amharic support returns in V2
// with proper language_code persistence.
function detectLanguage(_langCode?: string | null): ReminderLanguage {
  return "en";
}

// ─── helper: time windows ──────────────────────────────────────────────

const DAY_MS = 86_400_000;

/**
 * How many days BEFORE the due date to start sending reminders,
 * based on the total credit period (dueDate - customerCreatedAt).
 *
 * Longer credit gets more lead time so the customer can prepare.
 */
export function getLeadDays(creditPeriodDays: number): number {
  if (creditPeriodDays <= 7) return 0;
  if (creditPeriodDays <= 14) return 2;
  if (creditPeriodDays <= 21) return 3;
  if (creditPeriodDays <= 30) return 5;
  return 7;
}

export interface EligibilityResult {
  eligible: boolean;
  urgency: MessageUrgency;
  daysUntilDue?: number;
  overdueDays?: number;
}

/**
 * Check if a customer is eligible to receive a reminder now,
 * based on due date, frequency, last send time, and credit period.
 *
 * Behavior by scenario:
 *   - Due date in future & beyond lead-in window → not eligible (too early)
 *   - Due date in lead-in window → eligible daily (pre-due)
 *   - Due date is today → eligible (due-today)
 *   - Past due 1-7 days → eligible every 2 days
 *   - Past due 8+ days → eligible daily
 *   - No due date → eligible per frequency setting (default: weekly)
 */
export function isEligibleNow(
  frequency: "daily" | "weekly" | "disabled",
  lastSentAt: number | null,
  dueDate: number | null,
  customerCreatedAt: number,
): EligibilityResult {
  if (frequency === "disabled") return { eligible: false, urgency: "normal" };

  const now = Date.now();

  if (dueDate && dueDate > 0) {
    const creditPeriod = Math.max(1, Math.ceil((dueDate - customerCreatedAt) / DAY_MS));
    const leadDays = getLeadDays(creditPeriod);
    const daysUntilDue = Math.ceil((dueDate - now) / DAY_MS);

    if (daysUntilDue > leadDays) {
      // Too early — don't send before the lead-in window
      return { eligible: false, urgency: "normal", daysUntilDue };
    }

    if (daysUntilDue >= 1 && daysUntilDue <= leadDays) {
      // Pre-due: at most once per day
      const eligible = lastSentAt === null || now - lastSentAt >= DAY_MS;
      return { eligible, urgency: "pre_due", daysUntilDue };
    }

    if (daysUntilDue === 0) {
      // Due today
      const eligible = lastSentAt === null || now - lastSentAt >= DAY_MS;
      return { eligible, urgency: "due_today" };
    }

    // Overdue
    const overdueDays = Math.abs(daysUntilDue);
    const windowMs = overdueDays <= 7 ? 2 * DAY_MS : DAY_MS;
    const eligible = lastSentAt === null || now - lastSentAt >= windowMs;
    return { eligible, urgency: "overdue", overdueDays };
  }

  // No due date → use frequency setting (default: weekly)
  const windowMs = frequency === "daily" ? DAY_MS : 7 * DAY_MS;
  if (lastSentAt === null) return { eligible: true, urgency: "normal" };
  return { eligible: now - lastSentAt >= windowMs, urgency: "normal" };
}

/**
 * Calculate the number of days since a given timestamp.
 */
export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / DAY_MS);
}

// ─── queue implementation ──────────────────────────────────────────────

const queue: QueuedReminder[] = [];

/**
 * Queue a reminder for sending.
 * Deduplicates: if a reminder for the same customer+shop already exists in queue, skip.
 */
export function queueReminder(reminder: QueuedReminder): void {
  // Deduplicate: check if same customer already in queue
  const exists = queue.some(
    (r) => r.shopId === reminder.shopId && r.customerId === reminder.customerId,
  );
  if (exists) {
    console.log(
      `[ReminderScheduler] Skipping duplicate queue for customer ${reminder.customerId}`,
    );
    return;
  }
  queue.push(reminder);
}

/**
 * Get all currently queued reminders and clear the queue.
 */
export function drainQueue(): QueuedReminder[] {
  const items = queue.splice(0, queue.length);
  return items;
}

/**
 * Get queue size without draining.
 */
export function queueSize(): number {
  return queue.length;
}

/**
 * Clear queue (for testing).
 */
export function clearQueueForTest(): void {
  queue.length = 0;
}

// ─── main scheduler ────────────────────────────────────────────────────

/**
 * Query eligible customers for a shop (via the existing transaction ledger).
 *
 * This is a simplified version that assumes the shop provides its own
 * customer balance data. In production, this would query the transaction
 * ledger database. The caller passes in pre-computed customer data.
 *
 * @param shopId - The shop ID
 * @param customersWithBalance - Array of customers with calculated balance info
 * @param shopName - Shop name for message context
 * @returns ReminderBatchStats summarizing the run
 */
export async function scheduleReminders(
  shopId: number,
  customersWithBalance: EligibleCustomer[],
  shopName?: string,
): Promise<ReminderBatchStats> {
  const startedAt = Date.now();
  const stats: ReminderBatchStats = {
    startedAt,
    completedAt: startedAt,
    customersScanned: customersWithBalance.length,
    customersWithBalance: 0,
    remindersQueued: 0,
    remindersSent: 0,
    remindersFailed: 0,
    remindersSkipped: 0,
    errors: [],
    shopsProcessed: 1,
    success: false,
  };

  log("info", "Starting reminder scheduling", { shopId, customerCount: customersWithBalance.length });

  for (const customer of customersWithBalance) {
    try {
      // Only process customers with positive balance
      if (customer.balance <= 0) {
        stats.remindersSkipped++;
        continue;
      }
      stats.customersWithBalance++;

      // Check if customer has Telegram session OR phone number for SMS fallback
      const hasTelegram = !!customer.chatId;
      const hasPhone = !!customer.phoneNumber;
      let session = null;
      if (hasTelegram) {
        session = await getSessionByChatId(customer.chatId);
      }

      const telegramUsable =
        hasTelegram && session && session.updatesEnabled && customer.updatesEnabled;

      // Skip if neither Telegram nor phone can reach the customer
      if (!telegramUsable && !hasPhone) {
        stats.remindersSkipped++;
        continue;
      }

      // Check frequency settings
      const frequency = customer.reminderConfig?.frequency
        ?? await getCustomerFrequency(shopId, customer.customerId);
      if (frequency === "disabled") {
        stats.remindersSkipped++;
        continue;
      }

      // Due-date aware eligibility
      const lastSentAt = customer.reminderConfig?.lastReminderSentAt ?? null;
      const eligibility = isEligibleNow(
        frequency,
        lastSentAt,
        customer.dueDate,
        customer.customerCreatedAt,
      );

      // Track critical overdue (30+ days) regardless of eligibility
      if (eligibility.urgency === 'overdue' && eligibility.overdueDays !== undefined) {
        if (eligibility.overdueDays >= 30) {
          if (!stats.criticalOverdueCustomers) stats.criticalOverdueCustomers = [];
          stats.criticalOverdueCustomers.push({
            customerId: customer.customerId,
            customerName: customer.customerName,
            overdueDays: eligibility.overdueDays,
            shopId,
            balance: customer.balance,
          });
          stats.criticalOverdueCount = (stats.criticalOverdueCount ?? 0) + 1;
        }
      }

      if (!eligibility.eligible) {
        stats.remindersSkipped++;
        continue;
      }

      // Determine language
      const language = customer.telegramLanguage
        ?? (session ? detectLanguage(session.telegramUsername) : "en");

      // Calculate days held
      const heldDays = daysSince(customer.customerCreatedAt);

      // Queue the reminder with urgency info for tone-appropriate messaging
      const queuedReminder: QueuedReminder = {
        id: `${shopId}-${customer.customerId}-${Date.now()}-${crypto.randomUUID().slice(2, 10)}`,
        shopId,
        customerId: customer.customerId,
        chatId: customer.chatId || "",
        balance: customer.balance,
        dueDate: customer.dueDate,
        daysHeld: heldDays,
        language,
        urgency: eligibility.urgency,
        daysUntilDue: eligibility.daysUntilDue,
        overdueDays: eligibility.overdueDays,
        queuedAt: Date.now(),
        priority: 0,
        customerName: customer.customerName,
        shopName: shopName,
        phoneNumber: customer.phoneNumber,
      };

      queueReminder(queuedReminder);
      stats.remindersQueued++;
    } catch (error) {
      stats.errors.push({
        customerId: customer.customerId,
        shopId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  stats.completedAt = Date.now();
  stats.success = stats.errors.length === 0;

  console.log(
    `[ReminderScheduler] Shop ${shopId}: scanned=${stats.customersScanned}, ` +
    `withBalance=${stats.customersWithBalance}, queued=${stats.remindersQueued}, ` +
    `skipped=${stats.remindersSkipped}, errors=${stats.errors.length}`,
  );

  return stats;
}

/**
 * Run reminders for a single shop: schedule + send.
 * This is the high-level entry point called by the cron endpoint.
 */
/**
 * Scan customers for critical overdue (30+ days past due).
 * Used by the GET /critical-overdue endpoint for the dashboard.
 */
export async function scanCriticalOverdue(
  customersWithBalance: EligibleCustomer[],
): Promise<Array<{ customerId: number; customerName: string; overdueDays: number; shopId: number; balance: number }>> {
  const critical: Array<{ customerId: number; customerName: string; overdueDays: number; shopId: number; balance: number }> = [];

  for (const customer of customersWithBalance) {
    if (customer.balance <= 0) continue;
    if (!customer.dueDate || customer.dueDate <= 0) continue;

    const overdueDays = Math.ceil((Date.now() - customer.dueDate) / DAY_MS);
    if (overdueDays >= 30) {
      critical.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        overdueDays,
        shopId: customer.reminderConfig?.shopId ?? 0,
        balance: customer.balance,
      });
    }
  }

  return critical;
}

export async function runRemindersForShop(
  shopId: number,
  customersWithBalance: EligibleCustomer[],
  shopName?: string,
): Promise<ReminderBatchStats> {
  const stats = await scheduleReminders(shopId, customersWithBalance, shopName);

  // Send the queued reminders
  if (queueSize() > 0) {
    const { sendBatchReminders } = await import("./reminderSender.js");
    const reminderItems = drainQueue();
    const results = await sendBatchReminders(reminderItems);
    stats.remindersSent = results.sent;
    stats.remindersFailed = results.failed;

    // Persist lastReminderSentAt for successfully sent reminders
    const now = Date.now();
    for (let i = 0; i < results.results.length; i++) {
      const result = results.results[i];
      if (result.success) {
        const reminder = reminderItems[i];
        try {
          await setLastReminderSentAt(reminder.shopId, reminder.customerId, now);
        } catch (error) {
          console.error(
            `[ReminderScheduler] Failed to update lastReminderSentAt for shop=${reminder.shopId}, customer=${reminder.customerId}: ${error instanceof Error ? error.message : String(error)}`,
          );
          stats.errors.push({
            customerId: reminder.customerId,
            shopId: reminder.shopId,
            error: `Failed to persist lastReminderSentAt: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      }
    }
  }

  // ─── Alert owner about customers 1+ day past due ────────────────
  // Owner gets a push notification when a customer misses their due date,
  // so they can take action (send manual reminder, call, etc.)
  try {
    const ownerAlertedKey = (cid: number) => `reminder:owner_alert:${shopId}:${cid}`;
    const now = Date.now();
    const ALERT_COOLDOWN_MS = 3 * DAY_MS; // max 1 alert per 3 days per customer

    for (const customer of customersWithBalance) {
      if (customer.balance <= 0) continue;
      if (!customer.dueDate || customer.dueDate <= 0) continue;

      const overdueDays = Math.ceil((now - customer.dueDate) / DAY_MS);
      if (overdueDays < 1) continue;

      // Dedup: check if we already alerted the owner recently
      const key = ownerAlertedKey(customer.customerId);
      const lastAlerted = memOwnerAlerted.get(key);
      if (lastAlerted && now - lastAlerted < ALERT_COOLDOWN_MS) continue;

      const title = overdueDays === 1
        ? `⚠️ Due yesterday — ${customer.customerName}`
        : `⏰ ${overdueDays} days overdue — ${customer.customerName}`;
      const alertBody = `${customer.customerName} (${formatCurrencySimple(customer.balance)}) hasn't paid since ${overdueDays === 1 ? "their due date yesterday" : `${overdueDays} days ago`}. Tap to send a manual reminder.`;

      await sendPushToOwner(shopId, {
        title,
        body: alertBody,
        type: "overdue_alert",
        id: now,
      }).catch(() => {});

      memOwnerAlerted.set(key, now);
      console.log(`[ReminderScheduler] Alerted owner about customer ${customer.customerId} (${overdueDays}d overdue)`);
    }
  } catch (alertErr) {
    console.error("[ReminderScheduler] Failed to alert owner about overdue customers:", alertErr);
  }

  console.log(
    `[ReminderScheduler] Shop ${shopId}: sent=${stats.remindersSent}, ` +
    `failed=${stats.remindersFailed}, success=${stats.success}`,
  );

  return stats;
}

// In-memory dedup for owner alerts (resets on cold start — acceptable for daily cron)
const memOwnerAlerted = new Map<string, number>();

function formatCurrencySimple(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ETB`;
}