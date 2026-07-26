/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isEligibleNow,
  getLeadDays,
  daysSince,
  queueReminder,
  drainQueue,
  queueSize,
  clearQueueForTest,
  scheduleReminders,
  runRemindersForShop,
  scanCriticalOverdue,
} from "../reminderScheduler.js";

vi.mock("../telegramStore.js", () => ({
  getSessionByChatId: vi.fn(),
  getTelegramLinkSession: vi.fn(),
}));

vi.mock("../reminderConfiguration.js", () => ({
  getCustomerFrequency: vi.fn(),
  isRemindersEnabled: vi.fn(),
  setLastReminderSentAt: vi.fn(),
}));

const DAY_MS = 86_400_000;

vi.mock("../reminderSender.js", () => ({
  sendBatchReminders: vi.fn(),
}));

const { getSessionByChatId } = await import("../telegramStore.js");
const { getCustomerFrequency, setLastReminderSentAt } = await import("../reminderConfiguration.js");
const { sendBatchReminders } = await import("../reminderSender.js");

const mockGetSessionByChatId = getSessionByChatId as ReturnType<typeof vi.fn>;
const mockGetCustomerFrequency = getCustomerFrequency as ReturnType<typeof vi.fn>;
const mockSetLastReminderSentAt = setLastReminderSentAt as ReturnType<typeof vi.fn>;
const mockSendBatchReminders = sendBatchReminders as ReturnType<typeof vi.fn>;

