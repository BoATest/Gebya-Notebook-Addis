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

## Owner block (this week, ~1h)

- [ ] count SQL → Gate B (Armenian categoryCode/labelCode migration)
- [ ] Actions tab + required checks enabled
- [ ] Dependabot page confirm (should clear post-8ca51da)
- [ ] ProfitCard / ReportView blessed-behavior verdict
- [ ] Merkato session: labels review + 15-min task test on a real low-end phone
