# Engineering Constitution

## Purpose
This file is the standing operating system for work in this repository.

Use it to:
- keep the product vision visible
- challenge weak assumptions
- prevent overbuilding
- choose the next highest-value task
- apply multi-role engineering quality standards
- break implementation into small, handoff-ready units

This is not a passive document. Treat it as the default lead engineer, product thinker, and quality gate for the project.

## Mission
Build a simple, trustworthy mobile notebook for Ethiopian retailers.

The product is successful when a shop owner can:
- add a customer in seconds
- record credit in seconds
- record payment in seconds
- understand who owes what without learning accounting

If a proposed change makes the app feel more like software than a notebook, stop and simplify.

## Product North Star
Optimize for trust, speed, and clarity.

Always protect these truths:
- minimal required input
- low-literacy friendly wording
- mobile-first interaction
- no accounting jargon unless unavoidable
- no forced Telegram, phone, or identity data
- transaction history is preserved, never overwritten

## Scope Guardrails
Build now:
- customer ledger
- credit and payment flows
- balance visibility
- optional Telegram connection
- optional post-transaction notification

Do not expand into:
- inventory systems
- POS complexity
- tax workflows
- reporting dashboards
- heavy automation
- reminder engines unless they are tiny, off by default, and clearly valuable

## Decision Rules
Before building, ask:
1. Is this solving the main user problem or adding decoration?
2. Can this be done with fewer fields, fewer screens, or fewer decisions?
3. Are we introducing complexity that belongs in a later phase?
4. Will a low-confidence user understand the action immediately?
5. Does this preserve trust if a network request or integration fails?

If the answer is unclear, prefer the smaller implementation.

## Overbuild / Underbuild Checks
If a task feels overbuilt:
- reduce options
- hide advanced fields behind progressive disclosure
- remove analytics or admin-style framing
- ship the manual version before automation

If a task feels too shallow:
- verify the full core workflow is actually complete
- verify balances, history, and non-blocking save behavior
- add missing product logic before adding polish

## Next-Thing Heuristic
Choose the next task in this order:
1. broken core flow
2. missing acceptance criterion
3. trust or data integrity risk
4. usability blocker in a high-frequency action
5. optional enhancement that supports the current scope

Do not jump to polish or side systems while a higher item is unresolved.

## Multi-Role Engineering Constitution
Every meaningful change should be examined through these roles.

### Product Lead
Focus:
- user outcome
- scope discipline
- clarity of workflow

Questions:
- does this solve a real user pain now
- is the flow simpler after this change
- does this keep the product inside the current mission

### Frontend Engineer
Focus:
- interface clarity
- interaction quality
- responsive behavior

Questions:
- is the primary action obvious
- is the mobile layout fast to scan and tap
- are loading, empty, and error states understandable
- are visual changes consistent with the product language

### Backend Engineer
Focus:
- correctness
- failure handling
- integration safety

Questions:
- are side effects controlled
- does the system behave safely on retries or partial failure
- are optional integrations truly optional

### Data Engineer
Focus:
- data shape
- migrations
- history integrity

Questions:
- is history preserved instead of overwritten
- are derived values computed from source-of-truth data
- will this change remain safe as records grow

### Performance Engineer
Focus:
- perceived speed
- rendering efficiency
- bundle and network cost

Questions:
- does this add unnecessary rerenders or heavy dependencies
- is the critical path still fast on a modest phone
- are we adding work the user will not feel value from

### Accessibility Specialist
Focus:
- usability for more people
- keyboard and screen-reader support
- readable, understandable interfaces

Questions:
- are labels, roles, and actions clear
- is contrast acceptable
- can the main flow work without precise tapping or hidden meaning

### Security Engineer
Focus:
- user trust
- data protection
- integration boundaries

Questions:
- are secrets handled safely
- are external calls minimized and scoped
- are we avoiding unsafe assumptions around user data and links

### QA Engineer
Focus:
- regression prevention
- edge cases
- observable behavior

Questions:
- what are the happy path, edge path, and failure path
- what can break from this change
- what should be tested manually or automatically

## Quality Gates
Do not call a task complete unless these gates are satisfied.

### Product Gate
- the change helps a real user outcome
- the scope remains disciplined
- the flow is simpler or more trustworthy, not just larger

### Frontend Gate
- mobile-first layout still works
- primary actions are visually clear
- empty, loading, and error states are handled
- wording is plain and user-friendly

### Backend Gate
- failure handling is explicit
- optional integrations do not block primary actions
- business logic is correct for normal and edge cases

### Data Gate
- source-of-truth data remains intact
- balance and derived values are computed correctly
- no destructive overwrite of ledger history

### QA Gate
- acceptance criteria touched by the change are checked
- edge cases are named
- tests or manual verification are recorded

### Performance Gate
- no obvious expensive work was added without reason
- the main task flow remains fast on mobile
- dependencies were kept lean

### Accessibility Gate
- controls are labeled
- interactions are understandable
- the UI does not depend only on color or hidden context

### Security Gate
- no secrets are hardcoded
- external integrations are scoped and non-blocking
- risky data handling is called out explicitly

## Team-of-20 Simulation
Before implementation, break work into small ownership slices.

Use this shape:

### Goal
State the user outcome in one sentence.

### Workstreams
- Product guardrail
- Data/model
- Core logic
- UI flow
- Messaging/integration
- Verification

### Smallest Tasks
Each task should have a clear finish line, for example:
- add missing field
- compute derived balance
- render history list
- add optional action after save
- handle failure without blocking save
- test partial payment flow

### Handoffs
Each task should name:
- input it depends on
- output it produces
- what task can start next after it completes

If two tasks can run independently, treat them as parallel.
If one task blocks another, finish the blocker first.

## Required Pre-Coding Task Brief
Before writing code for a meaningful task, fill this brief in the response or working notes.

### Task
What are we changing

### User Outcome
What gets better for the user

### Why Now
Why this is the highest-value next step

### In Scope
- what this task will do

### Out of Scope
- what this task will not do

### Risks
- data risk
- UX risk
- integration risk
- regression risk

### Affected Areas
- files
- components
- routes
- services
- data structures

### Smallest Safe Plan
1. inspect current path
2. make the minimum effective change
3. verify correctness and regressions

### Quality Checks
- Product:
- Frontend:
- Backend:
- Data:
- QA:
- Performance:
- Accessibility:
- Security:

### Verification
- automated checks
- manual checks

## Default Delivery Pattern
For implementation tasks:
1. inspect the current code paths first
2. fill the pre-coding task brief
3. identify the smallest safe change
4. implement core behavior before polish
5. verify acceptance criteria and regressions
6. summarize what changed, what remains, and the next most important task

## Current Gebya Priorities
Until the scope changes, bias toward:
- customer list clarity
- customer detail usefulness
- fast credit entry
- fast payment entry
- correct running balance
- optional Telegram connection that feels lightweight

Bias against:
- extra dashboards
- extra tabs
- business intelligence features
- complex onboarding
- settings-heavy experiences

## Merge Gate
Before calling work complete, confirm:
- the main retailer workflow is faster or clearer than before
- the implementation stayed inside scope
- the user can recover from mistakes
- failures in optional integrations do not damage trust
- the next most important unfinished thing is identified explicitly

## Reuse In Other Projects
You can reuse this file in other repositories.

When adapting it:
- rewrite Mission
- rewrite Product North Star
- rewrite Scope Guardrails
- rewrite Current Priorities
- keep the multi-role constitution
- keep the quality gates
- keep the pre-coding task brief
- keep the next-thing heuristic unless the project has a stronger one
