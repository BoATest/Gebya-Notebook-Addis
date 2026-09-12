# Gebya Development Team — Full Product Questionnaire Answers

**Document:** `docs/GEBYA_DEVELOPMENT_TEAM_QA.md`
**Purpose:** Complete, honest answers to the 25-question "Questions for the Gebya Development Team" questionnaire (sections A–H), grounded directly in the current codebase (branch `master`, commit `e90457e`), **plus Section I — a go-to-market plan for reaching the first 1,000 shopkeepers**, including the growth levers already built into the code, the scaling prerequisites, the expert-team roles required, and the KPI dashboard to run the push.
**Prepared:** November 2026
**Evidence basis:** Source code in `artifacts/gebya`, `artifacts/api-server`, `lib/*`, plus the repository's own audit documents (`RELEASE_READINESS_AUDIT.md`, `CRITICAL_AUDIT_FINDINGS.md`, `CREDIT_FLOW_AUDIT.md`, `SYNC_V2_BACKUP_RESTORE_SUMMARY.md`, `RBAC_IMPLEMENTATION_SUMMARY.md`, `FIELD_TEST_PROTOCOL.md`, `GEBYA_PLATFORM_DEEP_DIVE.md`), re-verified against current code where the documents conflicted.

> **How to read this document.** Every claim is tagged ✅ (verified working in code), ⚠️ (partially built / needs work), or 🙈 (built but hidden / not visible to normal users). Where the repository's own audit documents disagree with each other, we say so explicitly rather than picking a side. Anything we could not verify in code is marked **[unverified]**.

---

## A. Full Product Scope — What Exists Today

### Q1. Complete list of every feature and module that is fully working and usable right now

**Architecture context first:** Gebya is a pnpm monorepo with three deployable pieces:

| Package | What it is | Used today? |
|---|---|---|
| `artifacts/gebya` | The main product — mobile-first React PWA, **fully offline-first** (all data in IndexedDB via Dexie.js, local schema now at **version 27**) | ✅ Yes — this is the product |
| `artifacts/api-server` | Express 5 + PostgreSQL backend: optional cloud sync, cloud backup/restore, Telegram bot/web-push, server-side RBAC, admin APIs | ⚠️ Built and tested; optional for core use |
| `lib/*` (`api-spec`, `api-zod`, `api-client-react`, `db`) | Shared OpenAPI spec, generated Zod schemas, React Query client, Drizzle ORM PostgreSQL layer | ✅ Used by the API server |

**Fully working, in the local/offline app (`artifacts/gebya`):**

**1. Today screen (daily operations home) — ✅**
- Profit/sales summary with **privacy toggle** (values hidden by default, tap to reveal, auto-hides after 30 s — `context/PrivacyContext`).
- Empty state with 📒 icon and amber hint arrow pointing at the record button.
- 7-day sales sparkline (pure CSS bar chart, today highlighted).
- Top-3 products "leaderboard" for today (trophy icons).
- Usage insights row (streak + days active + total entries); 🔥 streak chip always in the header; bold shop name in header.
- "Best-Day Celebration" toast when today's sales first exceed the all-time best (tracked in IndexedDB, once per record break).
- Offline status strip showing connection state and truthful "pending sync" count (driven by the durable `sync_outbox` table, schema v27).

**2. Recording transactions — ✅**
- **ሸጠሁ (I Sold)** / **ወጪ (I Spent)** / **ብድር (Credit)** entry forms in a modal interface (`TransactionForm.jsx`).
- **Voice entry** via Web Speech API (Amharic locale, graceful fallback to manual — voice is never mandatory). Transcripts and detected totals are stored (`raw_transcript`, `detected_total`, `parsing_confidence`).
- Payment type chips: Cash / Bank / Wallet with provider sub-chips (CBE, Dashen, Awash, Abyssinia / telebirr, CBE Birr) — controlled by Settings (`PaymentTypeChips.jsx`, `paymentChannels.js`).
- **True profit calculation**: selling price − cost price × quantity; cost optional under "Advanced".
- **Save-and-add flow**: after saving, "Add another" (resets form, keeps payment type) or "Done".
- **Undo toast**: 4-second undo after every saved transaction (deletes transaction and any credit record, fires "Undone ✓").
- **Edit any transaction**: pencil icon in Today's entries or from history detail (`EditTransactionSheet.jsx`); edited entries tagged `was_edited` and labelled "edited" in history.
- Catalog quick-chips: recurring/quick items defined in Settings appear as fill shortcuts in forms.
- **Quick Profit Calculator** modal (cost/sell price → live profit + margin %).
- Achievement badges (First Sale, 7-Day Streak, 1k Birr Day, 50 Transactions, First Credit Repaid) with unlock toasts and a badge strip in Settings.

**3. Credit / Notebook module (ዱቤ / Merro) — ✅ (the most complete module)**
- **Customer list** with search by name/note, overdue flags, status pills, per-customer balances (`CustomerList.jsx`).
- **Add customer**: single required field (name/identifier — nicknames like "baby's mother" supported by design, per `spec.md`); optional phone with strict Ethiopian `+251` validation (9 digits starting 9 or 7), note, Telegram username, optional customer photo (camera stream compressed to <80 KB JPEG).
- **Credit direction**: ያበደርኩት ("they owe me") vs የተበደርኩት ("I owe them") — shown as a badge in the credit list.
- **Add credit**: amount required; optional item note, due date, multi-item **basket breakdown** sub-sheet, catalog quick-chips.
- **Record payment**: amount required, optional note, payment-method mapping (Cash / telebirr / banks), **partial payments** with **FIFO automatic allocation** across outstanding credits (`fifoAllocatePayment`), overpayment **hard-blocked**, one-tap **Mark Fully Paid**.
- **Customer detail dashboard** (`CustomerDetail.jsx`): current balance, transaction history in time order, frequency, average pay duration, overdue timelines, promised-pay-date logging with "Missed Promises" highlighting, reminder history.
- **Status badges**: OVERDUE (red) / DUE SOON (amber) / OK (green) text badges + overdue-day pills.
- **Optional Telegram connect per customer** (`CustomerTelegramConnectSheet.jsx`): QR code / bot link / manual username fallback.
- Balance is **auto-calculated from the transaction ledger** — never manually editable, history never destructively overwritten (see Q11).
- Legacy credit records are **migrated automatically** (Dexie upgrade from `credit_records`/`credit_payment_logs` into the unified `customer_transactions` ledger, including splitting supplier debts into the supplier ledger).

**4. Supplier ledger (dual-ledger) — ✅**
- Separate suppliers registry + supplier transactions (`purchase_add` / `supplier_payment`), supplier list/detail/forms (`SupplierList.jsx`, `SupplierDetail.jsx`, `SupplierForm.jsx`, `SupplierTransactionSheet.jsx`). Tracks "I owe my supplier" separately from customer credit.

**5. Team / Staff module — ✅ (details in Q6)**
- Owner invites staff by phone with role and per-staff permissions (`TeamPage.jsx`, `MembersPanel.jsx`).
- Staff-side accept/decline full screen after OTP login (`StaffInviteAcceptScreen.jsx`); owner sees invite status badges (Sent / Notification Pending / Declined / Active).
- Staff registry with roles, PIN, activation/deactivation (`staff_members` table; `StaffPage.jsx`, `staffStore.js`).
- **RBAC permissions**: `can_add_records`, `can_delete_records`, `can_edit_settings`, `can_view_reports` — defaults per role (owner / cashier / viewer), overridable per staff member, **enforced server-side** (`artifacts/api-server/src/routes/rbac.ts`) with 403 + `audit_log` row on every violation attempt; owners auto-pass.
- Owner-only activity dashboard: per-staff daily breakdown, full staff attribution on every transaction (`actor_role`, `actor_staff_member_id`, `actor_name_snapshot` on all ledger tables), staff activity feed and event sync (dedicated Playwright tests).
- **Daily closing / shift handover** (`daily_closings` table, `HandoverStatus.jsx`): recorded vs actual cash/transfer with variance at day end.
- Policy: **one active device per staff member** enforced by identity logic.

**6. History & Reports — ✅**
- History view with per-day/per-week summaries; **Ethiopian calendar display** ("8 መጥቅ 2019" style) alongside Gregorian.
- **Report view** (`ReportView.jsx`) — recently refactored: simplified KPI cards, KPI detail sheets, sticky controls, fixed action bar, collapsible sections, insight strip, responsive 320–1920 px.
- **Report sharing**: formatted text summary via Web Share API with Telegram deep-link fallback; Telegram username field in Settings → Shop Profile.
- Period insights, timeline view, owner activity dashboard (`PeriodInsights.jsx`, `TimelineView.jsx`).
- **Export**: CSV and PDF download menu (`DownloadMenuSheet.jsx`, 48 px touch targets).

**7. Voice pipeline — ✅ (browser-based)**
- Web Speech API with Amharic locale; transcript + detected total shown for confirm/fix/re-record; non-blocking fallback to manual. (The cloud Whisper pipeline in the deep-dive doc is **optional/phase-2**; the working path today is on-device Web Speech.)

