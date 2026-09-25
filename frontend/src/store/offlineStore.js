/**
 * Minimal offline store — NFR-3/NFR-4/FR-E4.
 *
 * Real version: IndexedDB, full 7-day offline window, conflict-flagged
 * reconciliation (completion never loses to non-completion). This v0
 * implementation uses localStorage as a stand-in for IndexedDB so the
 * queue and timeline screens can be built and demoed against a real
 * offline-first contract today; swap the storage backend, not the API,
 * when IndexedDB is wired in.
 *
 * IMPORTANT: this is a client convenience only. It is never the source of
 * truth — the record service is. Every write here queues for sync.
 */

const QUEUE_KEY = "punarnava:sync_queue";
const CACHE_KEY = "punarnava:cache";

export function queueWrite(action) {
  const queue = getQueue();
  queue.push({ ...action, client_timestamp: new Date().toISOString(), synced: false });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function cache(key, value) {
  const c = getCache();
  c[key] = { value, cached_at: new Date().toISOString() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(c));
}

export function getCached(key) {
  const c = getCache();
  return c[key]?.value ?? null;
}

function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Last-write-wins, EXCEPT: a completion state never loses to a
 * non-completion state (PRD sync model). Call this when reconciling a
 * server response against a pending local write of the same milestone. */
export function resolveConflict(local, remote) {
  if (local.outcome === "done" && remote.state !== "done") return local;
  if (new Date(local.client_timestamp) > new Date(remote.updated_at || 0)) return local;
  return remote;
}

export async function flushQueue(sendFn) {
  const queue = getQueue();
  const remaining = [];
  for (const item of queue) {
    if (item.synced) continue;
    try {
      await sendFn(item);
      // synced successfully, drop from queue
    } catch {
      remaining.push(item); // stays queued, retried next flush
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return remaining.length;
}
