import { create } from 'zustand';
import { usePermissionsStore } from './permissionsStore';
import { resolvePermissions } from '../utils/permissions';
import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/syncEngine';
import { getCurrentUser } from '../utils/authClient';
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
      set({ user: false, checked: true, role: null, permissions: null, businesses: [], currentBusinessId: null, hasPassword: false, isPlatformAdmin: false });
      usePermissionsStore.getState().resetPermissions();
      return;
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
