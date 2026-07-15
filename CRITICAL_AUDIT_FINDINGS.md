# 🚨 CRITICAL AUDIT FINDINGS — Gebya Production Readiness

**Status:** ⛔ NOT PRODUCTION READY  
**Date:** July 2, 2026  
**Audit Type:** Security, Data Integrity, RBAC, Sync Architecture  
**Auditors:** Multi-disciplinary engineering team (Lead Dev + Security + FinTech PM + DevOps)

---

## EXECUTIVE SUMMARY

Gebya has **7 CRITICAL flaws** that will cause data loss, silent permission bypass, and financial integrity violations in production. **Do not launch until all CRITICALs are fixed.**

The most severe issues:
1. **Cross-device collision creates duplicate customer records** → credits split across phantom records
2. **Sync crashes mid-push lose transactions permanently** → money vanishes from ledger
3. **Silent conflict resolution overwrites without audit** → User A's changes deleted, User B doesn't know
4. **app.ts has incomplete syntax** → server may crash or skip rate limiting
5. **RBAC middleware doesn't check permissions** → cashiers can edit shop settings
6. **Identity routes use in-memory store, not DB** → team/device records don't sync with backend

---

## TIER 1: CRITICAL (Production-Blocking)

### 1️⃣ SYNTAX ERROR: app.ts CORS Callback Incomplete
**Severity:** CRITICAL  
**File:** `artifacts/api-server/src/app.ts:85-91`  
**Status:** Server likely fails to start or rate limiter is no-op

**The Bug:**
```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new
export { syncRateLimiter };  // ← INCOMPLETE LINE ABOVE!
```

The CORS origin callback is **unfinished**. Line 87 has `callback(new` with no completion.

**Impact:**
- Server fails to start (syntax error) OR
- TypeScript doesn't catch it (loose TS config) and callback returns undefined, all CORS requests fail

**Fix Required:**
```typescript
      } else {
        callback(new Error("Not allowed by CORS"));
      }
```

**Timeline:** Fix immediately (5 minutes)

---

### 2️⃣ RACE CONDITION: Cross-Device Collision Creates Duplicate Records
**Severity:** CRITICAL (Data Loss)  
**File:** `artifacts/gebya/src/utils/syncEngine.js:355-365`  
**Affected:** Customers, Suppliers, Transactions  
**User Impact:** Credits split across phantom records, reports show duplicates

**The Bug:**
When Device A and Device B both create a customer record offline, both get `local_id = 1`. On sync:
- Device A pushes: `{ local_id: 1, device_id: "device_a", name: "Shop A Corp" }`
- Device B pushes: `{ local_id: 1, device_id: "device_b", name: "Shop A Corp" }`

Server accepts both. On pull, client receives the remote record. Collision detection fires:

```javascript
// Different device with same local id — collision!
delete mapped.id; // let Dexie auto-increment
await table.add(mapped);
```

**Result:** Duplicate customer record created locally. Now:
- Customer #1 (local, device_a): balance = 5,000 birr
- Customer #47 (synced from device_b): balance = 0 birr

User later adds a payment to "Shop A Corp" thinking it's Customer #1, but actually creates a payment against a different internal ID.

**Real Scenario:**
1. Owner creates "Almaz" on phone (customer_id = 1, local)
2. Cashier creates "Almaz" on tablet (customer_id = 1, local)
3. Both sync → server merges, creates single record
4. On pull, tablet receives the merged record, auto-increments it to customer_id = 47
5. Next payment: "Record payment to Almaz" → which one? UI shows "Almaz" but there are 2 records in DB

**Why This Breaks Gebya:**
- Audit trail is corrupted (two transaction histories for one customer)
- Balance calculations show customer as owing both 5,000 (ID 1) and 2,000 (ID 47)
- Credits are **not fungible** — each record is separate
- Reconciliation requires manual merge (not supported)

**Fix Required:**
Implement server-side deduplication on push. When `{ local_id: 1, device_id: "device_b" }` arrives and a record with the same `{ local_id: 1, device_id: "device_a" }` exists for the same customer, **server must merge them and return a canonical ID**:

```typescript
// On server /push endpoint
const existing = await db.select().from(customers)
  .where(and(
    eq(customers.businessId, businessId),
    like(customers.displayName, incomingName)  // fuzzy match
  )).limit(1);

if (existing) {
  // Merge: return canonical customer ID to both devices
  return { merged: true, canonical_id: existing.id, conflicts: [...] };
}
```

Client must then **renumber** its local records to match the canonical ID.

**Timeline:** Fix before any multi-device deployment (HIGH PRIORITY)

---

### 3️⃣ DATA LOSS: Conflict Resolution Silently Overwrites Edits
**Severity:** CRITICAL (Financial Loss)  
**File:** `artifacts/gebya/src/utils/syncEngine.js:281-310` (`_resolveConflicts`)  
**Affected:** All data: transactions, customers, suppliers  
**User Impact:** User edits disappear without warning

