/**
 * Notification Stream — SSE broadcast utility
 *
 * In-memory broadcast for real-time notification count updates.
 * Used by notification creation routes to push updates to connected clients.
 */
import type { Response } from "express";

// In-memory client registry: Map<`${businessId}:${userId}`, Set<response>>
const clients = new Map<string, Set<Response>>();

export function registerClient(businessId: number, userId: number, res: Response) {
  const key = `${businessId}:${userId}`;
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key)!.add(res);
}

export function removeClient(businessId: number, userId: number, res: Response) {
  const key = `${businessId}:${userId}`;
  clients.get(key)?.delete(res);
  if (clients.get(key)?.size === 0) clients.delete(key);
}

export function broadcastNotification(businessId: number, userId: number) {
  const key = `${businessId}:${userId}`;
  const set = clients.get(key);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify({ type: "unread_count_changed", ts: Date.now() })}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch { set.delete(res); }
  }
}
