#!/usr/bin/env node
/**
 * Test Harness — Telegram Reminder Flow
 *
 * Run after starting the API server:
 *   pnpm --filter @workspace/api-server dev   (in another terminal)
 *   node test-harness.js                      (this script)
 *
 * Simulates: shop owner → customer links Telegram → reminder sent → payment confirmed
 *
 * Env:
 *   API_BASE_URL  (default: http://localhost:4000)
 *   SHOP_ID       (default: 1)
 *   CRON_SECRET   (default: test-cron-secret)
 */
const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";
const SHOP_ID = parseInt(process.env.SHOP_ID || "1", 10);
const CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
const API_KEY = process.env.API_KEY || ""; // If your server uses API key auth

const headers = {
  "Content-Type": "application/json",
  "x-shop-id": String(SHOP_ID),
  ...(API_KEY ? { "x-api-key": API_KEY } : {}),
};

const pass = [];
const fail = [];

function log(msg, ok, detail = "") {
  const icon = ok ? "✅" : "❌";
  const detailStr = detail ? ` — ${detail}` : "";
  console.log(`${icon} ${msg}${detailStr}`);
  if (ok) pass.push(msg);
  else fail.push({ msg, detail });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function post(path, body, extraHeaders = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { ...headers, ...extraHeaders },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: res.status, body: parsed };
  } catch (err) {
    throw new Error(`Fetch failed for POST ${path}: ${err.message}`);
  }
}

async function get(path, extraHeaders = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { ...headers, ...extraHeaders },
    });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: res.status, body: parsed };
  } catch (err) {
    throw new Error(`Fetch failed for GET ${path}: ${err.message}`);
  }
}

async function main() {
  console.log(`\n🧪 Telegram Reminder Flow Test Harness`);
  console.log(`   API: ${API_BASE} | Shop ID: ${SHOP_ID}`);
  console.log("=".repeat(60) + "\n");

  // ─── Step 1: Check Telegram bot status ──────────────────────────
  let r = await get("/telegram/status");
  const botOk = r.status === 200 && r.body?.configured;
  log("1. Bot configured", botOk, `status=${r.status}`);

  // ─── Step 2: Create a link session for a test customer ───────────
  const TOKEN = `test-customer-${Date.now()}`;
  const CHAT_ID = "test_chat_" + Math.floor(Math.random() * 100000);

  r = await post("/telegram/link-sessions", {
    shopId: SHOP_ID,
    token: TOKEN,
    customerId: 1,
    customerName: "Test Customer",
    shopName: "Test Shop",
    currentBalance: 100,
    updatesEnabled: false,
  });
  const sessionOk = r.status === 200 && r.body?.token === TOKEN;
  log("2. Link session created", sessionOk, `token=${TOKEN}, deepLink=${r.body?.deep_link ? 'yes' : 'no'}`);

  // ─── Step 3: Simulate customer tapping "Start" via webhook ─────────
  r = await post("/telegram/webhook", {
    message: {
      chat: { id: parseInt(CHAT_ID) },
      from: { username: "testuser", language_code: "en" },
      text: `/start ${TOKEN}`,
    },
  }, { "x-telegram-bot-api-secret-token": "test-tg-webhook-secret" });
  const webhookOk = r.status === 200 && r.body?.linked === true;
  log("3. Webhook /start processed", webhookOk, JSON.stringify(r.body).slice(0, 80));

  // ─── Step 4: Customer checks balance via Telegram ─────────────────
  await sleep(500);
  r = await post("/telegram/webhook", {
    message: {
      chat: { id: parseInt(CHAT_ID) },
      from: { username: "testuser", language_code: "en" },
      text: "/balance",
    },
  }, { "x-telegram-bot-api-secret-token": "test-tg-webhook-secret" });
  const balanceOk = r.status === 200;
  log("4. Customer checks /balance", balanceOk, `status=${r.status}`);

  // ─── Step 5: Shop owner sends on-demand reminder ──────────────────
  r = await post(`/telegram/reminders/remind/1`, {
    shopId: SHOP_ID,
    chatId: CHAT_ID,
    customerName: "Test Customer",
    balance: 100,
    language: "en",
  });
  const reminderOk = r.status === 200 && r.body?.sent === true;
  log("5. On-demand reminder sent", reminderOk, `messageId=${r.body?.messageId}`);

  // ─── Step 6: Simulate customer paying via /paid ────────────────────
  await sleep(500);
  r = await post("/telegram/webhook", {
    message: {
      chat: { id: parseInt(CHAT_ID) },
      from: { username: "testuser", language_code: "en" },
      text: "/paid 100",
    },
  }, { "x-telegram-bot-api-secret-token": "test-tg-webhook-secret" });
  const paidOk = r.status === 200;
  log("6. Customer sent /paid", paidOk, `status=${r.status}`);

  // ─── Step 7: Shop owner confirms payment ────────────────────────────
  await sleep(500);
  r = await post("/telegram/reminders/payment-confirmed", {
    shopId: SHOP_ID,
    customerId: 1,
    amount: 100,
    customerName: "Test Customer",
    chatId: CHAT_ID,
    phoneNumber: "+251900000000",
    language: "en",
  });
  const confirmedOk = r.status === 200 && r.body?.ok === true;
  log("7. Payment confirmed endpoint", confirmedOk, `shopId=${r.body?.shopId}, customerId=${r.body?.customerId}`);

  // ─── Step 8: Test premium tier toggle (TEST_MODE only) ──────────────
  const originalTestMode = process.env.TEST_MODE;
  // We test the toggle endpoint via the API
  r = await post("/telegram/reminders/plan", {
    shopId: SHOP_ID,
    plan: "plus",
  });
  const planToggleOk = r.status === 200 && r.body?.plan === "plus";
  log("8. Plan toggle to 'plus'", planToggleOk, r.body?.error || `plan=${r.body?.plan}`);

  // Toggle back to free
  r = await post("/telegram/reminders/plan", {
    shopId: SHOP_ID,
    plan: "free",
  });
  const planToggleBackOk = r.status === 200 && r.body?.plan === "free";
  log("9. Plan toggle to 'free'", planToggleBackOk, r.body?.error || `plan=${r.body?.plan}`);

  // ─── Step 10: Cron auth check ──────────────────────────────────────
  r = await post("/telegram/reminders/run", { shopId: SHOP_ID }, { "x-shop-id": String(SHOP_ID) });
  const cronAuthOk = r.status === 401;
  log("10. Cron /run rejects without secret", cronAuthOk, `status=${r.status} (expected 401)`);

  // ─── Summary ───────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${pass.length} passed, ${fail.length} failed`);
  if (fail.length > 0) {
    console.log("\nFailures:");
    fail.forEach((f) => console.log(`  - ${f.msg}: ${f.detail}`));
    process.exit(1);
  } else {
    console.log("\n🎉 All checks passed! The Telegram flow is working end-to-end.");
  }
}

main().catch((err) => {
  console.error("\n💥 Test harness crashed:", err.message);
  process.exit(1);
});
