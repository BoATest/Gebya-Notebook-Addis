# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (shared api-server)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### `artifacts/gebya` — Gebya Business Notebook App (primary artifact)

Mobile-first PWA for Ethiopian small shop owners. Serves at path `/`.

**Features:**
- **3-step intro slides** (IntroSlides.jsx): shown only to first-time users before onboarding. Explains the app concept across 3 colorful slides (business notebook → profit visibility → 3 buttons). Writes `intro_seen` flag to IndexedDB on dismiss/complete.
- **Empty state on Today tab**: When no entries exist for the day, shows a 📒 icon, descriptive text, and an amber hint arrow pointing at the ሸጠሁ button.
- **Undo toast on record**: After any transaction is saved, a 4-second toast fires with an Undo button. Tapping Undo deletes the transaction (and credit record if applicable) and fires a "Undone ✓" confirmation toast. Toast.jsx now supports optional `onUndo` callback.
- **Raised physical action buttons**: ሸጠሁ / ወጪ / ብድር buttons now use a 5px box-shadow and `translateY(5px)` + `boxShadow: none` on press (via `onPointerDown`/`onPointerUp` state) for a satisfying tactile feel on mobile.
- **Text status badges on Mero list**: Each credit row now shows a text badge — OVERDUE (red), DUE SOON (amber/red), or OK (green) — replacing the color-only dot.
- Today screen: profit/sales summary with privacy toggle (hidden by default, auto-hides after 30s)
- I Sold / I Spent / Credit (ብድር) entry forms with modal interface
- Payment type chips: Cash / Bank / Wallet with provider sub-chips (CBE, Dashen, Awash, Abyssinia / telebirr, CBE Birr)
- Save-and-add flow: after saving sale/expense, success screen offers "Add another" (resets form, keeps payment type) or "Done"
- Credit direction: ያበደርኩት (they owe me) vs የተበደርኩት (I owe them) — shown as badge in ብድር list
- Edit any transaction: tap pencil icon in Today's Entries, or "Edit this entry" in History detail sheet → pre-filled EditTransactionSheet
- Recurring expenses: define quick-fill shortcuts in Settings, appear as chips in expense form
- Payment Methods settings: enable/disable each bank and wallet; only enabled ones appear as chips
- True profit calculation: (selling price - cost price × quantity), cost optional under "Advanced"
- ብድር credit tracking with partial payments, urgency color coding, direction badges
- History view with per-day/week summaries; edited entries tagged with "edited" label
- Ethiopian calendar date display (e.g. "8 መጥቅ 2019")
- Voice input via Web Speech API (Amharic locale, fallback graceful)
- 100% offline — all data in IndexedDB via Dexie.js v3 schema, no backend needed
- **Quick Profit Calculator**: Calculator icon in action bar opens modal — enter cost/sell price, shows live profit + margin %
- **Top Products Leaderboard**: Top 3 sold items today shown with trophy icons between action bar and entries
- **7-Day Sales Sparkline**: Pure CSS bar chart for last 7 days above entries, today's bar highlighted
- **Best-Day Celebration**: Toast fires when today's sales first exceed all-time best (tracked in IndexedDB, fires once per record break)
- **Achievement Badges**: 5 milestones (First Sale, 7-Day Streak, 1k Birr Day, 50 Transactions, First Credit Repaid) stored in IndexedDB; toast on unlock; badge strip in Settings
- **Any-Time Report Share**: Share button on Today tab generates formatted text summary; uses Web Share API with Telegram deep-link fallback; Telegram username field in Settings > Shop Profile
- **Usage Insights on Home**: Streak + days active + total entries row now appears on Today tab; removed from Settings
- **🔥 Streak chip in header**: Always-visible streak indicator in the header
- **Bold shop name in header**: Shop name shown in bold white, prominent size
- **EN/አማ Language toggle**: Header pill button switches all static UI strings between English and Amharic; persisted in localStorage
- **Translation context**: LangContext with full EN and Amharic string maps; Amharic translations marked for native-speaker review

**Tech stack:**
- React + Vite + Tailwind CSS (v4)
- Dexie.js (IndexedDB wrapper)
- ethiopian-date library
- Lucide React icons

**Key files:**
- `artifacts/gebya/src/App.jsx` — main app shell, state, tab routing
- `artifacts/gebya/src/db.js` — Dexie database schema
- `artifacts/gebya/src/components/` — all UI components
- `artifacts/gebya/src/utils/ethiopianCalendar.js` — date conversion utilities

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (shared backend)
│   ├── gebya/              # Gebya business notebook PWA (PRIMARY)
│   └── mockup-sandbox/     # Design mockup preview server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server (not used by Gebya MVP — Gebya is fully client-side).

### `artifacts/gebya` (`@workspace/gebya`)

The primary artifact. React + Vite PWA. No backend dependency. All data stored in IndexedDB.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL (used by api-server, not by gebya).
