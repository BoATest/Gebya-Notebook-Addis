/**
 * Notification Cleanup Service
 *
 * Removes expired notifications (past their expiresAt TTL).
 * Designed to run as a Vercel cron job or on cold start.
 *
 * Default TTL: 90 days from creation.
 * Runs daily. Batches deletes to avoid long transactions.
 */
import { requireDb } from "@workspace/db";
import { notifications } from "@workspace/db/schema";
import { lt, inArray, count } from "drizzle-orm";

const BATCH_SIZE = 500;

export async function cleanupExpiredNotifications(): Promise<{ deleted: number }> {
  const db = requireDb();
  const now = new Date();

  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Find expired notifications in batches
    const expired = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(lt(notifications.expiresAt, now))
      .limit(BATCH_SIZE);

    if (expired.length === 0) {
      hasMore = false;
      break;
    }

    const ids = expired.map((r) => r.id);
    await db
      .delete(notifications)
      .where(inArray(notifications.id, ids));

    totalDeleted += ids.length;
    hasMore = ids.length === BATCH_SIZE;
  }

  return { deleted: totalDeleted };
}

export async function getExpiredCount(): Promise<number> {
  const db = requireDb();
  const now = new Date();
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(lt(notifications.expiresAt, now));
  return row?.total || 0;
}
