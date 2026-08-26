// @ts-nocheck
import { Router } from "express";
import { db } from "@workspace/db";
import { users, devices, otps, businesses, businessMembers } from "@workspace/db/schema";
import { normalizePhone } from "@workspace/db/schema";
import { eq, and, gt, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendTelegramTextMessage } from "../services/telegramBotService.js";
import { isPlatformAdminUser, isPlatformAdminEmail } from "../services/platformAdmin.js";

const router = Router();

if (!process.env.JWT_SECRET) {
  throw new Error(
    "[auth] FATAL: JWT_SECRET is not set. Refusing to start without a signing secret. " +
    "Set JWT_SECRET in your environment before booting."
  );
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "30d";
const JWT_COOKIE_NAME = "gebya_token";
const OTP_EXPIRES_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

/**
 * Extract JWT from Authorization header (Bearer) or httpOnly cookie.
 * Cookie is used by the bank dashboard; header is used by the merchant app.
 */
function getToken(req) {
  const authHeader = req.headers.authorization || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1];
  return req.cookies?.[JWT_COOKIE_NAME] || null;
}

function setTokenCookie(res, token) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });
}

function clearTokenCookie(res) {
  res.clearCookie(JWT_COOKIE_NAME, { path: "/" });
}

function hashOtp(plain: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plain, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyOtp(plain: string, hashed: string): boolean {
  if (!hashed.includes(':')) {
    return hashOtp(plain) === hashed;
  }
  const [salt, hash] = hashed.split(':');
  if (!salt || !hash) return false;
  const computedHash = crypto.pbkdf2Sync(plain, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
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

// Per-phone OTP request rate limit (blunts OTP-bombing). In-memory windowing is
// per-instance only — on serverless (multiple instances, cold starts) it is not
// shared, so pair with a persistent limiter (Redis/DB) for strong production
// guarantees. It still raises the cost of abuse on a single warm instance.
const otpRate = new Map<string, number[]>();
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;
const OTP_RATE_MAX = 5;

// --- POST /api/auth/otp ---
router.post("/otp", async (req, res) => {
  const { phone_number } = req.body;
  if (!phone_number || typeof phone_number !== "string" || phone_number.length < 8) {
    return res.status(400).json({ error: "phone_number is required" });
  }

  const normalizedPhone = normalizePhone(phone_number);
  if (!normalizedPhone) {
    return res.status(400).json({ error: "Invalid Ethiopian phone number" });
  }

  // Throttle OTP generation per phone number.
  const now = Date.now();
  const recent = (otpRate.get(normalizedPhone) ?? []).filter((t) => now - t < OTP_RATE_WINDOW_MS);
  if (recent.length >= OTP_RATE_MAX) {
    return res.status(429).json({ error: "Too many OTP requests. Please wait before retrying." });
  }
  recent.push(now);
  otpRate.set(normalizedPhone, recent);

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

  const normalizedPhone = normalizePhone(phone_number);
  if (!normalizedPhone) {
    return res.status(400).json({ error: "Invalid Ethiopian phone number" });
  }
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
    .orderBy(otps.createdAt, "desc")
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

  if (!verifyOtp(otp.trim(), otpRecord.codeHash)) {
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
  setTokenCookie(res, token);

  // Fetch all business memberships (gracefully handle if table has schema issues)
  let memberRows: any[] = [];
  try {
    memberRows = await db
      .select({
        businessId: businessMembers.businessId,
        role: businessMembers.role,
        permissions: businessMembers.permissions,
      })
      .from(businessMembers)
      .where(eq(businessMembers.userId, user.id));
} catch (err) {
      console.error("[auth:verify] business_members query failed:", err);
      // Continue without memberships — user can still authenticate
    }
    const primary = memberRows[0] || null;

    // Enrich with business names (batch query to avoid N+1)
    let businessList: any[] = [];
    try {
      if (memberRows.length > 0) {
        const bizIds = memberRows.map((m) => m.businessId);
        const bizRows = await db
          .select({ id: businesses.id, name: businesses.name })
          .from(businesses)
          .where(inArray(businesses.id, bizIds));
        const bizMap = new Map(bizRows.map((b) => [b.id, b.name]));
        businessList = memberRows.map((m) => ({
          business_id: m.businessId,
          name: bizMap.get(m.businessId) || "Unknown",
          role: m.role,
          permissions: m.permissions,
        }));
      }
    } catch (err) {
      console.error("[auth:verify] business enrichment failed:", err);
    }

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
      is_platform_admin: await isPlatformAdminUser(user),
    });
  });



// --- POST /api/auth/link-device ---
router.post("/link-device", async (req, res) => {
  const token = getToken(req);
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

// --- POST /api/auth/logout ---
router.post("/logout", async (req, res) => {
  clearTokenCookie(res);
  return res.json({ ok: true });
});

// --- GET /api/auth/me ---
router.get("/me", async (req, res) => {
  const token = getToken(req);
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

  // Enrich with business names + plan (batch query to avoid N+1)
  let businessList: any[] = [];
  if (memberRows.length > 0) {
    const bizIds = memberRows.map((m) => m.businessId);
    const bizRows = await db
      .select({ id: businesses.id, name: businesses.name, plan: businesses.plan })
      .from(businesses)
      .where(inArray(businesses.id, bizIds));
    const bizMap = new Map(bizRows.map((b) => [b.id, b]));
    businessList = memberRows.map((m) => ({
      business_id: m.businessId,
      name: bizMap.get(m.businessId)?.name || "Unknown",
      plan: bizMap.get(m.businessId)?.plan || "free",
      role: m.role,
      permissions: m.permissions,
    }));
  }

  return res.json({
    ok: true,
    user: {
      id: user.id,
      phone_number: user.phoneNumber,
      preferred_lang: user.preferredLang,
      created_at: user.createdAt,
    },
    has_password: !!user.passwordHash,
    role: primary?.role || null,
    permissions: primary?.permissions || null,
    businesses: businessList,
    is_platform_admin: await isPlatformAdminUser(user),
  });
});

// --- POST /api/auth/set-password ---
// Requires a valid OTP-verified session token
const PASSWORD_MAX_ATTEMPTS = 5;
const PASSWORD_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

router.post("/set-password", async (req, res) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }
  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { password } = req.body;
  if (!password || typeof password !== "string" || password.length < 6 || password.length > 32) {
    return res.status(400).json({ error: "Password must be 6-32 characters" });
  }

  const passwordHash = hashOtp(password); // Reuse PBKDF2 hashing
  await db
    .update(users)
    .set({
      passwordHash,
      passwordSetAt: new Date(),
      passwordAttempts: 0,
      passwordLockedUntil: null,
    })
    .where(eq(users.id, decoded.userId));

  return res.json({ ok: true });
});

// --- POST /api/auth/login ---
// Login with phone number + password (alternative to OTP)
router.post("/login", async (req, res) => {
  const { phone_number, password } = req.body;
  if (!phone_number || typeof phone_number !== "string" || !password) {
    return res.status(400).json({ error: "phone_number and password are required" });
  }

  const normalizedPhone = normalizePhone(phone_number);
  if (!normalizedPhone) {
    return res.status(400).json({ error: "Invalid Ethiopian phone number" });
  }

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, normalizedPhone))
    .limit(1);
  const user = userRows[0];

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  // Check lockout
  if (user.passwordLockedUntil && new Date() < user.passwordLockedUntil) {
    return res.status(429).json({ error: "Too many failed attempts. Try again later." });
  }

  const isValidPassword = verifyOtp(password, user.passwordHash);
  if (!isValidPassword) {
    const attempts = (user.passwordAttempts || 0) + 1;
    const update: any = { passwordAttempts: attempts };
    if (attempts >= PASSWORD_MAX_ATTEMPTS) {
      update.passwordLockedUntil = new Date(Date.now() + PASSWORD_LOCKOUT_MS);
      update.passwordAttempts = 0;
    }
    await db.update(users).set(update).where(eq(users.id, user.id));
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  // Reset attempts on success
  await db
    .update(users)
    .set({ passwordAttempts: 0, passwordLockedUntil: null })
    .where(eq(users.id, user.id));

  const token = signJwt(user.id);
  setTokenCookie(res, token);

  // Fetch businesses (same as /verify)
  const memberRows = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      permissions: businessMembers.permissions,
    })
    .from(businessMembers)
    .where(eq(businessMembers.userId, user.id));
  const primary = memberRows[0] || null;

  let businessList: any[] = [];
  try {
    if (memberRows.length > 0) {
      const bizIds = memberRows.map((m) => m.businessId);
      const bizRows = await db
        .select({ id: businesses.id, name: businesses.name })
        .from(businesses)
        .where(inArray(businesses.id, bizIds));
      const bizMap = new Map(bizRows.map((b) => [b.id, b.name]));
      businessList = memberRows.map((m) => ({
        business_id: m.businessId,
        name: bizMap.get(m.businessId) || "Unknown",
        role: m.role,
        permissions: m.permissions,
      }));
    }
  } catch { /* non-critical */ }

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
    is_platform_admin: await isPlatformAdminUser(user),
  });
});