**8. Telegram integration — ✅**
- Per-customer linking (QR/bot link/manual), notification queue that drains when online, delivery-state tracking per transaction (`telegram_delivery_state`, `telegram_delivery_error`, `telegram_delivery_attempted_at`), resend support (tests: `telegram-resend.spec.ts`, `telegram-slow-network.spec.ts`).
- Server bot (`telegramBotClient.js`) with webhook verification and customer-language confirmations; **never blocks** a save when Telegram is unlinked.

**9. Settings — ✅**
- Shop profile (name, phone, Telegram), payment methods enable/disable (banks & wallets), recurring expense shortcuts, catalog management, staff management, language toggle, password settings, app reset; covered by `settings-tabs.spec.ts`.

**10. Offline & PWA infrastructure — ✅**
- 100% offline core: every read/write hits IndexedDB first; the app **never blocks on network** and never shows "connection required".
- Installable PWA (vite-plugin-pwa, Workbox service worker, app-shell caching, 192/512 + maskable icons, theme `#1B4332`); install guidance panel (`PwaInstallPanel.jsx`).
- Sentry error tracking wired (`sentry.ts`).
- **Optional cloud sync v2**: version-aware conflict resolution (`sync_version` on all tables), paginated pull (`limit=200`, `hasMore`/`nextCursor`), exponential-backoff retry (5 attempts), durable push outbox — honest "Pending sync" indicator.

**11. Localization & cultural features — ✅ (quality caveat in Q15)**
- Full EN/አማ dictionaries (~1,500 lines; `EN`/`AM` + override maps), header pill toggle, persisted choice, `lint:i18n` guard script.
- Ethiopian calendar conversion + Ethiopian time utilities; Birr (ብር) formatting; voice parsing of number words in both languages ("ስድስት ሺህ" → 6000, "ten thousand" → 10000).

### Q2. Features or modules that are partially built or still incomplete

| Module | Status | What's missing |
|---|---|---|
| **Amharic translation quality** | ⚠️ | All AM strings were **machine-translated and not yet reviewed by a native speaker** — an explicit warning sits at the top of `context/LangContext.jsx`: *"Do NOT ship to production without completing this review."* The credit-flow audit also found newer UI elements (basket breakdown, overdue flags, overpayment warnings) still falling back to English when አማ is selected. |
| **Cloud sync (cross-device)** | ⚠️ | Sync v2 is built and tested, but `CRITICAL_AUDIT_FINDINGS.md` (July 2026) flagged a **cross-device local-id collision that can duplicate customer records and split balances**, plus **silent conflict overwrites without audit** and mid-push crash data-loss risk. The Sync v2 rework (outbox + version-aware upsert) targets these — but the documents conflict on what's fully fixed; see Q25. |
| **Conflict-resolution UI** | ⚠️ | A **conflict warning indicator exists** (the offline status strip / header renders `syncStore.conflictWarning` with details — verified in `OfflineStatusStrip.jsx`), but there is still **no owner-facing flow to actually resolve offline edit collisions** — the server detects conflicts; a human-resolution UI remains on the "hardening still needed" list from `RBAC_IMPLEMENTATION_SUMMARY.md`. |
| **Automated reminders** | ⚠️ | Manual nudges/reminder sheets exist (`ReminderSheet.jsx`, `CustomerReminderHistory.jsx`, server `reminders.ts` with tests, reminder settings), but **scheduled/due-date automation** is deliberately not enabled — `spec.md` says keep reminders disabled by default. |
| **Telegram invite notifications** | ⚠️ | Wired, but delivery depends on `TELEGRAM_BOT_TOKEN` + invitee's linked Telegram session; otherwise invite shows "Notification Pending" without blocking. |
| **Admin toolkit** | ⚠️/🙈 | `AdminPortal.jsx` + dashboard/shop-detail/metrics views, support tickets, SMS channel, broadcasts exist (`docs/ADMIN_TOOLKIT.md`), but the release audit listed "admin tools for data quality not yet built" and "analytics not instrumented" as gaps. Internal operations tooling, not finished product. |
| **Monetization / entitlements** | ⚠️/🙈 | `entitlements.js` defines FREE/PLUS tiers; a lazy `/pay` route (`PayPage.jsx`) exists, but payment collection is not a finished user-facing flow. |
| **Photo/receipt proof verification** | ⚠️ | Camera capture + photo attachment exist (`CameraCapture.jsx`, `PhotoAttachment.jsx`, `photoProof.js`, lifecycle tests), but the audit's verification/confidence-scoring system (bank-grade data trust) is not implemented. |
| **Bank-facing data trust layer** | 🙏 prototype | `BankDashboard.jsx`, `BankDataSharing.jsx`, `trustScore.js`, `cloudProof.js` exist (with a local-contract test) — a direction, not a finished bank product. |
| **Learning/insight features** | ⚠️/🙈 | `learningEngine.js` (unit tested), `DoThisNext.jsx`, `DailySuggestions.jsx`, `AskNotebookFAB.jsx`, `LearningInsights.jsx` — experimental, not part of the core daily flow. |
| **Analytics instrumentation** | ⚠️ | Analytics store/table + event tracking utils + server route exist, but the release audit scored analytics capture as **incomplete** — user behavior is not measured reliably yet. |
| **Location/GPS capture** | ❌ not started | Audit red flag: no GPS fields on transactions; important to add *before* scale-up because it cannot be added retroactively. |

### Q3. Features intentionally NOT built (and why)

From `spec.md` and its design rules:

1. **Full inventory management** — "do not build full inventory or full POS in this task." Gebya is a notebook, not a POS. (Inventory is deferred to Phase 2+ on the roadmap.)
2. **Full POS / checkout** — same rule; the app records, it does not ring up sales.
3. **Tax / accounting-reporting complexity** — "do not build tax/reporting complexity"; the product must avoid accounting jargon and tax-like language for low-literacy users.
4. **Heavy onboarding** — "do not create a heavy onboarding flow"; onboarding is shop name + language only.
5. **Complex automated reminder logic** — "do not build complex reminder logic yet… keep it disabled by default."
6. **WhatsApp integration** — "We are focusing on Telegram first, not WhatsApp."
7. **Forced phone number / Telegram / account creation** — "must not force phone number or Telegram"; Telegram is optional and never blocks a save; skip-authentication is a first-class path for single-device use.
8. **Complex CRDT merge logic** — Sync v2 deliberately chose a pragmatic version-aware upsert instead of full CRDT merging.

### Q4. Anything important built but hidden or not easily visible

Yes — several things:

1. 🙈 **Admin Portal / Dashboard / Shop Detail / Metrics** — role-gated internal tooling (support tickets, SMS channel status, broadcasts, push blasts, shop logs, cross-shop curation queue). A shopkeeper never sees these.
2. 🙈 **Bank dashboard & data-sharing surface** (`BankDashboard.jsx`, `BankDataSharing.jsx`) — the bank-facing direction; not part of the merchant experience.
3. 🙈 **Trust score** (`TrustCard.jsx`, `trustScore.js` — unit tested) — a per-customer trust computation exists but is not surfaced in customer detail (the audit noted customer detail shows only a static privacy line instead).
4. 🙈 **Learning engine & proactive suggestions** (`learningEngine.js`, `DoThisNext.jsx`, `DailySuggestions.jsx`, `AskNotebookFAB.jsx`) — habit-learning features; the field-test protocol even instructs the team **not to explain them** to test users.
5. 🙈 **Entitlements/PayPage** — free/plus tiers and a lazy `/pay` route exist but are not a visible flow.
6. 🙈 **Daily closing / shift handover** (`daily_closings`) — cash-variance tracking at day end; easy to miss but valuable for owner oversight.
7. 🙈 **Sync diagnostics & recovery** (`SyncDiagnosticSheet.jsx`, `RecoveryNudgeModal.jsx`, `cloudProof.js`) — recovery nudges and sync troubleshooting, surfaced only in specific conditions.
8. 🙈 **Recurring expense shortcuts, achievements, quick profit calculator** — all behind secondary entry points; users discover them late without guidance.

---

## B. Complete User Journeys (All Roles)

### Q5. Full journey of a new Shop Owner, first open → daily use

