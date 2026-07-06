import db from '../db';
import { getOrCreateCloudProofDeviceId } from './cloudProof';
import { useSyncStore } from '../stores/syncStore';

const SYNC_API_BASE = import.meta.env.VITE_SYNC_API_URL || '/api';
const AUTH_TOKEN_KEY = 'gebya_auth_token';
const LAST_SYNC_AT_KEY = 'gebya_last_sync_at';
const TABLE_LAST_SYNC_KEY = 'gebya_table_last_sync';
const BUSINESS_ID_KEY = 'gebya_business_id';

let syncEngineInstance = null;

// ─── JWT helpers ───
export async function getAuthToken() {
  const row = await db.settings.get(AUTH_TOKEN_KEY);
  return row?.value || null;
}

export async function setAuthToken(token) {
  await db.settings.put({ key: AUTH_TOKEN_KEY, value: token });
}

export async function clearAuthToken() {
  await db.settings.delete(AUTH_TOKEN_KEY);
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function mapPullRow(row) {
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const snakeKey = camelToSnake(key);
    mapped[snakeKey] = value;
  }
  mapped.id = row.localId || row.id;
  return mapped;
}

// ─── Retry with exponential backoff ───
async function fetchWithRetry(url, options, retries = 5, baseDelay = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // Don't retry on 4xx errors (client errors)
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      // Retry on 5xx or network errors
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText} after ${retries} retries`);
      }
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

class SyncEngine {
  constructor() {
    this.deviceId = null;
    this.status = 'idle'; // idle | syncing | error | offline | unauthenticated
    this.error = null;
    this.lastSyncAt = 0;
    this.tableLastSync = {}; // per-table last sync timestamps for resumable syncs
    this.businessId = null;
    this.listeners = [];
    this.unsubscribers = [];
    this.online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.timer = null;
    this._pushDebounce = null;
  }

  _notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
    try {
      useSyncStore.getState().setSyncState(state);
    } catch { /* ignore if store not initialized yet */ }
  }

  _warnConflict(message, details) {
    try {
      useSyncStore.getState().setConflictWarning(message);
      if (details && details.length > 0) {
        useSyncStore.getState().setConflictDetails(details);
      }
      // Log conflict event for frequency tracking (Section D)
      this._logConflictEvent(message, details);
    } catch { /* ignore */ }
  }

  async _logConflictEvent(message, details) {
    try {
      const now = Date.now();
      const day = new Date(now).toISOString().split('T')[0];
      const existing = await db.settings.get(`conflict_log_${day}`);
      const prev = existing?.value || { count: 0, events: [] };
      await db.settings.put({
        key: `conflict_log_${day}`,
        value: {
          count: (prev.count || 0) + 1,
          events: [
            ...(prev.events || []),
            {
              ts: now,
              message,
              table: details?.[0]?.table || 'unknown',
              recordCount: details?.length || 0,
              changedFields: details?.[0]?.changedFields || [],
            },
          ].slice(-50), // keep last 50 per day
        },
      });
    } catch { /* non-critical */ }
  }

  _diffFields(local, remote, excludeKeys = ['id', 'sync_version', 'updated_at', 'created_at', 'device_id', 'transaction_id']) {
    const changed = [];
    for (const key of Object.keys(remote)) {
      if (excludeKeys.includes(key)) continue;
      const l = local?.[key];
      const r = remote?.[key];
      if (JSON.stringify(l) !== JSON.stringify(r)) {
        changed.push(key);
      }
    }
    return changed;
  }

  getState() {
    return {
      status: this.status,
      error: this.error,
      lastSyncAt: this.lastSyncAt,
      online: this.online,
      businessId: this.businessId,
    };
  }

  onChange(cb) {
    this.listeners.push(cb);
    cb(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  async init() {
    this.deviceId = await getOrCreateCloudProofDeviceId();

    const globalRow = await db.settings.get(LAST_SYNC_AT_KEY);
    if (globalRow?.value) this.lastSyncAt = Number(globalRow.value);

    const tableRow = await db.settings.get(TABLE_LAST_SYNC_KEY);
    if (tableRow?.value) this.tableLastSync = tableRow.value;

    const bizRow = await db.settings.get(BUSINESS_ID_KEY);
    if (bizRow?.value) this.businessId = bizRow.value;

    this._setupOnlineListeners();
    this._setupDexieHooks();
    this._setupPeriodicSync();
  }

  _setupPeriodicSync() {
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible' && this.online) {
        this.sync();
      }
    }, 5 * 60 * 1000);
  }

  _setupOnlineListeners() {
    const onOnline = () => { this.online = true; this.sync(); };
    const onOffline = () => { this.online = false; this.status = 'offline'; this._notify(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    this.unsubscribers.push(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    });
  }

  _setupDexieHooks() {
    const tables = [
      'transactions',
      'customers',
      'customer_transactions',
      'catalog_entries',
      'suppliers',
      'supplier_transactions',
      'staff_members',
    ];

    tables.forEach((tableName) => {
      const table = db[tableName];
      if (!table?.hook) return;

      const onCreate = (primKey, obj, trans) => {
        // Ensure sync_version is set on new records
        if (obj.sync_version === undefined || obj.sync_version === null) {
          obj.sync_version = 1;
        }
        this._schedulePush(tableName, 'create', obj);
      };
      const onUpdate = (modifications, primKey, obj, trans) => {
        // Increment sync_version on updates (if not already set by caller)
        if (!modifications.sync_version) {
          const currentVersion = obj.sync_version || 1;
          modifications.sync_version = currentVersion + 1;
        }
        this._schedulePush(tableName, 'update', obj);
      };

      table.hook('creating', onCreate);
      table.hook('updating', onUpdate);

      this.unsubscribers.push(() => {
        table.hook('creating').unsubscribe(onCreate);
        table.hook('updating').unsubscribe(onUpdate);
      });
    });

    const kvTables = ['settings', 'analytics'];
    kvTables.forEach((tableName) => {
      const table = db[tableName];
      if (!table?.hook) return;
      const onCreate = (primKey, obj, trans) => {
        if (obj.sync_version === undefined || obj.sync_version === null) {
          obj.sync_version = 1;
        }
        this._schedulePush(tableName, 'create', obj);
      };
      const onUpdate = (modifications, primKey, obj, trans) => {
        if (!modifications.sync_version) {
          const currentVersion = obj.sync_version || 1;
          modifications.sync_version = currentVersion + 1;
        }
        this._schedulePush(tableName, 'update', obj);
      };
      table.hook('creating', onCreate);
      table.hook('updating', onUpdate);
      this.unsubscribers.push(() => {
        table.hook('creating').unsubscribe(onCreate);
        table.hook('updating').unsubscribe(onUpdate);
      });
    });
  }

  _schedulePush(table, operation, record) {
    if (this._pushDebounce) clearTimeout(this._pushDebounce);
    this._pushDebounce = setTimeout(() => this.sync(), 800);
  }

  async sync() {
    const token = await getAuthToken();
    if (!token) {
      this.status = 'unauthenticated';
      this._notify();
      return;
    }
    if (!this.online || this.status === 'syncing') return;

    this.status = 'syncing';
    this.error = null;
    this._notify();

    try {
      await this._pushAll(token);
      await this._pullAll(token);
      this.lastSyncAt = Date.now();
      await db.settings.put({ key: LAST_SYNC_AT_KEY, value: this.lastSyncAt });
      await db.settings.put({ key: TABLE_LAST_SYNC_KEY, value: this.tableLastSync });
      this.status = 'idle';
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('403')) {
        this.status = 'unauthenticated';
        await clearAuthToken();
      } else {
        this.status = 'error';
        this.error = err.message || 'Sync failed';
      }
      if (import.meta.env.DEV) console.error('[sync]', err);
    }
    this._notify();
  }

  /**
   * Force a full sync from the beginning of time. Used when a user joins a
   * new business so they download the entire shop history immediately.
   */
  async fullSync() {
    const token = await getAuthToken();
    if (!token) {
      this.status = 'unauthenticated';
      this._notify();
      return;
    }
    if (!this.online || this.status === 'syncing') return;

    // Save current state so we can restore if needed
    const previousLastSync = this.lastSyncAt;
    const previousTableLastSync = { ...this.tableLastSync };

    this.lastSyncAt = 0;
    this.tableLastSync = {};
    this.status = 'syncing';
    this.error = null;
    this._notify();

    try {
      await this._pushAll(token);
      await this._pullAll(token);
      this.lastSyncAt = Date.now();
      await db.settings.put({ key: LAST_SYNC_AT_KEY, value: this.lastSyncAt });
      await db.settings.put({ key: TABLE_LAST_SYNC_KEY, value: this.tableLastSync });
      this.status = 'idle';
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('403')) {
        this.status = 'unauthenticated';
        await clearAuthToken();
      } else {
        this.status = 'error';
        this.error = err.message || 'Sync failed';
      }
      if (import.meta.env.DEV) console.error('[sync full]', err);
    }
    this._notify();
  }

  async _pushAll(token) {
    const tables = [
      'transactions',
      'customers',
      'customer_transactions',
      'catalog_entries',
      'suppliers',
      'supplier_transactions',
      'staff_members',
    ];
    const payload = { device_id: this.deviceId, tables: {} };

    for (const name of tables) {
      const rows = await db[name]
        .where('updated_at')
        .above(this.lastSyncAt)
        .toArray();
      if (rows.length) payload.tables[name] = rows;
    }

    for (const name of ['settings', 'analytics']) {
      const all = await db[name].toArray();
      const changed = all.filter((r) => (r.updated_at || r.created_at || 0) > this.lastSyncAt);
      if (changed.length) payload.tables[name] = changed;
    }

    const hasData = Object.values(payload.tables).some((arr) => arr.length > 0);
    if (!hasData) return;

    const res = await fetchWithRetry(`${SYNC_API_BASE}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }, 3);

    if (!res.ok) {
      let friendly = `Push failed: ${res.status}`;
      try {
        const errBody = await res.json();
        if (res.status === 403 && errBody.missing_permission) {
          const permLabel = {
            can_add_records: 'record sales & expenses',
            can_delete_records: 'delete records',
            can_edit_settings: 'edit shop settings',
            can_view_reports: 'view reports',
          }[errBody.missing_permission] || errBody.missing_permission;
          friendly = `You don't have permission to ${permLabel}. Ask your shop owner to enable it in Team settings.`;
        } else if (errBody.error) {
          friendly = errBody.error;
        }
      } catch { /* ignore */ }
      throw new Error(friendly);
    }

    const response = await res.json();

    // Track business_id from server if returned
    if (response.business_id) {
      this.businessId = response.business_id;
      await db.settings.put({ key: BUSINESS_ID_KEY, value: response.business_id });
    }

    // Handle conflicts: re-pull and re-merge conflicting records
    if (response.conflicts && response.conflicts.length > 0) {
      const count = response.conflicts.length;
      const summary = `${count} record${count > 1 ? 's' : ''} had conflicting edits. The latest version was kept.`;
      this._warnConflict(summary);
      try { useSyncStore.getState().setLastConflicts(response.conflicts); } catch { /* ignore */ }
      await this._resolveConflicts(response.conflicts, token);
      try { useSyncStore.getState().setLastConflicts([]); } catch { /* ignore */ }
    }
  }

  async _resolveConflicts(conflicts, token) {
    // For each conflict, fetch the server record, merge with local, and re-push
    const conflictMap = {};
    const resolveConflicts = []; // collect field-level diffs

    for (const conflict of conflicts) {
      if (!conflictMap[conflict.table]) conflictMap[conflict.table] = [];
      conflictMap[conflict.table].push(conflict.localId);
    }

    for (const [tableName, localIds] of Object.entries(conflictMap)) {
      for (const localId of localIds) {
        try {
          // Fetch local record
          const localRecord = await db[tableName].get(localId);
          if (!localRecord) continue;

          // Fetch server record via pull
          const serverRes = await fetch(
            `${SYNC_API_BASE}/sync/pull?since=${(localRecord.updated_at || 0) - 1}&limit=50`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (!serverRes.ok) continue;
          const { tables } = await serverRes.json();
          const serverRows = tables?.[tableName] || [];
          const serverRecord = serverRows.find((r) => r.localId === localId || r.id === localId);
          if (!serverRecord) continue;

          // Compute diff before resolving
          const mappedServer = mapPullRow(serverRecord);
          const changedFields = this._diffFields(localRecord, mappedServer);
          if (changedFields.length > 0) {
            resolveConflicts.push({
              table: tableName,
              recordId: localId,
              transactionId: localRecord.transaction_id || null,
              changedFields,
              localVersion: localRecord,
              serverVersion: mappedServer,
            });
          }

          // Merge: accept server version but bump local version so next push wins
          const merged = { ...localRecord };
          merged.sync_version = (serverRecord.syncVersion || 1) + 1;
          merged.updated_at = Date.now();

          await db[tableName].put(merged);
        } catch (err) {
          if (import.meta.env.DEV) console.error('[sync] conflict resolution failed:', err);
        }
      }
    }

    // Re-push the merged records
    await this._pushAll(token);

    // Surface push-conflict diffs to the user
    if (resolveConflicts.length > 0) {
      const count = resolveConflicts.length;
      const summary = `${count} record${count > 1 ? 's' : ''} had conflicting edits. Your version was kept; here's what changed elsewhere:`;
      this._warnConflict(summary, resolveConflicts);
    }
  }

  async _pullAll(token) {
    const tables = [
      'transactions',
      'customers',
      'customer_transactions',
      'catalog_entries',
      'suppliers',
      'supplier_transactions',
      'staff_members',
    ];
    const kvTables = ['settings', 'analytics'];
    const allTables = [...tables, ...kvTables];

    let hasMore = true;
    let cursor = this.lastSyncAt;
    let pulledAny = false;
    const pullConflicts = []; // accumulate conflicts during pull

    // Paginated pull: keep pulling until no more pages
    while (hasMore) {
      const res = await fetchWithRetry(
        `${SYNC_API_BASE}/sync/pull?since=${cursor}&limit=200`,
        { headers: { 'Authorization': `Bearer ${token}` } },
        3
      );
      if (!res.ok) throw new Error(`Pull failed: ${res.status}`);
      const { tables: serverTables, hasMore: pageHasMore, nextCursor, business_id } = await res.json();
      if (!serverTables) break;

      // Track business_id from server
      if (business_id) {
        this.businessId = business_id;
        await db.settings.put({ key: BUSINESS_ID_KEY, value: business_id });
      }

      await db.transaction(
        'rw',
        db.transactions,
        db.customers,
        db.customer_transactions,
        db.catalog_entries,
        db.suppliers,
        db.supplier_transactions,
        db.staff_members,
        db.settings,
        db.analytics,
        async () => {
          for (const [name, rows] of Object.entries(serverTables)) {
            const table = db[name];
            if (!table || !rows?.length) continue;

            const isKeyValueTable = name === 'settings' || name === 'analytics';

            for (const row of rows) {
              const mapped = mapPullRow(row);

              if (isKeyValueTable) {
                // KV tables: merge by key, keep newer updated_at
                const local = await table.get(mapped.key);
                if (local && (local.updated_at || 0) >= (mapped.updated_at || 0)) continue;
                await table.put(mapped);
                continue;
              }

              // Data tables: merge by transaction_id (UUID) for cross-device safety.
              // Two devices can both generate localId=1, but never the same UUID.
              let local = null;
              if (mapped.transaction_id) {
                local = await table.where('transaction_id').equals(mapped.transaction_id).first();
              }
              if (!local) {
                // Fallback: match by integer id for legacy records without transaction_id
                local = await table.get(mapped.id);
              }

              if (!local) {
                // Brand new record from another device — assign a fresh local id
                delete mapped.id;
                await table.add(mapped);
              } else if (local.transaction_id && mapped.transaction_id && local.transaction_id === mapped.transaction_id) {
                // Same logical record (UUID match) — safe merge by timestamp
                if ((local.updated_at || 0) >= (mapped.updated_at || 0)) continue;
                // Collect conflict detail before overwriting
                const changedFields = this._diffFields(local, mapped);
                if (changedFields.length > 0) {
                  pullConflicts.push({
                    table: name,
                    recordId: local.id,
                    transactionId: mapped.transaction_id,
                    changedFields,
                    localVersion: local,
                    serverVersion: mapped,
                  });
                }
                await table.put({ ...mapped, id: local.id });
              } else {
                // Different record sharing the same integer id (collision) — assign new local id
                delete mapped.id;
                await table.add(mapped);
              }
            }

            // Track per-table last sync timestamp
            if (rows.length > 0) {
              const maxUpdatedAt = Math.max(...rows.map((r) => r.updatedAt || r.createdAt || 0));
              this.tableLastSync[name] = Math.max(this.tableLastSync[name] || 0, maxUpdatedAt);
              pulledAny = true;
            }
          }
        }
      );

      hasMore = !!pageHasMore;
      if (hasMore && nextCursor) {
        cursor = nextCursor;
      } else {
        hasMore = false;
      }

      // Safety: break if we've pulled too many pages
      if (!pulledAny && !hasMore) break;
    }

    // Surface pull conflicts to the user
    if (pullConflicts.length > 0) {
      const count = pullConflicts.length;
      const summary = `${count} record${count > 1 ? 's' : ''} updated elsewhere. Local edits were preserved where possible.`;
      this._warnConflict(summary, pullConflicts);
    }
  }

  destroy() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    if (this._pushDebounce) clearTimeout(this._pushDebounce);
    if (this.timer) clearInterval(this.timer);
  }
}

export async function initSyncEngine() {
  if (syncEngineInstance) return syncEngineInstance;
  syncEngineInstance = new SyncEngine();
  await syncEngineInstance.init();
  return syncEngineInstance;
}

export function getSyncEngine() {
  return syncEngineInstance;
}

export function destroySyncEngine() {
  syncEngineInstance?.destroy();
  syncEngineInstance = null;
}

/**
 * Trigger a full sync from the beginning of time. Call this after a user
 * joins a new business so their phone downloads the entire shop history.
 */
export async function forceFullSync() {
  if (!syncEngineInstance) return false;
  await syncEngineInstance.fullSync();
  return true;
}
