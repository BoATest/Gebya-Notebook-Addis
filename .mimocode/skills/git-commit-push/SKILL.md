---
name: git-commit-push
description: Standardized git status, stage, commit, and push workflow. Use before any commit operation.
---

# Git Commit & Push

Standardized workflow for staging, committing, and pushing changes. Works for both Gebya and EthioGrade projects.

## When to use
- After completing a set of related code changes
- When the user says "commit", "push", "save this", or "ship it"
- Before switching tasks to preserve work

## Workflow

### 1. Check status
```bash
git status
git diff --stat
```

### 2. Review changes
```bash
git diff
```
Verify: no unintended changes, no secrets/credentials staged.

### 3. Stage relevant files
```bash
git add <specific-files>
```
**Never** use `git add .` — always stage specific files to avoid committing temp files, build artifacts, or `.env`.

### 4. Verify staged content
```bash
git diff --cached --stat
```

### 5. Commit with descriptive message
```bash
git commit -m "<type>: <short-description>"
```

Message format:
- `fix:` — bug fix
- `feat:` — new feature
- `refactor:` — code restructuring
- `chore:` — maintenance, cleanup
- `docs:` — documentation only

### 6. Push
```bash
git push
# or for specific branch:
git push origin <branch-name>
```

## Key facts
- **Gebya production push**: `git push origin master` or `git push origin refactor/credit-page-ui-ux`
- **EthioGrade**: pushes to current branch directly
- **Never force-push** to shared branches
- **Never skip hooks** (`--no-verify`)

## Pre-commit checklist
- [ ] No `.env`, credentials, or API keys in diff
- [ ] Build passes (if applicable)
- [ ] Commit message is clear and follows convention
