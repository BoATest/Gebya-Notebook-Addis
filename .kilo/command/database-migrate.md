# Database Migration

## Trigger
- After merge to `main` (via post-merge hook)
- When schema files change in `lib/db/`

## Action
Runs the `database-migration` skill to:
1. Validate drizzle migration files
2. Check for backward-compatible changes
3. Verify rollback scripts exist
4. Update `0001_sync_v2.sql` through latest migration

## Output
- Migration safety report
- Rollback plan if breaking changes detected
- Blocks merge if migrations are unsafe