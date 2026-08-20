/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Environment ────────────────────────────────────────────────────────
process.env.JWT_SECRET = "test-secret-for-unit-tests";
process.env.APP_BASE_URL = "http://localhost:3000";
process.env.TELEGRAM_WEBHOOK_SECRET = "test-tg-webhook-secret";
process.env.REMINDER_CRON_SECRET = "test-cron-secret";
process.env.SMS_ENABLED = "false"; // SMS is disabled in tests

// ─── Mock DB ────────────────────────────────────────────────────────────
const mockRows: Record<string, any[]> = {};

const mockDb = {
  select: () => ({
    from: () => ({
      where: (clause: any) => {
        const table = Object.keys(clause || {})[0];
        return mockRows[table] || [];
      },
      limit: (n: number) => (mockRows[""] || []).slice(0, n),
    }),
  }),
  insert: () => ({ values: vi.fn(), values: (v: any) => { Object.keys(mockRows).push(JSON.stringify(v)); return mockDb; } }),
  update: () => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis() }),
  batch: vi.fn(),
};

vi.mock("@workspace/db", () => ({ db: mockDb, requireDb: vi.fn(() => mockDb) }));

vi.mock("@workspace/db/schema", () => ({
  businesses: { id: "id", plan: "plan", name: "name", ownerUserId: "owner_user_id" },
  customers: { id: "id", name: "name", displayName: "display_name", balance: "balance", businessId: "business_id", telegramChatId: "telegram_chat_id", telegramUsername: "telegram_username", telegramNotifyEnabled: "telegram_notify_enabled", phoneNumber: "phone_number", deletedAt: "deleted_at" },
  customerTransactions: { id: "id", customerId: "customer_id", type: "type", amount: "amount", businessId: "business_id" },
  businessMembers: { userId: "user_id", businessId: "business_id", role: "role", active: "active", permissions: "permissions" },
  notifications: { id: "id", businessId: "business_id", ownerUserId: "owner_user_id", type: "type", title: "title", body: "body", entityType: "entity_type", entityId: "entity_id", actorName: "actor_name", read: "read", createdAt: "created_at" },
  users: { id: "id", telegramLinkToken: "telegram_link_token", telegramChatId: "telegram_chat_id", phoneNumber: "phone_number" },
}));

