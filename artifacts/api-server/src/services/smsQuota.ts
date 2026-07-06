/**
 * SMS Quota Service
 *
 * Manages monthly SMS quota per shop for automated reminders.
 * - Tracks SMS sends per shop per month
 * - Hard cap at configurable limit (default: 20/month)
 * - Uses KV (Upstash Redis) or in-memory fallback
 *
 * Environment variables:
 *   SMS_MONTHLY_LIMIT - Max SMS per shop per month (default: 20)
 */

// ─── storage backend selection ────────────────────────────────────────
const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)?.trim();
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)?.trim();
const kvEnabled = Boolean(KV_URL && KV_TOKEN);

const SMS_MONTHLY_LIMIT = parseInt(process.env.SMS_MONTHLY_LIMIT || "20", 10);

// In-memory fallback (used when KV is not configured)
const memQuota = new Map<string, number>();

// ─── types ─────────────────────────────────────────────────────────────

export interface SmsQuotaInfo {
  shopId: number;
  month: string; // "YYYY-MM"
  count: number;
  limit: number;
  remaining: number;
  canSend: boolean;
}

// ─── KV command helper ────────────────────────────────────────────────

async function kvCmd(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(KV_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`KV command failed (${res.status})`);
  }
  const data = (await res.json()) as { result?: unknown };
  return data?.result ?? null;
}

// ─── helpers ───────────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function quotaKey(shopId: number, month: string): string {
  return `sms:quota:${shopId}:${month}`;
}

function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  const logLine = [`[SmsQuota] ${level.toUpperCase()}`, message, context ? JSON.stringify(context) : ""].join(" ");
  if (level === "error") console.error(logLine);
  else if (level === "warn") console.warn(logLine);
  else console.log(logLine);
}

// ─── low-level accessors (KV or memory) ───────────────────────────────

async function getCount(shopId: number, month: string): Promise<number> {
  const key = quotaKey(shopId, month);

  if (kvEnabled) {
    try {
      const raw = await kvCmd(["GET", key]);
      return raw ? parseInt(String(raw), 10) || 0 : 0;
    } catch (error) {
      log("error", "Failed to read quota from KV", { shopId, month, error: String(error) });
      return 0;
    }
  }

  return memQuota.get(key) || 0;
}

async function setCount(shopId: number, month: string, count: number): Promise<void> {
  const key = quotaKey(shopId, month);

  if (kvEnabled) {
    try {
      // Use INCR for atomic increment, but we need to SET for absolute value
      await kvCmd(["SET", key, String(count)]);
      // Set TTL to 60 days (auto-cleanup old months)
      await kvCmd(["EXPIRE", key, 60 * 24 * 60 * 60]);
    } catch (error) {
      log("error", "Failed to write quota to KV", { shopId, month, count, error: String(error) });
      throw error;
    }
  } else {
    memQuota.set(key, count);
  }
}

// ─── public API ────────────────────────────────────────────────────────

/**
 * Get current quota info for a shop.
 */
export async function getQuotaInfo(shopId: number): Promise<SmsQuotaInfo> {
  const month = getCurrentMonth();
  const count = await getCount(shopId, month);
  const remaining = Math.max(0, SMS_MONTHLY_LIMIT - count);

  return {
    shopId,
    month,
    count,
    limit: SMS_MONTHLY_LIMIT,
    remaining,
    canSend: count < SMS_MONTHLY_LIMIT,
  };
}

/**
 * Check if a shop can send an SMS (has quota remaining).
 */
export async function canSendSms(shopId: number): Promise<boolean> {
  const info = await getQuotaInfo(shopId);
  return info.canSend;
}

/**
 * Increment SMS count for a shop. Returns the new count.
 * Throws if quota exceeded (hard cap).
 */
export async function incrementSmsCount(shopId: number): Promise<number> {
  const month = getCurrentMonth();
  const currentCount = await getCount(shopId, month);

  if (currentCount >= SMS_MONTHLY_LIMIT) {
    throw new Error(`SMS quota exceeded for shop ${shopId}: ${currentCount}/${SMS_MONTHLY_LIMIT}`);
  }

  const newCount = currentCount + 1;
  await setCount(shopId, month, newCount);

  log("info", "SMS count incremented", {
    shopId,
    month,
    previousCount: currentCount,
    newCount,
    remaining: SMS_MONTHLY_LIMIT - newCount,
  });

  return newCount;
}

/**
 * Reset quota for a shop (for testing or manual reset).
 */
export async function resetQuota(shopId: number): Promise<void> {
  const month = getCurrentMonth();
  await setCount(shopId, month, 0);

  log("info", "SMS quota reset", { shopId, month });
}

/**
 * Get quota info for all shops (for admin dashboard).
 */
export async function getAllQuotas(): Promise<SmsQuotaInfo[]> {
  // This would require iterating all shop IDs
  // For now, return empty - implement when needed
  return [];
}
