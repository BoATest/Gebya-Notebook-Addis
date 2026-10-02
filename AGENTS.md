# AGENTS

Keep updates grounded in current repo manifests, `artifacts/gebya/README.md`, and verified source references.

## Workspace commands

Run these from the repo root:

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

- `pnpm run typecheck` runs `typecheck:libs` first, then package typechecks under `artifacts/*` and `scripts`.
- `pnpm run build` reruns root typechecks, then runs package builds where a `build` script exists.
- Keep `allowBuilds.esbuild: true` in `pnpm-workspace.yaml`; pnpm 11 otherwise skips the esbuild native build.

## Scoped package commands

Frontend (`artifacts/gebya`):

```bash
pnpm --filter @workspace/gebya run dev
pnpm --filter @workspace/gebya run serve
pnpm --filter @workspace/gebya run typecheck
pnpm --filter @workspace/gebya run lint:i18n
pnpm --filter @workspace/gebya run check:orphans
pnpm --filter @workspace/gebya run test:permissions
pnpm --filter @workspace/gebya run test:e2e
pnpm --filter @workspace/gebya run test:design-smoke
pnpm --filter @workspace/gebya run test:staff-events
pnpm --filter @workspace/gebya run test:staff-activity
pnpm --filter @workspace/gebya run test:settings-grouped
```

API (`artifacts/api-server`):

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/api-server run build
```

Scripts package:

```bash
pnpm --filter @workspace/scripts run typecheck
```

## Frontend smoke workflow

Run `pnpm --filter @workspace/gebya run test:design-smoke` before PRs that affect onboarding, owner home, Settings, Team & Staff, Report, staff identity, sync, or navigation. It captures screenshots for onboarding, owner home, Settings, Team & Staff, and Report; include those screenshots in the PR notes when the rendered merchant UI is affected.

For the grouped Settings experience, run `pnpm --filter @workspace/gebya run test:settings-grouped`. The test covers owner and staff permission states, setup-state variants, and the default-off feature flag.

Keep merchant-facing surfaces polished and local-first. Preserve offline, bank/payment safety, and manual Telegram-contact fallback copy; do not present Telegram QR linking as reliable without durable session storage.

## CI and build notes

- CI uses pnpm 11, Node 22, and `pnpm install --frozen-lockfile`.
- API source changes require rebuilding and committing `artifacts/api-server/dist/index.mjs`; CI runs `node ../gebya/scripts/check-dist-stale.mjs` from `artifacts/api-server` to reject a stale committed bundle.
- `artifacts/gebya/vite.config.ts` writes the production frontend build to `artifacts/gebya/dist/public`.
- `artifacts/gebya/README.md` is the source of truth for release builds. Windows is not the current release-build path because Tailwind native binding resolution fails before bundling.
- Use a clean Linux x64 environment for the beta build:

```bash
pnpm install --frozen-lockfile
PORT=4173 BASE_PATH=/ pnpm --dir artifacts/gebya build
```

- The manual Supabase backup workflow requires the `SUPABASE_BACKUP_URL` secret and retains its `gebya-backup` artifact for three days.

## Verified environment notes

- Frontend code reads `VITE_API_BASE_URL` and `VITE_TELEGRAM_BOT_USERNAME`.
- Sentry wiring reads `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE`, and optional `SENTRY_SOURCE_MAPS=true`.
- Bot delivery requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`; durable Telegram sessions support either `KV_REST_API_URL` / `KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.

## Post-deploy check

In the shipped app's browser console, run:

```js
window.__gebyaTestSentry()
```