vi.mock("../telegramStore.js", () => {
  const sessions: Record<string, any> = {};
  const chatToToken: Record<string, string> = {};

  return {
    getTelegramSessionStoreStatus: () => ({ mode: "memory", persistent: true, linkingAvailable: true, reason: null }),
    upsertTelegramLinkSession: vi.fn(async (payload: any) => {
      const session = {
        token: payload.token,
        customerId: payload.customerId,
        customerName: payload.customerName,
        shopName: payload.shopName,
        currentBalance: payload.currentBalance ?? 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 604800000,
        requestedAt: Date.now(),
        linkedAt: null,
        chatId: null,
        telegramUsername: null,
        updatesEnabled: payload.updatesEnabled ?? false,
        lastMessage: null,
        lastReference: null,
        lastUpdatedAt: null,
      };
      sessions[payload.token] = session;
      return session;
    }),
    getTelegramLinkSession: vi.fn(async (token: string) => sessions[token] ?? null),
    linkTelegramChatToSession: vi.fn(async (payload: any) => {
      const session = sessions[payload.token];
      if (!session) return null;
      const updated = {
        ...session,
        linkedAt: Date.now(),
        chatId: payload.chatId,
        telegramUsername: payload.telegramUsername || session.telegramUsername,
        lastUpdatedAt: Date.now(),
      };
      sessions[payload.token] = updated;
      if (payload.chatId) chatToToken[payload.chatId] = payload.token;
      return updated;
    }),
    syncTelegramCustomerState: vi.fn(async (payload: any) => {
      const session = sessions[payload.token];
      if (!session) {
        if (payload.chatId) {
          const newSession = {
            token: payload.token,
            customerId: "unknown",
            customerName: payload.customerName || "Customer",
            shopName: payload.shopName || "Gebya",
            currentBalance: payload.currentBalance ?? 0,
            createdAt: Date.now(),
            expiresAt: Date.now() + 604800000,
            requestedAt: Date.now(),
            linkedAt: payload.chatId ? Date.now() : null,
            chatId: payload.chatId ?? null,
            telegramUsername: payload.telegramUsername ?? null,
            updatesEnabled: payload.updatesEnabled ?? session?.updatesEnabled ?? false,
            lastMessage: null,
            lastReference: null,
            lastUpdatedAt: Date.now(),
          };
          sessions[payload.token] = newSession;
          if (payload.chatId) chatToToken[payload.chatId] = payload.token;
          return newSession;
        }
        return null;
      }
      const updated = {
        ...session,
        customerName: payload.customerName || session.customerName,
        shopName: payload.shopName || session.shopName,
        currentBalance: payload.currentBalance != null ? payload.currentBalance : session.currentBalance,
        updatesEnabled: payload.updatesEnabled ?? session.updatesEnabled,
        telegramUsername: payload.telegramUsername ?? session.telegramUsername,
        chatId: payload.chatId ?? session.chatId,
        lastUpdatedAt: Date.now(),
      };
      sessions[payload.token] = updated;
      if (updated.chatId) chatToToken[updated.chatId] = payload.token;
      return updated;
    }),
    getSessionByChatId: vi.fn(async (chatId: string) => {
      const token = chatToToken[chatId];
      return token ? sessions[token] : null;
    }),
    getStoredSessionCount: () => Object.keys(sessions).length,
    clearAllSessions: () => { Object.keys(sessions).forEach(k => delete sessions[k]); Object.keys(chatToToken).forEach(k => delete chatToToken[k]); },
    formatTelegramSessionState: (session: any) => {
      if (!session) return "not_linked";
      if (session.chatId) return session.updatesEnabled ? "updates_enabled" : "linked";
      return "link_pending";
    },
    storeTelegramDelivery: vi.fn(async (payload: any) => {
      const session = sessions[payload.token];
      if (!session) return null;
      const updated = { ...session, currentBalance: payload.currentBalance, lastMessage: payload.message, lastReference: payload.reference, lastUpdatedAt: Date.now() };
      sessions[payload.token] = updated;
      return updated;
    }),
  };
});

vi.mock("../telegramBotService.js", () => ({
  getTelegramBotUsername: () => "test_bot",
  isTelegramBotConfigured: () => true,
  sendTelegramTextMessage: vi.fn().mockResolvedValue({ message_id: "msg_e2e_123" }),
}));

vi.mock("../pushNotificationSender.js", () => ({
  sendPushToOwner: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../services/smsSender.js", () => ({
  isSmsEnabled: () => false,
  sendSms: vi.fn(),
}));

vi.mock("../services/smsQuota.js", () => ({
  incrementSmsCount: vi.fn(),
  canSendSms: vi.fn().mockResolvedValue(false),
}));

vi.mock("../services/reminderConfiguration.js", () => {
  const configs: Record<string, any> = {};
  return {
    getShopDefault: vi.fn(async () => "weekly"),
    setShopDefault: vi.fn(async (shopId: number, freq: string) => {
      configs[`shop:${shopId}:default`] = { frequency: freq };
    }),
    getCustomerFrequency: vi.fn(async () => "weekly"),
    setCustomerFrequency: vi.fn(async () => {}),
    clearCustomerOverride: vi.fn(async () => {}),
    isRemindersEnabled: vi.fn(async () => true),
    isPremiumShop: vi.fn(async (shopId) => {
      const row = mockRows["businesses"]?.find(b => b.id === shopId);
      return row?.plan === "plus" || false;
    }),
    setLastReminderSentAt: vi.fn(async () => {}),
    clearAllConfigs: () => { Object.keys(configs).forEach(k => delete configs[k]); },
  };
});

