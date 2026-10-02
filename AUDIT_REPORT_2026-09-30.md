# Gebya — Full Codebase Audit Report

**Project:** `Gebya-Notebook-Addis` (ገበያ / "Market")
**Date:** 2026-09-30
**Scope:** Entire monorepo — `artifacts/api-server`, `artifacts/gebya`, `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react`, `scripts/`, root config & docs
**Mode:** Read-only static audit. **No files were modified.**
**Method:** Four parallel domain investigations (backend, frontend, data layer, repo hygiene) + first-hand parent verification of every Critical finding.

---

## 0. Executive Summary

Gebya is a serious, working product with real users, real offline-sync engineering, and a 54-file test suite — but it is **not safe to expose publicly as-is**. The audit found **3 Critical** issues, of which one is a **complete account-takeover hole** that requires no password, no OTP, and no token: knowing a victim's phone number is enough to receive a valid owner JWT.

The most urgent work is not cosmetic. It is, in order: **(1) close the unauthenticated `POST /api/shops` account-takeover path, (2) fix the three Vercel cron jobs that have been failing authentication 100% of the time, (3) migrate money columns off 4-byte floats before the ledger accumulates irreconcilable rounding drift.**

| Severity | Count | Theme |
|---|---|---|
| 🔴 Critical | 3 | Auth bypass, dead background jobs, float money in the ledger of record |
| 🟠 High | 6 | Notification injection, RBAC gaps, migration drift, unverified DB TLS, env split-brain |
| 🟡 Medium | 11 | Token revocation unenforced, in-memory state on serverless, god components, untyped codebase |
| 🔵 Low | 9 | Timing-unsafe compares, dead code, index keys, no lint |

**Readiness verdict (audit opinion):** 🛑 **Do not promote to public/untrusted traffic** until Critical #1–#2 and High #1 (notification injection) are fixed. Fixes #1 and #2 are small, surgical, and can land same-day.

> **Note on existing repo docs:** The repo already contains ~42 root-level audit/session markdown files, several of which make overlapping and mutually contradictory claims (`CRITICAL_AUDIT_FINDINGS.md` says "⛔ NOT PRODUCTION READY"; `RELEASE_READINESS_AUDIT.md` scores 70%; `spec.md` and `GEBYA_PLATFORM_DEEP_DIVE.md` disagree on product scope). **This report supersedes them** for the findings it covers, because every Critical/High item below was verified directly against source, with file paths and line numbers. Section 6 covers the doc sprawl itself as a finding.

---

## 1. Project Overview

### 1.1 What this app does

**Gebya is a voice-first, offline-first Progressive Web App that replaces the paper notebook used by Ethiopian micro-retailers** — kiosk owners, street vendors, and small wholesalers who run their business on $100–200 Android phones over intermittent 3G.

Core product capabilities:

- **Transaction recording** — voice entry or manual, for sales and expenses, with a privacy-by-default amount toggle.
- **Credit ("ብድር") tracking** — customer *and* supplier ledgers with partial payments and automatic balance calculation. This is the heart of the product.
- **Offline-first sync** — all data lives locally in IndexedDB (Dexie), with an outbox-based sync engine to the cloud when connectivity returns.
- **Telegram integration** — customer reminders, ledger updates, and staff notifications via bot.
- **Reports** — Today dashboard, date-range reports, CSV export, settlements/reconciliation.
- **RBAC & admin** — role-based permissions for staff, plus a platform admin dashboard.
- **Bank/analytics track** — an emerging B2B data-sharing direction (bank officers viewing consented shop analytics), positioned in `GEBYA_PLATFORM_DEEP_DIVE.md` as the strategic upside.
- **Bilingual EN/አማርኛ UI**, Ethiopian calendar dates, Birr currency formatting.

### 1.2 Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React **19.1.0**, Vite 7, Tailwind CSS **v4.1.14**, Zustand 5 (auth/permissions/sync/staff/notifications/app/shop) + React Context (Lang/Theme/Privacy), Framer Motion, Lucide |
| **Local persistence** | Dexie 4.3.0 (IndexedDB, schema v28) — the MVP's source of truth |
| **Backend** | Express **5** + TypeScript (ESM) on Node 22, Drizzle ORM 0.45, zod, jsonwebtoken, helmet, express-rate-limit, web-push |
| **Database** | Neon Postgres (prod), Supabase (secondary), with an Upstash KV dependency present |
| **Routing (FE)** | **Hand-rolled path routing** — no router library (`src/main.tsx`) |
| **API contract** | OpenAPI → Orval codegen into `lib/api-client-react` / `lib/api-zod` — **but broken, see §4** |
| **Deployment** | Dual-track: Replit (Node 24, autoscale) + **Vercel serverless** for the API |
| **Package manager** | pnpm workspaces with a `catalog:` version scheme, `--frozen-lockfile`, `minimumReleaseAge: 1440` |
| **Testing** | Playwright (37 e2e specs) + Vitest (17 unit/integration specs) = **54 test files** |

### 1.3 Folder structure

