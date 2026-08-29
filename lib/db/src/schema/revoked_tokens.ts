import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

// Token-revocation list for the auth refresh flow. The JWT `jti` claim is the
// lookup key; `revoked_at` lets us prune old rows. Long-lived JWTs (1y for
// owners, 30d for staff) are now revocable without waiting for natural
// expiry, which is the gap that made the "Sign in to sync" prompt reappear.
export const revokedTokens = pgTable(
  "revoked_tokens",
  {
    jti: text("jti").primaryKey(),
    userId: text("user_id").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
  },
  (t) => [
    index("revoked_tokens_user_idx").on(t.userId),
    index("revoked_tokens_expires_at_idx").on(t.expiresAt),
  ],
);

export type RevokedToken = typeof revokedTokens.$inferSelect;
