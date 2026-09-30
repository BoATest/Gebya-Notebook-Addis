/**
 * Single source of truth for the displayed app version.
 *
 * R2.3 fix (owner-locked): the Settings footer rendered `vdev` and the About
 * card rendered `dev` because `__APP_VERSION__` was never defined and two
 * different env lookups disagreed. `vite.config.ts` now defines
 * `__APP_VERSION__` from package.json (build-time), and every surface reads
 * this module instead of inventing its own fallback chain.
 *
 * The 5-tap dev-mode unlock stays bound to whichever element renders this
 * string: the SettingsPage footer on the legacy layout, the MY APP › About row
 * on the grouped layout. Do not move the tap handler off that element.
 */
export const APP_VERSION =
  (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) ||
  import.meta.env?.VITE_APP_VERSION ||
  'dev';

/** Prefixed form for row subtitles ("v1.2.0"). */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
