---
name: gebya-build-deploy
description: Build Gebya frontend, verify, and push to Vercel production. Use after code edits to artifacts/gebya/src/.
---

# Gebya Build & Deploy

Build the Gebya React frontend and push to Vercel production via the `refactor/credit-page-ui-ux` branch.

## When to use
- After editing any file under `artifacts/gebya/src/`
- When the user says "build", "deploy", "push to vercel", or "make it live"
- Before starting a new feature to ensure a clean baseline

## Workflow

### 1. Build
```bash
pnpm run build
```
Workdir: `D:\Gebya-Notebook-Addis\artifacts\gebya`

Verify: build completes without errors (2050+ modules, ~16s).

### 2. Stage & Commit
```bash
git add <changed-files>
git commit -m "<type>: <description>"
```

Commit message conventions:
- `fix:` for bug fixes
- `feat:` for new features
- `refactor:` for code restructuring
- `chore:` for maintenance

### 3. Push to Vercel
```bash
git push origin refactor/credit-page-ui-ux
```

Vercel auto-deploys from this branch. No manual deploy step needed.

### 4. Merge to master (when ready for production)
```bash
git checkout master
git merge refactor/credit-page-ui-ux
git push origin master
```

## Key facts
- **Deployment branch**: `refactor/credit-page-ui-ux` (auto-deploys on Vercel)
- **Production branch**: `master` (manual merge when ready)
- **Build tool**: pnpm@10.28.0, vite v7.3.5
- **Root**: `D:\Gebya-Notebook-Addis`
- **Frontend**: `artifacts/gebya/`

## Error handling
- If `pnpm run build` fails, fix the error before pushing
- If Vercel deploy fails, check the Vercel dashboard for build logs
- Never force-push to `master`
