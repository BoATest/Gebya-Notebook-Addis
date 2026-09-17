/**
 * Central labels module (R2.1) — one entry per user-visible string, namespaced
 * by feature. Files that consume this module contain ZERO inline
 * `lang === 'am' ? … : …` ternaries (enforced per consumer in
 * tests/labels-settings.spec.ts).
 *
 * NAMESPACE REGISTRY (live vs queued — every feature area arrives batch-by-
 * batch, by feature, after the pilot proof):
 *   settings      — LIVE (pilot: readiness checklist + plan panel)
 *   onboarding    — LIVE (batch 2: OnboardingScreen)
 *   transactions  — queued (batch 3; TransactionForm is the largest file)
 *   customers / suppliers / staff / report / notifications / nav — queued
 *
 * EXTRACTION RULES (binding for every batch):
 *   1. Every entry is `{ en, am }`, both sides byte-identical to the inline
 *      strings they replaced — including wrong-ish ones. Zero term decisions
 *      in this refactor; copy-paste bugs are fixed in a later labels PR.
 *   2. A value may instead be a FUNCTION of the interpolation values,
 *      returning the same bytes the inline template produced. Callers access
 *      `entry[lang]` and invoke it (see settings.readiness.progressOf).
 *   3. Language selection NEVER nests inside other ternaries. Component
 *      logic chooses WHICH entry renders (`upgrading ? L.a[lang] : L.b[lang]`);
 *      the module owns every string.
 *   4. Consumers only read entries; they never mutate them.
 *   5. INVERTED (target-language) entries: a string whose inline branch did
 *      NOT depend on the current locale the way siblings do (e.g. a language
 *      toggle rendering the OTHER language's prompt) keeps its pre-refactor
 *      branch bytes keyed by the branch that produced them — `entry.am` holds
 *      the bytes of the inline `lang === 'am' ?` branch, even when those bytes
 *      are English. The byte-lock spec enforces this literally; no silent
 *      re-orientation is allowed in this refactor.
 */
import { settings } from './settings';
import { onboarding } from './onboarding';

export const LABELS = { settings, onboarding };
