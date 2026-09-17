/**
 * Central labels module (R2.1) — one entry per user-visible string, namespaced
 * by feature. Files that consume this module contain ZERO inline
 * `lang === 'am' ? … : …` ternaries (enforced per consumer in
 * tests/labels-settings.spec.ts).
 *
 * NAMESPACE REGISTRY (live vs queued — the pilot lands settings; every other
 * feature area arrives batch-by-batch, by feature, after this pilot proof):
 *   settings      — LIVE (pilot: readiness checklist + plan panel)
 *   onboarding    — queued (batch 2)
 *   transactions  — queued (batch 2; TransactionForm is the largest file)
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
 */
import { settings } from './settings';

export const LABELS = { settings };
