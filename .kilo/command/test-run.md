# Test Execution

## Trigger
- On every commit (via pre-commit hook) — unit tests only
- On every push (via pre-push hook) — full test suite (unit + E2E)

## Action
Runs:
1. `vitest` (unit tests) — fast, targeted to changed files
2. `playwright` (E2E tests) — full browser test suite
3. `test-driven-development` skill to ensure new code has tests

## Output
- Test pass/fail summary
- Coverage report in `.kilo/plans/`
- Blocks push if E2E tests fail