# Launch-Readiness Findings Report — Consolidated

**Date:** 2026-10-04 · **Protocol:** evidence-only review (your 6-area spec), no fixes applied.
**Status of findings:** every item below was verified against source this session; severity per your scale (P1 blocks launch / P2 fix soon / P3 polish). Live-production probes and local test runs marked where used.

---

## VERDICT (one line)

**Not launch-ready as-is** — 2 P1 security gaps + 1 P1 UX blocker + 3 P1 documentation gaps; the money-migration (0007/0008) is still unexecuted against the production DB. Everything else is P2/P3. The core money paths (sale, payment sheets, sync engine, auth) are genuinely solid.

---

## P1 — BLOCKS LAUNCH (5)

**P1-1 · SEC-3a — Invite-accept IDOR: any user can join any business via ID guessing.**
`artifacts/api-server/src/routes/business.ts:119-165`. `POST /invites/:inviteId/accept` authenticates with bare JWT, then selects the invite by **sequential integer ID** with no check that the accepting user's phone matches `invites.phoneNumber` (the column exists and is even indexed — `invites.ts:10`) and no token required. Any authenticated user iterating `inviteId` 1..N joins arbitrary businesses in the invited role — which can be `manager`. The sibling token path (`POST /join/:token`, 32-byte random) is correct; the numeric-ID path bypasses it entirely.
**Fix (small):** in the accept transaction, load the caller's phone (`users.phoneNumber`, pattern already at `business.ts:80-85`) and require `eq(invites.phoneNumber, phone)` in the invite select.

**P1-2 · UX-1 — Garbled Amharic on the sign-in/auth prompt (primary language, most-trusted surface).**
`src/components/shell/AuthRequiredPrompt.jsx:31-48`. The app defaults to `lang: 'am'`; every returning user hitting session expiry sees machine-mangled Amharic: `tooManyAttempts: 'በቀየሩ ከፍተኛ ሙያዊ ሙያዊ ሙያዊ'` ("professional" ×3), non-words like `መዲወ`/`መዲዛ` as the password label, `ችግር ተፈጥሮ` ("problem [is] nature"), and "notification sent via SMS" where it means the *code*. This is where trust matters most — it reads as phishing to a suspicious user.
**Fix:** human rewrite of ~12 strings (English block at :50-80 is clean); pairs with the Amharic review already scheduled (B5).

**P1-3 · DOC-4 — Production env vars documented nowhere; one now fail-fasts the server.**
`JOIN_CODE_SIGNING_KEY` (boot throws without it — `business-legacy.ts:16-22`), `CRON_SECRET`, `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID`, VAPID pair, `SYNC_MAINTENANCE` — none documented in any guide or `.env.example`. Three partial env docs exist with zero overlap discipline. A from-scratch deploy would either refuse to boot or ship forgeable JWTs.
**Fix:** one env-var matrix doc + reconcile the three `.env.example` files. (~2h)

**P1-4 · DOC-1 — No REVERT.md; rollback knowledge is stale or buried.**
The June-era `DEPLOYMENT_GUIDE.md:231` rollback section predates the two-project Vercel reality and the committed-bundle mechanism. The good rollback text (code+DB rollback coupling) lives only inside the unindexed `MIGRATION_PLAN_NUMERIC_MONEY.md` §4. `docs/R2-PLAN.md:80` planned REVERT.md and it was never written.
**Fix:** write REVERT.md absorbing MIGRATION_PLAN §4 + two-project promote-previous steps. (~1-2h)

**P1-5 · DOC-5 — No root README; the de-facto overview claims the app has no backend.**
`replit.md` states the api-server is "not used by Gebya MVP" and the frontend has "no backend dependency" — both false today (sync, auth, crons, 7 server secrets). A new engineer would conclude the entire cloud layer is optional.
**Fix:** minimal root README correcting this + indexing 5 canonical docs (audit, migration plan, REVERT.md, gebya README, env matrix), marking the other ~40 root docs superseded. (~2h)

---

## P2 — FIX SOON (9)

**P2-1 · FN-1 — Payment-save failure is silent (money path).**
`CustomerTransactionSheet.jsx` handleSave is `try { await onSave?.(…) } finally { setSaving(false) }` — **no catch, no toast**. The real write (`AppShell.jsx handleSaveCustomerTransaction` → `db.customer_transactions.add`, verified: write sits **outside** any try block) can reject (Dexie quota, IndexedDB loss) → unhandled rejection, sheet stays open, zero feedback. Compare `SaleWorkspace.jsx:613-628` which catches + toasts correctly.
**Fix:** wrap the write in AppShell's handler with catch → `fireToast(t.saveFailed)`; keep data in the form. (~1-2h)

**P2-2 · SEC-3b — Managers can rewrite their own/peer managers' permissions.**
`business.ts:336-390` (`PATCH /members/:userId/permissions`, `requireRole("owner","manager")`) blocks only the owner target; legacy equivalent (`business-legacy.ts:569-585`) is correctly owner-only. Also managers can create `manager` staff (`business-legacy.ts:358`).
**Fix:** owner-only for permission edits + manager-creation; align new/legacy routes. (~1h)

**P2-3 · SEC-3c — Device approve/reject/revoke bypass for null-shopId devices.**
`business-legacy.ts:708-813` — owner check runs only `if (device.shopId)`; a null-shopId device row can be approved/revoked by any authenticated user.
**Fix:** require shopId + ownership, else 403. (~30min)

**P2-4 · DI-8 — Restore orphans the sync outbox (post-restore local/server divergence).**
`useBackupData.js:126-176` restores 14 tables but never clears `db.sync_outbox`; cloud snapshots strip sync metadata so restored rows re-push as version-1 (server LWW discards → conflicts), and outbox entries for pre-restore records become permanent ghosts.
**Fix:** clear outbox inside the restore transaction + force a full re-pull after restore. (~2h)