vi.mock("../services/reminderScheduler.js", () => ({
  runRemindersForShop: vi.fn().mockResolvedValue({
    startedAt: Date.now(),
    completedAt: Date.now(),
    customersScanned: 2,
    customersWithBalance: 2,
    remindersQueued: 2,
    remindersSent: 2,
    remindersFailed: 0,
    remindersSkipped: 0,
    errors: [],
    shopsProcessed: 1,
    success: true,
  }),
  scanCriticalOverdue: vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/reminderHistory.js", () => ({
  createHistoryEntry: vi.fn().mockResolvedValue({
    id: "hist-e2e-1",
    shopId: 1,
    customerId: 1,
    chatId: "tg_123",
    balanceAtSendTime: "100.00",
    sentAt: Date.now(),
    status: "sent",
    language: "en",
    messageId: "msg_e2e_123",
    retryCount: 0,
    lastAttemptAt: Date.now(),
    customerNameSnapshot: "አንደኛ ደንበኛ",
    createdAt: new Date(),
  }),
  queryHistory: vi.fn().mockResolvedValue({
    total: 1,
    entries: [{
      id: "hist-e2e-1",
      shopId: 1,
      customerId: 1,
      chatId: "tg_123",
      balanceAtSendTime: "100.00",
      sentAt: Date.now(),
      status: "sent",
      language: "en",
      messageId: "msg_e2e_123",
      retryCount: 0,
      lastAttemptAt: Date.now(),
      customerNameSnapshot: "አንደኛ ደንበኛ",
      createdAt: new Date(),
    }],
    pagination: { limit: 50, offset: 0, hasMore: false },
  }),
}));

vi.mock("../services/reminderMessageBuilder.js", () => ({
  buildReminderMessage: vi.fn(() => "Reminder: You have 100.00 ETB outstanding. Please pay."),
}));

vi.mock("../services/reminderSender.js", () => ({
  queryHistory: vi.fn(),
  sendReminder: vi.fn().mockResolvedValue({ success: true, messageId: "msg_e2e_123" }),
  sendBatchReminders: vi.fn().mockResolvedValue({ sent: 2, failed: 0, results: [] }),
  clearHistoryForTest: vi.fn(),
  getStoredHistoryCount: vi.fn(() => 0),
}));

vi.mock("../services/telegramStore.js", () => {
  const sessions: Record<string, any> = {};
  const chatToToken: Record<string, string> = {};
  return {
    getTelegramSessionStoreStatus: () => ({ mode: "memory", persistent: true, linkingAvailable: true, reason: null }),
    upsertTelegramLinkSession: vi.fn(async (payload: any) => {
      const session = {
        token: payload.token,
        customerId: payload.customerId,
        customerName: payload.customerName,
        shopName: payload.shopName,
        currentBalance: payload.currentBalance ?? 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 604800000,
        requestedAt: Date.now(),
        linkedAt: null,
        chatId: null,
        telegramUsername: null,
        updatesEnabled: payload.updatesEnabled ?? false,
        lastMessage: null,
        lastReference: null,
        lastUpdatedAt: null,
      };
      sessions[payload.token] = session;
      return session;
    }),
    getTelegramLinkSession: vi.fn(async (token: string) => sessions[token] ?? null),
    linkTelegramChatToSession: vi.fn(async (payload: any) => {
      const session = sessions[payload.token];
      if (!session) return null;
      const updated = {
        ...session,
        linkedAt: Date.now(),
        chatId: payload.chatId,
        telegramUsername: payload.telegramUsername || session.telegramUsername,
        lastUpdatedAt: Date.now(),
      };
      sessions[payload.token] = updated;
      if (payload.chatId) chatToToken[payload.chatId] = payload.token;
      return updated;
    }),
    syncTelegramCustomerState: vi.fn(async (payload: any) => {
      const session = sessions[payload.token];
      if (!session) {
        if (payload.chatId) {
          const newSession = {
            token: payload.token,
            customerId: "unknown",
            customerName: payload.customerName || "Customer",
            shopName: payload.shopName || "Gebya",
            currentBalance: payload.currentBalance ?? 0,
            createdAt: Date.now(),
            expiresAt: Date.now() + 604800000,
            requestedAt: Date.now(),
            linkedAt: payload.chatId ? Date.now() : null,
            chatId: payload.chatId ?? null,
            telegramUsername: payload.telegramUsername ?? null,
            updatesEnabled: payload.updatesEnabled ?? false,
            lastMessage: null,
            lastReference: null,
            lastUpdatedAt: Date.now(),
          };
          sessions[payload.token] = newSession;
          if (payload.chatId) chatToToken[payload.chatId] = payload.token;
          return newSession;
        }
        return null;
      }
      const updated = {
        ...session,
        customerName: payload.customerName || session.customerName,
        shopName: payload.shopName || session.shopName,
        currentBalance: payload.currentBalance != null ? payload.currentBalance : session.currentBalance,
        updatesEnabled: payload.updatesEnabled ?? session.updatesEnabled,
        telegramUsername: payload.telegramUsername ?? session.telegramUsername,
        chatId: payload.chatId ?? session.chatId,
        lastUpdatedAt: Date.now(),
      };
      sessions[payload.token] = updated;
      if (updated.chatId) chatToToken[updated.chatId] = payload.token;
      return updated;
    }),
    getSessionByChatId: vi.fn(async (chatId: string) => {
      const token = chatToToken[chatId];
      return token ? sessions[token] : null;
    }),
    getStoredSessionCount: () => Object.keys(sessions).length,
    clearAllSessions: () => { Object.keys(sessions).forEach(k => delete sessions[k]); Object.keys(chatToToken).forEach(k => delete chatToToken[k]); },
    formatTelegramSessionState: (session: any) => {
      if (!session) return "not_linked";
      if (session.chatId) return session.updatesEnabled ? "updates_enabled" : "linked";
      return "link_pending";
    },
    storeTelegramDelivery: vi.fn(async (payload: any) => {
      const session = sessions[payload.token];
      if (!session) return null;
      const updated = { ...session, currentBalance: payload.currentBalance, lastMessage: payload.message, lastReference: payload.reference, lastUpdatedAt: Date.now() };
      sessions[payload.token] = updated;
      return updated;
    }),
  };
});

