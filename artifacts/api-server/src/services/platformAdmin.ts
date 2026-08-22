import { normalizePhone } from "@workspace/db/schema";
import { requireDb, platformAdminMembers } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

/**
 * Platform admin allowlist.
 *
 * A phone is an admin if it is listed in the PLATFORM_ADMIN_PHONES env var
 * (comma-separated, e.g. "+251911111111,+251922222222") OR in the
 * platform_admin_members table (managed at runtime from the Command Center).
 *
 * If NO allowlist is configured at all (env empty AND table empty):
 *   - production  → deny all /admin access (safe default — misconfiguration
 *                   must never expose platform-wide data)
 *   - development → allow any shop owner (convenience for local work)
 */
const ENV_ALLOWLIST = (process.env.PLATFORM_ADMIN_PHONES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(normalizePhone)
  .filter((n): n is string => !!n);

// Email-based allowlist for Google-sign-in admins (comma-separated).
const ENV_EMAIL_ALLOWLIST = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

export async function isPlatformAdminPhone(phone: string | null | undefined): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  // Env allowlist is the fast path (and the bootstrap for the first admin).
  if (ENV_ALLOWLIST.includes(normalized)) return true;

  // No allowlist configured anywhere → dev-mode convenience or safe-deny.
  try {
    const db = requireDb();
    const rows = await db
      .select({ id: platformAdminMembers.id })
      .from(platformAdminMembers)
      .where(eq(platformAdminMembers.phone, normalized))
      .limit(1);
    if (rows.length > 0) return true;
  } catch (e) {
    console.warn("[platformAdmin] DB member check failed:", e instanceof Error ? e.message : String(e));
  }

  if (ENV_ALLOWLIST.length === 0 && !isProduction) return true;
  return false;
}

/** True if the email is on the platform-admin email allowlist (env OR table). */
export async function isPlatformAdminEmail(email: string | null | undefined): Promise<boolean> {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  if (ENV_EMAIL_ALLOWLIST.includes(normalized)) return true;
  try {
    const db = requireDb();
    const rows = await db
      .select({ id: platformAdminMembers.id })
      .from(platformAdminMembers)
      .where(eq(platformAdminMembers.email, normalized))
      .limit(1);
    if (rows.length > 0) return true;
  } catch (e) {
    console.warn("[platformAdmin] DB email check failed:", e instanceof Error ? e.message : String(e));
  }
  return false;
}

/** Combined check: a user is an admin if their phone OR email is allowlisted. */
export async function isPlatformAdminUser(user: { phoneNumber?: string | null; email?: string | null } | null | undefined): Promise<boolean> {
  if (!user) return false;
  if (await isPlatformAdminPhone(user.phoneNumber)) return true;
  if (await isPlatformAdminEmail(user.email)) return true;
  return false;
}

/** List all runtime-managed admin members (newest first). */
export async function listAdminMembers() {
  const db = requireDb();
  return db.select().from(platformAdminMembers).orderBy(desc(platformAdminMembers.createdAt));
}

/** Add a member by phone and/or email. Returns { ok, status: 'added' | 'exists' | 'invalid', member }. */
export async function addAdminMember(input: {
  phone?: string | null;
  email?: string | null;
  addedByPhone?: string | null;
  note?: string | null;
}) {
  const normalizedPhone = input.phone ? normalizePhone(input.phone) : null;
  const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
  if (!normalizedPhone && !normalizedEmail) return { ok: false, status: "invalid" as const };
  const db = requireDb();
  const existing = await db
    .select()
    .from(platformAdminMembers)
    .where(normalizedPhone ? eq(platformAdminMembers.phone, normalizedPhone) : eq(platformAdminMembers.email, normalizedEmail!))
    .limit(1);
  if (existing.length > 0) return { ok: true, status: "exists" as const, member: existing[0] };
  const inserted = await db
    .insert(platformAdminMembers)
    .values({ phone: normalizedPhone, email: normalizedEmail, addedByPhone: input.addedByPhone ?? null, note: input.note || null })
    .returning();
  return { ok: true, status: "added" as const, member: inserted[0] };
}

/** Remove a member by id. */
export async function removeAdminMember(id: number) {
  const db = requireDb();
  const deleted = await db.delete(platformAdminMembers).where(eq(platformAdminMembers.id, id)).returning();
  return deleted[0] ?? null;
}