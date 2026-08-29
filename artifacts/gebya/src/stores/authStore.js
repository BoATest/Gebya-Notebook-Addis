import { create } from 'zustand';
import { usePermissionsStore } from './permissionsStore';
import { resolvePermissions } from '../utils/permissions';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/syncEngine';
import { getCurrentUser, ensureFreshToken } from '../utils/authClient';
import { setBusinesses, getBusinesses } from '../db';

export const useAuthStore = create((set, get) => ({
  user: null,
  checked: false,
  role: null,
  permissions: null,
  businesses: [],
  currentBusinessId: null,
  hasPassword: false,
  isPlatformAdmin: false,

  setUser: (user) => set({ user, checked: true }),

  setCurrentBusiness: (businessId) => set({ currentBusinessId: businessId }),

  init: async () => {
    const token = await getAuthToken();
    if (!token) {
      // No token at all. Try one silent refresh: the token may have been
      // evicted from IndexedDB (e.g. after a sync event cleared it) but
      // still be refreshable server-side. If the refresh also fails, we
      // truly are signed out.
      try {
        await ensureFreshToken();
      } catch {
        set({ user: false, checked: true, role: null, permissions: null, businesses: [], currentBusinessId: null, hasPassword: false, isPlatformAdmin: false });
        usePermissionsStore.getState().resetPermissions();
        return;
      }
    }
    try {
      const data = await getCurrentUser(token);
      const user = data.user;
      const role = data.role || null;
      const rawPerms = data.permissions;
      const businesses = data.businesses || [];
      const currentBusinessId = data.businesses?.[0]?.business_id || null;
      const hasPassword = data.has_password || false;
      const isPlatformAdmin = data.is_platform_admin === true;

      const resolvedPerms = resolvePermissions(role, rawPerms);
      usePermissionsStore.getState().setPermissions(resolvedPerms, role);

      await setBusinesses(businesses);

      set({ user, checked: true, role, permissions: rawPerms, businesses, currentBusinessId, hasPassword, isPlatformAdmin });
    } catch (err) {
      // Token might be stale — try a silent refresh, then re-fetch /me.
      let recovered = false;
      try {
        await ensureFreshToken();
        const data2 = await getCurrentUser(await getAuthToken());
        const resolvedPerms2 = resolvePermissions(data2.role || null, data2.permissions);
        usePermissionsStore.getState().setPermissions(resolvedPerms2, data2.role || null);
        await setBusinesses(data2.businesses || []);
        set({
          user: data2.user, checked: true, role: data2.role || null, permissions: data2.permissions,
          businesses: data2.businesses || [],
          currentBusinessId: data2.businesses?.[0]?.business_id || null,
          hasPassword: data2.has_password || false,
          isPlatformAdmin: data2.is_platform_admin === true,
        });
        recovered = true;
      } catch { /* still failed */ }
      if (recovered) return;

      try {
        const cached = await getBusinesses();
        if (cached?.list?.length) {
          set({
            user: false, checked: true, role: null, permissions: null,
            businesses: cached.list,
            currentBusinessId: cached.list[0].business_id,
            hasPassword: false,
            isPlatformAdmin: false,
          });
          return;
        }
      } catch { /* non-critical */ }
      await clearAuthToken();
      usePermissionsStore.getState().resetPermissions();
      set({ user: false, checked: true, role: null, permissions: null, businesses: [], currentBusinessId: null, hasPassword: false, isPlatformAdmin: false });
    }
  },

  login: async (token, user, role, rawPermissions, businesses, isPlatformAdmin = false) => {
    await setAuthToken(token);
    const resolvedPerms = resolvePermissions(role, rawPermissions);
    usePermissionsStore.getState().setPermissions(resolvedPerms, role);
    const currentBusinessId = businesses?.[0]?.business_id || null;
    set({ user, checked: true, role, permissions: rawPermissions, businesses: businesses || [], currentBusinessId, hasPassword: false, isPlatformAdmin: isPlatformAdmin === true });
  },

  logout: async () => {
    await clearAuthToken();
    usePermissionsStore.getState().resetPermissions();
    set({ user: false, checked: true, role: null, permissions: null, businesses: [], currentBusinessId: null, hasPassword: false, isPlatformAdmin: false });
  },
}));