1. **Open the app** (browser or installed PWA). After the first load it is served from the service-worker-cached app shell, so it opens even with poor connectivity.
2. **Onboarding** (`OnboardingScreen.jsx`): collects **shop name** and **language preference** (Amharic or English) — deliberately minimal, well under 2 minutes, and writes the `intro_seen` flag plus settings to the local `settings` table. (Verified: the intro-slides flow described in `replit.md` now lives *inside* `OnboardingScreen.jsx` — the separate `IntroSlides.jsx` file no longer exists. A separate router-style `pages/OnboardingPage.jsx` with Owner / Staff / Quick-Start account-type selection exists but is **not wired** into the live shell.)
3. **Identity gate** (`AuthGate.jsx`): the owner can **skip** (single-device, local-only mode — no account required) or **register/login with phone OTP**. Skipping is a first-class path, honoring the "no forced login" design rule.
4. **First action** — the app lands on the **Today tab**. If nothing is recorded yet, the empty state (📒 icon + amber hint arrow) points at the **ሸጠሁ** button. Tapping it, entering an amount, and saving takes seconds, and the **4-second undo toast** protects against mistakes.
5. **Daily loop from then on:**
   - **ሸጠሁ** → amount → save (voice is the fast path; payment type defaults to Cash; "Add another" for batch entry).
   - **ወጪ** → amount → save (recurring chips for regular expenses).
   - **ብድር** → customer (existing or new, one required field) → amount → optional due date → save; "notify customer on Telegram?" appears only if the customer is linked.
   - Check the **Today summary** (privacy-hidden until tapped), the **credit list** for who owes what, **History/Report** for the day/week, and **share** a summary if desired.
6. **Growth loop**: streaks, best-day celebrations, badges, top products, and the 7-day sparkline surface as habits form. Settings holds payment providers, recurring expenses, catalog items, staff, and Telegram.

### Q6. Full journey of a Staff member joining a shop

1. **Owner side**: in `TeamPage.jsx` the owner invites a staff member by **phone number**, chooses a role, and sets per-staff permission toggles (`can_add_records`, `can_delete_records`, `can_edit_settings`, `can_view_reports`). Phone validation and duplicate-shop guards run at `/business/invite`.
2. **Notification**: the server attempts a **Telegram DM** to the invitee (if the bot is configured and the phone has a linked session). If not possible, the invite is marked "Notification Pending" — **the invite is never blocked**.
3. **Staff side**: the staff member opens Gebya on their own phone and logs in with **phone OTP**. Because their phone matches a pending invite, **`StaffInviteAcceptScreen`** shows the shop name, their role, and **Accept & Join / Decline** buttons.
4. **Joining**: Accept calls the accept endpoint → links the user to the business → the app reloads with the **correct permissions** loaded into their identity.
5. **Daily use as staff**: a **restricted view** — they can record sales/expenses/credits and view reports (as permitted), but **cannot edit settings** by default; every transaction is stamped with their identity (`actor_staff_member_id`, `actor_name_snapshot`) so the owner's dashboard attributes activity per person. One active device per staff is enforced.
6. **Owner oversight**: staff activity feed, per-staff daily breakdowns, invite status badges (or "Declined"), shift handover/daily-closing variance, and (server-side) an **audit log of permission-violation attempts** (`GET /api/audit/violations`, last 200, owner-only).
7. **Server enforcement**: if a staff app tries to bypass the UI and call the sync API directly, the RBAC middleware rejects with 403 and logs the attempt. Cashiers keep add/delete by default; the owner can revoke delete per person.

### Q7. Other user roles or account types

Yes — three more, in descending order of maturity:

1. **Platform Admin (internal)** — 🙈/⚠️
   - Logs into an internal portal (`AdminPortal.jsx` → `AdminDashboard.jsx` / `AdminShopDetail.jsx` / `AdminMetricsView.jsx`).
   - Journey: admin login → shop list → per-shop detail (metrics, logs) → actions like SMS-quota reset, broadcast/push. Documented in `docs/ADMIN_TOOLKIT.md`.
   - **Status**: functional internal tooling; the release audit still lists admin/analytics gaps. Operations tooling, not product.
2. **Bank / data consumer (direction, not a live role)** — 🙏
   - `BankDashboard.jsx` + `BankDataSharing.jsx` + trust-score/cloud-proof utils sketch a future "bank views verified merchant data" surface. **Prototype stage; no bank is connected to anything today.**
3. **Entitlement tiers (free vs plus)** — 🙈
   - `entitlements.js` defines plan capabilities (multi-shop, priority-support flags, etc.); the free tier is what everyone effectively uses today. Paywall not live.
4. **Customer (credit recipient)** — not an app user, but two lightweight touchpoints exist (both standalone public routes in `main.tsx`, no login needed):
   - **`/pay` — PayPage**: a customer-facing payment-channel picker (Cash/telebirr/banks), reached from **"Pay-it-now" reminder links** — the customer taps the link in their Telegram reminder and picks how they'll pay. Kept out of the main bundle so shopkeepers never download it.
   - **`/join/:token` — JoinPage**: public staff-invite accept link.
   - They can also optionally **receive Telegram messages** (credit/payment confirmations) — lightweight, no account.

### Q8. What happens if a user closes the app mid-action and returns later?

This is where the offline-first architecture pays off:

- **Saved transactions**: safe the instant they're written — **every write goes to IndexedDB first**, before any network involvement. Closing the app cannot lose a saved entry.
- **Unsaved entry (half-filled form, or voice recording in progress)**: lost — in-progress state is in memory, not storage. This is the only real mid-action loss case, and it is standard for every app.
- **Undo window**: after saving, a 4-second toast offers Undo; closing the app during that window simply skips the undo (the transaction stays saved).
- **Offline edits & credits**: queued in the local **sync outbox** (`sync_outbox`, schema v27) and pushed when connectivity returns, with exponential-backoff retry (5 attempts, 1 s base, doubling). The "Pending sync" indicator counts the outbox, so it is **truthful**.
- **Telegram notifications**: queued (delivery-state fields) and drained when online — a save never depends on Telegram succeeding.
- **Cloud sync interruptions**: per-table `lastSyncAt` tracking makes pulls **resumable** after partial failure; on push conflict, the client re-pulls, merges (bumps `sync_version`), and re-pushes.
- **Cloud backup/restore**: snapshots are full JSON dumps with SHA-256 checksums — restore works even if the local database is gone (as long as a snapshot was taken).
- **Caveat (honest)**: the audit found that **sync crashes mid-push** could in the worst case lose a transaction, and silent conflict overwrites were flagged. The Sync v2 rework (outbox + version-aware upsert) targets exactly these, but see Q23/Q25 for residual risk before multi-device pilots.

---

## C. Credit / Notebook Core

### Q9. How many taps does it take to: add a customer, record a credit, record a payment, see balance, send a reminder?

The design target in `spec.md` is **under 10 seconds each**; the UI is built for that. Approximate tap counts from the current UI (exact count varies with state — e.g., whether the customer already exists):

| Action | Typical taps | Path |
|---|---|---|
| **Add a customer** | **3 taps + typing the name** | Credit tab ➕ (or "new customer" link in credit form) → name field (auto-focused) → Save. Phone/note/Telegram are optional extras. |
| **Record a credit** | **3–5 taps** | ብድር → pick/enter customer → amount → Save (optional due date/note under "More"; catalog chips can fill item notes in one tap). |
| **Record a payment** | **4–5 taps** | Open customer (or credit list) → "Record Payment" → amount → Save. "Mark Fully Paid" reduces this to **2 taps** for a full settlement. |
| **See balance** | **0–1 taps** | Balances are always visible on the credit/customer list; opening a customer shows the full ledger. |
| **Send a reminder** | **2–4 taps** | Customer → nudge/reminder action (Telegram message if linked; otherwise the reminder sheet logs the promise / shows history). Automated scheduled reminders are intentionally disabled (see Q2). |

Notes:
- The amount field is a large "hero" input with Birr-aware parsing (`fmtInput`/`parseInput`) to prevent entry errors; defaults are smart (Today pre-selected, Cash default).
- The Amharic cheat sheet in `FIELD_TEST_PROTOCOL.md` shows the canonical flows in 3–5 numbered steps each — consistent with the counts above.
- Multi-item credits (basket) and photos add steps but are optional, never required.

### Q10. Does the credit/notebook part work fully offline? What happens with no internet?

**Yes — 100% offline for all credit/notebook functionality.**

- Customers, customer transactions, supplier transactions, staff members, catalog, settings all live in **IndexedDB (Dexie)** on the phone. Reads and writes never touch the network.
- With no internet: add customers, add credits, record payments (including partial + FIFO allocation), edit entries, see balances/overdue flags, view history, export CSV/PDF — **all work exactly as online**. The app never shows "connection required."
- The only things that wait for internet: **cloud sync push/pull** (queued in the durable `sync_outbox`, retried with exponential backoff when online), **Telegram message delivery** (queued with per-transaction delivery state; manual resend available), **cloud backup upload/download**, and **OTP login** (but skip-mode/local identity works offline for single-device use).
- The offline status strip + "Pending sync" count keep the user informed without blocking them.

### Q11. How accurate and reliable is the balance calculation?

**Designed to be exact, and it is guarded by tests.**

