# Implementation Instructions for Codex

## Operating Mode
Read the existing codebase first and do not code immediately.

Use `AGENTS.md` as the standing engineering constitution. It defines the mission, scope guardrails, challenge rules, quality gates, and the required pre-coding task brief.
Use `TASK_BRIEF_TEMPLATE.md` when you need a clean standalone format for the pre-coding brief.
Use `PROJECT_TEMPLATE.md` when creating the same operating system in another repository.

Start by:
1. identifying the files/components/routes/services related to customer records, transactions, and messaging
2. filling the pre-coding task brief from `AGENTS.md`
3. proposing the smallest safe implementation plan for this feature
4. listing assumptions and risks
5. then proceeding with implementation without asking unnecessary clarification questions

## Build Rules
- make scoped changes only for this feature
- do not expand into inventory, POS, tax, or analytics
- prefer reuse of existing components and patterns
- keep the UI mobile-first and fast
- required fields must stay minimal
- advanced fields should be hidden under progressive disclosure
- Telegram must stay optional

## Telegram / QR Guidance
For QR generation, use a standard library such as:
- react-qr-code
- qrcode
- qrcode.js

Generate a bot deep link like:
t.me/YourBot?start=...

Do not build a custom QR engine.

## Technical Expectations
- use transaction ledger entries instead of overwriting balances
- compute current balance from transactions
- preserve transaction history
- support search by display_name and note
- keep message sending non-blocking
- handle Telegram errors gracefully

## Requested Execution Order
1. review the current codebase and identify affected files
2. produce a short implementation plan
3. implement database/model updates
4. implement UI updates
5. implement Telegram integration points
6. add validation and error handling
7. run lint/typecheck/tests/build if available
8. summarize what was changed, what remains, and any risks

## Output Format
- first show the implementation plan
- then make the code changes
- then show a concise changelog
- then show follow-up recommendations under:
  - must do next
  - good later
