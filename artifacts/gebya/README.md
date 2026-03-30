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

Do one final smoke pass on the shipped build for:

- onboarding
- sale entry
- customer creation
- first credit
- second credit
- partial payment
- overpayment blocked
- Telegram connect sheet
- Settings opens

## Sentry verification on the shipped build

After deployment, open the shipped Gebya app in the browser console and run:

```js
window.__gebyaTestSentry()
```

Expected result:

- a Sentry event named `Gebya Sentry test error` appears in your Sentry project
- the event uses the expected environment and release values if you set them

## If Windows builds become required later

The smallest repo fix would be to:

1. stop excluding the Windows Tailwind oxide binding in `pnpm-workspace.yaml`
2. regenerate `pnpm-lock.yaml`
3. reinstall dependencies
4. rerun the Gebya build on Windows

That is intentionally out of scope for the current beta path.