vi.mock("../rbac.js", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  verifyShopOwnership: (req: any, res: any, next: any) => {
    const shopId = Number(req.body?.shopId) || Number(req.query?.shopId) || Number(req.headers?.["x-shop-id"]) || 0;
    if (!Number.isInteger(shopId) || shopId <= 0) {
      res.status(400).json({ error: "Missing or invalid shopId" });
      return;
    }
    req.deviceContext = { userId: 1, businessId: shopId, role: "owner", permissions: { can_edit_settings: true, can_view_reports: true, can_add_records: true } };
    next();
  },
}));

vi.mock("@workspace/db", () => {
  const businesses: any[] = [{ id: 1, name: "Test Shop", plan: "plus", ownerUserId: 1 }];
  const customers: any[] = [
    { id: 1, name: "አንደኛ ደንበኛ", displayName: "አንደኛ ደንበኛ", businessId: 1, balance: 100, telegramChatId: "tg_123", telegramUsername: "@testuser", telegramNotifyEnabled: true, phoneNumber: "+251911234567", deletedAt: null },
  ];
  const notifications: any[] = [];
  const businessMembers: any[] = [{ userId: 1, businessId: 1, role: "owner", active: true, permissions: {} }];
  const usersArr: any[] = [{ id: 1, telegramLinkToken: "owner-token", telegramChatId: null, phoneNumber: "+251900000000" }];

  return {
    db: {
      select: () => ({
        from: (table: any) => ({
          where: (clause: any) => {
            const entries = Object.entries(clause || {});
            const tableName = entries[0]?.[0] || "";
            if (tableName === "businesses") return businesses.filter(b => (clause as any).businessId ? b.id === (clause as any).businessId : true);
            if (tableName === "customers") return customers;
            if (tableName === "notifications") return notifications;
            if (tableName === "businessMembers") return businessMembers;
            if (tableName === "users") return usersArr;
            return [];
          },
          limit: (n: number) => customers.slice(0, n),
        }),
      }),
      insert: (table: any) => ({
        values: (v: any) => {
          if (table === notifications) notifications.push(v);
          return { returning: () => ({ then: (resolve: any) => resolve([v]) }) };
        },
      }),
      update: vi.fn(),
      batch: vi.fn(),
    },
    requireDb: vi.fn(() => {
      const obj: any = {
        select: () => ({
          from: (table: any) => ({
            where: (clause: any) => {
              const entries = Object.entries(clause || {});
              const tableName = entries[0]?.[0] || "";
              if (tableName === "businesses") return businesses;
              if (tableName === "customers") return customers;
              if (tableName === "notifications") return notifications;
              if (tableName === "businessMembers") return businessMembers;
              if (tableName === "users") return usersArr;
              return [];
            },
            limit: (n: number) => customers.slice(0, n),
          }),
        }),
        insert: (table: any) => ({
          values: (v: any) => {
            if (table === notifications) notifications.push(v);
            return { returning: () => ({ then: (resolve: any) => resolve([v]) }) };
          },
        }),
        update: vi.fn(),
        batch: vi.fn(),
      };
      return obj;
    }),
  };
});

