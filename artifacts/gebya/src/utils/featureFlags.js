/**
 * Feature flags — R2.3 "grouped Settings" rollout gate.
 *
 * FLAG: settings_grouped_v2 — DEFAULT OFF.
 *
 * The grouped More/Settings page (SHOP / MONEY & CREDIT / MY APP) ships dark.
 * While the flag is OFF, SettingsPage renders the legacy 3-tab layout with zero
 * changes; R2.4 flips the default after the owner dogfood week and deletes the
 * old layout + old specs (REVERT.md documents the 2-minute flip-back).
 *
 * Resolution order (first decisive value wins):
 *   1. URL query   ?groupedSettings=1|0        — per-session preview / e2e target
 *   2. localStorage 'gebya_settings_grouped_v2' — explicit opt-in ('on'/'off')
 *   3. build-time  VITE_SETTINGS_GROUPED_V2     — owner flips the default here
 *   4. DEFAULT OFF
 *
 * Alias handling: the owner-facing name drifted during review
 * (`gebya_flag_settings_grouped_v2` / `?flag_settings_grouped` /
 * `VITE_FEATURE_SETTINGS_GROUPED`). Both spellings resolve identically; the
 * canonical names above are what new code should write. Aliases are read-only.
 *
 * Reads never throw: private-mode storage denials fall through to the next
 * source (default stays OFF, never enabled by accident). The pure resolver is
 * exported so precedence is unit-locked in tests/feature-flags.test.mjs.
 */

export const SETTINGS_GROUPED_V2_STORAGE_KEY = 'gebya_settings_grouped_v2';
export const SETTINGS_GROUPED_V2_STORAGE_KEY_ALIAS = 'gebya_flag_settings_grouped_v2';
export const SETTINGS_GROUPED_V2_QUERY_KEY = 'groupedSettings';
export const SETTINGS_GROUPED_V2_QUERY_KEY_ALIAS = 'flag_settings_grouped';
export const SETTINGS_GROUPED_V2_ENV_KEY = 'VITE_SETTINGS_GROUPED_V2';
export const SETTINGS_GROUPED_V2_ENV_KEY_ALIAS = 'VITE_FEATURE_SETTINGS_GROUPED';

const ON_VALUES = new Set(['1', 'on', 'true', 'yes']);
const OFF_VALUES = new Set(['0', 'off', 'false', 'no']);

/** @returns {boolean|null} null = not decisive — fall through to next source */
function parseFlagValue(raw) {
  if (raw === null || raw === undefined) return null;
  const value = String(raw).trim().toLowerCase();
  if (ON_VALUES.has(value)) return true;
  if (OFF_VALUES.has(value)) return false;
  return null;
}

/** Storage-like (getItem) or plain object; never throws. */
function readSource(source, key) {
  if (!source) return null;
  try {
    if (typeof source.getItem === 'function') return source.getItem(key);
    return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : null;
  } catch {
    return null;
  }
}

function firstDecisive(values) {
  for (const value of values) {
    const parsed = parseFlagValue(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

/**
 * Pure resolver — no globals touched. Unit-locked (tests/feature-flags.test.mjs).
 * @param {{ search?: string, storage?: any, env?: any }} sources
 * @returns {boolean}
 */
export function resolveSettingsGroupedV2({ search = '', storage = null, env = null } = {}) {
  // 1. Query override — highest precedence so a preview link can force either
  //    state without touching persistent storage.
  try {
    const params = new URLSearchParams(search);
    const fromQuery = firstDecisive([
      params.get(SETTINGS_GROUPED_V2_QUERY_KEY),
      params.get(SETTINGS_GROUPED_V2_QUERY_KEY_ALIAS),
    ]);
    if (fromQuery !== null) return fromQuery;
  } catch { /* malformed search string — fall through */ }

  // 2. Explicit runtime choice (owner opt-in during dogfood).
  const fromStorage = firstDecisive([
    readSource(storage, SETTINGS_GROUPED_V2_STORAGE_KEY),
    readSource(storage, SETTINGS_GROUPED_V2_STORAGE_KEY_ALIAS),
  ]);
  if (fromStorage !== null) return fromStorage;

  // 3. Build-time default (owner flips this after the dogfood week).
  const fromEnv = firstDecisive([
    readSource(env, SETTINGS_GROUPED_V2_ENV_KEY),
    readSource(env, SETTINGS_GROUPED_V2_ENV_KEY_ALIAS),
  ]);
  if (fromEnv !== null) return fromEnv;

  // 4. DEFAULT OFF.
  return false;
}

/** Live read — browser sources only; safe under SSR/Node (returns OFF). */
export function isSettingsGroupedV2Enabled() {
  let search = '';
  let storage = null;
  try {
    if (typeof window !== 'undefined') {
      search = window.location?.search || '';
      storage = window.localStorage || null;
    }
  } catch { /* storage denied — resolver falls through */ }

  let env = null;
  try {
    env = import.meta.env || null;
  } catch { /* non-Vite host — env source absent */ }

  return resolveSettingsGroupedV2({ search, storage, env });
}

/**
 * Dev/QA helper — persists an explicit choice ('on'/'off'). Pass null to clear
 * and fall back to the build-time default. Never throws.
 */
export function setSettingsGroupedV2Override(value) {
  try {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(SETTINGS_GROUPED_V2_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SETTINGS_GROUPED_V2_STORAGE_KEY, value ? 'on' : 'off');
    }
  } catch { /* ignore — flag stays at its current resolution */ }
}
