# R2 Plan — sliced delivery, DoD, and Gate D addendum

Owner directive recorded 2026-09-16 (post-ee06a6c). Supersedes the big-bang R2
approach. R2 code starts only when Gates B–D land (order B → C → D).

## Gate D scope (final, one PR)

1. `telegramIntentParser` no-arg/Unknown branch crash fix + unit test
   (reminder pipeline must not crash silently).
2. Staff 0/3 hide from the plan row (R1 leftover; show tx 0/500 only until
   the limit is enforced).
3. **`setup_completed_at`** — timestamp written to shop settings when the
   setup checklist reaches 5/5. Rides the existing backup/sync (backup JSON
   already includes `settings`). Exists to make the R2 success metric
   (setup completion / Ready-%) measurable BEFORE the redesign ships.

   **Ruling 1 (owner):** immutable — first stamp wins.
   - Write-if-null only (restore-safe: a restored old backup can never
     clobber a real timestamp).
   - **Backfill-on-encounter:** hook the existing readiness computation —
     if 5/5 && `setup_completed_at == null` → stamp now. Existing completed
     shops must be captured; immutable alone would undercount everyone
     pre-Gate-D.

   **5/5 definition (FIX FIRST, owner-ruled):** exactly the five checks in
   `ReadinessHero.jsx:14-46` — profile name, shop phone, payment channel
   configured, ≥1 active catalog item, ≥1 recurring expense. The metric's
   definition = the checklist's definition; they must never diverge. (An
   earlier labels draft invented different items — replaced; see
   R2-LABELS-DRAFT "Setup checklist items — REAL source of truth".)

### Gate D status — LANDED (working tree; commit + deploy pending owner)

1. **Parser** — `telegramIntentParser.ts` is a total function (no-arg/null
   boundary returns well-formed Unknown; duplicated Amharic branch replaced
   with «ከፈልኩ»). 14 unit tests in `src/services/__tests__/telegramIntentParser.test.ts`.
   api-server suite: 369 passed / 0 failed; typecheck + build green.
2. **Staff quota row hidden UNCONDITIONALLY on the free plan** —
   `PlanPanel.jsx` renders it only via `shouldShowStaffQuota()`
   (`utils/entitlements.js`): false for every finite `max_staff` regardless
   of staffCount (the "2/3" case is a trust bug exactly like "0/3" — the
   limit is not enforced), true only for Plus/Infinity. Tx 0/500 stays
   visible (that quota IS enforced). Guarded twice: unit test in
   `tests/setup-readiness.spec.ts` (staffCount=2 → hidden) + rendered smoke
   in `tests/design-regression-smoke.spec.ts` (Money tab: Free Plan visible,
   `0/3` absent, `0/500` visible).
3. **`setup_completed_at`** — single definition in
   `gebya/src/utils/setupReadiness.js` (computeSetupChecklist = exactly the 5
   ReadinessHero checks; stamp = write-if-null, immutable, backfill-on-
   encounter). ReadinessHero consumes it and stamps on encounter; 12 unit
   tests in `tests/setup-readiness.spec.ts`.

Deploy note: `api-server/dist/index.mjs` is committed BY DESIGN (Vercel
skips install; `api/[...route].ts` imports the bundle). The committed bundle
had gone stale (predated the parser); it was rebuilt and verified current —
this PR MUST include the rebuilt `dist/index.mjs`. Re-run
`pnpm build` + `node ../gebya/scripts/check-dist-stale.mjs dist/index.mjs`
before every api-server deploy.

## Rulings for R2.1 (owner)

- **Ruling 2:** R2.1 ships **byte-identical strings**. Term decisions
  (More/Settings, Credit (Dubie), locked-on wording, `መጠባበቂያ`) land strictly
  AFTER — tiny labels PR or R2.2.
- **Merkato session gates R2.2, NOT R2.1** — critical path to first visible
  value is B → C → D → R2.1.