// --- POST /api/auth/remove-password ---
// Requires a valid JWT token (user is already logged in)
router.post("/remove-password", async (req, res) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }
  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  await db
    .update(users)
    .set({
      passwordHash: null,
      passwordSetAt: null,
      passwordAttempts: 0,
      passwordLockedUntil: null,
    })
    .where(eq(users.id, decoded.userId));

  return res.json({ ok: true, has_password: false });
});

// --- POST /api/auth/google-admin ---
// "Sign in with Google" for platform admins (Google Identity Services).
// Verifies the Google id_token server-side, checks the admin email allowlist,
// then issues the same JWT the OTP flow uses.
router.post("/google-admin", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: "Google sign-in is not configured (set GOOGLE_CLIENT_ID)" });
  }
  const { idToken } = req.body ?? {};
  if (!idToken || typeof idToken !== "string") {
    return res.status(400).json({ error: "idToken is required" });
  }

  let payload: any;
  try {
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const resp = await fetch(verifyUrl);
    payload = await resp.json();
  } catch {
    return res.status(400).json({ error: "Failed to verify Google token" });
  }

  if (!payload || payload.aud !== clientId) {
    return res.status(401).json({ error: "Invalid Google token (audience mismatch)" });
  }
  // Reject tokens that did not originate from Google's OIDC issuer.
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    return res.status(401).json({ error: "Invalid Google token issuer" });
  }
  if (String(payload.email_verified) !== "true") {
    return res.status(403).json({ error: "Google email is not verified" });
  }
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "Google account has no email" });
  }

  if (!(await isPlatformAdminEmail(email))) {
    return res.status(403).json({ error: "Your Google account is not on the platform-admin allowlist" });
  }

  const syntheticPhone = `gadmin:${email}`;
  let userRows = await db.select().from(users).where(eq(users.phoneNumber, syntheticPhone)).limit(1);
  let user = userRows[0];
  if (!user) {
    const inserted = await db.insert(users).values({ phoneNumber: syntheticPhone, email, active: true }).returning();
    user = inserted[0];
  } else if (!user.email) {
    await db.update(users).set({ email }).where(eq(users.id, user.id));
  }

  const token = signJwt(user.id);
  setTokenCookie(res, token);

  return res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      phone_number: user.phoneNumber,
      email: user.email,
      preferred_lang: user.preferredLang,
      created_at: user.createdAt,
    },
    role: "platform_admin",
    permissions: [],
    businesses: [],
    is_platform_admin: true,
  });
});

export default router;