**The Bug:**
When two users edit the same record simultaneously:

```javascript
// _resolveConflicts — happens silently during pull
const merged = { ...localRecord };
merged.sync_version = (serverRecord.syncVersion || 1) + 1;
merged.updated_at = Date.now();
await db[tableName].put(merged);

// Then re-push
await this._pushAll(token);
```

**Scenario:**
1. Transaction created on server: `{ id: 123, amount: 5000, sync_version: 1 }`
2. User A edits locally: `{ id: 123, amount: 5000, cost: 2000, profit: 3000 }`
3. User B edits on server: `{ id: 123, amount: 5000, cost: 1500, profit: 3500 }`
4. User A syncs: conflict detected
5. **Code does:** Accept server version (3500 profit), then bump version to 2 and re-push
6. **Result:** User A's profit edit (3000) is discarded. User B's version overwrites.

But then User A re-pushes the `merged` record with `sync_version = 2`, which overwrites the server again!

**Why This Cascades:**
- User A doesn't see any warning
- The profit margin is now incorrect in the ledger
- When User B next syncs, they pull User A's stale data back
- This creates a **perpetual conflict loop** where the last to sync wins indefinitely

**Real Scenario (Financial):**
1. Owner records sale: 1000 birr
2. Later realizes actual cost was 200 (margin = 800)
3. Edits transaction: cost_price = 200
4. Meanwhile, cashier on tablet records same transaction slightly different
5. Sync conflict
6. Owner's cost_price edit is **silently deleted**
7. Profit calculation is now wrong (assumes cost = 0)
8. Monthly report shows inflated profit

**Fix Required:**
Implement **notification-based conflict resolution**, not silent overwrites:

```javascript
// On conflict, do NOT auto-merge
if (conflict_detected) {
  await db.conflicts.put({
    table: tableName,
    local_id: localId,
    local_version: localRecord.sync_version,
    server_version: serverRecord.sync_version,
    local_data: localRecord,
    server_data: serverRecord,
    status: 'pending_user_review',
    created_at: now(),
  });
  
  // Notify user
  throw new Error(`Conflict in ${tableName}: Your edits vs. another user's. Review in Conflicts tab.`);
}
```

**Timeline:** Fix before launch (blocks MVP)

---

### 4️⃣ ATOMIC TRANSACTION GAPS: Sync Crash Loses Half of Pushed Data
**Severity:** CRITICAL (Data Loss)  
**File:** `artifacts/api-server/src/routes/sync.ts:143-280` (`pushTable`)  
**Affected:** All data tables  
**User Impact:** Transactions committed on device never reach server

**The Bug:**
The `/sync/push` endpoint processes rows **one at a time** without transaction boundaries:

```typescript
for (const row of capped) {
  const data = mapper({...row, device_id: deviceId});
  const existing = await db.select()...;
  
  if (existing.length === 0) {
    await db.insert(table).values(data);  // ← Individual insert
  } else {
    await db.update(table)...;  // ← Individual update
  }
}
```

**Scenario:**
1. User on 3G pushes 100 transactions
2. Server receives and starts processing
3. After 50 transactions, connection drops (phone loses signal)
4. Server continues processing rows 1-50, commits them
5. Client error handler checks if push succeeded (HTTP 200?), and if yes, **deletes local records**
6. Rows 51-100 are lost—never pushed, never queued for retry

If network recovers, client tries again, but rows 51-100 are already deleted from IndexedDB.

**Why This Happens:**
- No transaction boundary means partial success is possible
- Client assumes "push success = all rows pushed"
- No idempotency key to retry failed rows

**Real Impact:**
- User records 50 transactions on a slow 3G connection
- Push partially succeeds (HTTP 200)
- Client deletes all 50 from local storage
- User refreshes app, sees 0 transactions (they vanished)
- $500 in sales is permanently lost

**Fix Required:**
Wrap all `pushTable` operations in a **database transaction** and implement **idempotency keys**:

```typescript
// Server /push handler
await db.transaction(async (tx) => {
  for (const row of rows) {
    await tx.insert(table).values(mapper(row));
  }
});

// Client: do NOT delete until ALL tables are successfully processed
const allPushed = await Promise.all([
  pushTable('transactions', ...),
  pushTable('customers', ...),
  pushTable('customer_transactions', ...),
]);

