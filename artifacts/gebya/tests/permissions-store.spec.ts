/**
 * Permissions store unit tests.
 *
 * Tests the trust boundary: owner always passes, staff gets cached or minimal
 * permissions, first-launch staff is restricted to simple-sale entry only.
 *
 * Mocks db.settings (Dexie) to simulate IndexedDB cache states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module before any import that uses it
vi.mock('../src/db', () => ({
  db: {
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { usePermissionsStore } from '../src/stores/permissionsStore';
import { db } from '../src/db';

beforeEach(async () => {
  vi.clearAllMocks();
  // Reset store to initial state
  usePermissionsStore.setState({ permissions: null, role: null, loaded: false });
  // Ensure mock returns undefined (no cache)
  (db.settings.get as any).mockResolvedValue(undefined);
});

describe('permissionsStore', () => {
  describe('(a) owner always passes', () => {
    it('owner passes all permissions with no cached permissions', async () => {
      await usePermissionsStore.getState().loadCachedPermissions();

      // Simulate owner role set (as authStore would after network call)
      usePermissionsStore.getState().setPermissions(null, 'owner');

      expect(usePermissionsStore.getState().hasPermission('can_delete_records')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_manage_team')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_edit_settings')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_add_records')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_view_reports')).toBe(true);
    });

    it('owner passes even when loaded from cache with staff permissions', async () => {
      // Cache has staff permissions (some denied) but role is owner
      (db.settings.get as any).mockResolvedValue({
        value: {
          permissions: { can_delete_records: false, can_manage_team: false },
          role: 'owner',
          cached_at: Date.now(),
        },
      });

      await usePermissionsStore.getState().loadCachedPermissions();

      // Owner role from cache — all permissions pass regardless of permission object
      expect(usePermissionsStore.getState().hasPermission('can_delete_records')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_manage_team')).toBe(true);
    });
  });

  describe('(b) staff offline with cached permissions', () => {
    it('staff with cached "no delete" is blocked from deleting', async () => {
      (db.settings.get as any).mockResolvedValue({
        value: {
          permissions: {
            can_manage_team: false,
            can_delete_records: false,
            can_edit_settings: false,
            can_add_records: true,
            can_view_reports: true,
          },
          role: 'cashier',
          cached_at: Date.now(),
        },
      });

      await usePermissionsStore.getState().loadCachedPermissions();

      expect(usePermissionsStore.getState().hasPermission('can_delete_records')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_manage_team')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_edit_settings')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_add_records')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_view_reports')).toBe(true);
    });

    it('staff with cached permissions — cache is used, not minimal safe', async () => {
      // Cache has can_view_reports: true (unlike minimal safe which is false)
      (db.settings.get as any).mockResolvedValue({
        value: {
          permissions: {
            can_manage_team: false,
            can_delete_records: false,
            can_edit_settings: false,
            can_add_records: true,
            can_view_reports: true, // explicitly true in cache
          },
          role: 'cashier',
          cached_at: Date.now(),
        },
      });

      await usePermissionsStore.getState().loadCachedPermissions();

      // Reports are ON because the cache says so (not overridden by minimal safe)
      expect(usePermissionsStore.getState().hasPermission('can_view_reports')).toBe(true);
    });
  });

  describe('(c) first-launch staff (no cache)', () => {
    it('restricted to simple-sale entry only', async () => {
      // No cache — db.settings.get returns undefined
      await usePermissionsStore.getState().loadCachedPermissions();

      // permissions is null, role is null — falls through to STAFF_MINIMAL_SAFE
      expect(usePermissionsStore.getState().hasPermission('can_add_records')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_view_reports')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_delete_records')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_manage_team')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_edit_settings')).toBe(false);
    });

    it('store reports loaded=false when no cache exists', async () => {
      await usePermissionsStore.getState().loadCachedPermissions();
      expect(usePermissionsStore.getState().loaded).toBe(false);
    });
  });

  describe('(d) owner role unaffected in all offline states', () => {
    const scenarios = [
      { label: 'no cache', getMock: undefined },
      { label: 'empty cache value', getMock: { value: { permissions: null, role: null } } },
      { label: 'staff cache (wrong role)', getMock: { value: { permissions: { can_delete_records: false }, role: 'cashier' } } },
    ];

    for (const { label, getMock } of scenarios) {
      it(`owner passes — ${label}`, async () => {
        (db.settings.get as any).mockResolvedValue(getMock);
        usePermissionsStore.setState({ permissions: null, role: null, loaded: false });

        await usePermissionsStore.getState().loadCachedPermissions();

        // Simulate owner (as if authStore just set it after network call)
        usePermissionsStore.getState().setPermissions(null, 'owner');

        expect(usePermissionsStore.getState().hasPermission('can_delete_records')).toBe(true);
        expect(usePermissionsStore.getState().hasPermission('can_manage_team')).toBe(true);
        expect(usePermissionsStore.getState().hasPermission('can_view_reports')).toBe(true);
        expect(usePermissionsStore.getState().hasPermission('can_add_records')).toBe(true);
        expect(usePermissionsStore.getState().hasPermission('can_edit_settings')).toBe(true);
      });
    }
  });

  describe('cache persistence', () => {
    it('setPermissions writes to IndexedDB', async () => {
      const perms = { can_add_records: true, can_view_reports: true };
      usePermissionsStore.getState().setPermissions(perms, 'cashier');

      expect(db.settings.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'cached_permissions',
          value: expect.objectContaining({ permissions: perms, role: 'cashier' }),
        })
      );
    });

    it('resetPermissions deletes from IndexedDB', async () => {
      usePermissionsStore.getState().resetPermissions();
      expect(db.settings.delete).toHaveBeenCalledWith('cached_permissions');
    });
  });

  describe('(e) setPermissions(null) guard — null payload does NOT write to cache', () => {
    it('setPermissions(null, "staff") does NOT write to IndexedDB', () => {
      usePermissionsStore.getState().setPermissions(null, 'staff');
      expect(db.settings.put).not.toHaveBeenCalled();
    });

    it('setPermissions(null, "staff") clears existing permissions in memory', () => {
      // First set real permissions
      usePermissionsStore.getState().setPermissions(
        { can_add_records: true, can_view_reports: true, can_delete_records: false, can_manage_team: false, can_edit_settings: false },
        'cashier'
      );
      expect(usePermissionsStore.getState().permissions).toBeTruthy();

      // Then null them out (as a flaky sync response might)
      usePermissionsStore.getState().setPermissions(null, 'staff');
      expect(usePermissionsStore.getState().permissions).toBeNull();
      expect(usePermissionsStore.getState().role).toBe('staff');
    });

    it('setPermissions(null, "staff") causes hasPermission to fall through to minimal safe', () => {
      usePermissionsStore.getState().setPermissions(null, 'staff');

      // Minimal safe: only can_add_records is true
      expect(usePermissionsStore.getState().hasPermission('can_add_records')).toBe(true);
      expect(usePermissionsStore.getState().hasPermission('can_view_reports')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_delete_records')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_manage_team')).toBe(false);
      expect(usePermissionsStore.getState().hasPermission('can_edit_settings')).toBe(false);
    });

    it('setPermissions(empty object, "staff") DOES write to IndexedDB (not null)', () => {
      usePermissionsStore.getState().setPermissions({}, 'staff');
      expect(db.settings.put).toHaveBeenCalled();
    });
  });

  describe('(f) resetPermissions clears all state', () => {
    it('after reset, permissions and role are null', () => {
      usePermissionsStore.getState().setPermissions(
        { can_add_records: true, can_view_reports: true, can_delete_records: true, can_manage_team: true, can_edit_settings: true },
        'admin'
      );
      expect(usePermissionsStore.getState().role).toBe('admin');

      usePermissionsStore.getState().resetPermissions();
      expect(usePermissionsStore.getState().permissions).toBeNull();
      expect(usePermissionsStore.getState().role).toBeNull();
      expect(usePermissionsStore.getState().loaded).toBe(false);
    });
  });

  describe('(g) unknown permission key returns false', () => {
    it('hasPermission("nonexistent_key") returns false for all roles', () => {
      usePermissionsStore.getState().setPermissions(
        { can_add_records: true, can_view_reports: true, can_delete_records: true, can_manage_team: true, can_edit_settings: true },
        'admin'
      );
      expect(usePermissionsStore.getState().hasPermission('nonexistent_key')).toBe(false);
    });

    it('hasPermission("nonexistent_key") returns false for staff with no permissions', () => {
      usePermissionsStore.getState().setPermissions(null, 'staff');
      expect(usePermissionsStore.getState().hasPermission('nonexistent_key')).toBe(false);
    });
  });
});