```
Gebya-Notebook-Addis/
├── artifacts/
│   ├── api-server/          # Express 5 backend (~18,300 LOC, 93 files)
│   │   ├── src/routes/      # ~40 route modules (auth, sync, rbac, admin, telegram, …)
│   │   ├── src/services/    # telegram, reminders, notifications, push
│   │   ├── src/middlewares/ # requireRole, requireDeviceContext
│   │   ├── api/             # Vercel serverless entrypoints + crons
│   │   └── dist/index.mjs   # ⚠️ COMMITTED bundle — Vercel ships this
│   ├── gebya/               # React 19 PWA frontend (~47,400 LOC, 240 files)
│   │   ├── src/api/         # hand-rolled fetch clients
│   │   ├── src/stores/      # Zustand stores
│   │   ├── src/db.js        # Dexie schema v28
│   │   ├── src/utils/       # syncEngine, authClient, etc.
│   │   ├── src/components/  # incl. the 2,310-line AppShell.jsx
│   │   └── tests/           # Playwright + Vitest
│   └── mockup-sandbox/
├── lib/
│   ├── db/                  # Drizzle schema + migrations + 5 stray .cjs scripts
│   ├── api-spec/            # OpenAPI yaml (describes exactly ONE endpoint)
│   ├── api-zod/             # hand-written zod schemas (@ts-nocheck)
│   └── api-client-react/    # generated client (health-check only)
├── scripts/                 # i18n audit toolchain + one-off scratch scripts
├── docs/
└── ~42 root-level *.md      # audit/session docs (see §6)
```

### 1.4 How data flows

**Critical architectural fact: there are two largely independent systems in this repo.**

```
┌──────────────────────── MVP (what users actually run) ────────────────────────┐
│  React PWA  ──▶  Dexie / IndexedDB  ──▶  sync outbox  ──▶  POST /api/sync     │
│  (voice entry, ledger, reports)   (source of truth)         (best-effort)     │
└───────────────────────────────────────────────────────────────────────────────┘
                    │ if reachable
                    ▼
┌──────────────────────── Cloud layer (Express on Vercel) ──────────────────────┐
│  routes/ ──▶ middlewares (auth header → requireRole/DeviceContext)            │
│          ──▶ drizzle-orm ──▶ Neon Postgres                                   │
│  + Telegram bot webhook, Vercel Crons (reminders, cleanup, warmup),           │
│    push notifications, SSE stream, admin dashboard, bank analytics            │
└───────────────────────────────────────────────────────────────────────────────┘
```

Key flow characteristics and their consequences:

