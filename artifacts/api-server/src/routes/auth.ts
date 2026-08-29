import { Router, Request, Response } from "express";
import { requireDb } from "@workspace/db";
import { users, devices, otps, businesses, businessMembers, revokedTokens } from "@workspace/db/schema";
import { normalizePhone } from "@workspace/db/schema";
import { eq, and, gt, inArray, desc, lt } from "drizzle-orm";
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
export const JWT_SECRET = process.env.JWT_SECRET;
// Backwards-compat export. New code should use getTokenExpiryForRole().
export const JWT_EXPIRES_IN = "30d";
export const JWT_COOKIE_NAME = "gebya_token";

// ── Long-lived tokens + silent refresh ──
//
// Owners (and platform admins) get a 1-year JWT. Staff get 30 days. Both
// remain refreshable for an additional REFRESH_WINDOW_DAYS past their
// nominal expiry via POST /auth/refresh. The feature flag defaults OFF so
// the legacy 30-day behavior stays in effect until the operator opts in.
const JWT_TTL_OWNER_DAYS = Number(process.env.JWT_TTL_OWNER_DAYS || 365);
const JWT_TTL_STAFF_DAYS = Number(process.env.JWT_TTL_STAFF_DAYS || 30);
const JWT_REFRESH_WINDOW_DAYS = Number(process.env.JWT_REFRESH_WINDOW_DAYS || 30);
const LONG_TOKEN_ENABLED = process.env.LONG_TOKEN_ENABLED === "true";

export function getTokenExpiryForRole(role?: string | null): string {
  if (!LONG_TOKEN_ENABLED) return JWT_EXPIRES_IN;
  // platform_admin tokens are scoped to platform-level access, not a single
  // shop; treat them like owners for TTL purposes.
  const days = role === "staff" ? JWT_TTL_STAFF_DAYS : JWT_TTL_OWNER_DAYS;
  return `${days}d`;
}

const OTP_EXPIRES_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