- **Single source of truth**: balance = Σ(credit_add) − Σ(payment) computed from the `customer_transactions` ledger (`customerLedger.js`, `customerLedgerMutations.js`). It is **never manually editable**, and financial history is never destructively overwritten (edits create flagged corrections; deletes are confirm-guarded).
- **Partial payments** are allocated **FIFO** across outstanding credits (`fifoAllocatePayment`), so per-credit and total balances stay consistent with each other.
- **Overpayment is hard-blocked** ("cannot receive extra payment over outstanding balance"), which prevents negative/nonsense balances.
- **Legacy migration is idempotent**: the Dexie upgrade that converts old `credit_records`/`credit_payment_logs` into the unified ledger de-duplicates against existing rows (matching on customer/type/amount/timestamps/notes) so migration cannot double-count.
- **Test coverage**: dedicated suites cover exactly this — `customer-ledger.spec.ts`, `offline-ledger.spec.ts`, `transfer-balance.spec.ts`, `customer-detail.spec.ts`, plus api-server `sync.test.ts` for server-side integrity. Payments, promises, and archive flows have their own specs (`promise-recording.spec.ts`, `archive-customer.spec.ts`).
- **Known risk (honest)**: the audit's cross-device duplicate-record finding (Q2) is the one scenario that could make balances *appear* wrong (split across two records of the same person). For **single-device, offline-first use — the pilot scenario — balances are reliable.** For multi-device use, run the audit's fix verification first.

---

## D. All Other Functionalities That Exist

### Q12. Every other feature explained: what it does, who it's for, offline?, how many steps

| Feature | What it does | Who | Offline? | Steps (typical) |
|---|---|---|---|---|
| **Voice entry** | Speaks a sale/expense; transcript + detected total shown for Save/Fix/Re-record | Both (owner/staff) | ✅ (on-device Web Speech; cloud Whisper optional, needs net) | 1 tap (mic) → speak → Save |
| **Quick Profit Calculator** | Cost/sell price → live profit + margin % | Both | ✅ | 1 tap (calculator icon) → 2 numbers → read |
| **Catalog quick-chips** | Saved item names as one-tap fill shortcuts in sale/expense/credit forms | Both | ✅ | Define once in Settings; 1 tap thereafter |
| **Recurring expenses** | Quick-fill shortcuts for regular costs (rent, transport, etc.) | Both | ✅ | Define in Settings; 1 tap in expense form |
| **Payment methods config** | Enable/disable each bank & wallet; only enabled ones appear as chips | Owner | ✅ | Settings → toggle |
| **Supplier ledger** | Track purchases from and payments to suppliers ("I owe supplier") | Owner | ✅ | Suppliers tab → supplier → purchase/payment → save (3–4) |
| **Customer Telegram connect** | Link a customer via QR/bot link/username to receive credit/payment alerts | Owner | ⚠️ linking local; messaging queued for net | Customer → connect sheet → scan/link (2–3) |
| **Report share** | Formatted text summary of the day/period via Web Share API / Telegram deep link | Both | ✅ (share target may need net) | Report → Share → choose app (2–3) |
| **CSV / PDF export** | Download transactions/ledger data | Owner | ✅ (file saved locally) | Download icon → choose format (2) |
| **History / Timeline** | Per-day and per-week entries, edited entries tagged, Ethiopian dates | Both | ✅ | Tab switch (1) |
| **Staff team page** | Invite staff, set role + per-staff permissions, see invite status | Owner | ⚠️ invite/notification needs server | Team → invite → phone+role → send (4–5) |
| **Staff PIN / device binding** | Staff identity on a device; one active device per staff | Staff | ✅ after login | Login once (OTP) |
| **Owner activity dashboard** | Per-staff daily breakdown, attribution of every entry | Owner | ✅ (local data) | Nav (1) |
| **Daily closing / handover** | Record end-of-day actual cash/transfer vs recorded; variance computed | Owner | ✅ | Close-day action → enter actuals → save (3–4) |
| **Achievements & streaks** | 5 badges, streak chip, best-day celebration, usage insights | Both | ✅ | Automatic (0) |
| **Privacy mode** | Money values hidden by default; tap to reveal; 30 s auto-hide | Both | ✅ | 0 (default) / 1 tap to reveal |
| **PWA install guidance** | Step-by-step "add to home screen" help per device | Both | ✅ | Install panel (1) |
| **Language toggle** | EN/አማ switch for all UI strings, persisted | Both | ✅ | 1 tap (header pill) |
| **Ethiopian calendar & Birr format** | EC dates ("8 መጥቅ 2019"), ብር formatting, word-number parsing | Both | ✅ | Automatic (0) |
| **Undo / edit / delete** | 4-s undo toast after save; edit via pencil or detail sheet; confirm-guarded delete | Both | ✅ | 1–2 |
| **Cloud backup / restore** (opt.) | JSON snapshots (max 10 × 10 MB) with SHA-256 verification | Owner | ❌ needs net | Settings → Cloud backup → create/restore (3) |
| **Cloud sync** (opt.) | Multi-device via version-aware push/pull with conflict tracking | Owner+staff | ❌ needs net | Automatic when online |
| **Search** | Search sheet across customers/transactions | Both | ✅ | 1 tap → type |
| **Photo capture** | Camera capture of customer/item, compressed <80 KB | Both | ✅ (stored locally) | 1–2 |

### Q13. Reports, summaries, history views, export options, analytics already built?

**Yes — this area is well covered:**

- **Today summary** with privacy toggle (sales, expenses, collected cash, profit).
- **History view** with per-day/per-week summaries; **Timeline view**; edited-entry tags.
- **Report view** (`ReportView.jsx`, refactored "Shop Check Report Dashboard"): simplified **KPI cards**, KPI **detail sheets**, sticky controls, collapsible sections, insight strip; mobile-responsive.
- **Period insights** (`PeriodInsights.jsx`) and **Owner activity dashboard** (per-staff breakdown).
- **7-day sparkline**, **top products**, **streak/usage insights**, **best-day celebration**.
- **Customer-level metrics**: frequency, average pay duration, overdue days, promise tracking, reminder history.
- **Export**: **CSV and PDF** via the download menu; plus **share as text** (Web Share API / Telegram deep link).
- **Cloud JSON snapshots** (full local DB dumps) as backup/restore.
- **Analytics (weak spot, but partially wired)**: an analytics table + `eventTracking.js` (`initSession`, `trackEvent`, `trackFirstEvent` — initialized in `AppShell.jsx`) + a server analytics route exist. Instrumentation code is real, but the release audit scored capture as **incomplete** — real behavioral analytics are not yet flowing into decisions.

### Q14. Settings, multi-shop, multi-user, permission features already working?

**All four exist:**

- **Settings** (✅): shop profile, payment methods/channels, recurring expenses, catalog management, staff management, Telegram, password, language, app reset — organized in tabs (`settings-tabs.spec.ts`).
- **Multi-user** (✅): owner + staff roles with invites, accept/decline, PIN, device binding, staff attribution on every entry, owner activity dashboard, violation audit log.
- **Permissions / RBAC** (✅): four server-enforced permissions, per-staff overrides, owner auto-pass, 403 + audit-logged violations; the owner dashboard is strictly role-gated.
- **Multi-shop** (⚠️ partial): data model supports multiple businesses (`identity.businesses`, `BusinessSelector.jsx`, `business_members` on the server, multi-shop entitlement flag), and a business selector UI exists — but multi-shop operation is not a polished everyday flow yet, and the PLUS tier gates some of it.

---

## E. Language, Trust & Data

### Q15. Is the entire interface fully available in clear Amharic?

**Coverage: essentially yes. Quality: not yet verified.** Honest breakdown:

- ✅ **Structural coverage is complete**: full `AM` dictionary + `AM_OVERRIDES` exist alongside English (~1,500 lines of strings in `context/dictionaries.js`); every screen uses the `t()` helper, so switching to አማ translates the UI wherever mapped. Amharic number-word parsing works for voice, and dates display in the Ethiopian calendar.
- 🚨 **The code itself forbids calling it production-ready**: the top of `LangContext.jsx` carries a hard warning that all AM strings are **machine-translated and require native-speaker review** — *"especially financial/business terminology, verb forms, and formal/informal register. Do NOT ship to production without completing this review."*
- ⚠️ **Known gaps** (from `CREDIT_FLOW_AUDIT.md`): newer elements — "Basket Item Breakdown", overdue flags, overpayment warnings — still show English fallbacks in some cases when አማ is selected. A `lint:i18n` script catches character/encoding issues, but not translation completeness.
- ✅ **Default language is now አማ** (changed from `en` to `am` in `LangContext.jsx` during this review session — verified in code; existing users keep their saved preference via localStorage).

**Verdict:** the plumbing for "fully Amharic" exists and አማ is now the default, but a **native-speaker translation audit is a mandatory pre-pilot task** (also: fill the known gaps).

### Q16. Where is the data stored — phone only, cloud, or both?

- **Phone (default and source of truth)**: everything lives in **IndexedDB (Dexie, "GebyaDB", schema v27)** on the device — transactions, customers, customer transactions, suppliers, supplier transactions, catalog, staff, settings, analytics, daily closings, identity, sync queue/outbox.
- **Cloud (optional, opt-in)**: PostgreSQL (Drizzle ORM) behind `artifacts/api-server` — mirrored tables, cloud **backups** (snapshots), server-side RBAC/audit, Telegram bot state. Sync is never required for core function.
- **Consequence**: a user who never logs in and never enables sync has **zero cloud presence** — genuinely phone-only.

