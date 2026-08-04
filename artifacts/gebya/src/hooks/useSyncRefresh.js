import { useEffect, useRef } from 'react';
import { useSyncStore } from '../stores/syncStore';

/**
 * Triggers a callback whenever the sync engine completes a sync cycle.
 * Skips the initial mount value — only fires on actual sync completions.
 *
 * @param {Function} onSyncComplete — called after each successful sync
 */
export function useSyncRefresh(onSyncComplete) {
  const lastSyncAt = useSyncStore(s => s.lastSyncAt);
  const initialRef = useRef(lastSyncAt);

  useEffect(() => {
    if (lastSyncAt === initialRef.current) return;
    onSyncComplete();
  }, [lastSyncAt, onSyncComplete]);
}