**P2-5 · FN-2 — `can_view_reports` promised but never enforced in UI.**
`STAFF_MINIMAL_SAFE` sets it false ("Reports are OFF until first sync" — `permissionsStore.js:11`), but zero `hasPermission('can_view_reports')` consumers exist; bottom nav renders History/Report unconditionally (`AppBottomNav.jsx`: tabs array has no permission filter). Staff devices show the shop-wide report surface regardless of the owner's toggle. Server `/sync/pull` does require `can_view_reports` (verified) — so this is a UI trust gap, not data exposure.
**Fix:** gate the history tab on the permission. (~1h)

**P2-6 · DI-7 — Backup storage: bare-JWT, per-user, quota-abusable.**
`backup.ts` — all four routes bare JWT (no role check); staff JWT can store 10×10MB snapshots. No cross-user read (userId-scoped, checksum verified — good). No restore endpoint server-side (restore is client-only — so the "restore to test env" question resolves to: restore happens on-device only). No test coverage.
**Fix:** owner-role check or storage quota per role; add a backup round-trip test. (~1-2h)

**P2-7 · DOC-2/DOC-6 — Deployment docs stale; migration plan unindexed.**
All four deployment docs are June-era, single-project; the migration runbook (highest-stakes doc) is referenced by nothing.
**Fix:** one current deployment doc; index the migration plan from README. (~2h)

**P2-8 · DI-9 — LWW conflict policy is a design fact to document, not fix now.**
`sync.ts:71-85` confirmed: syncVersion first, then device-updatedAt tiebreaker. Loss window = edits made after another device's higher-version push are silently discarded (returned as conflict records only). Wrong device clocks win ties. Needs a UX decision (user-chosable conflicts) — post-launch.

**P2-9 · SEC-4 — staff.ts task creation doesn't verify target staff is in-tenant.**
`staff.ts:41-49` inserts `Number(staffId)` without checking membership in `ctx.businessId`; priority/status stored free-form.
**Fix:** membership check + enum validation. (~30min)

---

## P3 — POLISH (verified, non-blocking)

- **SEC-2**: cookie flags correct (httpOnly/secure/lax — `authHelpers.ts:13-22`); no CSRF token; residual = Chrome Lax+POST 2-min window on no-body mutations; token also lives in JSON responses as Bearer, so httpOnly is defense-in-depth only.
- **SEC-6**: Telegram webhook secret uses `!==` instead of the in-repo `safeEqual` (`telegram.ts:75,308`) — inconsistent with own standard, low exploitability.
- **FN-4**: hardcoded hex colors on `CustomerDetail.jsx` (`#E75645`, `#1b7a3d`, `#c0392b`, etc.) bypassing design tokens; SaleWorkspace clean by contrast.
- **UX-3**: `AuthRequiredPrompt.jsx:113` falls back to raw `err.message` (untranslated English) for non-429 errors.
- **UX-2**: 4 parallel string systems (dictionaries.js, labels/*, inline ternaries, local t-objects) — drift already materialized as UX-1; consolidate post-launch.
- **DOC-3/DOC-8**: no known-issues list; 45 root .md files, some contradicting each other; audit report itself now partially stale (its `JOIN_CODE_SIGNING_KEY` critical is fixed — don't re-report).
- **DI-10**: outbox overflow guard is warn-only (`syncEngine.js:498-505`); QuotaExceededError mid-sale handling NOT RUN.
- **SEC-1**: `pnpm audit --prod` — **api-server: 4 moderate** (all `ip-address` via `express-rate-limit`, no high/critical); **gebya: 0 vulnerabilities**. Covered by workspace overrides? No — `ip-address` not in the override list.
- **Resolved during review**: ReportView orphan question settled — it IS rendered (`HistoryTab.jsx:4,22`); the 61KB chunk is live. `AppActionBar` correctly gates sale buttons via `canAddRecords`.

---

## Verified-OK (positive evidence, for the record)

- Sale flow: double-save guard, empty-form block, overpayment confirm, error toast + data preservation, draft auto-save with UNDO — all verified in `SaleWorkspace.jsx`.
- Onboarding: 409-conflict recovery path ("continue without phone"), owner-permission stamping before completion, offline fallback honestly labeled.
- Sync money pull-guard + truncation reporting live in production; RBAC `active=true` sweep complete; takeover guard + cron auth verified live via probes.
- `pnpm audit`: no high/critical anywhere; frontend fully clean.
- All `.env*` files (14 found) git-ignored and never committed historically (verified `git check-ignore` + `git log --all`).

## NOT RUN (needs a live device/session — schedule a field-test pass)

- Real-device walkthrough as owner + staff (kedir); airplane-mode full journey; token-expiry mid-session on device; 2GB-RAM performance; slow-3G cold start (estimated: 381 KB gzip critical path — acceptable but measurable); restore-to-test-env drill; voice-entry offline.

---

## Recommended order from here

1. **P1-1 invite IDOR** — one query change, closes cross-tenant access. (I can do it now.)
2. **P1-2 Amharic auth strings + P2-1 silent payment failure** — trust + money-path UX.
3. **P1-3/4/5 docs batch** — env matrix + REVERT.md + README (mostly assembly; material exists).
4. **P2 batch** — SEC-3b/3c, DI-8 restore, FN-2 gating, SEC-4 staff validation.
5. **Session B migration** (unchanged) — Neon rehearsal → prod 0007+0008.
6. **Field-test pass** for the NOT RUN items, then Amharic native-speaker review (B5).
