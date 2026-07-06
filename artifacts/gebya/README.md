# Gebya Beta Build

This document captures the current release-ready build path for the Gebya beta.

## Current build status

- `pnpm --dir artifacts/gebya typecheck` passes.
- `pnpm --dir artifacts/gebya build` does **not** currently work on this Windows workspace.
- The blocker is **not** a Gebya app-code failure. The build fails while loading Tailwind's native binding through `@tailwindcss/oxide`.

## Exact blocker

The workspace currently resolves `@tailwindcss/oxide` to Linux optional bindings in `pnpm-lock.yaml`, while the Windows binding is excluded in `pnpm-workspace.yaml`.

On Windows, the Gebya build fails before bundling with an error like:

```text
Error: Cannot find native binding
```

Because of that, Windows should not be treated as the release build environment for the current beta.

## Required release environment

Use a clean Linux x64 environment with:

- Node.js 20 or newer
- pnpm
- the exact commit you plan to ship to testers

Optional Sentry environment variables for the shipped beta build:

- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_RELEASE`
- `SENTRY_SOURCE_MAPS=true` only if you want Vite to emit source maps during build

## Exact build steps

From the repo root in Linux:

```bash
pnpm install --frozen-lockfile
PORT=4173 BASE_PATH=/ pnpm --dir artifacts/gebya build
```

The production build output is written to:

```text
artifacts/gebya/dist/public
```

## What to ship

Use the build generated from the exact commit you intend to share with testers.

For the current release path:

- deploy the safer API changes from this branch
- keep Telegram available as a manual contact fallback
- do not rely on QR bot linking in stateless Vercel deployments unless persistent Telegram session storage is added
- if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` are configured, linked customers can still receive bot updates after sync, but new QR link sessions should be treated as unavailable unless storage is durable

Do one final smoke pass on the shipped build for:

- onboarding
- sale entry
- customer creation
- first credit
- second credit
- partial payment
- overpayment blocked
- Telegram connect sheet
- Telegram manual fallback save
- Settings opens

## Telegram deployment note

The current branch intentionally favors trust over feature breadth.

- Automatic Telegram QR linking is gated by backend session storage safety.
- On stateless deployments such as Vercel serverless without durable Telegram session storage, the UI should fall back to manual Telegram contact instead of presenting QR linking as reliable.
- This is the expected behavior for the current release.
- Persistent storage can be added in a later pass if QR linking becomes a must-have.

## Sentry verification on the shipped build

After deployment, open the shipped Gebya app in the browser console and run:

```js
window.__gebyaTestSentry()
```

Expected result:

- a Sentry event named `Gebya Sentry test error` appears in your Sentry project
- the event uses the expected environment and release values if you set them

## Phase 2 changes (this commit)

### A. Voice removed
- Deleted 5 orphaned voice components/hooks (VoiceRecordScreen, VoiceResultScreen, VoiceFixScreen, VoiceButton, useSpeechRecognition)
- Deleted 2 voice test files
- Removed ~130 voice i18n keys from LangContext.jsx (EN, Ge'ez, Amharic)
- Removed `voice_note` fallback from staffEventSync.js
- DB schema fields retained for historical compatibility (no new voice data collected)
- `/api/transcribe` backend endpoint is soft-disabled (no API key → 503 stub). **Hard-remove pending** in api-server repo before funder demos.

### B. Learning loop (the app learns your business)
- **Bug fixes:** Fixed `is_active` vs `active` filter (was no-op), unified `last_unit_price`/`last_price` field naming, unified `last_used`/`last_used_at` naming
- **Suggestion acceptance tracking:** Records shown/accepted/rejected per catalog entry. Items rarely accepted when shown get downweighted in ranking.
- **Price clustering:** Stores last 50 price observations per item, computes typical price via IQR outlier detection. Damaged-goods sales don't override typical price.
- **Cross-spelling normalization:** Bigram similarity (Dice coefficient, threshold 0.6) for Amharic/Latin/mixed script. "Injira"→"Injera" (0.60), "Injeara"→"Injera" (0.73), "Beyainetu"→"Beyaynetu" (0.75).
- **Surfaced insights:** Dashboard strip shows "You sell X mostly in the morning" patterns based on time-of-day analysis.
- **New files:** `learningEngine.js`, `LearningInsights.jsx`
- **DB schema v21:** Added `suggestion_log` table, `cross_shop_unmatched` table, catalog_entries fields

### C. Behavioral trust score
- Two scores per shop: `data_integrity_score` (device consistency, edit frequency, photos, actor clarity) and `business_health_score` (repayment consistency 40%, credit health 30%, revenue stability 30%)
- Repayment consistency is a real computed factor: checks if credit customers have paid >= 50% of their credit
- Overdue customer flags: Customers with 60+ days overdue and no repayment pattern are flagged in the credit view
- Weights are config-driven (stored in `settings` table, overridable without code deploy) with hardcoded defaults
- Raw factor inputs stored for later recalibration
- **New files:** `trustScore.js`, `OverdueCustomerFlags.jsx`

### D. Sync conflict logging
- Conflict events now logged to `settings` table (key: `conflict_log_YYYY-MM-DD`)
- Stores timestamp, message, table name, record count, changed fields
- Keeps last 50 events per day for frequency analysis

### E. Monetization infrastructure
- `plan_tier` field (free/plus) on shop record
- `hasEntitlement()` check wired to plausible future-premium features
- `computeImpactMetrics()` for grant/NBE/DFI conversations (shops onboarded, transaction volume, credit tracked, recovery rate)
- No paywall, no payment gateway, no bank-facing API
- **New files:** `entitlements.js`, `AdminMetricsView.jsx`

### F. Analytics & Admin dashboard
- Voice events removed from event schema
- Learning loop events tracked in `suggestion_log` table
- Cross-shop curation queue: `cross_shop_unmatched` table + `CrossShopCurationQueue.jsx` component
- Admin section in Settings page with metrics and curation queue
- **New files:** `CrossShopCurationQueue.jsx`

### Pre-existing api-server typecheck errors
87 errors across 7 test/route files — NONE introduced by this pass. All in files untouched by Phase 2.

## If Windows builds become required later

The smallest repo fix would be to:

1. stop excluding the Windows Tailwind oxide binding in `pnpm-workspace.yaml`
2. regenerate `pnpm-lock.yaml`
3. reinstall dependencies
4. rerun the Gebya build on Windows

That is intentionally out of scope for the current beta path.
