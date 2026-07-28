import { create } from 'zustand';

/**
 * Sync engine state: status, errors, last sync time.
 * Updated by the syncEngine utility (subscribes to this store).
 */

export const useSyncStore = create((set) => ({
  status: 'idle',
  error: null,
  lastSyncAt: 0,
  online: true,
  pendingCount: 0,
  conflictWarning: null,
  lastConflicts: [],
  conflictDetails: [],

  setSyncState: (state) => set(state),
  setConflictWarning: (warning) => set({ conflictWarning: warning }),
  setLastConflicts: (conflicts) => set({ lastConflicts: conflicts }),
  setConflictDetails: (details) => set({ conflictDetails: details }),
}));
