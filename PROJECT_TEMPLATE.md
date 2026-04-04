# Project Constitution Template

Use this file to create a new `AGENTS.md` for another repository.

Instruction:
- replace every bracketed placeholder
- delete sections that do not fit the product
- keep the multi-role constitution, quality gates, and task brief unless you have a stronger system

## Purpose
This file is the standing operating system for work in this repository.

Use it to:
- keep the product vision visible
- challenge weak assumptions
- prevent overbuilding
- choose the next highest-value task
- apply multi-role engineering quality standards
- break implementation into small, handoff-ready units

## Mission
Build [product name] for [target users].

The product is successful when users can:
- [primary outcome 1]
- [primary outcome 2]
- [primary outcome 3]

If a proposed change moves the product away from its core job, stop and simplify.

## Product North Star
Optimize for:
- [principle 1]
- [principle 2]
- [principle 3]

Always protect these truths:
- [truth 1]
- [truth 2]
- [truth 3]

## Scope Guardrails
Build now:
- [in-scope item 1]
- [in-scope item 2]
- [in-scope item 3]

Do not expand into:
- [out-of-scope item 1]
- [out-of-scope item 2]
- [out-of-scope item 3]

## Decision Rules
Before building, ask:
1. Is this solving the main user problem or adding decoration?
2. Can this be done with fewer fields, fewer screens, or fewer decisions?
3. Are we introducing complexity that belongs in a later phase?
4. Will the intended user understand the action immediately?
5. Does this preserve trust if data, network, or integration behavior fails?

If the answer is unclear, prefer the smaller implementation.

## Overbuild / Underbuild Checks
If a task feels overbuilt:
- reduce options
- hide advanced behavior unless it is truly needed
- ship the manual version before automation

If a task feels too shallow:
- verify the full core workflow is complete
- verify data integrity and failure behavior
- add missing product logic before polish

## Next-Thing Heuristic
Choose the next task in this order:
1. broken core flow
2. missing acceptance criterion
3. trust or data integrity risk
4. usability blocker in a high-frequency action
5. optional enhancement that supports the current scope

## Multi-Role Engineering Constitution
Review meaningful changes through these roles:
- Product Lead
- Frontend Engineer
- Backend Engineer
- Data Engineer
- Performance Engineer
- Accessibility Specialist
- Security Engineer
- QA Engineer

For each role, define:
- focus
- core questions
- what failure looks like

## Quality Gates
Do not call a task complete unless these gates are satisfied:
- Product Gate
- Frontend Gate
- Backend Gate
- Data Gate
- QA Gate
- Performance Gate
- Accessibility Gate
- Security Gate

For each gate, define the minimum standard.

## Team-of-20 Simulation
Before implementation, break work into:
- Goal
- Workstreams
- Smallest Tasks
- Handoffs

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

## Current Priorities
Bias toward:
- [priority 1]
- [priority 2]
- [priority 3]

Bias against:
- [anti-priority 1]
- [anti-priority 2]
- [anti-priority 3]

## Merge Gate
Before calling work complete, confirm:
- the main user workflow is better than before
- the implementation stayed inside scope
- the user can recover from mistakes
- failures do not damage trust
- the next most important unfinished thing is identified explicitly
