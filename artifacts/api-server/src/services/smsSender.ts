/**
 * SMS Sender Service
 *
 * Sends SMS via Ethio Telecom SMPP API (mySMSEthiopia).
 * - Validates phone numbers (E.164 format)
 * - Rate limiting (configurable, default 10/sec)
 * - Retry logic with exponential backoff
 * - Error classification for better handling
 *
 * Environment variables:
 *   SMS_API_KEY      - API key from mySMSEthiopia dashboard
 *   SMS_API_URL      - API endpoint (default: https://smsethiopia.et/api/sms/send)
 *   SMS_RATE_LIMIT   - Max SMS per second (default: 10)
 *   SMS_ENABLED      - Enable/disable SMS sending (default: false)
 */

const SMS_API_KEY = process.env.SMS_API_KEY?.trim();
const SMS_API_URL = (process.env.SMS_API_URL?.trim()) || "https://smsethiopia.et/api/sms/send";
const SMS_RATE_LIMIT = parseInt(process.env.SMS_RATE_LIMIT || "10", 10);
const SMS_ENABLED = process.env.SMS_ENABLED === "true";

// ─── types ─────────────────────────────────────────────────────────────

export type SmsErrorClass =
  | "invalid_phone"
  | "rate_limit"
  | "auth_error"
  | "network_timeout"
  | "provider_error"
  | "other";

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorClass?: SmsErrorClass;
  retryCount: number;
  lastAttemptAt: number;
  provider: "ethio_telecom";
}

// ─── rate limiter ──────────────────────────────────────────────────────

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

const smsRateLimiter = new SlidingWindowRateLimiter();

// ─── helpers ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  const logLine = [`[SmsSender] ${level.toUpperCase()}`, message, context ? JSON.stringify(context) : ""].join(" ");
  if (level === "error") console.error(logLine);
  else if (level === "warn") console.warn(logLine);
  else console.log(logLine);
}

/**
 * Normalize phone number to E.164 format without the + prefix.
 * Input: "+251911234567" or "0911234567" or "251911234567"
 * Output: "251911234567" (12 digits, no +)
 */
function normalizePhoneForApi(phone: string): string | null {
  if (!phone) return null;

  // Strip all non-digits
  let digits = phone.replace(/\D/g, "");

  // Handle different formats
  if (digits.startsWith("251") && digits.length === 12) {
    // Already in correct format: 251911234567
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    // Ethiopian local: 0911234567 → 251911234567
    return `251${digits.slice(1)}`;
  }
  if (digits.length === 9 && (digits.startsWith("9") || digits.startsWith("7"))) {
    // Subscriber only: 911234567 → 251911234567
    return `251${digits}`;
  }

  // Invalid format
  return null;
}

function classifySmsError(error: unknown, httpStatus?: number): SmsErrorClass {
  if (httpStatus === 401 || httpStatus === 403) return "auth_error";
  if (httpStatus === 429) return "rate_limit";
  if (httpStatus === 400) return "invalid_phone";
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "network_timeout";
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("key")) return "auth_error";
    if (msg.includes("429") || msg.includes("too many")) return "rate_limit";
    if (msg.includes("400") || msg.includes("invalid") || msg.includes("phone")) return "invalid_phone";
    if (msg.includes("timeout") || msg.includes("network") || msg.includes("econnrefused")) return "network_timeout";
  }
  return "other";
}

// ─── public API ────────────────────────────────────────────────────────

/**
 * Check if SMS sending is enabled and configured.
 */
export function isSmsEnabled(): boolean {
  return SMS_ENABLED && !!SMS_API_KEY;
}

/**
 * Send a single SMS message.
 *
 * @param phone - Recipient phone number (any format, will be normalized)
 * @param message - SMS message body (max 160 chars for single SMS)
 * @param options - Optional: retry count, shopId/customerId for logging
 * @returns SmsSendResult describing the outcome
 */
