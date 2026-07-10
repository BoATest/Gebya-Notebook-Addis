import { create } from 'zustand';
import { db } from '../db';

/**
 * Permissions store — holds the current user's resolved permissions and role.
 *
 * On cold boot, eagerly loads cached { role, permissions } from IndexedDB so
 * that hasPermission() returns the correct answer synchronously at first
 * render — before any async auth check completes.
 *
 * Owner always passes all permission checks, regardless of cache state.
 * First-launch staff (no cache, no server response) get a minimal safe set:
 * can_add_records only (simple sale entry). Reports are OFF until first sync.
 */

const CACHE_KEY = 'cached_permissions';

const OWNER_FULL_ACCESS = {
  can_manage_team: true,
  can_delete_records: true,
  can_edit_settings: true,
  can_add_records: true,
  can_view_reports: true,
};

// Minimal safe set for first-launch staff with no cached permissions.
// Reports OFF — an unverified device should not see business reports.
const STAFF_MINIMAL_SAFE = {
  can_manage_team: false,
  can_delete_records: false,
  can_edit_settings: false,
  can_add_records: true,
  can_view_reports: false,
};

export const usePermissionsStore = create((set, get) => ({
  permissions: null,
  role: null,
  loaded: false,

  setPermissions: (next, role) => {
    set({ permissions: next, role: role || null, loaded: true });
    if (next && typeof next === 'object') {
      db.settings.put({
        key: CACHE_KEY,
        value: { permissions: next, role: role || null, cached_at: Date.now() },
      }).catch(() => { /* non-critical — cache write is best-effort */ });
    }
  },

  hasPermission: (key) => {
    const { role, permissions } = get();
    if (role === 'owner') return OWNER_FULL_ACCESS[key] === true;
    if (permissions && typeof permissions === 'object') return permissions[key] === true;
    return STAFF_MINIMAL_SAFE[key] === true;
  },

  resetPermissions: () => {
    set({ permissions: null, role: null, loaded: false });
    db.settings.delete(CACHE_KEY).catch(() => {});
  },

  loadCachedPermissions: async () => {
    try {
      const cached = await db.settings.get(CACHE_KEY);
      if (cached?.value?.permissions) {
        set({
          permissions: cached.value.permissions,
          role: cached.value.role || null,
          loaded: true,
        });
        return true;
      }
    } catch { /* IndexedDB may not be available */ }
    return false;
  },
}));

// Eagerly load cache at module import time — before React renders any component.
// This ensures role + permissions are synchronously available at first render.
usePermissionsStore.getState().loadCachedPermissions();