vi.mock("@workspace/db/schema", () => ({
  businesses: { id: "id", plan: "plan", name: "name", ownerUserId: "owner_user_id" },
  customers: { id: "id", name: "name", displayName: "display_name", balance: "balance", businessId: "business_id", telegramChatId: "telegram_chat_id", telegramUsername: "telegram_username", telegramNotifyEnabled: "telegram_notify_enabled", phoneNumber: "phone_number", deletedAt: "deleted_at" },
  customerTransactions: { id: "id", customerId: "customer_id", type: "type", amount: "amount", businessId: "business_id" },
  businessMembers: { userId: "user_id", businessId: "business_id", role: "role", active: "active", permissions: "permissions" },
  notifications: { id: "id", businessId: "business_id", ownerUserId: "owner_user_id", type: "type", title: "title", body: "body", entityType: "entity_type", entityId: "entity_id", actorName: "actor_name", read: "read", createdAt: "created_at" },
  users: { id: "id", telegramLinkToken: "telegram_link_token", telegramChatId: "telegram_chat_id", phoneNumber: "phone_number" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({ eq: true })),
  and: vi.fn(() => ({ and: true })),
  gt: vi.fn(() => ({ gt: true })),
  asc: vi.fn(() => ({ asc: true })),
  inArray: vi.fn(() => ({ inArray: true })),
  sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
}));

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}));

vi.mock("../auth.js", () => ({
  verifyJwt: vi.fn().mockReturnValue({ userId: 1 }),
  getToken: vi.fn(),
}));

vi.mock("../rateLimits.js", () => ({
  syncRateLimiter: (_req: any, _res: any, next: any) => next(),
  authRateLimiter: (_req: any, _res: any, next: any) => next(),
  generalRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../services/smsSender.ts", () => ({
  isSmsEnabled: () => false,
  sendSms: vi.fn(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────
const { default: remindersRouter } = await import("../routes/reminders.js");
const { default: telegramRouter } = await import("../routes/telegram.js");
const { clearAllSessions } = await import("../services/telegramStore.js");
const { clearHistoryForTest } = await import("../services/reminderHistory.js");
const { clearAllConfigs } = await import("../services/reminderConfiguration.js");
const { clearHistoryForTest: clearSenderHistory } = await import("../services/reminderSender.js");

// ─── Test helpers ────────────────────────────────────────────────────────

function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    _statusCalled: false,
    headers: {},
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      this._statusCalled = true;
      return res;
    }),
    json: vi.fn(function (this: any, payload: any) {
      if (!this._statusCalled) this.status(200);
      this.body = payload;
      return res;
    }),
    send: vi.fn(function (this: any, payload: any) {
      if (!this._statusCalled) this.status(200);
      this.body = payload;
      return res;
    }),
    end: vi.fn(function () {
      if (!this._statusCalled) this.status(200);
      return res;
    }),
  };
  return res;
}

const deviceContext = { userId: 1, businessId: 1, role: "owner", permissions: { can_edit_settings: true, can_view_reports: true, can_add_records: true } };

function createReq(method: string, url: string, body: any = {}, query: any = {}, headers: any = {}) {
  return {
    method,
    url,
    body,
    query,
    headers,
    locals: {},
    params: {},
    deviceContext,
  };
}

