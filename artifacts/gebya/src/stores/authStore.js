import { create } from 'zustand';
import { getAuthToken } from '../utils/syncEngine';
import { usePermissionsStore } from './permissionsStore';
import { resolvePermissions } from '../utils/permissions';

export const useAuthStore = create((set, get) => ({
  user: null,
  checked: false,
  role: null,
  permissions: null,
  businesses: [],
  currentBusinessId: null,

  setUser: (user) => set({ user, checked: true }),

  setCurrentBusiness: (businessId) => set({ currentBusinessId: businessId }),

  init: async () => {
    const token = await getAuthToken();
    if (!token) {
      set({ user: false, checked: true, role: null, permissions: null, businesses: [], currentBusinessId: null });
      usePermissionsStore.getState().resetPermissions();
      return;
    }
    try {
      const { getCurrentUser } = await import('../utils/authClient');
      const data = await getCurrentUser(token);
      const user = data.user;
      const role = data.role || null;
      const rawPerms = data.permissions;
      const businesses = data.businesses || [];
      const currentBusinessId = data.businesses?.[0]?.business_id || null;

      const resolvedPerms = resolvePermissions(role, rawPerms);
      usePermissionsStore.getState().setPermissions(resolvedPerms, role);

      // Cache businesses to IndexedDB for offline availability
      const { setBusinesses } = await import('../db');
      await setBusinesses(businesses);

      set({ user, checked: true, role, permissions: rawPerms, businesses, currentBusinessId });
    } catch (err) {
      // On failure, try loading cached businesses from IndexedDB for offline use
      try {
        const { getBusinesses } = await import('../db');
        const cached = await getBusinesses();
        if (cached?.list?.length) {
          set({
            user: false, checked: true, role: null, permissions: null,
            businesses: cached.list,
            currentBusinessId: cached.list[0].business_id,
          });
          return;
        }
      } catch { /* non-critical */ }
      const { clearAuthToken } = await import('../utils/syncEngine');
      await clearAuthToken();
      usePermissionsStore.getState().resetPermissions();
      set({ user: false, checked: true, role: null, permissions: null, businesses: [], currentBusinessId: null });
    }
  },

  login: async (token, user, role, rawPermissions, businesses) => {
    const { setAuthToken } = await import('../utils/syncEngine');
    await setAuthToken(token);
    const resolvedPerms = resolvePermissions(role, rawPermissions);
    usePermissionsStore.getState().setPermissions(resolvedPerms, role);
    const currentBusinessId = businesses?.[0]?.business_id || null;
    set({ user, checked: true, role, permissions: rawPermissions, businesses: businesses || [], currentBusinessId });
  },

  logout: async () => {
    const { clearAuthToken } = await import('../utils/syncEngine');
    await clearAuthToken();
    usePermissionsStore.getState().resetPermissions();
    set({ user: false, checked: true, role: null, permissions: null, businesses: [], currentBusinessId: null });
  },
}));
