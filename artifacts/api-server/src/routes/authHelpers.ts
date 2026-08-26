import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_COOKIE_NAME } from "./auth.js";

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
    maxAge: 30 * 24 * 60 * 60 * 1000,
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

export function signJwt(userId: number) {
  return jwt.sign({ userId, type: "access" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET, { clockTolerance: 60 }) as { userId: number; type: string };
  } catch {
    return null;
  }
}
