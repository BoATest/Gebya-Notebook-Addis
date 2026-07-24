// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { users, devices, otps, businesses, businessMembers } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendTelegramTextMessage } from "../services/telegramBotService.js";

const router = Router();

if (!process.env.JWT_SECRET) {
  throw new Error(
    "[auth] FATAL: JWT_SECRET is not set. Refusing to start without a signing secret. " +
    "Set JWT_SECRET in your environment before booting."
  );
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "30d";
const OTP_EXPIRES_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(plain: string) {
  return crypto.createHash("sha256").update(plain).digest("hex");
}

function generateOtp() {
  // 6-digit numeric OTP — use crypto for unpredictability
  return String(crypto.randomInt(100000, 1000000));
}

function signJwt(userId: number) {
  return jwt.sign({ userId, type: "access" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET, { clockTolerance: 60 }) as { userId: number; type: string };
  } catch {
    return null;
  }
}

// --- POST /api/auth/otp ---
router.post("/otp", async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number || typeof phone_number !== "string" || phone_number.length < 8) {
    return res.status(400).json({ error: "phone_number is required" });
  }

  const normalizedPhone = phone_number.trim().replace(/\s+/g, "");

  // Check for existing user and telegram chat_id
  const existingUser = await db.select().from(users).where(eq(users.phoneNumber, normalizedPhone)).limit(1);
  const user = existingUser[0];

  const plainOtp = generateOtp();
  const codeHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);

  // Insert OTP record
  await db.insert(otps).values({
    phoneNumber: normalizedPhone,
    codeHash,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt,
    consumed: false,
  });

  // Send OTP via Telegram if user has a linked chat_id
  if (user?.telegramChatId) {
    try {
      await sendTelegramTextMessage(
        user.telegramChatId,
        `Your Gebya login code: ${plainOtp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`
      );
    } catch (err) {
      console.error("[auth:otp] Telegram send failed:", err);
    }
  } else {
    // Fallback: send OTP via SMS if Telegram is not linked
    try {
      const { sendSms } = await import("../services/smsSender.js");
      await sendSms(normalizedPhone, `Your Gebya login code: ${plainOtp}. Expires in 10 min. Do not share.`);
    } catch (err) {
      console.error("[auth:otp] SMS send failed:", err);
    }
  }

  // In dev, return the OTP for testing
  if (process.env.NODE_ENV === "development") {
    return res.json({ ok: true, phone_number: normalizedPhone, otp: plainOtp });
  }

  return res.json({ ok: true, phone_number: normalizedPhone, sent: true });
});

// --- POST /api/auth/verify ---
router.post("/verify", async (req, res) => {
  const { phone_number, otp } = req.body;
  if (!phone_number || !otp || typeof phone_number !== "string" || typeof otp !== "string") {
    return res.status(400).json({ error: "phone_number and otp are required" });
  }

  const normalizedPhone = phone_number.trim().replace(/\s+/g, "");
  const codeHash = hashOtp(otp.trim());

  // Find the most recent unconsumed OTP for this phone
  const otpRows = await db
    .select()
    .from(otps)
    .where(
      and(
        eq(otps.phoneNumber, normalizedPhone),
        eq(otps.consumed, false),
        gt(otps.expiresAt, new Date())
      )
    )
    .orderBy(otps.createdAt)
    .limit(1);

  const otpRecord = otpRows[0];
  if (!otpRecord) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }

  const attempts = otpRecord.attempts ?? 0;
  const maxAttempts = otpRecord.maxAttempts ?? OTP_MAX_ATTEMPTS;

  if (attempts >= maxAttempts) {
    return res.status(429).json({ error: "Too many attempts. Request a new OTP." });
  }

  // Increment attempts
  await db
    .update(otps)
    .set({ attempts: attempts + 1 })
    .where(eq(otps.id, otpRecord.id));

  if (otpRecord.codeHash !== codeHash) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // Mark consumed
  await db.update(otps).set({ consumed: true }).where(eq(otps.id, otpRecord.id));

  // Get or create user
  let userRows = await db.select().from(users).where(eq(users.phoneNumber, normalizedPhone)).limit(1);
  let user = userRows[0];

  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ phoneNumber: normalizedPhone, active: true })
      .returning();
    user = inserted[0];
    // Business is created via POST /api/shops (business-legacy bridge) during onboarding.
    // No auto-creation here to avoid duplicate businesses for the same user.
  }

  const token = signJwt(user.id);

  // Fetch all business memberships
  const memberRows = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      permissions: businessMembers.permissions,
    })
    .from(businessMembers)
    .where(eq(businessMembers.userId, user.id));
  const primary = memberRows[0] || null;

  // Enrich with business names
  const businessList = await Promise.all(
    memberRows.map(async (m) => {
      const biz = await db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, m.businessId))
        .limit(1);
      return {
        business_id: m.businessId,
        name: biz[0]?.name || "Unknown",
        role: m.role,
        permissions: m.permissions,
      };
    })
  );

  return res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      phone_number: user.phoneNumber,
      preferred_lang: user.preferredLang,
      created_at: user.createdAt,
    },
    role: primary?.role || null,
    permissions: primary?.permissions || null,
    businesses: businessList,
  });
});

// --- POST /api/auth/link-device ---
router.post("/link-device", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { device_id, device_name } = req.body;
  if (!device_id || typeof device_id !== "string") {
    return res.status(400).json({ error: "device_id is required" });
  }

  // Upsert device link
  await db
    .insert(devices)
    .values({
      userId: decoded.userId,
      deviceId: device_id,
      name: device_name || null,
    })
    .onConflictDoUpdate({
      target: devices.deviceId,
      set: { userId: decoded.userId, lastSeenAt: new Date() },
    });

  return res.json({ ok: true, device_id, user_id: decoded.userId });
});

// --- GET /api/auth/me ---
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const userRows = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Fetch all business memberships
  const memberRows = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      permissions: businessMembers.permissions,
    })
    .from(businessMembers)
    .where(eq(businessMembers.userId, user.id));
  const primary = memberRows[0] || null;

  // Enrich with business names
  const businessList = await Promise.all(
    memberRows.map(async (m) => {
      const biz = await db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, m.businessId))
        .limit(1);
      return {
        business_id: m.businessId,
        name: biz[0]?.name || "Unknown",
        role: m.role,
        permissions: m.permissions,
      };
    })
  );

  return res.json({
    ok: true,
    user: {
      id: user.id,
      phone_number: user.phoneNumber,
      preferred_lang: user.preferredLang,
      created_at: user.createdAt,
    },
    role: primary?.role || null,
    permissions: primary?.permissions || null,
    businesses: businessList,
  });
});

export default router;
