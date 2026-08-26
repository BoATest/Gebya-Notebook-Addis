// Pure helpers for the sync engine: case conversion, pull-row mapping, and a
// fetch wrapper with exponential backoff. No module-level state.

export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function mapPullRow(row) {
  const mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const snakeKey = camelToSnake(key);
    mapped[snakeKey] = value;
  }
  // Preserve the origin (deviceId, localId) so later edits re-key to the same
  // server row even when local auto-increment ids collide across devices.
  if (row.localId != null) mapped.remote_local_id = row.localId;
  mapped.id = row.localId || row.id;
  return mapped;
}

export async function fetchWithRetry(url, options, retries = 3, baseDelay = 1000) {
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
  throw new Error("Unreachable");
}