export async function sendSms(
  phone: string,
  message: string,
  options?: {
    retryCount?: number;
    shopId?: number;
    customerId?: number;
  },
): Promise<SmsSendResult> {
  if (!isSmsEnabled()) {
    return {
      success: false,
      error: "SMS sending is disabled or not configured",
      errorClass: "other",
      retryCount: 0,
      lastAttemptAt: Date.now(),
      provider: "ethio_telecom",
    };
  }

  // Normalize phone
  const normalizedPhone = normalizePhoneForApi(phone);
  if (!normalizedPhone) {
    return {
      success: false,
      error: `Invalid phone number: ${phone}`,
      errorClass: "invalid_phone",
      retryCount: 0,
      lastAttemptAt: Date.now(),
      provider: "ethio_telecom",
    };
  }

  // Rate limit
  await smsRateLimiter.waitForSlot(SMS_RATE_LIMIT);

  const retryCount = options?.retryCount ?? 0;
  const BACKOFF_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s

  for (let attempt = 0; attempt <= BACKOFF_DELAYS.length; attempt++) {
    try {
      log("info", "Sending SMS", {
        phone: normalizedPhone,
        shopId: options?.shopId,
        customerId: options?.customerId,
        attempt: attempt + 1,
      });

      const response = await fetch(SMS_API_URL, {
        method: "POST",
        headers: {
          "KEY": SMS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          msisdn: normalizedPhone,
          text: message,
        }),
      });

      const data = await response.json() as {
        status?: string;
        message?: string;
        [key: string]: unknown;
      };

      if (!response.ok) {
        const errorClass = classifySmsError(null, response.status);
        const isLastAttempt = attempt >= BACKOFF_DELAYS.length;

        if (!isLastAttempt && (errorClass === "rate_limit" || errorClass === "network_timeout")) {
          const delay = BACKOFF_DELAYS[attempt];
          log("warn", `SMS failed (attempt ${attempt + 1}), retrying in ${delay}ms`, {
            phone: normalizedPhone,
            status: response.status,
            error: data.message,
          });
          await sleep(delay);
          continue;
        }

        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
          errorClass,
          retryCount: attempt,
          lastAttemptAt: Date.now(),
          provider: "ethio_telecom",
        };
      }

      // Success
      log("info", "SMS sent successfully", {
        phone: normalizedPhone,
        shopId: options?.shopId,
        customerId: options?.customerId,
      });

      return {
        success: true,
        messageId: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        retryCount: attempt,
        lastAttemptAt: Date.now(),
        provider: "ethio_telecom",
      };
    } catch (error) {
      const errorClass = classifySmsError(error);
      const isLastAttempt = attempt >= BACKOFF_DELAYS.length;

      if (!isLastAttempt && (errorClass === "rate_limit" || errorClass === "network_timeout")) {
        const delay = BACKOFF_DELAYS[attempt];
        log("warn", `SMS failed (attempt ${attempt + 1}), retrying in ${delay}ms`, {
          phone: normalizedPhone,
          error: error instanceof Error ? error.message : String(error),
        });
        await sleep(delay);
        continue;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorClass,
        retryCount: attempt,
        lastAttemptAt: Date.now(),
        provider: "ethio_telecom",
      };
    }
  }

  // Should never reach here
  return {
    success: false,
    error: "Unexpected: retry loop exited without result",
    retryCount: BACKOFF_DELAYS.length,
    lastAttemptAt: Date.now(),
    provider: "ethio_telecom",
  };
}

/**
 * Send a batch of SMS messages sequentially (with rate limiting).
 */
export async function sendBatchSms(
  messages: Array<{ phone: string; message: string; shopId?: number; customerId?: number }>,
): Promise<{ sent: number; failed: number; results: SmsSendResult[] }> {
  let sent = 0;
  let failed = 0;
  const results: SmsSendResult[] = [];

  for (const msg of messages) {
    const result = await sendSms(msg.phone, msg.message, {
      shopId: msg.shopId,
      customerId: msg.customerId,
    });
    results.push(result);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, results };
}
