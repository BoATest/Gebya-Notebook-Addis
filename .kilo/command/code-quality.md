# Code Quality Scoring

## Trigger
- On every commit (via pre-commit hook)
- On every PR open (via CI)

## Action
Runs `npx skills add bobmatnyc/claude-mpm-skills@code-quality-scoring` or invokes the skill's scoring logic against the changed files.

## Output
- Quality score (0-100) logged to `.kilo/plans/`
- Issues flagged with severity
- PR comment with score summary