/**
 * useNotificationStream — Real-time SSE hook for notification count
 *
 * Replaces the 30-second polling interval in AppShell.
 * Connects to the SSE endpoint and receives real-time unread count updates.
 *
 * Usage:
 *   useNotificationStream(userId);
 *   // unreadCount updates automatically via the notifications store
 */
import { useEffect, useRef, useCallback } from 'react';
import { useNotificationsStore } from '../stores/notificationsStore';
import { getAuthToken } from '../utils/syncEngine';

const BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');
const SSE_URL = `${BASE}/notifications/stream`;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useNotificationStream(isAuthenticated) {
  const eventSourceRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef(null);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    reconnectAttempts.current = 0;
  }, []);

  const connect = useCallback(async () => {
    if (!isAuthenticated || eventSourceRef.current) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      // SSE doesn't support custom headers, so pass token as query param
      const url = new URL(SSE_URL);
      url.searchParams.set('token', token);

      const eventSource = new EventSource(url.toString(), {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;
      reconnectAttempts.current = 0;

      eventSource.addEventListener('unread', (event) => {
        try {
          const { count } = JSON.parse(event.data);
          // Update the store directly
          useNotificationsStore.setState({ unreadCount: count });
        } catch {
          // Ignore parse errors
        }
      });

      eventSource.addEventListener('error', () => {
        eventSource.close();
        eventSourceRef.current = null;

        // Reconnect with backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          const delay = RECONNECT_DELAY * Math.min(reconnectAttempts.current, 5);
          reconnectTimeout.current = setTimeout(connect, delay);
        }
      });

      eventSource.addEventListener('open', () => {
        reconnectAttempts.current = 0;
      });
    } catch {
      // Connection failed, retry
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }
    return cleanup;
  }, [isAuthenticated, connect, cleanup]);

  // Also fetch on visibility change (in case SSE missed an event)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, fetchUnreadCount]);

  return null;
}
