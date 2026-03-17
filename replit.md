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