- **R2.1 proof of "invisible refactor":** before/after screenshots asserted
  pixel-identical, included in the R2.1 PR.
- **Pre-ruling (ratify in Merkato session):** nav tab stays "More"/`ተጨማሪ`;
  page title is "Settings"/`ማስተካከያ`; toasts reference the title
  ("Settings → Plan"). Two levels, each named consistently.

## Sliced R2

| Slice | Scope | Risk |
|---|---|---|
| **R2.1** | Labels module — refactor ALL inline `lang === 'am' ? … : …` ternaries to one central labels file. **No visible change.** E2E imports strings from it; Merkato reviewer workflow consumes it. Ships first, alone. | low |
| **R2.2** | Notification 5-group collapsibles **inside existing tabs**. Visible win. | low |
| **R2.3** | Grouped single page + My Account panel + `can_edit_settings` enforcement (first consumers — currently 0), behind a feature flag, **default off**. | medium |
| **R2.4** | Owner dogfood week → flip flag → delete old layout + old specs. **REVERT.md**: documented 2-minute flip-back. | process |

## Definition of Done (owner pre-committed — agent CANNOT self-declare)

- [ ] All suites green, EN + Amharic
- [ ] Three-state + **populated-shop** screenshots owner-approved (Amharic
      names, real amounts — empty states hide layout issues)
- [ ] Labels signed by Merkato reviewer
- [ ] Dogfood week completes with zero P1 issues
- [ ] Revert plan (REVERT.md) documented
- [ ] `setup_completed_at` live in production

## R2 doc additions (binding)

1. **Restore validation** — restore-from-backup must validate the JSON
   against a schema; legacy `settings` keys map forward or drop cleanly
   (backup JSON includes `settings`; unknown keys must never crash restore).
2. **Service worker** — cache version bump + "update available" toast so
   installed PWA users actually receive R2 (otherwise the old shell serves
   from cache indefinitely).
3. **Screenshots** — POPULATED shop state (Amharic names, real amounts) is
   required alongside the three seeded states for owner approval.
4. **FUTURE list (do NOT build now)** — contextual setup prompts surfaced
   from the Today tab.

## Rulings A & B (owner, post-b2f391b)

- **Ruling A — checklist composition FROZEN for R2.** Never change a metric
  definition before measuring it once. FUTURE: checklist item 5 (recurring
  expenses) is the weakest activation proxy — candidate swap "first sale on
  credit recorded", decided only after 4–6 weeks of `setup_completed_at`
  data shows which item stalls; any change documents its date (metric eras
  stay clean).
- **Ruling B — Gate B unblocked:** count SQL demoted from gate to
  diagnostics. Migration ships batched-by-default (~1k rows/batch,
  idempotent, re-runnable) and LOGS the row count it fixed — that is the
  count. Owner runs the SELECT later for the evidence table only, if desired.
- **Backup-first owner action tied to deploy:** pg_dump immediately before
  this ships (agent has no DB access — backup-first is NOT done until the
  owner confirms the dump exists).

## R2 checklist additions (owner element-by-element audit of live UI)

1. **Install duplication**: top Install banner + "Install the App" card =
   two affordances, one job. Keep the banner (dismissible); drop the card.
2. **Payment Channels badge**: drop "/25" — no shop approaches 25 channels;
   show "1 configured" count only.
3. **Ban "App"/"Push" column vocabulary globally in R2.2** (not just staff
   view) — developer terms; the 5-group model replaces them with
   plain-language groups.
4. **Version display**: About shows "dev", footer "vdev" — fix the displayed
   version string; the 5-tap dev unlock must keep working on the new version
   element (update its test).

## Owner block (this week, ~1h)

- [ ] count SQL → Gate B (Armenian categoryCode/labelCode migration)
- [ ] Actions tab + required checks enabled
- [ ] Dependabot page confirm (should clear post-8ca51da)
- [ ] ProfitCard / ReportView blessed-behavior verdict
- [ ] Merkato session: labels review + 15-min task test on a real low-end phone