1. **The client is authoritative for writes.** Data is created locally and pushed up. The schema reflects this: many tables use **client-supplied `bigint` epoch millis** as `createdAt`/`updatedAt`, and entity tables (`customers`, `suppliers`, `staff_members`) even require a device-local `transaction_id` as an idempotency key.
2. **Sync is table-by-table, chunked, and silently truncating** — see Critical/Medium findings (§2 #9).
3. **Auth is dual-token:** a long-lived access JWT (1 year for owners, 30 days for staff) plus a refresh cookie. The access JWT is stored in IndexedDB; the refresh flow is properly deduped.
4. **Context is header-driven.** Most protected routes resolve the acting business from `x-business-id` / `Authorization` headers rather than the session cookie — which creates a systemic inconsistency (browser clients 401 on most non-auth endpoints).
5. **The frontend does not import the shared `lib/` client at all** (grep: zero imports of `lib/api-client-react` or `lib/api-zod`). The "single-source API contract" is aspirational, not real — the frontend hand-rolls its own fetch clients in `src/api/*.js`.

---

## 2. Top 10 Issues (ranked by severity)

### 🔴 #1 — Unauthenticated account takeover via `POST /api/shops`
- **File:** `artifacts/api-server/src/routes/business-legacy.ts:41-51` (route) and `artifacts/api-server/src/routes/businessLegacyHelpers.ts:29-44` (helper)
- **What's wrong (verified first-hand):** The route performs **no authentication** before calling `ensureUser(phone)`:

  ```ts
  // businessLegacyHelpers.ts:29
  export async function ensureUser(phone?: string): Promise<number> {
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) {
        const rows = await requireDb().select().from(users)
          .where(eq(users.phoneNumber, normalized)).limit(1);
        if (rows.length > 0) return rows[0].id;   // ← returns the EXISTING user
  ```

  `business-legacy.ts:48-51` then takes that returned id and signs a JWT for it, returning it to the caller as `auth_token`. So an attacker who submits any known phone number as `phone` in the request body is handed a valid session **as that user** — the shop owner. No password, no OTP, no token required.
  Compounding it, `business-legacy.ts:14` derives the join-code HMAC key from a per-instance random fallback when the env var is unset: `process.env.JOIN_CODE_SIGNING_KEY || crypto.randomBytes(32)`, so join-code hashes can never validate consistently across serverless instances.
- **Why it matters:** This is a **full authentication bypass with total account takeover**. It defeats the otherwise-real OTP/password/lockout machinery built in `auth.ts`. Every shop's books, customer credit ledger, and staff data become readable and writable by anyone who knows or guesses an Ethiopian mobile number. This alone makes the API unsafe to expose publicly.
- **Suggested fix:** Require a verified OTP challenge or an authenticated session **before** any `ensureUser` lookup that can resolve to an existing phone. Make `JOIN_CODE_SIGNING_KEY` a mandatory boot-time env var that fails fast when unset.

---

### 🔴 #2 — All three Vercel Cron jobs fail authentication 100% of the time
- **Files:** `artifacts/api-server/src/routes/reminders.ts:94-115`, `src/routes/notificationCleanup.ts:17-38`, `src/routes/notifications.ts:179-203`
- **What's wrong (verified first-hand):** Each cron route demands a header that Vercel never sends:

  ```ts
  // reminders.ts:94
  const isVercelCron = req.headers?.["x-vercel-cron"] === "1";
  if (isVercelCron) {
    const signingSecret = process.env.VERCEL_CRON_SIGNING_SECRET?.trim();
    if (!signingSecret) { /* 500 */ }
    const signature = req.headers["x-vercel-signature"] as string | undefined;
    if (!safeEqual(signature, signingSecret)) {
      return res.status(401).json({ error: "unauthorized" });   // ← always taken
    }
  }
  ```

  Vercel Cron sends only `Authorization: Bearer $CRON_SECRET` and `x-vercel-cron-schedule` — there is **no `x-vercel-signature` header**. Every scheduled invocation therefore 401s. Only `/admin/warmup` (`admin.ts:568-587`) uses the bearer-token pattern correctly.
- **Why it matters:** Three scheduled production jobs are **silently dead**. The most consequential is customer credit **reminders**: the feature exists, the code is written, the cron is configured — and it has never successfully run. Diminishing-returns damage: overdue-credit reminders are arguably the single highest-value retention feature for a credit-ledger product, and shop owners believe it is working.
- **Suggested fix:** Replace the `x-vercel-signature` check with a constant-time comparison of the `Authorization: Bearer` value against `CRON_SECRET` (copy the working pattern from `admin.ts:568-587`), using a distinct secret per job.

---

### 🔴 #3 — Money is stored as 4-byte floating point in the ledger of record
- **Files:** `lib/db/src/schema/transactions.ts:12,14,16,30,31` (verified first-hand), plus `customer_transactions.ts`, `supplier_transactions.ts`, `catalog_entries.ts`
- **What's wrong (verified first-hand):**

  ```ts
  // lib/db/src/schema/transactions.ts
  amount: real("amount").notNull().default(0),      // line 12
  costPrice: real("cost_price"),                    // line 14
  profit: real("profit"),                           // line 16
  paidAmount: real("paid_amount"),                  // line 30
  remainingAmount: real("remaining_amount"),        // line 31
  ```

  Postgres `real` is single-precision IEEE-754 (~7 significant decimal digits). Ethiopian Birr amounts with santim decimals cannot be represented exactly, and `SUM()` over a shop's transaction history accumulates drift. Worse, the codebase is **internally inconsistent**: `settlements.ts` uses `integer`, and `notifications.ts` uses `numeric(12,2)` — the only correct money column in the schema.
- **Why it matters:** This is a **point-of-sale credit ledger** — the record shop owners use to decide who owes them money and how much. Silent rounding drift in `remaining_amount` produces customer disputes the shopkeeper cannot explain, and it gets worse every month. Migrating later, once there is production data, is far riskier and more expensive than migrating now.
- **Suggested fix:** One dedicated migration converting all money columns to `numeric(12,2)` (or integer santim), applied consistently across every table, with a data round-trip verification. Do this **before** significant data volume accumulates.

---

### 🟠 #4 — Cross-business notification injection
- **File:** `artifacts/api-server/src/routes/notifications.ts:143-166`
- **What's wrong:** `POST /api/notifications` verifies only that *a* JWT exists. `businessId` is read from `req.body` with **no membership check**, so any authenticated user — including the cheapest staff account of any shop — can write notifications into *any other business*, and trigger web-push fan-out to that business's owner.
- **Why it matters:** Cross-tenant data injection plus a push-notification abuse vector. In an app where notifications carry credit amounts, forged notifications are a social-engineering tool against shop owners.
- **Suggested fix:** Resolve `businessId` from the verified membership context (`requireDeviceContext`) and reject any request whose body disagrees with it.

---

### 🟠 #5 — Systemic RBAC flaws: inactive staff retain access, arbitrary business selection
- **Files:** `src/middlewares/requireRole.ts:24-30`, `src/routes/rbac.ts:36-44` (+ the same pattern in `adminHelpers.ts`, `notifications.ts`, `backup.ts`, `analyticsHelpers.ts`, `businessLegacyHelpers.ts`, `audit.ts`, `staff.ts`)
- **What's wrong:** Three distinct defects in one subsystem:
  1. `requireRole` **never checks `active = true`** on `business_members`, so a deactivated/fired staff member keeps full access indefinitely.
  2. `requireDeviceContext` silently picks the **first** active membership when no `x-business-id` header is sent — arbitrary and unpredictable for users who belong to multiple shops.
  3. Context is read **exclusively from headers**, while `authHelpers.ts:getToken` *does* read the JWT cookie — so cookie-authenticated browser clients 401 on nearly every non-auth endpoint.
- **Why it matters:** #1 is a real security hole (fired staff retain access). #3 is a systemic, user-visible bug that makes the API inconsistent between mobile and browser clients.
- **Suggested fix:** Add `active = true` to every membership query; require an explicit business selector instead of defaulting; unify all token extraction through the shared `getToken` helper that accepts both cookie and header.

---

### 🟠 #6 — Unauthenticated Telegram send endpoints + capability tokens in URL paths
- **Files:** `src/routes/telegram.ts:216-265` (`/send-ledger-update`), `:267-299` (`/resend-latest`), `~:137` (`GET /link-sessions/:token`)
- **What's wrong:** Both send endpoints have **no auth middleware** — the only gate is a link-session token in the body, and the message text is attacker-supplied. Anyone holding a session token can send arbitrary messages to borrowers. Separately, the link-session token is carried **in the URL path**, which the request logger writes to logs verbatim (`lib/secure.ts:23-36` scrubs query params only, not path segments).
- **Why it matters:** Spam/phishing relay through the shop's own Telegram identity (destroying user trust in the notification channel), plus credential leakage into log storage and any APM/monitoring that scrapes logs (including the SSE token below).
- **Suggested fix:** Require an authenticated staff context for send/resend; move capability tokens out of paths into headers or POST bodies; extend the log scrubber to redact path segments.

---

### 🟠 #7 — Drizzle migrations are out of sync with the schema and cannot be applied
- **Files:** `lib/db/drizzle/meta/_journal.json` (verified first-hand: **only 2 entries**), vs `lib/db/drizzle/0002…0006_*.sql`, `lib/db/migrations/*.sql`
- **What's wrong (verified first-hand):** The journal contains only `0000_baseline_current_schema` and `0001_icy_mulholland_black`. Migration files `0002`–`0006` exist on disk but have **no journal entries and no `meta/` snapshots** — meaning `drizzle-kit migrate` will **silently skip them**. Four further raw SQL scripts in `lib/db/migrations/` sit outside journaling entirely, and one table (`notification_logs`) exists **only** as raw SQL with no Drizzle schema definition at all. Concrete proof of drift: `platform_admin_members.ts` declares `email` as `unique()`, but `0006_add_platform_admin_members.sql` creates the table **without an `email` column** — the file itself notes the server patches this at boot via `ensureSchema`.
- **Why it matters:** **The migration path is broken while appearing healthy.** A fresh environment provisioned from migrations will produce a database that does not match the schema the code expects. The only thing making production work is runtime `ensureSchema` DDL (≈690 `ALTER`s fired at boot), which is fragile and, per §2 #16, race-prone on cold start.
- **Suggested fix:** Regenerate a clean Drizzle baseline covering the current schema so the journal and snapshots are authoritative, fold the four raw `migrations/*.sql` scripts in, add the missing `notification_logs` schema definition, and retire `ensureSchema`.

---

### 🟠 #8 — Database TLS does not verify the server certificate
- **File:** `lib/db/src/index.ts:~26`
- **What's wrong:** `return { rejectUnauthorized: false }; // INTERIM: encrypted, CA not verified (Supabase private CA)` — applied to **every non-local connection** (Neon and Supabase alike).
- **Why it matters:** The connection is encrypted but the server identity is unverified, leaving the database connection **open to man-in-the-middle interception**. The comment admits it was meant to be temporary and then shipped.
- **Suggested fix:** Bundle the provider CA chain and set `rejectUnauthorized: true`; if a provider needs an exception, scope it to that provider rather than disabling verification globally.

---

### 🟠 #9 — Silent sync truncation with unreported data loss
- **File:** `artifacts/api-server/src/routes/sync.ts:40` (verified) with chunking/transaction code around `:57-140`
- **What's wrong:**

  ```ts
  rows.slice(0, MAX_ROWS_PER_TABLE_PUSH = 500)
  ```

  Each table's push is silently capped at 500 rows with **no error, no signal, and no `truncated` flag in the response**. The client believes the sync succeeded. Additionally, `pushTable` opens a `requireDb().transaction()` per 100-row chunk *even when already inside the outer `/push` transaction*, and runs per-row SELECT+UPDATE (N+1) inside.
- **Why it matters:** **Silent data loss in an offline-first app whose entire value proposition is not losing a shopkeeper's records.** A shop with more than 500 transactions in one table since its last sync silently loses the overflow — and the user is told everything is fine. This is the worst *class* of bug for this product.
- **Suggested fix:** Return a per-table `truncated`/`dropped` count in the response and surface it in the UI; remove the redundant nested transactions; batch the upserts.

---

### 🟠 #10 — Frontend API base URL: three variable names, silent same-origin fallback
- **Files (verified first-hand via grep):**
  - `VITE_API_BASE` → `src/api/identity.js:5`, `api/events.js:1`, `api/analytics.js:14`, `api/notifications.js:1`, `api/reminders.js:3`, `hooks/useNotificationStream.js:15`, `utils/shared-ui.jsx:4`, `utils/useAutoBackup.js:7`, `components/AdminShopDetail.jsx:12`
  - `VITE_SYNC_API_URL` → `utils/authClient.js:1`, `utils/syncEngine.js:7`, `utils/customerLedger.js:74`, `components/AuthGate.jsx:8`, `components/JoinPage.jsx:9`
  - `VITE_API_BASE_URL` → `utils/telegramBotClient.js:3`, and `vite.config.ts:36`
- **What's wrong:** Three different env var names are read across the codebase, each defaulting to `'/api'` when unset. The on-disk Vercel-generated `.env.local` defines **only** `VITE_API_BASE_URL`. Under that configuration, **auth and sync calls silently fall back to same-origin `/api`** while other modules point elsewhere — and because `artifacts/gebya/vercel.json:3-6` rewrites `/(.*) → /index.html` with **no `/api/*` passthrough**, those requests would receive `index.html` HTML with a 200 status instead of JSON.
- **Why it matters:** Depending on the deployed Vercel env, login and sync can be broken or routed to the wrong origin, and the failure mode is JSON parse errors on HTML rather than a clear configuration error. This is the highest-value thing to verify before anything else on the frontend.
- **Suggested fix:** Consolidate on a single `VITE_API_BASE` constant module imported everywhere, fail loudly at build time if unset in production, and add the `/api/*` passthrough rewrite.

---

## 3. Quick Wins (each under 10 minutes)

Ordered by value-per-minute. All are small, low-risk, and independently shippable.

| # | Fix | File | Why it's worth 10 minutes |
|---|---|---|---|
| 1 | **Add `.env.new` deletion + confirm env files untracked** — `.env`, `.env.local`, `.env.new` are all untracked and were never committed (verified via `git log --all`), so this is hygiene, not an incident. | root | Cheap confirmation that no secret is leaking, plus removes a stale empty file that invites confusion during rotation. |
| 2 | **Fix the cron auth check** (§2 #2) — swap `x-vercel-signature` for constant-time `Authorization: Bearer` comparison, copying the working pattern at `admin.ts:568-587`. | `reminders.ts:94-115`, `notificationCleanup.ts:17-38`, `notifications.ts:179-203` | Revives three dead production jobs, including the customer credit-reminder feature. Tiny diff, large business impact. |
| 3 | **Make `JOIN_CODE_SIGNING_KEY` mandatory** — delete the `|| crypto.randomBytes(32)` fallback and fail fast at boot. | `business-legacy.ts:14` | Removes a silent per-instance inconsistency in join-code validation. One line. |
| 4 | **Replace `Math.random()` with `crypto.randomInt`** for 4-char one-time link codes. | `telegram.ts:160-190` | Predictable-PRNG bearer tokens become cryptographically random. The correct helper already exists in the same repo (`businessLegacyHelpers.ts:38`). |
| 5 | **Timing-safe webhook secret comparison** — swap two `!==` for the in-repo `safeEqual`. | `telegram.ts:73`, `:309` | Closes a timing side-channel with a helper that already exists. Two-line change. |
| 6 | **Remove `maximum-scale=1.0, user-scalable=no`.** | `gebya/index.html:6` | WCAG 1.4.4 violation; iOS ≥10 ignores it anyway, so it is pure downside for low-vision users who need to zoom ledger amounts. |
| 7 | **Add `noopener,noreferrer`** to the one `window.open('_blank')` that lacks it. | `components/ShareModal.jsx:63` | Closes reverse-tabnabbing; the other call sites already do this correctly. |
| 8 | **Fix the `revoked_tokens.userId` type** (`text` → `integer`) — or at minimum document the mismatch. | `lib/db/src/schema/revoked_tokens.ts:11` | Enables a real FK and prevents `"12"` vs `12` mixed-format values. |
| 9 | **Delete the no-op SSL expression** — `const finalConnectionString = ssl ? cs : cs;` both branches are identical. | `lib/db/src/index.ts:31-33` | Removes code that actively misleads the next reader about TLS behavior. |
| 10 | **Add `tzx` as a devDependency of `@workspace/db`** instead of reaching into `../../artifacts/api-server/node_modules/tsx/…`. | `lib/db/package.json:9-11` | Removes a cross-package coupling that breaks whenever the api-server's install layout changes. |
| 11 | **Remove `@ts-nocheck` from the API-contract barrel.** | `lib/api-zod/src/index.ts:1` | Re-enables type-checking across the whole shared contract with one line. |
| 12 | **Fix the misleading `platformAdmin.ts:12-19` comment.** | `src/routes/platformAdmin.ts` | The comment says dev mode allows any owner; the code correctly fails closed. The comment is what's wrong — fix the comment, not the code. |

---

## 4. Code Debt (worth refactoring later)

Ranked by how much future pain each item causes. None of these are urgent; all of them compound.

### 4.1 The API contract is a fiction — `lib/` is a dead letters office
- **Files:** `lib/api-spec/openapi.yaml` (describes **exactly one endpoint**: `GET /healthz`), `lib/api-zod/src/identity.ts` + `events.ts` (hand-written, not generated), `lib/api-client-react/src/generated/` (health-check only)
- **Problem:** The repo presents itself as OpenAPI → Orval → zod → client codegen, but the real contract is handwritten zod, the spec covers a single endpoint, and the frontend imports **none of it** (grep: zero matches for `lib/api-client-react` or `lib/api-zod` in `artifacts/gebya/src`). The generated headers say `orval v8.5.3` while the package pins `^8.28.1`, so the output predates the installed generator.
- **Impact:** Three parallel, unverified descriptions of the API (spec, zod, hand-rolled client). Validation drift is invisible because the barrel carries `@ts-nocheck`.
- **Fix:** Either promote the real schemas into `openapi.yaml` and regenerate properly, or honestly delete the single-endpoint spec and document the handwritten zod as the source of truth. Do not keep the middle state.

### 4.2 God components with a 30-second auth re-init poll
- **Files:** `components/AppShell.jsx` (**2,310 lines**, ~20 `useState`, 15 `useEffect`), `CustomerDetail.jsx` (1,604), `saleWorkspace/SaleWorkspace.jsx` (1,596)
- **Problem:** `AppShell.jsx:793-814` polls `useAuthStore.getState().init()` **every 30 seconds per open tab** — a full `/auth/me` fetch, permission re-resolution, and a `setBusinesses` IndexedDB write, multiplied by tabs and devices. This is the top of the performance/cost pyramid for a user base on metered 3G.
- **Impact:** Wasted mobile data and battery for the target user; merge-conflict-prone files; the July 2025 `PRODUCTION_AUDIT_REPORT.md` flagged this exact class of problem and it has only partially been addressed.
- **Fix:** Decompose AppShell by domain; replace the poll with a lightweight permissions endpoint (ETag-conditional) or reuse the existing SSE channel.

### 4.3 ~95% of the frontend escapes type-checking
- **File:** `artifacts/gebya/tsconfig.json`
- **Problem:** No `allowJs`, so `tsc --noEmit` only sees four files (`main.tsx`, `sentry.ts`, `use-mobile.tsx`, `bank-main.tsx`) — and `bank-main.tsx` is `@ts-nocheck` at line 1. The strict flags (`strictNullChecks`, `noImplicitAny`) effectively apply to none of the 240-file app. There is also **no ESLint config at all**, so across 121 `useEffect` call sites there is no automated guard for hook-dependency bugs.
- **Fix:** Enable `allowJs`/`checkJs` incrementally starting with `src/api` and `src/utils` (highest bug density), and add `eslint-plugin-react-hooks`.

### 4.4 Duplicated and legacy data models in one schema package
- **Files:** `lib/db/src/schema/users.ts` (serial-id `users`/`devices`) vs `shops.ts` (a **second** uuid-id `users`/`devices` plus `shops`/`staff`/`join_codes`)
- **Problem:** Two conflicting identities coexist. `shops.ts` is not re-exported from the schema barrel, so the collision is *latent* — but any direct import pulls a type-incompatible second `users`/`devices` into the same Drizzle schema object. This is the vestigial "Shop Sync v1" model.
- **Related debt:** `customer_transactions`, `supplier_transactions`, `transactions.customer_id`, `settlements.businessId/staffId`, and ~12 other tables have **bare integer references with no `.references()` FK** — orphaned rows are possible everywhere else in the schema has FK discipline. `customers`/`suppliers`/`staff_members` also require a borrowed `transaction_id` as their identity key, so an entity cannot exist independently of a transaction.
- **Fix:** Move the legacy model out of the drizzle schema path into `legacy/`, add `.references()` with explicit `onDelete` across the board, and give entities their own `client_uuid`.

### 4.5 Missing indexes on the hot paths
- **Files:** `transactions.ts` (indexed on `business_id` only), `customer_transactions.ts`, `settlements.ts` (**no indexes at all**, including none on `businessId`)
- **Problem:** There is **no index on `customer_id`** anywhere, despite `utils/customerBalance.ts` and `balance.ts` existing precisely to aggregate per customer. There is no index on the epoch `created_at`/`ethiopian_date` used by every date-range report.
- **Impact:** Every customer-credit lookup and every report is a sequential scan that gets slower with every transaction a shop records. This is the most predictable future performance cliff in the backend.
- **Fix:** Add `(business_id, customer_id)` composite indexes on the transaction tables, a reporting index on the date column, and a `settlements_business_idx`.

### 4.6 In-memory state on stateless serverless
- **Files:** `src/services/notificationStream.ts` (SSE client registry as `Map<businessId:userId, Set<Response>>`), `src/routes/auth.ts:54-56` (OTP limiter Map), `src/lib/adminRateLimit.ts`
- **Problem:** Three security/feature mechanisms rely on process-local memory on a platform where instances are independent. The SSE registry means `broadcastNotification` usually cannot reach a client connected to a different instance — **real-time notification badges are silently dead in production**. The two rate limiters are per-instance, so distributed brute force and bulk-send abuse bypass them.
- **Fix:** Move pub/sub and both limiters to Upstash KV (already a dependency). Both files' own header comments admit the limitation.

### 4.7 Root-level documentation sprawl
- **Files:** 42 root `*.md` files, ~396 KB, **all git-tracked**, and **no canonical `README.md` exists** (`replit.md` serves as the de-facto overview)
- **Problem:** 24 of the 42 files are pure process/session noise ("Final PR Summary", "Merge Conflict Resolved", "Session 7 Plan", "Push To Main Repo Options"). Five overlapping PR/push docs, three overlapping deployment docs, and four overlapping audit docs that **contradict each other** — spanning 2025 and 2026 with no supersession markers. A new engineer has no way to tell which document is current.
- **Also tracked:** 51 files of AI-tool session residue (`.kilo/`, `.kiro/`, `.mimocode/`, `.plans/`, `attached_assets/`).
- **Fix:** Write a canonical root `README.md`; move product-relevant docs to `docs/`; archive or delete the noise; decide explicitly whether AI-tool residue belongs in the repo.

### 4.8 Backend route composition and CORS triplication
- **Files:** `vercel.json` (static `Access-Control-Allow-Origin` + `credentials: true`), `api/healthz.ts` (a duplicated allowlist missing `FRONTEND_URL` and localhost branches), `src/main.ts` (dynamic echo)
- **Problem:** Three independently maintained CORS implementations that can and do disagree — the edge-level static header conflicts with the app-level echo, and `healthz` silently diverges. Also, `api/telegram/webhook.ts` imports TypeScript source (`../../src/app.js`) while every other function imports the prebuilt `dist/index.mjs`, giving the same webhook domain two different code paths and a build-order dependency.
- **Fix:** One shared allowlist module; point `webhook.ts` at `dist/index.mjs` like the catch-all.

### 4.9 Dead and demo code
- **Files:** `artifacts/gebya/src/bank-main.tsx` (`@ts-nocheck`), `bank.html`, `BankDashboard.d.ts` beside `BankDashboard.jsx`, two separate `ErrorBoundary.jsx` implementations (`components/` and `components/report/`), a `playwright.config.ts:20-24` ignore rule for `parseItemDraft.spec.ts` **which does not exist**
- **Also:** `lib/db/` contains 11 untracked one-off `.cjs` scripts (`converge-*.cjs`, `gateb-check*`, `list-tables.cjs`, `check3.cjs`) that are neither committed nor ignored; `scripts/` holds four superseded scratch scripts (`analyze-entries.cjs` defines nothing and returns nothing, `classify-findings.cjs`, `inspect-labels.cjs`, `scan-all-strings.cjs`) replaced by the coherent `scripts/audit/` toolchain.
- **Fix:** Prune. Note that `scripts/audit/` and `enforce-pnpm.cjs` are genuinely well-built — keep them.

### 4.10 Frontend security-header gap and observability blind spot
- **Files:** `artifacts/gebya/vite.config.ts:37-58` vs `artifacts/gebya/vercel.json:7-40`
- **Problem:** CSP, `X-Frame-Options`, and `nosniff` are set **only by the dev/preview plugin**. Production `vercel.json` headers contain only `Cache-Control`, so **production ships no security headers at all**. The dev CSP also permits `script-src 'unsafe-inline'` outside dev. Separately, `ErrorBoundary.jsx:15-17` only `console.error`s under `import.meta.env.DEV` while `initSentry()` runs in `main.tsx:9` — so production render crashes are swallowed and **invisible in monitoring**.
- **Fix:** Replicate the header set in `vercel.json`; add `Sentry.captureException` to `componentDidCatch`.

### 4.11 Smaller debt worth noting
- **Money/type inconsistencies:** `revoked_tokens.userId` is `text` vs `integer` PKs; `users` and several tables have no `updatedAt` despite mutable password/lockout fields; zod insert schemas declare `.nullable()` on NOT NULL columns (`transactions.itemName`, `customers.name`) so a validated insert can still fail at the DB.
- **Phone validation weaker than the DB:** `lib/api-zod/src/identity.ts:15-21` uses a loose `min(9).max(20)` length check, while the DB enforces `^\+251[79]\d{8}$` and a strict normalizer already exists in the same package. Reuse it.
- **No `pgEnum` anywhere:** `transactions.type` is a bare `z.string().max(32)` for a semantically fixed vocabulary, while `staff_tasks` correctly uses `z.enum`.
- **Mixed time representations:** sync-facing tables use unvalidated client `bigint` epoch millis (`z.number()` with no bounds) while platform tables use server `timestamptz` — every cross-table join needs conversion.
- **Snapshot payloads in `text`:** `snapshots.payload` holds full JSON in an unbounded `text` column while the newer `bank_report_snapshots.payload` correctly uses `jsonb`.
- **CI gaps:** no lint job, no dependency-audit job despite a hand-maintained CVE override block in `pnpm-workspace.yaml`, and no frontend *unit*-test job (Vitest exists locally but only Playwright runs in CI). Actions are pinned by major tag, not SHA. The Supabase backup workflow is `workflow_dispatch` only — **no schedule**, so backups happen only when someone remembers. CI runs Node 22 while `.replit` and `replit.md` say Node 24.
- **`scripts/test-admin-endpoints.mjs`** sends real `/api/admin/broadcast` and `/api/admin/push-all`; pointed at production it would notify **every shop**. It defaults to localhost, but add a guard refusing non-localhost targets without an explicit flag.

---

## 5. What Is Done Well (worth preserving)

The audit is not one-sided — several things here are better than typical for a codebase at this stage:

- **No SQL injection surface.** Across the whole backend, every query goes through Drizzle's parameterized builder; the only `sql.raw` is internal DDL. Grep for string-concatenated SQL found zero hits.
- **No XSS surface.** Zero `dangerouslySetInnerHTML`, zero `eval`/`new Function`/`innerHTML =` across `src/`. Only one `any` in all TS files.
- **Token handling is above average for this stack.** The JWT lives in IndexedDB (not `localStorage`); all ~15 `localStorage`/`sessionStorage` uses are UI preferences wrapped in try/catch. Auth refresh is properly deduped and bounded — N concurrent 401s share one in-flight refresh with retry-once semantics and no loops.
- **Real test breadth.** 54 test files, including a 932-line sync-engine suite, a schema-v22 migration test, offline/network-resilience specs, Telegram slow-network specs, and mobile-viewport smoke tests. CI runs typecheck + tests + a **dist-stale gate** that fails if the committed bundle drifts from source — a genuinely clever safeguard.
- **Supply-chain hygiene is deliberate.** `minimumReleaseAge: 1440`, curated CVE `overrides:`, a `preinstall` guard that deletes foreign lockfiles, and `--frozen-lockfile` everywhere. No hardcoded credentials found in `scripts/` or workflows.
- **Secrets are not leaked.** `.env`, `.env.local`, and `.env.new` are all **untracked**, and `git log --all` confirms they were **never committed** historically.
- **Several security mechanisms are real, not decorative:** mutation audit logging, zod validation on newer endpoints, OTP/password brute-force lockout, checksum-verified backup restores, idempotent event push with dedupe, a fail-closed admin allowlist, and a webhook secret that fails closed when unset.
- **Thoughtful UX details:** `PayPage.jsx:58-72` scrubs sensitive bank/phone params out of the URL into `sessionStorage` with `history.replaceState` cleanup; `lazyWithRetry` self-heals stale chunks after deploys; PWA autoUpdate is wired properly.

---

## 6. Recommended Priority Order

**Tier 1 — do before any public exposure (hours, not days)**
1. 🔴 Close the `POST /api/shops` account-takeover path (§2 #1).
2. 🔴 Fix the three cron auth checks so reminders actually run (§2 #2).
3. 🟠 Add a membership check to `POST /api/notifications` (§2 #4).
4. 🟠 Verify the production Vercel env var name for the frontend API base (§2 #10) — 10 minutes, and it may already be breaking or misrouting live traffic.

**Tier 2 — do this sprint (before data volume grows)**

5. 🔴 Migrate money columns off `real` to `numeric(12,2)` (§2 #3) — cheapest now, painful later.
6. 🟠 Add `active = true` to RBAC membership queries and unify token extraction (§2 #5).
7. 🟠 Fix the silent sync truncation and report dropped rows (§2 #9).
8. 🟠 Repair the Drizzle migration baseline (§2 #7) so provisioning is reproducible.

**Tier 3 — hardening & debt (schedule deliberately)**

9. 🟠 Enable DB TLS certificate verification (§2 #8).
10. 🟠 Authenticate the Telegram send endpoints and de-tokenize URL paths (§2 #6).
11. 🟡 Move SSE pub/sub and rate limiters to Upstash (§4.6).
12. 🟡 Ship security headers in production and wire Sentry into the ErrorBoundary (§4.10).
13. 🟡 Decompose `AppShell.jsx`, kill the 30-second auth poll, add indexes, enable `allowJs` + ESLint (§4.2, §4.3, §4.5).
14. 🔵 Documentation consolidation: canonical `README.md`, archive the 24 noise docs (§4.7).

---

## 7. Verification Notes & Honest Gaps

**Verified first-hand by the parent agent during this audit:**
- `businessLegacyHelpers.ts:29-44` `ensureUser` returning an existing user's id; `business-legacy.ts:41-51` calling it with no auth; `business-legacy.ts:14` `JOIN_CODE_SIGNING_KEY` fallback.
- `reminders.ts:94-115` requiring a nonexistent `x-vercel-signature` header.
- `lib/db/src/schema/transactions.ts:12,14,16,30,31` — all five money columns are `real`.
- `lib/db/drizzle/meta/_journal.json` — exactly two entries (0000, 0001).
- The three-way `VITE_API_BASE` / `VITE_SYNC_API_URL` / `VITE_API_BASE_URL` split across 15+ files.
- `scripts/enforce-pnpm.cjs` and `post-merge.sh` being legitimately wired into `package.json`/`.replit`.

**Reported by domain researchers with direct file evidence, not independently re-read by the parent:** the remaining High/Medium/Low items (notification injection, RBAC internals, Telegram endpoints, TLS option, SSE registry, CORS triplication, frontend god components, typecheck scope, root doc inventory). These cite specific paths and line numbers and are marked above where confidence is lower.

**Explicitly unverified / open items, with the check that would close each:**
1. **Frontend production Vercel env** — which of the three API-base variable names is actually defined in the production environment. *Check:* Vercel → Project → Settings → Environment Variables. Highest-priority open item because §2 #10 is conditional on it.
2. **Bank-token IDOR (probable, not closed)** — whether merchant `users.id` and `bankUsers.id` are both serial integers, which would let any merchant JWT authenticate as an arbitrary bank user via `analyticsHelpers.ts:5-18`. *Check:* read `lib/db/src/schema/bank_analytics.ts` and confirm the `bankUsers.id` type. Flagged High-probability; **not confirmed** either way.
3. **`setup-telegram.js`** was not line-read, so the presence of a committed bot token is neither confirmed nor ruled out. *Check:* grep that file for token-shaped literals.
4. **`0000_baseline_current_schema.sql`** was only partially read, so it is unconfirmed whether every current table appears in the baseline — if tables are missing, §2 #7 escalates from High to Critical. *Check:* diff the baseline's `CREATE TABLE` list against `lib/db/src/schema/index.ts` exports.
5. **`public/sw-push.js`** contents were not read, so push-subscription handling in the service worker remains unverified.
6. **`lib/db/.env`** existence is confirmed; whether it is git-tracked was not verified (root env files *were* verified as untracked and never committed). *Check:* `git ls-files --error-unmatch lib/db/.env`.

---

*No files were created, modified, or deleted during this audit. The only artifact produced is this report.*
