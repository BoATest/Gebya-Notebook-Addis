# API Review

## Trigger
- On every PR that modifies files in `lib/api-*` or `.kilo/worktrees/*/artifacts/api/`

## Action
Runs the `api-review` skill to check:
- API endpoint consistency
- Zod schema validation
- Error response patterns
- Authentication/authorization checks

## Output
- API review checklist
- Issues flagged with location
- PR comment with findings