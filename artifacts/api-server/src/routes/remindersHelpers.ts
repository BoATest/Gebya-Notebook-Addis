import { type Request } from "express";

export function getShopId(req: Request): number {
  // Try from body, then query, then header
  const shopId =
    Number(req.body?.shopId) ||
    Number(req.query?.shopId) ||
    Number(req.headers?.["x-shop-id"]) ||
    0;
  if (!Number.isInteger(shopId) || shopId <= 0) {
    throw new Error("Missing or invalid shopId");
  }
  return shopId;
}

export function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void {
  const logLine = [`[reminders] ${level.toUpperCase()}`, message, context ? JSON.stringify(context) : ""].join(" ");
  if (level === "error") console.error(logLine);
  else if (level === "warn") console.warn(logLine);
  else console.log(logLine);
}