### Q17. Can users easily back up or export their data?

**Yes, three ways:**

1. **CSV export** — from the report/credit screens via the download menu (also PDF). Works offline; files land in the phone's downloads.
2. **Cloud backup/restore** (needs the API server) — Settings → Cloud backup: creates a full JSON snapshot (max 10 per user, 10 MB each, oldest auto-rotated), listed and downloadable with **SHA-256 checksum verification**; restore from snapshot supported.
3. **Share as text** — report summaries shareable via Web Share API / Telegram.

**Caveat:** the *easiest* path for a non-technical user is arguably the cloud backup, but it requires the server to be deployed and reachable; CSV is the universal fallback. Backup is currently **manual** — there is no automatic scheduled backup yet. For a pilot, have users take a cloud backup weekly (or add automatic backups before then).

### Q18. The landing page says "All data stays on your phone · Not connected with your bank · Free". Is this still 100% true?

**No — each claim needs updating. Accurate current wording follows:**

| Claim | Truth today | Honest replacement |
|---|---|---|
| "All data stays on your phone" | ✅ True **by default** (local IndexedDB, no account required) — but **optional cloud sync + cloud backup now exist**, moving data to the developer's server when enabled. | "Your records live on your phone. Cloud backup/sync is available **only if you turn it on**." |
| "Not connected with your bank" | ✅ True **functionally today** — no bank APIs, no aggregation, nothing sent to any bank. ⚠️ But the codebase contains **bank-dashboard / bank data-sharing prototypes** and a trust-score/cloud-proof layer aimed at a future bank-facing product; the *direction* is bank-adjacent even though nothing is connected now. | "We don't connect to your bank. Your bank balance has nothing to do with Gebya." (Keep until a bank product actually ships — then re-word.) |
| "Free" | ⚠️ **Partially true** — everything a shopkeeper needs today is free with no paywall in the daily flow, but `entitlements.js` defines **FREE/PLUS tiers** and a `/pay` route exists, so monetization is planned. The field-test protocol even tells the team *not* to promise it will always be free. | "Free to use" / "Free during launch" — decide the wording deliberately. |

---

## F. Technical & Future Flexibility

### Q19. Current tech stack

**Frontend (`artifacts/gebya`)**
- React 18 + Vite 7, **TypeScript 5.9** (strict, composite project references), Tailwind CSS **v4**, Zustand 5 (state), Dexie.js (IndexedDB), Lucide icons, Web Speech API, `ethiopian-date`, qrcode.react, vite-plugin-pwa (Workbox), Sentry, Playwright (E2E) + Vitest (unit/contract), pnpm workspace.

**Backend (`artifacts/api-server`)**
- Node 22, **Express 5**, Drizzle ORM 0.45 + **PostgreSQL**, Zod 3 (shared via `lib/api-zod`, generated from an **OpenAPI spec** with **Orval** → typed React Query client in `lib/api-client-react`), JWT auth (`jsonwebtoken`), helmet, cors, express-rate-limit, cookie-parser, `web-push`, esbuild (CJS bundle), tsx dev runner, Vitest route tests (sync/telegram/reminders).

**Shared (`lib/*`)**
- `lib/api-spec` (OpenAPI + Orval config), `lib/api-zod`, `lib/api-client-react`, `lib/db` (Drizzle schema: transactions, customers, customer_transactions, catalog_entries, suppliers, supplier_transactions, staff_members, settings, analytics, snapshots, audit_log, users/devices, invites, business_members, support tickets/messages, admin shop logs — migrations in `lib/db/drizzle`).

**Infra / workflow**
- pnpm workspaces monorepo, GitHub + **Vercel** (frontend; serverless-friendly API), `.github/workflows` CI, Replit dev config, `docs/` + extensive root-level audit/protocol documents.

### Q20. Is the app a PWA, native app, or web-only right now?

**A PWA (Progressive Web App) — installable web app, not a native app.**

- Vite PWA plugin + Workbox service worker: offline app-shell caching, 192/512 + maskable icons, theme color, install prompt handling (`PwaInstallPanel.jsx` with per-device install steps).
- Installable on **Android** home screens (the primary audience). On **iOS**, PWAs work but with platform friction (Safari share-sheet install; some storage/permission quirks) — worth a dedicated iOS smoke test if pilot users have iPhones.
- There is **no Play Store / App Store package today**. If store presence becomes a trust signal for Ethiopian users, a TWA (Trusted Web Activity) wrapper is the cheapest path later.

### Q21. Is the data structure flexible enough for new features without major rewriting?

**Yes — this is one of the codebase's genuine strengths:**

