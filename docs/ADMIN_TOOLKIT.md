# Gebya Admin Toolkit

Internal support & operations console for the Gebya platform team. This document
describes how the platform admin ("command center") is built, how to grant access,
and the endpoints/components it relies on.

> Audience: the Gebya team (and trusted friends) who operate the platform.
> Scope: remote support, user/shop lookup, platform dashboards, and targeted messaging.

---

## 1. Design principle — no public admin surface

The platform admin panel is **not** a separate URL or a screen every shop owner can
reach. It lives inside the same PWA, but is gated in two independent layers:

1. **Client gate** (`Settings` → admin section is only revealed to owners *or* the
   dev-mode easter egg). The platform-wide "Admin" / "Shop lookup" tools are shown
   **only** when the signed-in user is on the server-side allowlist (or dev mode).
2. **Server gate** (the real enforcement): every admin endpoint requires the caller's
   phone number to be present in `PLATFORM_ADMIN_PHONES`. Owners calling admin
   endpoints receive `403` — the client hiding is defense-in-depth, not the security
   boundary.

This matches how professional tools are built: a separate admin tool (or, here, an
in-app surface) protected by a server-enforced allowlist — never "role === owner".

---

## 2. How to add / remove a platform admin

Admins are identified by **phone number** (normalized, E.164 `+251...`).

- Env var: `PLATFORM_ADMIN_PHONES`
  - Comma-separated list, e.g. `+251911223344,+251922334455`
  - Set in the API server environment (Vercel project → Environment Variables) for
    production. Empty = **deny all** in production; in dev (no `NODE_ENV=production`)
    any owner is allowed so local work is easy.
- Helper: `artifacts/api-server/src/services/platformAdmin.ts`
  - `isPlatformAdminPhone(phone)` → boolean
- The flag is also surfaced to the client: `/auth/verify`, `/auth/me`, `/auth/login`
  return `is_platform_admin`, stored in `useAuthStore.isPlatformAdmin`.

After changing the env var, **redeploy the API server**. No code change needed.

---

## 3. What the admin can do (the "command center")

Reached from `Settings → [Platform Admin] → Admin` (owner tools: Metrics / Analytics /
Curation / Activity / Support are separate and available to every owner).

### Platform dashboard (`AdminDashboard.jsx`)
- **Overview**: platform numbers (shops, users, devices, transactions, sales, credit),
  onboarding funnel, credit recovery rate, 14-day growth timeline.
- **Shops**: searchable health table; each row has **Open** → shop deep-dive.
- **Frictions**: operational problem finder (see §8) — dormant/zero-transaction/orphaned
  shops, owners without Telegram, low Telegram adoption, reminder delivery failures,
  and the platform SMS status. Each sample shop has **Open** to drill in.
- **Features**: feature adoption + payment-method breakdown.
- **Actions**: refresh, broadcast in-app notification to all shops, browser push to all
  subscribed devices, export shop list (CSV).

### Shop deep-dive (`AdminShopDetail.jsx`) — "look in and work"
Opened from the Shops table. Three tabs:
- **Details**: stats, overdue exposure, team members, bank agreements.
- **Activity**: that shop's audit log + any blocked permission probes (admin passes
  `?business_id=`). Read-only inspection.
- **Comms**: communication health for that shop — Ethio Telecom **SMS** status + monthly
  quota used/limit, owner & customer **Telegram** link status/adoption, and count of
  failed reminder deliveries (`customer_transactions.telegram_delivery_state`).
- **Actions**: take action on the shop — **reset its SMS quota**, **reach the owner**
  (sends via their linked Telegram, or SMS fallback if SMS is enabled, or returns a
  manual bot link when neither is reachable), **resend failed reminders** to that shop's
  customers whose last Telegram/SMS delivery failed, write **private admin notes**, and
  review the **outreach/action log** (every reset/nudge/note is recorded and attributed
  to the admin's phone number).
- **Tickets**: that shop's support tickets; admin can reply (which notifies the owner
  in-app).
- **Targeted message**: send a single in-app notification to that one shop.

### Support tickets (`SupportPanel.jsx` + `support.ts`)
- Any shop member opens a ticket from `Settings → Support`.
- Platform admins see **all** tickets (with shop name + owner phone); owners see only
  their own shop's tickets.
- Admin reply creates an in-app `support_reply` notification for the shop owner.
- Status flow: `open → replied → resolved → closed`.

---

## 4. Server endpoints

All under the API server. Admin endpoints require `Authorization: Bearer <token>` **and**
`PLATFORM_ADMIN_PHONES` membership (enforced by `requireAdmin()` in `admin.ts`).

| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| GET | `/admin/overview` | admin | platform stats |
| GET | `/admin/shops` | admin | shop health list (search server-side) |
| GET | `/admin/shops/:businessId` | admin | shop detail (stats, members, bank shares) |
| GET | `/admin/features` | admin | feature adoption |
| POST | `/admin/broadcast` | admin | in-app notification to all (optional `business_id`) |
| POST | `/admin/push-all` | admin | browser push to all (optional `business_id`) |
| GET | `/admin/export-shops` | admin | CSV export |
| GET | `/audit/activity?business_id=` | admin **or** owner(of own) | shop activity feed |
| GET | `/audit/violations?business_id=` | admin **or** owner(of own) | blocked permission probes |
| POST | `/support/tickets` | any member | create ticket for own shop |
| GET | `/support/tickets?business_id=` | admin (all / filtered) or owner (own) | list |
| GET | `/support/tickets/:id` | admin or ticket owner | thread |
| POST | `/support/tickets/:id/reply` | admin or ticket owner | reply (admin reply → owner notification) |
| PATCH | `/support/tickets/:id/status` | admin or ticket owner | set status |