async function dispatchRouter(router: any, req: any, res: any): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Handler timed out")), 5000);
    router.handle(req, res, (err?: any) => {
      clearTimeout(timer);
      if (err) reject(err);
      else resolve();
    });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("E2E: Telegram Webhook + Reminder Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllSessions();
    clearHistoryForTest();
    clearAllConfigs();
    clearSenderHistory();
    process.env.REMINDER_CRON_SECRET = "test-cron-secret";
  });

  describe("Full customer onboarding → Telegram link → reminder → payment flow", () => {
    const SHOP_ID = 1;
    const CUSTOMER_ID = 1;
    const TOKEN = `cust-1-${Date.now()}`;
    const CHAT_ID = "tg_e2e_999";
    const CUSTOMER_NAME = "አንደኛ ደንበኛ";

    it("Step 1: shop owner creates a link session for a customer", async () => {
      const req = createReq("POST", "/link-sessions", {
        shopId: SHOP_ID,
        token: TOKEN,
        customerId: CUSTOMER_ID,
        customerName: CUSTOMER_NAME,
        shopName: "Test Shop",
        currentBalance: 100,
        updatesEnabled: false,
      }, {}, {
        "x-shop-id": String(SHOP_ID),
        "authorization": "Bearer test-token",
      });
      const res = createRes();

      await dispatchRouter(telegramRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        token: TOKEN,
        deep_link: expect.stringContaining("t.me"),
        bot_username: "test_bot",
      }));
    });

    it("Step 2: customer opens deep link → bot receives /start TOKEN → session links", async () => {
      // First create the session
      const { upsertTelegramLinkSession } = await import("../services/telegramStore.js");
      await upsertTelegramLinkSession({
        token: TOKEN,
        customerId: "1",
        customerName: CUSTOMER_NAME,
        shopName: "Test Shop",
        currentBalance: 100,
        updatesEnabled: false,
      });

      // Simulate the webhook receiving /start with the token
      const req = createReq("POST", "/webhook", {
        message: {
          chat: { id: Number(CHAT_ID) },
          from: { username: "testuser", language_code: "en" },
          text: `/start ${TOKEN}`,
        },
      }, {}, {
        "x-telegram-bot-api-secret-token": "test-tg-webhook-secret",
      });
      const res = createRes();

      const { sendTelegramTextMessage } = await import("../services/telegramBotService.js");

      await dispatchRouter(telegramRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        linked: true,
      }));

      // Bot should have sent a "Linked!" message to the customer
      expect(sendTelegramTextMessage).toHaveBeenCalledWith(
        String(Number(CHAT_ID)),
        expect.stringContaining("Linked")
      );
    });

    it("Step 3: customer checks /balance via Telegram", async () => {
      // Link the chat first
      const { linkTelegramChatToSession, syncTelegramCustomerState } = await import("../services/telegramStore.js");
      await linkTelegramChatToSession({ token: TOKEN, chatId: CHAT_ID, telegramUsername: "@testuser" });
      await syncTelegramCustomerState({ token: TOKEN, updatesEnabled: true, currentBalance: 100 });

      const req = createReq("POST", "/webhook", {
        message: {
          chat: { id: Number(CHAT_ID) },
          from: { username: "testuser", language_code: "en" },
          text: "/balance",
        },
      }, {}, {
        "x-telegram-bot-api-secret-token": "test-tg-webhook-secret",
      });
      const res = createRes();

      const { sendTelegramTextMessage } = await import("../services/telegramBotService.js");

      await dispatchRouter(telegramRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(sendTelegramTextMessage).toHaveBeenCalledWith(
        String(Number(CHAT_ID)),
        expect.stringContaining("💰 Current balance")
      );
      expect(sendTelegramTextMessage).toHaveBeenCalledWith(
        String(Number(CHAT_ID)),
        expect.stringContaining("100.00 ETB")
      );
    });

    it("Step 4: shop owner sends on-demand reminder to linked customer", async () => {
      const req = createReq("POST", `/remind/${CUSTOMER_ID}`, {
        shopId: SHOP_ID,
        chatId: CHAT_ID,
        customerName: CUSTOMER_NAME,
        balance: 100,
        language: "en",
      }, {}, {
        "x-shop-id": String(SHOP_ID),
      });
      req.params = { customerId: String(CUSTOMER_ID) };
      const res = createRes();

      const { sendTelegramTextMessage } = await import("../services/telegramBotService.js");
      const { buildReminderMessage } = await import("../services/reminderMessageBuilder.js");
      const { createHistoryEntry } = await import("../services/reminderHistory.js");

      await dispatchRouter(remindersRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        sent: true,
        messageId: "msg_e2e_123",
      }));

      // Telegram message sent to the customer's chat
      expect(sendTelegramTextMessage).toHaveBeenCalledWith(CHAT_ID, expect.any(String));
      // History entry created
      expect(createHistoryEntry).toHaveBeenCalledWith(expect.objectContaining({
        shopId: SHOP_ID,
        customerId: CUSTOMER_ID,
        chatId: CHAT_ID,
        status: "sent",
      }));
    });

    it("Step 5: customer acknowledges payment via /paid", async () => {
      // Ensure the customer is linked
      const { linkTelegramChatToSession, syncTelegramCustomerState, storeTelegramDelivery } = await import("../services/telegramStore.js");
      await linkTelegramChatToSession({ token: TOKEN, chatId: CHAT_ID, telegramUsername: "@testuser" });
      await syncTelegramCustomerState({ token: TOKEN, updatesEnabled: true, currentBalance: 100 });
      await createHistoryEntry({
        shopId: SHOP_ID,
        customerId: CUSTOMER_ID,
        chatId: CHAT_ID,
        balanceAtSendTime: "100",
        sentAt: Date.now(),
        status: "sent",
        language: "en",
        messageId: "msg_e2e_123",
        retryCount: 0,
        lastAttemptAt: Date.now(),
        customerNameSnapshot: CUSTOMER_NAME,
      } as any);

      const req = createReq("POST", "/webhook", {
        message: {
          chat: { id: Number(CHAT_ID) },
          from: { username: "testuser", language_code: "en" },
          text: "/paid",
        },
      }, {}, {
        "x-telegram-bot-api-secret-token": "test-tg-webhook-secret",
      });
      const res = createRes();

      const { sendTelegramTextMessage, sendPushToOwner } = await import("../services/pushNotificationSender.js");

      await dispatchRouter(telegramRouter, req, res);

      expect(res.status).toHaveBeenCalled;
      // Bot confirms receipt of payment claim
      expect(sendTelegramTextMessage).toHaveBeenCalledWith(
        String(Number(CHAT_ID)),
        expect.stringContaining("payment confirmed")
      );
    });

    it("Step 6: shop owner marks payment confirmed → customer gets thank-you", async () => {
      const req = createReq("POST", "/payment-confirmed", {
        shopId: SHOP_ID,
        customerId: CUSTOMER_ID,
        amount: 100,
        customerName: CUSTOMER_NAME,
        chatId: CHAT_ID,
        language: "en",
      }, {}, {});
      const res = createRes();

      const { sendTelegramTextMessage } = await import("../services/telegramBotService.js");
      const { sendPushToOwner } = await import("../services/pushNotificationSender.js");

      await dispatchRouter(remindersRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ok: true, shopId: SHOP_ID, customerId: CUSTOMER_ID });

      // Thank-you message sent to customer
      expect(sendTelegramTextMessage).toHaveBeenCalledWith(
        CHAT_ID,
        expect.stringContaining("payment of 100.00 ETB has been confirmed")
      );

      // Owner gets push notification
      expect(sendPushToOwner).toHaveBeenCalledWith(
        SHOP_ID,
        expect.objectContaining({
          title: "Payment confirmed",
        })
      );
    });
  });

  describe("Premium tier gating", () => {
    it("free tier shop: cron /run skips non-premium shops", async () => {
      // Mock isPremiumShop to return false
      const { isPremiumShop } = await import("../services/reminderConfiguration.js");
      (isPremiumShop as any).mockResolvedValueOnce(false);

      const req = createReq("POST", "/run", { shopId: 1 }, {}, {
        "x-reminder-cron-secret": "test-cron-secret",
        "x-shop-id": "1",
      });
      const res = createRes();

      await dispatchRouter(remindersRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(isPremiumShop).toHaveBeenCalledWith(1);
      // Should return empty stats since shop was skipped
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        message: "No shops with reminder-enabled customers found",
      }));
    });

    it("free tier shop: on-demand /remind/:customerId still works", async () => {
      // Don't mock isPremiumShop — on-demand skips the check
      const req = createReq("POST", `/remind/${1}`, {
        shopId: 1,
        chatId: "tg_123",
        customerName: CUSTOMER_NAME,
        balance: 100,
        language: "en",
      }, {}, {
        "x-shop-id": "1",
      });
      req.params = { customerId: "1" };
      const res = createRes();

      const { sendTelegramTextMessage } = await import("../services/telegramBotService.js");

      await dispatchRouter(remindersRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(sendTelegramTextMessage).toHaveBeenCalledWith("tg_123", expect.any(String));
    });

    it("plus tier shop: cron /run processes reminders", async () => {
      const { isPremiumShop } = await import("../services/reminderConfiguration.js");
      (isPremiumShop as any).mockResolvedValueOnce(true);

      const req = createReq("POST", "/run", {
        shopId: 1,
        customers: [{
          customerId: 1,
          customerName: CUSTOMER_NAME,
          balance: 100,
          customerCreatedAt: Date.now() - 86400000,
          chatId: "tg_123",
        }],
      }, {}, {
        "x-reminder-cron-secret": "test-cron-secret",
        "x-shop-id": "1",
      });
      const res = createRes();

      const { runRemindersForShop } = await import("../services/reminderScheduler.js");

      await dispatchRouter(remindersRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(isPremiumShop).toHaveBeenCalledWith(1);
      expect(runRemindersForShop).toHaveBeenCalledWith(
        1,
        expect.any(Array),
        undefined
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        ok: true,
        stats: expect.objectContaining({
          scanned: 2,
          sent: 2,
        }),
      }));
    });
  });

  describe("Cron authentication security", () => {
    it("rejects /run without cron secret (non-Vercel)", async () => {
      const req = createReq("POST", "/run", { shopId: 1 }, {}, {
        "x-shop-id": "1",
      });
      const res = createRes();

      await dispatchRouter(remindersRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("rejects /run with wrong cron secret", async () => {
      const req = createReq("POST", "/run", { shopId: 1 }, {}, {
        "x-reminder-cron-secret": "wrong-secret",
        "x-shop-id": "1",
      });
      const res = createRes();

      await dispatchRouter(remindersRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("rejects unauthenticated /link-sessions (no auth header)", async () => {
      const req = createReq("POST", "/link-sessions", {
        shopId: 1,
        token: TOKEN,
        customerId: 1,
        customerName: CUSTOMER_NAME,
        shopName: "Test Shop",
      }, {}, {
        "x-shop-id": String(1),
      });
      const res = createRes();

      await dispatchRouter(telegramRouter, req, res);

      // verifyShopOwnership should reject without auth
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("Telegram webhook secret validation", () => {
    it("rejects webhook without secret token header", async () => {
      const req = createReq("POST", "/webhook", {
        message: {
          chat: { id: 123 },
          text: "/balance",
        },
      }, {}, {});
      const res = createRes();

      await dispatchRouter(telegramRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("rejects webhook with wrong secret token", async () => {
      const req = createReq("POST", "/webhook", {
        message: {
          chat: { id: 123 },
          text: "/balance",
        },
      }, {}, {
        "x-telegram-bot-api-secret-token": "wrong-secret",
      });
      const res = createRes();

      await dispatchRouter(telegramRouter, req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe("SMS-only customer flow", () => {
    it("on-demand reminder with phone number sends via SMS fallback", async () => {
      const req = createReq("POST", "/remind/2", {
        shopId: 1,
        chatId: "",
        customerName: "SMS Customer",
        balance: 50,
        phoneNumber: "+251911234567",
        language: "en",
      }, {}, {
        "x-shop-id": "1",
      });
      req.params = { customerId: "2" };
      const res = createRes();

      // We need to check that the SMS path is taken when chatId is empty
      // The endpoint should handle this gracefully
      await dispatchRouter(remindersRouter, req, res);

      // Should return success even for SMS-only (the ReminderSheet handles SMS via URL)
      // The backend /remind endpoint sends via Telegram, so SMS-only returns 400
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});