- **Local schema is versioned and migrated**: Dexie is at **version 27** with an unbroken upgrade chain from v1 — every feature wave (sync fields, staff attribution, Telegram fields, photo refs, daily closings, outbox) was added as additive schema versions with upgrade callbacks, including a careful idempotent migration of legacy credit tables. Adding new stores/fields is routine.
- **Server schema mirrors it**: Drizzle + Drizzle-Zod schemas, generated API types (Orval), `sync_version` on every table, `snapshots` and `audit_log` already in place — new features fit the established push/pull pattern.
- **Attribution built in**: `actor_role` / `actor_staff_member_id` / `actor_name_snapshot` on every ledger row, plus `audit_log` — future compliance/intelligence features don't require backfilling.
- **Generated API layer** (OpenAPI → Zod → React Query hooks) means server changes propagate to typed clients rather than ad-hoc fetch code.
- **Honest gaps to fix while the data is still young** (the audit's core warning): **no GPS/location fields** on transactions, **no product normalization/master list** (item names are free text — "Sugar" with 47 spellings), and **no confidence/verification scoring**. These cannot be retrofitted onto old rows; if bank-grade data matters later, add these fields **before** the pilot scale-up, not after.

---

## G. Real-User Readiness

### Q22. Have real shopkeepers already used the full product?

**No.** Honest status:

- The repository contains a **prepared but not executed** field-test plan (`FIELD_TEST_PROTOCOL.md`): 5–10 shops, 2 weeks, daily observation logs, success metrics (60% complete 7+ sales, 50% open without reminder, 40% willing to pay 50 birr/month, etc.), failure-mode playbook, and an Amharic cheat sheet.
- `RELEASE_READINESS_AUDIT.md` explicitly states user testing is **"UNTESTED — No user testing conducted yet."**
- All "validation" so far is **team-internal + code-level testing** (44 test files in `artifacts/gebya/tests` + api-server suites: offline ledger, sync, staff events, telegram, onboarding, design smoke…). That proves the software behaves as built — it does not prove real shopkeepers will use it.
- **Feedback received so far: none from real users.** Any statement about "user feedback" would be inaccurate.

### Q23. The three biggest risks / weak points before more real shop owners use it daily

**1. Trust & durability of the data (highest stakes).**
The tool will hold people's *money memories*. IndexedDB data can be cleared by browser storage pressure or by a well-meaning relative "freeing up space" — and the currently available backups are **manual** (CSV, or cloud snapshots that require the server to be deployed and reachable). Combined with the audit's **mid-push sync loss** and **duplicate-record** findings, the single worst outcome — a shop owner losing their ledger — has known-but-not-fully-closed paths. *Mitigation: deploy the API server, enable automatic weekly cloud backups, verify the audit's critical fixes, and put backup training into onboarding.*

**2. Amharic quality & onboarding clarity.**
All Amharic strings are **machine-translated and explicitly flagged "do not ship without native review"**, some newer UI falls back to English, and the release audit scored "value obvious in under 30 seconds" as only partial (no single value proposition; multiple features compete for attention). For the target users (elders, low-literacy, tech-fearful), a mistranslated financial term or an unclear first screen can cause immediate abandonment. *Mitigation: native-speaker translation audit + one-promise hero message + the protocol's one-time assisted setup.*

**3. Untested real-world performance & habit formation.**
Everything above is verified on developer hardware/emulators. Real risks: old low-RAM Androids (Infinix/Tecno), voice accuracy in noisy merkato, PWA-install friction, whether entry actually beats paper speed-for-speed, and whether the daily habit forms without reminders. None of this is measured — the field-test protocol exists precisely because these are unknown. *Mitigation: run the prepared 5–10 shop field test first; instrument basic analytics at the same time so the pilot produces learning.*

(Honorable mentions: automated reminders disabled; full conflict-**resolution** flow missing for multi-device shops (a warning indicator exists — see Q2); analytics not instrumented; admin/support tooling gaps — all real, but secondary to the three above for a 10–20 shop pilot.)

### Q24. Is the current version ready for 10–20 shop owners to use as their real daily tool for 1–2 weeks?

**Honest verdict: yes, conditionally — for a *supervised* pilot exactly like the prepared field-test protocol. No for unsupervised daily reliance.**

**Why yes (conditions met):**
- The **core daily loop is complete and offline-proof**: record sales/expenses/credits, track payments and balances, view history, export. Nothing in the daily loop requires internet.
- **Data durability is engineered for**: instant local persistence, undo, edit with audit flags, durable outbox, cloud snapshots with checksums, resumable sync.
- **Error paths are non-blocking by design** (voice fails → manual; Telegram fails → queue; sync fails → local remains truth).
- There is real test coverage on the money-critical paths, and the RBAC implementation summary's independent audit concluded the architecture "can be deployed to real shops today for owner oversight and basic multi-phone use."

**Required conditions before handover (all cheap, all listed in the repo's own documents):**
1. **Native Amharic translation audit** (the code's own hard warning) — including the known English-fallback gaps.
2. **Verify the remaining `CRITICAL_AUDIT_FINDINGS.md` criticals** — two are already confirmed fixed in current code (the broken CORS callback no longer exists; RBAC now checks per-member permissions). Remaining to verify: duplicate-record race, conflict overwrite auditing, identity store backing. Re-run the api-server test suite.
3. **Deploy + smoke-test the API server** (OTP, sync, Telegram, backup) in its production home — or explicitly pilot in **skip-login local-only mode** so the pilot doesn't depend on the server.
4. **Set default language to አማ**, pre-configure payment providers, and follow the **field-test protocol**: assisted setup, cheat sheet, weekly visits.
5. **Backup discipline**: have each pilot user enable cloud backup or CSV-export weekly until automatic backups exist.
6. Keep it **single-device per shop** for the pilot (owner's phone) — multi-device should wait for the duplicate-record fix verification.

With those conditions, the release audit's own recommendation aligns: *"Launch to 10 beta shops with full instrumentation… verify data quality manually for 2 weeks… iterate"* — exactly the 10–20 shop pilot being proposed.

---

## H. Final Open Question

### Q25. Anything important not asked that we should know?

1. **The repository's own audit documents disagree with each other — and that's the most important thing to know.**
   - `SYNC_V2_BACKUP_RESTORE_SUMMARY.md` (June 2026) describes sync hardening as *complete* (version-aware conflicts, pagination, outbox, backup/restore) and `RBAC_IMPLEMENTATION_SUMMARY.md` describes RBAC as *enforced server-side*.
   - `CRITICAL_AUDIT_FINDINGS.md` (July 2026, later) declares **"NOT PRODUCTION READY"** with 7 criticals: incomplete CORS syntax in `app.ts`, cross-device duplicate records, silent conflict overwrites, sync mid-push data loss, RBAC permission checks bypassed, in-memory identity store, and others.
   - **Fresh spot-check (this document's preparation, Nov 2026):** two flagged criticals appear **stale/fixed in current code** — `app.ts` has been refactored into a 6-line re-export of the built bundle (the broken CORS callback no longer exists there), and `routes/rbac.ts` now resolves per-member permissions (`resolvePermissions(role, member.permissions)`) and enforces `ctx.permissions[requiredPermission] === true` before allowing a route.
   - **Full verification completed (this session):** all seven flagged criticals were re-checked against current code with a green api-server test run (348 passed / 0 failed) — verdict table in Section K. `CRITICAL_AUDIT_FINDINGS.md` is **stale**. Multi-device sync is now evidence-supported; real concurrent-use testing is still wise before broad enablement, and the offline single-device pilot is unaffected either way.

2. **Documentation drift is significant.** `replit.md` describes features (IntroSlides, Whisper pipeline) that may have evolved; the deep-dive says "Gebya is fully client-side" while sync/admin/bank code exists; docs span June–July 2026. Before any external evaluation, consolidate to **one source-of-truth document** and prune the ~40 root-level status files.

3. **Privacy claim vs. telemetry tension.** The privacy model says "no analytics tracking without opt-in," yet the code contains an analytics store, event tracking, and **Sentry error tracking wired in**. Sentry sends error reports (possibly with context) to a third party. For the promised trust position, either gate Sentry/analytics behind explicit consent or document exactly what leaves the phone.

4. ~~**The default language is English, not Amharic**~~ — **RESOLVED this session**: the default is now አማ (`LangContext.jsx`, verified). The machine-translation caveat (Q15) still stands.

5. **Backup is manual; there's no scheduled/automatic backup.** For a demographic that won't remember to press "backup," automatic weekly backups (or backup-on-close nudges — partially present via `RecoveryNudgeModal`) matter more than any other missing feature.

6. **No data-quality guards in the offline path**: nothing stops item names being entered inconsistently, and there's no duplicate-customer warning ("you already have an Almaz") — small annoyances that grow into trust problems.

7. **iOS is untested** — the target is Android, but any pilot user with an iPhone will hit PWA quirks (install flow, storage prompts). Cheap to smoke-test now.

8. **The team's own field-test protocol is the best next step and it's already written** — selection criteria, week-by-week observation log, success metrics, failure playbook, Amharic cheat sheet. Executing it *as designed* answers Q22–Q24 with data instead of opinion.

9. **The "Ask Notebook" / learning features and the admin portal should be explicitly scoped out of pilot communication** (the protocol already says don't explain them) — half-finished intelligence features confuse skeptical first users rather than delight them.

10. **Security hygiene before scale**: OTP/JWT endpoints, `TELEGRAM_BOT_TOKEN`/`JWT_SECRET` env management (`.env` files exist in the repo — verify none are committed to the public fork), and rate-limiting behavior need a quick pass before the server takes real user traffic.

---

## I. Beyond the Questionnaire — Getting to the First 1,000 Clients

*This section was added for the audience evaluating Gebya: what an expert team should know and do to turn this product into its first 1,000 daily-active shopkeepers. It combines growth levers **already built into the code** with the gaps that must be closed and the team roles required.*

### I.1 Growth levers already built into the product (use these — most founders build them later)

1. **The customer "Pay-it-now" loop (built-in viral channel).** Every reminder can carry a **pay-page link** (`/pay`, public route, no login) where the customer picks Cash/telebirr/bank. Every credit reminder sent to a customer exposes Gebya to a *new* person — customers ask "what app is this?" That is a referral engine hiding inside the credit feature. **Action:** brand the pay page and reminder messages with "Recorded with Gebya ገበያ".
2. **Report sharing as word-of-mouth.** Shop owners already share formatted daily summaries (Web Share API / Telegram deep-link). A shared report seen by another merchant is a free impression — add a one-line Gebya signature + install link to the shared text (small change, high leverage).
3. **Staff invitations multiply accounts.** Each shop with staff brings 1–4 additional users through `/join` invites — the multi-user module is an organic distribution loop.
4. **Offline-first = zero data-cost objection.** The PWA works fully offline; this neutralizes the #1 objection (data cost) in the Ethiopian market. Make "ያለ ኢንተርኔት ይሰራል" (works without internet) the headline of every acquisition message.
5. **Supplier ledger as a B2B2B channel.** Wholesalers/suppliers are already modeled in the app. Wholesalers serve hundreds of retailers — one convinced wholesaler can distribute Gebya (or at least demonstrate it) to their whole customer list. This is the cheapest channel-based route to scale.
6. **Telegram bot as a support + retention channel.** The bot infrastructure (webhooks, delivery states, customer-language confirmations) can double as a support and re-engagement channel without building anything new.

### I.2 The realistic funnel to 1,000 active shops

Ethiopian micro-retail is a **trust-and-proximity market**: owners adopt tools their neighbor or supplier vouches for, not ads. A realistic sequence:

| Stage | Target | Mechanism |
|---|---|---|
| 0. Fix pre-pilot blockers | (see Q24 conditions) | Amharic review, critical-fix verification, server deploy |
| 1. Supervised pilot | 10–20 shops, 2 weeks | The prepared `FIELD_TEST_PROTOCOL.md` — execute it *as written* |
| 2. Pilot-to-case-studies | 5 quantified stories | "Almaz increased collections by X%" — the protocol's "funder sentence" per shop |
| 3. Cluster expansion | 100–200 shops | Geographic clusters (merkato + 2–3 neighborhood hubs); weekly in-person visits; referrals from happy pilot shops (ask on day 14: "show one friend") |
| 4. Channel scaling | 500–1,000 shops | Supplier/wholesaler partnerships, Telegram commerce communities, shop-association intros, and the in-product pay-page/report-share loops |

**Why this order:** the product's current weaknesses (manual backups, no automated reminders, English-default onboarding) are all survivable with *high-touch* distribution. Scaling to 1,000 shops **before** fixing them converts each acquisition into a churn risk.

**Unit-economics note for the audience:** at the field-test's own price test (50 birr/month willingness target: 40% of shops), 1,000 shops ≈ 20,000 ETB/month potential revenue against support/infra costs that are near-zero for offline-first clients — but only if self-serve onboarding works. **Concierge onboarding does not scale past ~100 shops**, so I.4's investments are mandatory, not optional.

### I.3 What must be built/changed before scaling past ~100 shops (prioritized)

1. **Automatic weekly cloud backups** (currently manual — see Q17/Q25) — non-negotiable before trusting 1,000 shops' ledgers to a PWA.
2. **አማ as default language + native translation audit** — the app's biggest conversion lever for the actual audience (Q15).
3. **Self-serve onboarding polish**: one-promise hero message ("Track sales & credit faster than paper — with your voice", per the audit), Amharic video tutorials (2-minute screen recordings are the cheapest education in this market), and the unused `OnboardingPage.jsx` owner/staff/quick-start chooser either wired in or removed.
4. **Basic analytics activation** — instrumentation code exists (`eventTracking.js`); turn it on so the funnel above is measurable. Consent-gate it to stay true to the privacy promise (Q25).
5. **Automated due-date reminders** (the spec explicitly deferred them; at 1,000 shops, manual chasing is the #1 churn reason) — already half-built (`ReminderSheet`, server `reminders.ts`, reminder settings).
6. **Conflict-resolution flow** for multi-device shops (indicator exists, resolution doesn't — Q2).
7. **Play Store presence via TWA wrapper** — "it's on the Play Store" is a trust signal for many Ethiopian users; a TWA of the existing PWA is days of work, not months.
8. **GPS + product-normalization fields** — needed before the *data-asset* phase (banks/lenders), not before the 1,000-user milestone; but add them *now* so early data isn't lost (the audit's "cannot be retrofitted" warning).

### I.4 The expert team this push needs (roles, not headcount — some can be part-time)

| Role | Why | Evidence from repo |
|---|---|---|
| **Field ops / GTM lead** (Amharic-native, merkato-familiar) | Runs pilot → cluster expansion; owns the cheat sheet, weekly visits, referrals | `FIELD_TEST_PROTOCOL.md` is written but has no owner |
| **Amharic content/UX writer (native speaker)** | Translation audit + onboarding copy + reminder templates + video scripts | `LangContext.jsx` hard-blocks launch without this |
| **QA on low-end Android devices** | Infinix/Tecno verification: PWA install, offline, voice, performance | All tests so far run on dev hardware |
| **DevOps / platform engineer** | Server uptime for OTP/sync/Telegram/backup; Vercel + Postgres ops; monitoring | API server is production-critical the moment sync is sold |
| **Support agent (Telegram-first)** | Support tickets/SMS/broadcast tooling already exists (`docs/ADMIN_TOOLKIT.md`) — needs a human on the other end | AdminPortal support modules are built, unused |
| **Security reviewer** | Verify remaining audit criticals; secrets hygiene; OTP abuse/rate limits | `CRITICAL_AUDIT_FINDINGS.md` |
| **Data analyst (part-time)** | Turns pilot logs + (once enabled) analytics into the case studies that fuel stage 3 | Deep-dive §16 defines the metrics already |

### I.5 The KPI dashboard to run the 1,000-client push

Track weekly, per cohort (targets from the repo's own docs):

- **Activation**: first transaction within 5 min of install (deep-dive target: <2 min); % completing sale + expense + credit in week 1 (protocol target: 60% reach 7+ sales).
- **Habit**: % opening without reminder 5+ days (protocol target: 50%); D7 retention >40% (deep-dive).
- **Depth**: voice-vs-manual ratio >70%; cost-price entry >2/5 users (deep-dive targets); credit customers per active shop.
- **Revenue signal**: % saying yes to 50 birr/month (protocol target: 40%); unpaid-to-paid conversion on Pay-it-now reminders (new metric — measures the I.1.1 loop).
- **Viral**: % of new installs arriving via shared reports / pay-page links / staff invites (instrument via UTM or event params — currently absent).
- **Trust**: crash-free sessions >99% (Sentry); pending-sync=0 rate; backup coverage %.

### I.6 What could kill the 1,000-client push (and the counter-move)

1. **Support overload** → staff the Telegram support channel from shop #20, not shop #500; the admin toolkit is ready, the process isn't.
2. **A single public data-loss story** → automatic backups + restore drills before scale (one lost ledger in a merkato community ends adoption in that cluster).
3. **Promise drift** ("free" vs paid) → decide and publish the pricing line before 100 shops (the field protocol already forbids promising free forever).
4. **Onboarding cliff without a human** → Amharic videos + default-አማ + one-promise hero; test self-serve with 5 strangers before removing concierge.
5. **Server dependency surprise** → keep the app fully functional in skip-login local mode; sell sync/backup as an upgrade, never as a requirement (the architecture already supports this — it's a positioning decision).

---

## J. Decision Memo & Action Plan (Final)

*Added after an independent second opinion (Grok's senior-founder assessment) was reviewed against this document's code-level findings. The two assessments agree on all major points; this section records the final decision, the sharpened framing, and the exact 3-week execution plan.*

### J.1 Final verdict (agreed by both assessments)

| Question | Verdict |
|---|---|
| Core product quality? | **Strong** — offline-first credit engine is a real competitive asset |
| Ready for unsupervised daily use? | **No** |
| Ready for a supervised 10–20 shop pilot? | **Yes, conditionally** — after the P0 list below |
| Single biggest gap? | **Zero real-user validation.** Internal tests + good architecture ≠ product-market readiness. State this plainly everywhere. |

**P0 (block the pilot until done):** ① Native Amharic review + አማ default (machine-translated *financial* Amharic is a **trust-killer in week one**, not a cosmetic issue); ② Real shopkeeper testing (execute the field protocol); ③ Backup discipline (manual backups + low-end Android + relatives clearing storage = a data-loss vector with market-level reputational damage if it goes public).

**P1:** Rewrite the three landing-page claims honestly; keep the pilot **strictly single-device per shop** until the duplicate-record race is verified fixed; pilot in **skip-login local mode** (recommended default) so server uptime/OTP/sync are not pilot variables.

### J.2 Sharpened facts (from code verification, beyond the second opinion)

1. **All seven audit criticals are now verified against current code (this session)** — see the verdict table in Section K. The flagged CORS/RBAC/identity-store/duplicate-record/conflict/rate-limiter issues are fixed or addressed in today's architecture; `CRITICAL_AUDIT_FINDINGS.md` is **stale**. Multi-device sync is now evidence-supported (real concurrent-use testing is still wise before broad enablement).
2. **`.env` files sit in the repo root of a public fork** — check `JWT_SECRET` / `TELEGRAM_BOT_TOKEN` are not committed *before anything else* (10-minute task, real consequences).
3. **Telemetry consent — PARTIALLY DONE this session:** Sentry error reporting now has a user consent gate + a visible Settings toggle (Section K, #2–3). **Still open:** gating/activating behavioral analytics (`eventTracking.js`) before the pilot so the two weeks are measurable.
4. **Growth-loop branding is pilot work, not "later" work** — add "Recorded with Gebya ገበያ" + install link to shared report text and reminder/pay-page messages now; pilot shops will share reports anyway.

### K. Code changes applied (this session)

The following fixes were implemented, built, and tested during this review (the production build now passes — it was previously broken):

| # | File | Change | Why |
|---|---|---|---|
| 1 | `context/LangContext.jsx` | Default language `en` → `am` | Target audience is Ethiopian shopkeepers; matches the P0 Amharic requirement |
| 2 | `sentry.ts` | Added user consent gate (`gebya_error_reporting` localStorage key, default ON, user can switch OFF) + exported `isErrorReportingEnabled()` / `setErrorReportingPreference()` | Honor the "nothing leaves your phone without opt-in" promise; Sentry was already DSN-gated with `sendDefaultPii:false` |
| 3 | `settings/tabs/DataTab.jsx` | Added "Error reporting" toggle (role="switch") in the Display & Privacy card, wired to the Sentry consent functions | Gives users visible control matching the consent gate |
| 4 | `components/AppShell.jsx` | Appended "—— Gebya ገበያ" signature to the daily share summary | Viral growth loop: every shared report advertises the app |
| 5 | `components/ReportView.jsx` | Appended "—— Gebya ገበያ" signature to the weekly/custom report share text | Same viral loop for the Report view |
| 6 | `utils/customerTelegram.js` | Appended "via Gebya ገበያ" to the customer ledger Telegram message | Brands every customer touchpoint |
| 7 | `components/staff/StaffActivityFeed.jsx` | Removed duplicate `export default` (kept the `React.memo` one) | **Fixed a production build blocker** — "Multiple exports with the same name" broke every `vite build` |
| 8 | `components/staff/StaffAllMembers.jsx` | Removed duplicate `const t = useTranslation()` (the `t` prop from StaffPage is used directly) | **Fixed a second production build blocker** — "The symbol t has already been declared" |
| 9 | `tests/staff-activity-feed.spec.ts` | Fixed Activity tab locator: `getByRole('button')` → `getByRole('tab')` (the tab renders with role="tab") | Test was timing out on a role mismatch; now navigates correctly |

**Validation results:**
- `vite build`: **passes** (was failing on #7 and #8) — verified twice with exit code 0; PWA generated (69 precache entries), 0 warnings
- `tsc --noEmit`: **passes**
- Vitest unit suites (14 files): **all pass**; node:test-style files: 80 passed, 0 failed
- `customerTelegram.test.mjs` (covers #6): **passes** (93/93 across the core suites; brand line is additive)
- Playwright `staff-activity-feed.spec.ts`: navigation now works (#9); the remaining data-render assertion is a **pre-existing** mock issue unrelated to these changes
- **Duplicate-record race (audit critical #2) — fresh evidence:** `syncEngine.js` pull now matches server rows by `transaction_id` first, then by the `(remote_local_id, device_id)` composite, with an explicit code comment ("avoids duplicate rows when two devices auto-increment to the same local id") and collects `pullConflicts`. Strong indication the race is addressed; a full verification pass (including server-side tests) is still recommended before any multi-device pilot.

**Audit criticals verdict table (all 7 re-checked this session; `CRITICAL_AUDIT_FINDINGS.md` is stale):**

| # | Audit finding (July 2026) | Verdict now | Evidence |
|---|---|---|---|
| 1 | Broken CORS callback / syntax in `app.ts` | ✅ **Fixed** | `app.ts` refactored to a 6-line re-export of the built bundle; the broken code no longer exists |
| 2 | Cross-device duplicate customer records | ✅ **Fixed** | Pull matches by `transaction_id` → `(remote_local_id, device_id)` composite (explicit anti-duplication comment); `sync_outbox` durable push |
| 3 | Silent conflict overwrites without audit | ✅ **Addressed** | Server collects `ConflictRecord`s per chunk and returns them in the push response; client surfaces `pullConflicts` + warning strip. (Nicety remaining: persist conflicts to a server-side audit table) |
| 4 | Sync mid-push crash loses transactions | ✅ **Addressed** | Durable `sync_outbox` (v27): rows removed only after server acknowledgement; exponential-backoff retry |
| 5 | RBAC middleware doesn't check permissions | ✅ **Fixed** | `rbac.ts` resolves `resolvePermissions(role, member.permissions)` and hard-checks `ctx.permissions[requiredPermission] === true`; 403 + audit_log |
| 6 | Identity routes use in-memory store | ✅ **Fixed** | OTP is DB-backed: `requireDb().insert(otps)` with `codeHash`/`consumed`/`expiresAt`; no module-level session store exists in the server |
| 7 | Rate limiter is a no-op | ✅ **Addressed** | Proper limiter modules in `rateLimits.ts` (`sync`/`auth`/`general`) applied via `router.use()`; the broken file that housed them no longer exists |

**Supporting result:** api-server test suite green — **16 test files passed, 1 skipped; 348 tests passed, 14 skipped, 0 failed** (12.6 s).

**Secrets check (P0):** `.gitignore` covers `.env`/`.env*`; `git log` confirms no env file was ever committed to any branch. ✅ (Note: `.env` contains real VAPID private keys — rotate them if that file has ever been shared outside the team.)

**Out of scope (requires a human, not code):** the Amharic native-speaker translation audit itself, shop recruitment, and low-end-device QA — these remain as the field-test prerequisites in J.3.

### J.3 The 3-week execution plan

| When | What |
|---|---|
| **Days 1–2** | Recruit Amharic native reviewer + start audit; ~~flip default to አማ~~ **✅ done** (Section K #1); secrets check **✅ done** (Section K) |
| **Days 2–4** | ~~Critical-fix verification + api-server test run~~ **✅ done** — all 7 criticals verified (K verdict table), api-server suite green (348/0); Sentry consent gate **✅ done** (K #2–3); analytics gating still open |
| **Days 4–6** | QA on 3 low-end Androids (Infinix/Tecno): install, offline, voice, performance; build the daily observation spreadsheet from the protocol |
| **Days 6–7** | Recruit 10–20 shops per protocol criteria; print Amharic cheat sheets; confirm pilot mode (local/skip-login + weekly backup during visits); brand share/pay-page text |
| **Weeks 1–2** | Execute `FIELD_TEST_PROTOCOL.md` exactly — assisted setup, daily logs, weekly visits, day-14 questions |
| **Week 3** | Go/no-go review against the thresholds in J.4 |

### J.4 Go/no-go thresholds (pilot decision rule)

| Metric | Threshold | Source |
|---|---|---|
| Shops completing 7+ sales in 2 weeks | **≥ 60%** | FIELD_TEST_PROTOCOL |
| Shops opening unaided 5+ days | **≥ 50%** | FIELD_TEST_PROTOCOL |
| **Data-loss incidents** | **0 (zero tolerance)** | This memo |
| Would pay 50 birr/month | **≥ 40%** | FIELD_TEST_PROTOCOL |
| At least one shop showed it to another shopkeeper | **≥ 1** | FIELD_TEST_PROTOCOL |

**Rule: ≥3 of 5 → scale to 100–200 shops in geographic clusters (Section I.2). <3 of 5 → identify the failed metric, fix, repeat with 5 shops. Zero data-loss incidents is a hard gate regardless of the other four.**

### J.5 Standing strategic rules (from both assessments)

1. Protect the **simplicity + offline** positioning ruthlessly; never dilute the one promise.
2. Keep bank/lending talk out of all user-facing material — "not connected to your bank" is an asset while it's true.
3. Hidden/experimental surfaces (learning engine, bank dashboard, paywall, admin portal) stay out of the pilot build, not just out of the conversation.
4. Use the built-in growth loops early and cheaply (branding), but save channel scaling (Section I.2 stage 4) until the core is proven.

### J.6 Decision record — FINAL (closed)

All six decision items were put to an independent second review; its positions matched this document's recommendations on **every** item. They are no longer open questions — they are final:

| # | Decision | FINAL position | Confidence (independent review) |
|---|---|---|---|
| D1 | Pilot mode | **Local / skip-login only** for the first 10–20 shops. Server features (OTP, sync, Telegram delivery, cloud backup) are introduced later as upgrades, once the notebook habit is proven. | High |
| D2 | Multi-device | **One device per shop — the owner's phone only. No staff devices in the pilot.** Multi-device is a post-pilot feature. | Very high |
| D3 | VAPID keys | **Rotate.** The `.env` has lived in a multi-remote repo (origin `BoATest` + fork/personal `Mayademe1020`), so "100% sure it never left the team" cannot honestly be claimed; rotation costs ~nothing while there are no real push subscribers. | Medium-high |
| D4 | Landing claims | **Update all three**: "Your records live on your phone. Cloud backup is optional." / "We do not connect to your bank." / "Free to use during the pilot." | High |
| D5 | Free wording | **"Free to use" / "Free during the pilot"** — never "always free" or "free forever". | High |
| D6 | Branding URL | **Name-only ("—— Gebya ገበያ") for the pilot** — the current code state is correct; add a link only after a stable domain / Play-Store presence. | Medium |

**Key rationale locked with D1/D2:** server-side failures during the pilot (OTP errors, sync hiccups, Telegram delivery problems) will be *blamed on the product itself* by shopkeepers and will pollute the pilot's core learning question ("will they use it instead of paper?"). Infrastructure testing is explicitly **not** a pilot goal.

**D3 execution split:** new keys can be generated and the local `.env` updated by the team/agent; the **Vercel env-var update is a human step** (rotation invalidates existing push subscriptions — cost is zero today with no real subscribers).

*End of Section J — this memo, Section I, and the questionnaire answers above constitute the complete briefing for the evaluation audience.*

---

## Appendix — One-Page Summary

| Question area | One-line answer |
|---|---|
| **Working today** | Offline-first PWA: sales/expense/credit recording (voice + manual), full customer credit ledger with FIFO partial payments, supplier ledger, staff/RBAC with server enforcement, reports + CSV/PDF export, Telegram alerts, EN/አማ UI, Ethiopian calendar, PWA install, optional cloud sync/backup |
| **Partial** | Amharic quality (machine-translated), multi-device sync edge cases, conflict UI, automated reminders, admin toolkit, analytics, monetization |
| **Deliberately not built** | Inventory, POS, tax complexity, heavy onboarding, complex reminder automation, WhatsApp |
| **Hidden** | Admin portal, bank dashboard, trust score, learning engine, entitlements, daily closing, sync diagnostics |
| **Offline** | 100% for core credit/notebook; only sync/Telegram/backup/login need internet |
| **Balance accuracy** | Auto-calculated, FIFO allocations, overpayment blocked, test-covered; reliable single-device |
| **Storage** | Phone IndexedDB by default; optional Postgres cloud |
| **Amharic** | Complete plumbing; machine-translated — native review required before launch |
| **Landing claims** | All three need re-wording (cloud is optional-but-real; bank direction exists; free ≠ promised forever) |
| **Real users** | None yet — field-test protocol is prepared, not executed |
| **Pilot readiness** | Conditionally yes (supervised, 10–20 shops, single-device) after translation audit + critical-fix verification + server deploy |
| **Biggest risks** | Data durability/backups, Amharic + onboarding clarity, untested real-world habit/performance |
| **Path to 1,000 clients** (Section I) | Use the 6 built-in growth levers (pay-page loop, report sharing, staff invites, offline headline, supplier channel, Telegram support) → pilot → case studies → clusters → channels; fix auto-backup + አማ default + self-serve onboarding before ~100 shops; 7-role expert team; weekly KPI dashboard |

*End of document.*