import { getToken, setTokenCookie, clearTokenCookie, hashOtp, verifyOtp, generateOtp, signJwt, verifyJwt, type DecodedToken } from "./authHelpers.js";
export { verifyJwt };

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
  const existingUser = await requireDb().select().from(users).where(eq(users.phoneNumber, normalizedPhone)).limit(1);
  const user = existingUser[0];

  const plainOtp = generateOtp();
  const codeHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MS);

  // Insert OTP record
  await requireDb().insert(otps).values({
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
  const otpRows = await requireDb().select()
    .from(otps)
    .where(
      and(
        eq(otps.phoneNumber, normalizedPhone),
        eq(otps.consumed, false),
        gt(otps.expiresAt, new Date())
      )
    )
    .orderBy(desc(otps.createdAt))
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
  await requireDb().update(otps)
    .set({ attempts: attempts + 1 })
    .where(eq(otps.id, otpRecord.id));

  if (!verifyOtp(otp.trim(), otpRecord.codeHash)) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  // Mark consumed
  await requireDb().update(otps).set({ consumed: true }).where(eq(otps.id, otpRecord.id));

  // Get or create user
  let userRows = await requireDb().select().from(users).where(eq(users.phoneNumber, normalizedPhone)).limit(1);
  let user = userRows[0];

  if (!user) {
    const inserted = await requireDb().insert(users)
      .values({ phoneNumber: normalizedPhone, active: true })
      .returning();
    user = inserted[0];
    // Business is created via POST /api/shops (business-legacy bridge) during onboarding.
    // No auto-creation here to avoid duplicate businesses for the same user.
  }

  // Fetch business memberships BEFORE signing so the JWT carries the
  // role-based TTL. If the query fails we fall back to "owner" — the
  // longest TTL — which is the safer default for a returning user.
  let memberRows: any[] = [];
  let primary: { role: string | null; permissions: any } | null = null;
  try {
    memberRows = await requireDb().select({
        businessId: businessMembers.businessId,
        role: businessMembers.role,
        permissions: businessMembers.permissions,
      })
      .from(businessMembers)
      .where(eq(businessMembers.userId, user.id));
    primary = memberRows[0] || null;
  } catch (err) {
    console.error("[auth:verify] business_members query failed:", err);
  }

  // platform_admin tokens are scoped to platform-level access; treat them
  // as owner-equivalent for TTL purposes.
  const isPlatformAdmin = await isPlatformAdminUser(user);
  const tokenRole = isPlatformAdmin ? "platform_admin" : (primary?.role || "owner");
  const token = signJwt(user.id, tokenRole);
  setTokenCookie(res, token);

  // Enrich with business names (batch query to avoid N+1)
  let businessList: any[] = [];
  try {
    if (memberRows.length > 0) {
      const bizIds = memberRows.map((m) => m.businessId);
      const bizRows = await requireDb().select({ id: businesses.id, name: businesses.name })
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
    is_platform_admin: isPlatformAdmin,
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
  await requireDb().insert(devices)
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

// --- POST /api/auth/refresh ---
// Accepts a (possibly expired) JWT and issues a fresh one, as long as the
// token was issued less than (TTL + REFRESH_WINDOW_DAYS) ago and has not
// been revoked. The client calls this on every 401 to make token expiry
// invisible to the user.
router.post("/refresh", async (req, res) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  // Decode WITHOUT expiry check so we can refresh recently-expired tokens.
  // We deliberately use jwt.decode (no signature verify) first to get the
  // exp; the actual signature is verified by verifyJwt-with-ignore-exp below.
  const decoded = jwt.decode(token) as { jti?: string; userId?: number; role?: string; exp?: number } | null;
  if (!decoded || !decoded.userId || !decoded.jti) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // The token's role determines the refresh window length. `iat` is the
  // token creation time in seconds; refresh is allowed up to (ttl +
  // REFRESH_WINDOW_DAYS) after iat.
  const ttlDays = decoded.role === "staff" ? JWT_TTL_STAFF_DAYS : JWT_TTL_OWNER_DAYS;
  const refreshWindowMs = (ttlDays + JWT_REFRESH_WINDOW_DAYS) * 24 * 60 * 60 * 1000;
  const iatSec = (decoded as any).iat ?? Math.floor((decoded.exp ?? 0) - ttlDays * 24 * 60 * 60);
  const tokenAgeMs = Date.now() - iatSec * 1000;
  if (tokenAgeMs > refreshWindowMs) {
    return res.status(401).json({ error: "refresh_window_closed" });
  }

  // Verify signature (still required — we just allow expired tokens).
  let payload: DecodedToken;
  try {
    payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as unknown as DecodedToken;
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Check the revocation list.
  const revoked = await requireDb().select()
    .from(revokedTokens)
    .where(eq(revokedTokens.jti, payload.jti))
    .limit(1);
  if (revoked.length > 0) {
    return res.status(401).json({ error: "token_revoked" });
  }

  // Issue a fresh token with the same role.
  const newToken = signJwt(payload.userId, payload.role);
  setTokenCookie(res, newToken);

  // Decode the new token to surface exp for the client.
  const newDecoded = jwt.decode(newToken) as { exp: number };
  return res.json({
    ok: true,
    token: newToken,
    expires_at: newDecoded.exp * 1000,
    refresh_window_closes_at: (newDecoded.exp + JWT_REFRESH_WINDOW_DAYS * 24 * 60 * 60) * 1000,
    role: payload.role,
  });
});

// --- POST /api/auth/logout ---
// Now also revokes the current token's jti, so a stolen device can't keep
// using it after the owner has explicitly logged out.
router.post("/logout", async (req, res) => {
  const token = getToken(req);
  if (token) {
    const decoded = jwt.decode(token) as { jti?: string; userId?: string; exp?: number } | null;
    if (decoded?.jti && decoded?.exp) {
      try {
        await requireDb().insert(revokedTokens).values({
          jti: decoded.jti,
          userId: String(decoded.userId || ""),
          expiresAt: new Date(decoded.exp * 1000),
          reason: "logout",
        }).onConflictDoNothing();
      } catch (err) {
        // Non-fatal — the cookie clear is the primary effect.
        console.error("[auth:logout] revoke failed:", err);
      }
    }
  }
  clearTokenCookie(res);
  return res.json({ ok: true });
});

// --- GET /api/auth/me ---
// Same as before, plus a silent-refresh side-effect: if the presented token
// is within 7 days of expiry, transparently issue a new one in the response
// (existing clients ignore it; the new client reads it from `refreshed_token`).
router.get("/me", async (req, res) => {
  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const decoded = verifyJwt(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const userRows = await requireDb().select().from(users).where(eq(users.id, decoded.userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Fetch all business memberships
  const memberRows = await requireDb().select({
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
    const bizRows = await requireDb().select({ id: businesses.id, name: businesses.name, plan: businesses.plan })
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

  // Silent refresh: if the token is within 7 days of expiry, return a fresh
  // one. Skip if the token is already revoked.
  const SILENT_REFRESH_WINDOW_DAYS = 7;
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsToExpiry = decoded.exp - nowSec;
  let refreshedToken: string | undefined;
  if (LONG_TOKEN_ENABLED && secondsToExpiry < SILENT_REFRESH_WINDOW_DAYS * 24 * 60 * 60 && secondsToExpiry > 0) {
    refreshedToken = signJwt(decoded.userId, decoded.role);
    setTokenCookie(res, refreshedToken);
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
    ...(refreshedToken ? { refreshed_token: refreshedToken } : {}),
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
  await requireDb().update(users)
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

  const userRows = await requireDb().select()
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
    await requireDb().update(users).set(update).where(eq(users.id, user.id));
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  // Reset attempts on success
  await requireDb().update(users)
    .set({ passwordAttempts: 0, passwordLockedUntil: null })
    .where(eq(users.id, user.id));

  // Fetch memberships BEFORE signing so the JWT carries the role-based TTL.
  let memberRows: any[] = [];
  try {
    memberRows = await requireDb().select({
        businessId: businessMembers.businessId,
        role: businessMembers.role,
        permissions: businessMembers.permissions,
      })
      .from(businessMembers)
      .where(eq(businessMembers.userId, user.id));
  } catch { /* non-critical */ }
  const primary = memberRows[0] || null;
  const isPlatformAdmin = await isPlatformAdminUser(user);
  const tokenRole = isPlatformAdmin ? "platform_admin" : (primary?.role || "owner");
  const token = signJwt(user.id, tokenRole);
  setTokenCookie(res, token);

  let businessList: any[] = [];
  try {
    if (memberRows.length > 0) {
      const bizIds = memberRows.map((m) => m.businessId);
      const bizRows = await requireDb().select({ id: businesses.id, name: businesses.name })
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
    is_platform_admin: isPlatformAdmin,
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

  await requireDb().update(users)
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
  let userRows = await requireDb().select().from(users).where(eq(users.phoneNumber, syntheticPhone)).limit(1);
  let user = userRows[0];
  if (!user) {
    const inserted = await requireDb().insert(users).values({ phoneNumber: syntheticPhone, email, active: true }).returning();
    user = inserted[0];
  } else if (!user.email) {
    await requireDb().update(users).set({ email }).where(eq(users.id, user.id));
  }

  const token = signJwt(user.id, "platform_admin");
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
