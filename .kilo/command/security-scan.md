# Security Scanning

## Trigger
- On every commit (via pre-commit hook)
- On every PR open (via CI)

## Action
Runs the `security-scanning` skill against changed files, focusing on:
- JWT token handling in `auth.ts`, `auth.js`
- RBAC permission checks in `rbac.ts`
- Secret detection in `.env` files
- SQL injection patterns in database queries

## Output
- Security findings with severity (critical/high/medium/low)
- Blocks commit if critical issues found
- PR comment with findings summary