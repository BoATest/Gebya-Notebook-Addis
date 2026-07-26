# Gebya Automation Map

## How Skills Trigger Automatically

This file documents how skills in `~/.agents/skills/` are wired to fire automatically via git hooks and CI events in the `.kilo/command/` directory.

---

## Event → Skill Mapping

| Git Event | Hook | Skills Triggered | What It Does |
|---|---|---|---|
| `pre-commit` | `.git/hooks/pre-commit` | `code-quality-scoring`, `security-scanning`, `vitest` | Scores changed code quality, scans for security issues, runs unit tests on changed files |
| `pre-push` | `.git/hooks/pre-push` | `playwright`, `accessibility-testing`, `test-driven-development` | Runs E2E browser tests, a11y audit on UI components, enforces test-first for new code |
| `post-merge` | `.git/hooks/post-merge` | `database-migration`, `drizzle` | Validates drizzle migrations after pull, checks for schema drift |
| `PR Open` | GitHub Actions CI | `api-review`, `vercel-networking-domains`, `web-performance-optimization`, `cicd-pipeline-generator` | Reviews API changes, validates Vercel config, checks performance budget |
| `Push to main` | GitHub Actions CI | `deploy-check` | Full deploy readiness: Vercel patterns, edge caching, perf, CI config |

---

## Skill Categories & When They Fire

### Development-Time (pre-commit)
- `code-quality-scoring` — Every commit gets a quality score (0-100). Blocks commit if score < threshold.
- `security-scanning` — Scans changed files for JWT/auth/secret patterns. Blocks commit on critical findings.
- `vitest` — Runs unit tests for changed files only (fast).

### Pre-Deploy (pre-push)
- `playwright` — Full E2E test suite in browser. Blocks push if tests fail.
- `accessibility-testing` — Scans changed UI components for WCAG issues.
- `test-driven-development` — Validates new code has corresponding tests.

### Post-Merge (post-merge)
- `database-migration` — Validates drizzle migrations are safe and backward-compatible.
- `drizzle` — Checks for schema drift between DB schema and code.

### CI Pipeline (on push/PR)
- `api-review` — Reviews API route changes for consistency.
- `vercel-networking-domains` — Validates Vercel config, edge/caching patterns.
- `web-performance-optimization` — Audits bundle size and LCP score.
- `cicd-pipeline-generator` — Ensures deploy config is current.
- `deploy-check` — Final deploy readiness gate.

---

## Configuration

### Execution Policy
On Windows, PowerShell hooks require execution policy bypass. The hook scripts use:
```
powershell -ExecutionPolicy Bypass -File .kilo/hooks/pre-commit.ps1
```

### Skill Location
All installed skills are in `C:\Users\25191\.agents\skills\<skill-name>\`.

### Command Definitions
Each command trigger is documented in `.kilo/command/<trigger-name>.md`.

---

## Current Installed Skills (28)

### Core Dev (7)
vercel-react-best-practices, typescript-advanced-types, playwright, vitest, drizzle, test-driven-development, database-migration

### Quality (3)
code-quality-scoring, security-scanning, accessibility-testing

### DevOps (4)
git-advanced-workflows, github-actions, web-performance-optimization, cicd-pipeline-generator

### Platform (1)
vercel-networking-domains

### Design (6)
accessibility, prd-writer, frontend-design, generate-design, generate-prototype, onboarding

### Platform/Bot (3)
telegram-bot-builder, telegram-mini-app, mobile-app-testing

### Workflow (2)
requesting-code-review, find-skills

### API/Review (1)
api-review