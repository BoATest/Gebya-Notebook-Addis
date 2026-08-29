import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { JWT_SECRET, JWT_COOKIE_NAME, getTokenExpiryForRole } from "./auth.js";

export function getToken(req: Request) {
  const authHeader = req.headers.authorization || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1];
  return req.cookies?.[JWT_COOKIE_NAME] || null;
}

export function setTokenCookie(res: Response, token: string) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60 * 1000, // upper bound; actual expiry is in the JWT
    path: "/",
  });
}

export function clearTokenCookie(res: Response) {
  res.clearCookie(JWT_COOKIE_NAME, { path: "/" });
}

export function hashOtp(plain: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(plain, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyOtp(plain: string, hashed: string): boolean {
  if (!hashed.includes(":")) {
    return hashOtp(plain) === hashed;
  }
  const [salt, hash] = hashed.split(":");
  if (!salt || !hash) return false;
  const computedHash = crypto.pbkdf2Sync(plain, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(hash, "hex"));
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Sign a JWT for a user. `role` picks the TTL — owner (and platform_admin)
 * get a 1-year token, staff get 30 days, see getTokenExpiryForRole().
 * `userId` is now a string to support both legacy serial PKs and UUID PKs
 * (legacy owners use the serial users table; new tenants may use UUIDs).
 */
export function signJwt(userId: string | number, role?: string | null) {
  const jti = crypto.randomUUID();
  const expiresIn = getTokenExpiryForRole(role) as jwt.SignOptions["expiresIn"];
  return jwt.sign({ userId: String(userId), type: "access", role: role || "owner", jti }, JWT_SECRET, {
    expiresIn,
  });
}

export interface DecodedToken {
  userId: number;
  role: string;
  jti: string;
  iat: number;
  exp: number;
}

export function verifyJwt(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET, { clockTolerance: 60 }) as unknown as DecodedToken;
  } catch {
    return null;
  }
}