`requireAdmin()` is exported from `admin.ts` and reused by `support.ts`.

---

## 5. Database

New tables (run a migration / `drizzle-kit push` before first use):

- `support_tickets` (`lib/db/src/schema/support_tickets.ts`)
- `support_messages`
- Exported from `lib/db/src/schema/index.ts`.

Deploy step: `pnpm --filter @workspace/db run push` (or the team's migration flow).
Without this, support tickets 500 at runtime, and the **Actions** tab (admin notes +
outreach log) won't persist — it needs the new `admin_shop_logs` table.

---

## 6. Deployment checklist

1. `lib/db`: create `support_tickets` / `support_messages` and `admin_shop_logs` (push / migrate).
2. API server env: set `PLATFORM_ADMIN_PHONES` (comma-separated E.164 phones).
3. Redeploy API server + webapp.
4. Verify: sign in with an allowlisted phone → `Settings` shows the **Platform Admin**
   section; "Admin" opens the dashboard. Sign in with a non-admin owner → only owner
   tools (Metrics/Analytics/Curation/Activity/Support), **no** platform dashboard.

---

## 7. Notes / guardrails

- Admin inspection is **read-only** for shop data (activity, stats). Mutations are
  limited to messaging and support replies — no acting *as* the shop.
- Bank/financial data is never bypassed; bank agreements follow the existing consent
  model in `analytics.ts`.
- The dev-mode 5-tap easter egg (`localStorage.gebya_dev_mode`) is a local-only escape
  hatch for development; it does **not** grant server admin rights.
- **Scale:** the shops list is capped (default 500, max 2000 via `?limit=&offset=`) and
  returns `total`; overview/frictions still scan all businesses (fine at current scale,
  will need cursor pagination at very high shop counts).
- **Owner Telegram linking:** owners connect by tapping the admin-sent deep link (one
  tap, no app steps). A self-serve owner "Connect Telegram" screen in the app is a
  possible future addition but is not required for the admin outreach flow.

---

## 8. How do I actually open the console?

The admin console is **inside the Gebya PWA** (the same app users download), not a
separate URL. To reach it:

1. Open the app → **Settings**.
2. Reveal the admin section:
   - **Local/dev:** tap the version text (“Gebya v1.0”) **5 times** → dev mode on. This
     shows owner tools + (for allowlisted phones) the platform dashboard.
   - **Production:** sign in with a phone listed in `PLATFORM_ADMIN_PHONES`. The
     **Platform Admin** section appears automatically — no easter egg needed.
3. Inside the section, tap **Admin** → the command center (Overview / Shops /
   Frictions / Features / Actions).

**Do I need to deploy to Vercel to use it?** No — you can run everything locally:
- API server: `pnpm --filter @workspace/api-server dev` (needs `DATABASE_URL` pointing
  at Postgres; uses the same DB as production unless you point it elsewhere).
- Webapp: `pnpm --filter @workspace/gebya dev` (or `build` + serve). Point the webapp's
  `VITE_API_BASE` at your local/API URL.
- Then open the webapp in a browser, do the 5-tap, and sign in with your (allowlisted)
  phone.

You only **need** a deployed API server + webapp when you want to operate on real
production data or let teammates access it. The console is just a UI on top of the
existing API; it works wherever that API is reachable.

> Server gating (important): `isPlatformAdminPhone` returns `true` when
> `PLATFORM_ADMIN_PHONES` lists the phone. If the allowlist is **unset**: production
> denies all `/admin` access (safe default), but **development** (`NODE_ENV !==
> "production"`) allows any signed-in owner — so locally you can open the console
> without configuring anything. For real admin access in any environment, set
> `PLATFORM_ADMIN_PHONES`.

---

## 9. SMS & Telegram visibility

The platform already integrates **Ethio Telecom SMS** (`smsSender.ts`, monthly per-shop
quota in `smsQuota.ts`) and a **Telegram bot** (`telegramBotService.ts`,
`telegramStore.ts`) for OTP delivery and automated customer reminders (with SMS
fallback). The admin can now **see** (not yet act on) this from the console:

- **Frictions tab** → "Reminder delivery failures" (count of customers whose last
  reminder `telegram_delivery_state` was not `sent`) and "Owners without Telegram".
- **Per-shop Comms tab** → owner/customer Telegram link status + adoption %, the
  platform **SMS enabled** flag, and that shop's **SMS quota used/limit**, plus its
  reminder delivery-failure count.

Ideas we could add next (say the word): reset a shop's SMS quota, re-send a failed
reminder, or a per-shop "outreach log" of every SMS/Telegram we sent them.

**Owner auto-linking (built):** the admin "Reach owner" action now mints a one-time
Telegram link token for an unlinked owner and sends `https://t.me/<bot>?start=<token>`
via SMS (or returns it for manual sharing). When the owner taps it, the bot's `/start`
handler sets `users.telegram_chat_id` and clears the token — so the owner is connected
automatically, no app steps required. Needs `TELEGRAM_BOT_USERNAME` configured and the
bot webhook reachable.

