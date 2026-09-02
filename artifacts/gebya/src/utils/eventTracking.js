/**
 * Event Analytics Tracking
 * 
 * Simple analytics to measure user behavior without external services.
 * All events stored locally in IndexedDB analytics table.
 */

import { db } from '../db';

let sessionId = null;
let sessionStartTime = null;

/**
 * Initialize session tracking on app load
 */
export function initSession() {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  sessionStartTime = Date.now();
  
  trackEvent('session_start', {
    session_id: sessionId,
    timestamp: Date.now()
  });
}

/**
 * Track any event
 * @param {string} eventType - Event identifier (e.g., 'transaction_created')
 * @param {object} properties - Additional event data
 */
export async function trackEvent(eventType, properties = {}) {
  try {
    // Get device ID from settings
    const deviceIdSetting = await db.settings.get('device_id');
    const deviceId = deviceIdSetting?.value || 'unknown';
    
    const eventData = {
      device_id: deviceId,
      key: `event:${eventType}`,
      value: JSON.stringify({
        ...properties,
        timestamp: Date.now(),
        session_id: sessionId
      }),
      count: 1,
      last_seen_at: Date.now(),
      created_at: Date.now()
    };

    await db.analytics.add(eventData);
  } catch (err) {
    // Silently fail - analytics should never break the app
    console.warn('Analytics tracking failed:', err);
  }
}

/**
 * Track an event only once per shop/device — for first-time milestone analytics.
 * Uses a `first_event_seen:<eventType>` setting key in IndexedDB. Safe to fire
 * on every trigger; the guard prevents duplicate first-time events.
 */
export async function trackFirstEvent(eventType, properties = {}) {
  try {
    const flagKey = `first_event_seen:${eventType}`;
    const existing = await db.settings.get(flagKey);
    if (existing?.value === true) return false;

    await db.settings.put({ key: flagKey, value: true });
    await trackEvent(eventType, properties);
    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('trackFirstEvent failed:', err);
    return false;
  }
}

/**
 * Track session end (on app close/minimize)
 */
export function endSession() {
  if (sessionStartTime && sessionId) {
    const duration = Date.now() - sessionStartTime;
    trackEvent('session_end', {
      session_id: sessionId,
      duration_ms: duration
    });
  }
}

/**
 * Get analytics summary (for debugging/admin view)
 */
export async function getAnalyticsSummary() {
  try {
    const events = await db.analytics
      .where('key')
      .startsWith('event:')
      .toArray();
    
    // Group by event type
    const grouped = {};
    for (const event of events) {
      const eventType = event.key.replace('event:', '');
      if (!grouped[eventType]) {
        grouped[eventType] = 0;
      }
      grouped[eventType] += event.count || 1;
    }
    
    // Calculate sessions in last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentSessions = events.filter(e => 
      e.key === 'event:session_start' && 
      e.created_at > sevenDaysAgo
    );
    
    return {
      totalEvents: events.length,
      eventCounts: grouped,
      sessions7d: recentSessions.length,
      lastSessionAt: events.length > 0 ? Math.max(...events.map(e => e.created_at)) : null
    };
  } catch (err) {
    console.error('Failed to get analytics summary:', err);
    return null;
  }
}