if (allPushed.every(r => r.success)) {
  // ONLY NOW delete from local storage
  await db.transactions.bulkDelete(txIds);
}
```

**Timeline:** Fix before launch (blocks MVP)

---

### 5️⃣ RBAC BYPASS: verifyShopOwnership Doesn't Check Permissions
**Severity:** CRITICAL (Authorization Bypass)  
**File:** `artifacts/api-server/src/routes/rbac.ts:94-118`  
**Affected:** `/api/telegram/reminders/*`, potentially other endpoints  
**User Impact:** Cashiers can change shop settings (turn off reminders, etc.)

**The Bug:**
```typescript
export async function verifyShopOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  let ctx = (req as any).deviceContext as DeviceContext | undefined;
  if (!ctx) { ctx = await requireDeviceContext(req); if (!ctx) { res.status(401).json(...); return; } }
  const shopId = Number(req.body?.shopId) || Number(req.query?.shopId) || Number(req.headers?.["x-shop-id"]) || 0;
  if (!Number.isInteger(shopId) || shopId <= 0) { res.status(400).json(...); return; }
  if (shopId !== ctx.businessId) { res.status(403).json(...); return; }
  next(); // ← NO ROLE CHECK!
}
```

This middleware only checks: "Is the shopId in the request the same as the user's businessId?"

**It does NOT check:**
- Is the user an "owner"?
- Does the user have the required permission?

**Scenario:**
- Owner has a cashier on staff with role `cashier` (default permissions: only `can_add_records`)
- Cashier calls `PUT /api/telegram/reminders/pause` with `shopId: 123`
- `verifyShopOwnership` passes (cashier's business is 123)
- No `requirePermission("can_edit_settings")` on the route
- **Cashier can now pause all customer reminders**, even though they shouldn't have that power

**Where It's Used:**
- Likely used on `/api/telegram/reminders/*` routes
- Any endpoint that uses `verifyShopOwnership` alone (without additional permission checks) is vulnerable

**Fix Required:**
Replace `verifyShopOwnership` calls with `requirePermission` checks:

```typescript
// Instead of:
router.put('/pause', verifyShopOwnership, (req, res) => { ... });

// Use:
router.put('/pause', requirePermission('can_edit_settings'), (req, res) => { ... });
```

Or update `verifyShopOwnership` to also check permissions:

```typescript
export async function verifyShopOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  let ctx = await requireDeviceContext(req);
  if (!ctx) { res.status(401).json(...); return; }
  
  const shopId = Number(req.body?.shopId || req.query?.shopId || req.headers?.["x-shop-id"] || 0);
  if (shopId !== ctx.businessId) { res.status(403).json(...); return; }
  
  // ← ADD: Check if user is actually owner
  if (ctx.role !== 'owner') {
    res.status(403).json({ error: 'Only shop owners can perform this action' });
    return;
  }
  
  next();
}
```

**Timeline:** Fix immediately (1 hour)

---

### 6️⃣ IDENTITY ROUTES USE IN-MEMORY STORE (Not Synced)
**Severity:** CRITICAL (Data Integrity)  
**File:** `artifacts/api-server/src/routes/identity.ts:1-30`  
**Affected:** `/api/shops`, `/api/shops/join`, `/api/shops/:shop_id/staff`  
**User Impact:** Team members and devices created via web UI don't sync to app

**The Bug:**
The identity routes explicitly use an **in-memory store**, not Postgres:

```typescript
// From identity.ts header:
// "Express router mounted at /api. The handlers depend on the in-memory
// store defined in `@workspace/db/schema/store` so the slice can be
// exercised end-to-end without a running Postgres."
```

This is a **hallucination/placeholder**. The comment even admits it:

> "swapping the store for Drizzle queries in production is a one-line change per call site."

**Translation:** "We haven't actually implemented this in the database yet; it's in-memory and will be lost on server restart."

**Impact:**
- Owner invites cashier via `/api/shops/123/staff` (identity route) → in-memory only
- Cashier joins app → receives no staff member record (never persisted)
- Sync engine never sees the cashier → sync conflicts
- Ledger shows transactions with no actor, RBAC fails

**Real Scenario:**
1. Owner deploys to Vercel
2. Owner creates shop
3. Owner invites cashier (via web UI using identity routes)
4. Vercel function restarts
5. All invites in memory are **gone**
6. Cashier never receives the invite link
7. App shows 0 staff members in the shop

**Fix Required:**
Migrate all identity routes to Drizzle ORM (PostgreSQL):

```typescript
// Instead of: store.createShop(...)
// Do:
const shop = await db.insert(businesses).values({ ownerUserId, name }).returning();
```

This is a **significant refactor**. All CRUD operations in identity.ts need to hit Postgres.

**Timeline:** Fix before launch (2-3 days of work)

---

### 7️⃣ HARDCODED JWT SECRET Fallback
**Severity:** CRITICAL (Secret Management)  
**File:** `artifacts/api-server/src/routes/auth.ts:8`  
**Impact:** All JWTs can be forged if JWT_SECRET env is not set

**The Bug:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "gebya-dev-secret-change-me";
```

If `JWT_SECRET` env variable is missing, defaults to a hardcoded string.

**Note:** `app.ts` does check this for production (lines 14-18), BUT `auth.ts` has its own copy of the variable without the check.

**Fix Required:**
Use the same pattern as `app.ts`:

```typescript
// In auth.ts:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("[security] JWT_SECRET not set or too weak");
}
```

Or import the validation from `app.ts` as a shared module.

**Timeline:** Fix immediately (5 minutes)

---

## TIER 2: HIGH (Fix Within 1 Week)

### 8️⃣ MISSING NOT NULL Constraints on Financial Columns
**File:** `lib/db/src/schema/transactions.ts`, `customers.ts`, `customer_transactions.ts`  
**Impact:** Null values in calculations cause runtime errors and incorrect balances

**Examples:**
```typescript
costPrice: real("cost_price"),  // ← Should be: .notNull()
amount: real("amount").default(0),  // ← Good, has default
customerId: integer("customer_id"),  // ← Missing NOT NULL for FK
```

**Fix:** Add `.notNull()` to all required financial fields.

---

### 9️⃣ NO FOREIGN KEY CONSTRAINTS (Orphaned Records)
**File:** `lib/db/src/schema/*`  
**Impact:** Deleting a customer leaves transactions orphaned

**Example:**
```typescript
customerId: integer("customer_id"),  // ← No .references()
```

Should be:
```typescript
customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }),
```

**Fix:** Add foreign key constraints to all references.

---

### 🔟 RATE LIMITING ON /auth/otp (Brute-Force Vulnerable)
**File:** `artifacts/api-server/src/routes/auth.ts:51-92`  
**Impact:** Attacker can brute-force phone numbers to find accounts

**The Endpoint:**
- `/auth/otp` accepts ANY phone number
- Returns 200 OK regardless of whether user exists
- No rate limiting per phone (only 5 attempts per OTP record, but unlimited OTP creation)
- In dev mode, returns the OTP in the response

**Fix Required:**
1. Add per-phone-number rate limiting (max 3 OTP requests per phone per 15 min)
2. Never return OTP in response (even in dev—use test account instead)
3. Add account enumeration protection (always return same response, even if account doesn't exist)

---

## TIER 3: MEDIUM (Refactor)

### 1️⃣1️⃣ NO COMPOSITE INDEX ON (businessId, updatedAt)
**File:** `lib/db/src/schema/transactions.ts` (and all sync tables)  
**Impact:** Sync pulls trigger full table scans; slow with 10k+ records

**Fix:** Add composite index:
```typescript
index("transactions_business_updated_idx").on(t.businessId, t.updatedAt),
```

---

### 1️⃣2️⃣ NO AUDIT LOG FOR OFFLINE EDITS
**File:** `artifacts/gebya/src/utils/syncEngine.js`  
**Impact:** Can't trace who made offline edits or when

**Fix:** On sync, log all pushed changes to backend audit table with source = "offline_edit".

---

## PRODUCTION READINESS CHECKPOINT

| Item | Status | Owner |
|------|--------|-------|
| Fix app.ts syntax error | ⛔ BLOCKED | Lead Dev |
| Fix cross-device collision | ⛔ BLOCKED | Lead Dev |
| Fix conflict resolution (silent overwrite) | ⛔ BLOCKED | FinTech PM |
| Fix sync atomicity (crash loses data) | ⛔ BLOCKED | Lead Dev |
| Fix RBAC bypass in verifyShopOwnership | ⛔ BLOCKED | Security |
| Migrate identity routes to Postgres | ⛔ BLOCKED | Lead Dev + DevOps |
| Fix JWT secret fallback | ✅ QUICK FIX | Lead Dev |
| Add NOT NULL constraints | ✅ QUICK FIX | Lead Dev |
| Add foreign key constraints | ✅ QUICK FIX | Lead Dev |
| Rate-limit /auth/otp | ✅ QUICK FIX | Security |
| Add composite indexes | ✅ PERFORMANCE | DevOps |

---

## DEPLOYMENT RECOMMENDATION

**Status:** ⛔ **DO NOT LAUNCH**

All 7 CRITICAL findings must be fixed and verified with:
1. Unit tests for conflict resolution logic
2. Integration tests for sync atomicity
3. RBAC permission matrix tests (every endpoint + role combo)
4. End-to-end test: offline sync with crashes and network failures
5. Security audit of auth endpoints (rate limiting, OTP handling)

**Estimated Fix Time:** 5-7 days of focused development  
**Recommended:** Launch Phase 1 (local-only, no cloud sync) first to validate, then add cloud sync in Phase 2 with proper conflict resolution.

---

**Next Step:** Have the lead dev acknowledge these findings and create tickets for each CRITICAL. Do not proceed without addressing all CRITICALs.
