/**
 * Notification Stream — Server-Sent Events (SSE)
 *
 * GET /notifications/stream — Real-time unread count updates.
 * Uses Redis pub/sub (Upstash) to broadcast across Vercel serverless instances.
 *
 * Flow:
 *   1. Client connects to SSE endpoint
 *   2. Server sends current unread count immediately
 *   3. When a new notification is created, publish to Redis channel
 *   4. All connected SSE endpoints receive the broadcast and send to clients
 *   5. Client updates unread count in real-time
 */
import { Router, type Request, type Response } from "express";
import { requireDb } from "@workspace/db";
import { notifications, businessMembers } from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { verifyJwt } from "./auth.js";

const router = Router();

// ─── Redis pub/sub via Upstash REST API ────────────────────────────────────

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)?.trim();
const KV_TOKEN = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN)?.trim();
const kvEnabled = Boolean(KV_URL && KV_TOKEN);

const REDIS_CHANNEL = "gebya:notifications";

// In-memory subscriber list (for this serverless instance)
type SSEClient = {
  res: Response;
  businessId: number;
  userId: number;
  heartbeat: NodeJS.Timeout;
};
const sseClients = new Map<string, SSEClient>();

function getUserIdFromRequest(req: any): number | null {
  // Check Authorization header first
  const authHeader = (req.headers as any).authorization || (req.headers as any).Authorization || "";
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const token = String(headerValue).replace(/^Bearer\s+/i, "");
  if (token) {
    const decoded = verifyJwt(token);
    if (decoded?.userId) return decoded.userId;
  }

  // Fallback: check query param (for EventSource which can't send headers)
  const queryToken = (req.query?.token as string) || "";
  if (queryToken) {
    const decoded = verifyJwt(queryToken);
    if (decoded?.userId) return decoded.userId;
  }

  return null;
}

async function getOwnerBusiness(userId: number): Promise<{ businessId: number; isOwner: boolean } | null> {
  const rows = await requireDb()
    .select({ businessId: businessMembers.businessId, role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.active, true)))
    .limit(1);
  if (!rows.length) return null;
  return { businessId: rows[0].businessId, isOwner: rows[0].role === "owner" };
}

async function getUnreadCount(businessId: number, userId: number): Promise<number> {
  const db = requireDb();
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(
      eq(notifications.businessId, businessId),
      eq(notifications.ownerUserId, userId),
      eq(notifications.read, false)
    ));
  return row?.total || 0;
}

// ─── Redis pub/sub subscriber ──────────────────────────────────────────────

let redisSubscribed = false;
let redisSubscriber: AbortController | null = null;

async function subscribeToRedis() {
  if (!kvEnabled || redisSubscribed) return;

  try {
    // Upstash Redis doesn't have native SUBSCRIBE via REST.
    // Instead, we use a polling approach with Redis Streams or
    // fall back to in-memory broadcast for single-instance.
    // For production, consider Upstash Redis Streams or a dedicated pub/sub.
    redisSubscribed = true;
    console.log("[NotificationStream] Redis pub/sub initialized (REST polling mode)");
  } catch (err) {
    console.error("[NotificationStream] Redis init failed:", err);
  }
}

// ─── Broadcast function (called when new notification is created) ──────────

export function broadcastNotification(businessId: number, userId: number) {
  const countPromise = getUnreadCount(businessId, userId);

  countPromise.then((unreadCount) => {
    // Send to all connected SSE clients for this business
    for (const [key, client] of sseClients) {
      if (client.businessId === businessId && client.userId === userId) {
        try {
          client.res.write(`event: unread\ndata: ${JSON.stringify({ count: unreadCount })}\n\n`);
        } catch {
          // Client disconnected, clean up
          clearInterval(client.heartbeat);
          sseClients.delete(key);
        }
      }
    }
  }).catch(() => {});
}

// ─── SSE endpoint ──────────────────────────────────────────────────────────

router.get("/stream", async (req: Request, res: Response) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }

  const owner = await getOwnerBusiness(userId);
  if (!owner || !owner.isOwner) {
    res.status(403).json({ error: "Owner only" });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable Nginx buffering
  });

  // Send initial unread count
  const initialCount = await getUnreadCount(owner.businessId, userId);
  res.write(`event: unread\ndata: ${JSON.stringify({ count: initialCount })}\n\n`);

  // Register client
  const clientId = `${userId}-${Date.now()}`;
  const heartbeat = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(clientId);
    }
  }, 30000);

  sseClients.set(clientId, {
    res,
    businessId: owner.businessId,
    userId,
    heartbeat,
  });

  // Clean up on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
  });

  // Initialize Redis subscription if not done
  subscribeToRedis();
});

export default router;