// Helper to create EligibleCustomer with sensible defaults
function makeCustomer(overrides: Partial<{
  customerId: number;
  customerName: string;
  balance: number;
  dueDate: number | null;
  customerCreatedAt: number;
  chatId: string;
  updatesEnabled: boolean;
  telegramLanguage: "am" | "en";
  reminderConfig: any;
}> = {}): any {
  return {
    customerId: overrides.customerId ?? 1,
    customerName: overrides.customerName ?? "Test Customer",
    balance: overrides.balance ?? 100,
    dueDate: overrides.dueDate ?? null,
    customerCreatedAt: overrides.customerCreatedAt ?? Date.now() - 86400000,
    chatId: overrides.chatId ?? "12345",
    updatesEnabled: overrides.updatesEnabled ?? true,
    telegramLanguage: overrides.telegramLanguage ?? "en",
    reminderConfig: overrides.reminderConfig ?? {
      id: "cfg-1",
      shopId: 1,
      customerId: 1,
      frequency: "weekly",
      lastReminderSentAt: null,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}

describe("reminderScheduler", () => {
  beforeEach(() => {
    clearQueueForTest();
    vi.clearAllMocks();
  });

  describe("isEligibleNow", () => {
    const now = Date.now();
    const tomorrow = now + DAY_MS;
    const yesterday = now - DAY_MS;
    const weekAgo = now - 7 * DAY_MS;

    it("returns not eligible for disabled frequency", () => {
      const r = isEligibleNow("disabled", now, null, weekAgo);
      expect(r.eligible).toBe(false);
    });

    it("returns eligible when never sent (no due date)", () => {
      expect(isEligibleNow("daily", null, null, weekAgo).eligible).toBe(true);
      expect(isEligibleNow("weekly", null, null, weekAgo).eligible).toBe(true);
    });

    it("returns eligible for daily when 24h has passed (no due date)", () => {
      const r = isEligibleNow("daily", now - 25 * 3600 * 1000, null, weekAgo);
      expect(r.eligible).toBe(true);
    });

    it("returns not eligible for daily when <24h has passed (no due date)", () => {
      const r = isEligibleNow("daily", now - 3600 * 1000, null, weekAgo);
      expect(r.eligible).toBe(false);
    });

    it("returns eligible for weekly when 7d has passed (no due date)", () => {
      const r = isEligibleNow("weekly", now - 8 * DAY_MS, null, weekAgo);
      expect(r.eligible).toBe(true);
    });

    it("returns not eligible for weekly when <7d has passed (no due date)", () => {
      const r = isEligibleNow("weekly", now - 3 * DAY_MS, null, weekAgo);
      expect(r.eligible).toBe(false);
    });

    it("blocks reminders when due date is beyond lead-in window", () => {
      // 30-day credit → 5 days lead time
      const created = now - 30 * DAY_MS;
      const due = now + 10 * DAY_MS; // 10 days away, but lead is only 5
      const r = isEligibleNow("weekly", null, due, created);
      expect(r.eligible).toBe(false);
      expect(r.urgency).toBe("normal");
    });

    it("allows pre-due reminder when inside lead-in window", () => {
      // 30-day credit → 5 days lead time
      const created = now - 30 * DAY_MS;
      const due = now + 3 * DAY_MS; // 3 days away, inside 5-day lead
      const r = isEligibleNow("weekly", null, due, created);
      expect(r.eligible).toBe(true);
      expect(r.urgency).toBe("pre_due");
      expect(r.daysUntilDue).toBe(3);
    });

    it("marks urgency as due_today when due date is today", () => {
      const created = weekAgo;
      const due = now; // Due today
      const r = isEligibleNow("weekly", null, due, created);
      expect(r.eligible).toBe(true);
      expect(r.urgency).toBe("due_today");
    });

    it("marks urgency as overdue when due date is past", () => {
      const created = weekAgo;
      const due = now - 3 * DAY_MS; // 3 days overdue
      const r = isEligibleNow("weekly", null, due, created);
      expect(r.eligible).toBe(true);
      expect(r.urgency).toBe("overdue");
      expect(r.overdueDays).toBe(3);
    });

    it("overdue 1-7 days: eligible every 2 days", () => {
      const created = weekAgo;
      const due = now - 3 * DAY_MS;
      // Last sent 1 day ago → not eligible (2-day window)
      const r1 = isEligibleNow("weekly", now - DAY_MS, due, created);
      expect(r1.eligible).toBe(false);
      // Last sent 3 days ago → eligible
      const r2 = isEligibleNow("weekly", now - 3 * DAY_MS, due, created);
      expect(r2.eligible).toBe(true);
    });

    it("overdue 8+ days: eligible daily", () => {
      const created = 30 * DAY_MS;
      const due = now - 10 * DAY_MS; // 10 days overdue
      // Last sent 23h ago → not eligible (daily window)
      const r1 = isEligibleNow("weekly", now - 23 * 3600 * 1000, due, created);
      expect(r1.eligible).toBe(false);
      // Last sent 25h ago → eligible
      const r2 = isEligibleNow("weekly", now - 25 * 3600 * 1000, due, created);
      expect(r2.eligible).toBe(true);
    });
  });

  describe("getLeadDays", () => {
    it("returns 0 for credit <= 7 days", () => {
      expect(getLeadDays(7)).toBe(0);
    });
    it("returns 2 for credit 8-14 days", () => {
      expect(getLeadDays(10)).toBe(2);
    });
    it("returns 3 for credit 15-21 days", () => {
      expect(getLeadDays(18)).toBe(3);
    });
    it("returns 5 for credit 22-30 days", () => {
      expect(getLeadDays(25)).toBe(5);
    });
    it("returns 7 for credit > 30 days", () => {
      expect(getLeadDays(45)).toBe(7);
    });
  });

  describe("daysSince", () => {
    it("returns floor of days since timestamp", () => {
      const now = Date.now();
      expect(daysSince(now - 86400000)).toBe(1); // exactly 1 day
      expect(daysSince(now - 172800000)).toBe(2); // exactly 2 days
    });

    it("floors fractional days", () => {
      const now = Date.now();
      expect(daysSince(now - 86400000 - 3600000)).toBe(1); // 25 hours ago = 1 day
    });
  });

  describe("queue/drain", () => {
    it("queueReminder adds to queue", () => {
      const reminder = {
        id: "r1",
        shopId: 1,
        customerId: 1,
        chatId: "123",
        balance: 100,
        dueDate: null,
        daysHeld: 5,
        language: "en" as const,
        queuedAt: Date.now(),
        priority: 0,
        customerName: "C1",
      };
      queueReminder(reminder);
      expect(queueSize()).toBe(1);
    });

    it("queueReminder deduplicates same customer+shop", () => {
      const r1 = { id: "r1", shopId: 1, customerId: 1 };
      const r2 = { id: "r2", shopId: 1, customerId: 1 };
      queueReminder(r1);
      queueReminder(r2);
      expect(queueSize()).toBe(1);
    });

    it("drainQueue empties and returns items", () => {
      queueReminder({ id: "r1", shopId: 1, customerId: 1, chatId: "1", balance: 10, dueDate: null, daysHeld: 1, language: "en", queuedAt: Date.now(), priority: 0 });
      queueReminder({ id: "r2", shopId: 2, customerId: 2, chatId: "2", balance: 20, dueDate: null, daysHeld: 2, language: "en", queuedAt: Date.now(), priority: 0 });
      const items = drainQueue();
      expect(items).toHaveLength(2);
      expect(queueSize()).toBe(0);
    });
  });

  describe("scheduleReminders", () => {
    it("skips customers with balance <= 0", async () => {
      const stats = await scheduleReminders(1, [makeCustomer({ balance: 0 }), makeCustomer({ balance: -5 })]);
      expect(stats.remindersSkipped).toBe(2);
      expect(stats.remindersQueued).toBe(0);
    });

    it("skips customers with missing Telegram session", async () => {
      mockGetSessionByChatId.mockResolvedValue(null);
      const stats = await scheduleReminders(1, [makeCustomer()]);
      expect(stats.remindersSkipped).toBe(1);
      expect(stats.remindersQueued).toBe(0);
    });

    it("skips customers with session that has updatesEnabled=false and no fallback", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: false,
        telegramUsername: null,
      } as any);
      const customer = makeCustomer({ updatesEnabled: false });
      const stats = await scheduleReminders(1, [customer]);
      expect(stats.remindersSkipped).toBe(1);
    });

    it("skips customers with disabled frequency", async () => {
      mockGetSessionByChatId.mockResolvedValue({ chatId: "123", updatesEnabled: true } as any);
      mockGetCustomerFrequency.mockResolvedValue("disabled");
      const stats = await scheduleReminders(1, [
        {
          customerId: 1,
          customerName: "Test Customer",
          balance: 100,
          dueDate: null,
          customerCreatedAt: Date.now() - 86400000,
          chatId: "12345",
          updatesEnabled: true,
          telegramLanguage: "en",
          // omit reminderConfig so scheduler falls back to getCustomerFrequency
        },
      ]);
      expect(stats.remindersSkipped).toBe(1);
      expect(mockGetCustomerFrequency).toHaveBeenCalledWith(1, 1);
    });

    it("queues eligible customers", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: null,
      } as any);
      mockGetCustomerFrequency.mockResolvedValue("daily");

      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 86400000;
      const stats = await scheduleReminders(1, [
        makeCustomer({
          customerId: 1,
          customerName: "Alice",
          customerCreatedAt: thirtyDaysAgo,
          reminderConfig: {
            id: "cfg-1",
            shopId: 1,
            customerId: 1,
            frequency: "daily",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          },
        }),
      ]);

      expect(stats.customersScanned).toBe(1);
      expect(stats.customersWithBalance).toBe(1);
      expect(stats.remindersQueued).toBe(1);
      expect(stats.remindersSkipped).toBe(0);
      expect(queueSize()).toBe(1);
    });

    it("resolves language from telegramUsername when am", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: "@am_customer",
      } as any);
      mockGetCustomerFrequency.mockResolvedValue("daily");

      const stats = await scheduleReminders(1, [
        makeCustomer({
          telegramLanguage: "am",
          customerCreatedAt: Date.now() - 86400000,
        }),
      ]);

      expect(stats.remindersQueued).toBe(1);
      const queued = drainQueue();
      expect(queued[0].language).toBe("am");
    });

    it("uses customer.reminderConfig.frequency over getCustomerFrequency when provided", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: null,
      } as any);
      // Even if getCustomerFrequency returns disabled, the reminderConfig override should win
      // But scheduleReminders prefers customer.reminderConfig.frequency
      const stats = await scheduleReminders(1, [
        makeCustomer({
          reminderConfig: {
            id: "cfg-1",
            shopId: 1,
            customerId: 1,
            frequency: "weekly",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
      ]);

      expect(stats.remindersQueued).toBe(1);
      expect(mockGetCustomerFrequency).not.toHaveBeenCalled();
    });
  });

  describe("auth routing", () => {
    it("runRemindersForShop does not enforce cron secret — auth is handled by verifyReminderCronSecret at the route level in reminders.ts", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: null,
      } as any);
      mockGetCustomerFrequency.mockResolvedValue("daily");
      mockSendBatchReminders.mockResolvedValue({ sent: 1, failed: 0, results: [{ success: true, retryCount: 0, lastAttemptAt: Date.now(), shouldRetry: false, shouldUnlink: false }] });

      const customers = [
        makeCustomer({
          customerId: 1,
          customerCreatedAt: Date.now() - 86400000,
          reminderConfig: {
            id: "cfg-1",
            shopId: 1,
            customerId: 1,
            frequency: "daily",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
      ];

      const stats = await runRemindersForShop(1, customers);
      expect(stats.remindersSent).toBe(1);
      expect(stats.remindersFailed).toBe(0);
      expect(mockSendBatchReminders).toHaveBeenCalledTimes(1);
      expect(mockSetLastReminderSentAt).toHaveBeenCalledWith(1, 1, expect.any(Number));
    });
  });

  describe("runRemindersForShop", () => {
    it("schedules and sends queued reminders", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: null,
      } as any);
      mockGetCustomerFrequency.mockResolvedValue("daily");
      mockSendBatchReminders.mockResolvedValue({ sent: 1, failed: 0, results: [{ success: true, retryCount: 0, lastAttemptAt: Date.now(), shouldRetry: false, shouldUnlink: false }] });

      const customers = [
        makeCustomer({
          customerId: 1,
          customerCreatedAt: Date.now() - 86400000,
          reminderConfig: {
            id: "cfg-1",
            shopId: 1,
            customerId: 1,
            frequency: "daily",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
      ];

      const stats = await runRemindersForShop(1, customers);
      expect(stats.remindersSent).toBe(1);
      expect(stats.remindersFailed).toBe(0);
      expect(mockSendBatchReminders).toHaveBeenCalledTimes(1);
      expect(mockSetLastReminderSentAt).toHaveBeenCalledWith(1, 1, expect.any(Number));
    });

    it("persists lastReminderSentAt only for successful sends", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: null,
      } as any);
      mockGetCustomerFrequency.mockResolvedValue("daily");
      mockSendBatchReminders.mockResolvedValue({
        sent: 1,
        failed: 1,
        results: [
          { success: true, retryCount: 0, lastAttemptAt: Date.now(), shouldRetry: false, shouldUnlink: false },
          { success: false, retryCount: 0, lastAttemptAt: Date.now(), shouldRetry: false, shouldUnlink: false },
        ],
      });

      const customers = [
        makeCustomer({
          customerId: 1,
          customerCreatedAt: Date.now() - 86400000,
          reminderConfig: {
            id: "cfg-1",
            shopId: 1,
            customerId: 1,
            frequency: "daily",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
        makeCustomer({
          customerId: 2,
          customerCreatedAt: Date.now() - 86400000,
          reminderConfig: {
            id: "cfg-2",
            shopId: 1,
            customerId: 2,
            frequency: "daily",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
      ];

      const stats = await runRemindersForShop(1, customers);
      expect(stats.remindersSent).toBe(1);
      expect(stats.remindersFailed).toBe(1);
      expect(mockSetLastReminderSentAt).toHaveBeenCalledTimes(1);
      expect(mockSetLastReminderSentAt).toHaveBeenCalledWith(1, 1, expect.any(Number));
    });

    it("tracks critical overdue customers (30+ days) in stats", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: null,
      } as any);
      mockGetCustomerFrequency.mockResolvedValue("daily");
      mockSendBatchReminders.mockResolvedValue({ sent: 1, failed: 0, results: [{ success: true, retryCount: 0, lastAttemptAt: Date.now(), shouldRetry: false, shouldUnlink: false }] });

      const now = Date.now();
      const customers = [
        makeCustomer({
          customerId: 1,
          customerName: "Overdue 60d",
          dueDate: now - 60 * DAY_MS,
          customerCreatedAt: now - 90 * DAY_MS,
          balance: 500,
          reminderConfig: {
            id: "cfg-1", shopId: 1, customerId: 1, frequency: "daily",
            lastReminderSentAt: now - 7 * DAY_MS, enabled: true, createdAt: now, updatedAt: now,
          },
        }),
        makeCustomer({
          customerId: 2,
          customerName: "Overdue 10d",
          dueDate: now - 10 * DAY_MS,
          customerCreatedAt: now - 40 * DAY_MS,
          balance: 200,
          reminderConfig: {
            id: "cfg-2", shopId: 1, customerId: 2, frequency: "daily",
            lastReminderSentAt: now - 7 * DAY_MS, enabled: true, createdAt: now, updatedAt: now,
          },
        }),
        makeCustomer({
          customerId: 3,
          customerName: "Not overdue",
          dueDate: null,
          customerCreatedAt: now - 30 * DAY_MS,
          balance: 100,
          reminderConfig: {
            id: "cfg-3", shopId: 1, customerId: 3, frequency: "daily",
            lastReminderSentAt: now - 14 * DAY_MS, enabled: true, createdAt: now, updatedAt: now,
          },
        }),
      ];

      const stats = await runRemindersForShop(1, customers);
      expect(stats.criticalOverdueCount).toBe(1);
      expect(stats.criticalOverdueCustomers).toHaveLength(1);
      expect(stats.criticalOverdueCustomers![0].customerId).toBe(1);
      expect(stats.criticalOverdueCustomers![0].overdueDays).toBeGreaterThanOrEqual(60);
    });

    it("logs error if setLastReminderSentAt fails but continues", async () => {
      mockGetSessionByChatId.mockResolvedValue({
        chatId: "123",
        updatesEnabled: true,
        telegramUsername: null,
      } as any);
      mockGetCustomerFrequency.mockResolvedValue("daily");
      mockSendBatchReminders.mockResolvedValue({ sent: 1, failed: 0, results: [{ success: true, retryCount: 0, lastAttemptAt: Date.now(), shouldRetry: false, shouldUnlink: false }] });
      mockSetLastReminderSentAt.mockRejectedValueOnce(new Error("Redis down"));

      const customers = [
        makeCustomer({
          customerId: 1,
          customerCreatedAt: Date.now() - 86400000,
          reminderConfig: {
            id: "cfg-1",
            shopId: 1,
            customerId: 1,
            frequency: "daily",
            lastReminderSentAt: null,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        }),
      ];

      const stats = await runRemindersForShop(1, customers);
      expect(stats.remindersSent).toBe(1);
      expect(stats.errors).toHaveLength(1);
      expect(stats.errors[0].customerId).toBe(1);
      expect(mockSetLastReminderSentAt).toHaveBeenCalledTimes(1);
    });
  });

  describe("scanCriticalOverdue", () => {
    it("returns empty array when no customers are overdue", async () => {
      const result = await scanCriticalOverdue([]);
      expect(result).toEqual([]);
    });

    it("returns empty array when customers have no due date", async () => {
      const customers = [makeCustomer({ dueDate: null, balance: 100 })];
      const result = await scanCriticalOverdue(customers);
      expect(result).toEqual([]);
    });

    it("returns customers with 30+ overdue days", async () => {
      const now = Date.now();
      const customers = [
        makeCustomer({
          customerId: 1,
          customerName: "Critical",
          dueDate: now - 45 * DAY_MS,
          balance: 500,
          customerCreatedAt: now - 90 * DAY_MS,
        }),
        makeCustomer({
          customerId: 2,
          customerName: "Not critical",
          dueDate: now - 10 * DAY_MS,
          balance: 300,
          customerCreatedAt: now - 30 * DAY_MS,
        }),
      ];
      const result = await scanCriticalOverdue(customers);
      expect(result).toHaveLength(1);
      expect(result[0].customerId).toBe(1);
      expect(result[0].overdueDays).toBeGreaterThanOrEqual(45);
    });

    it("skips customers with zero or negative balance", async () => {
      const now = Date.now();
      const customers = [
        makeCustomer({ customerId: 1, dueDate: now - 45 * DAY_MS, balance: 0 }),
        makeCustomer({ customerId: 2, dueDate: now - 45 * DAY_MS, balance: -10 }),
      ];
      const result = await scanCriticalOverdue(customers);
      expect(result).toHaveLength(0);
    });
  });
});
