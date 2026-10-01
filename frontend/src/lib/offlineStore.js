const STORAGE_KEY = "punarnava_offline_queue";

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue() {
  return readQueue();
}

export function queueRequest(request) {
  const queue = readQueue();

  const item = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    ...request,
  };

  queue.push(item);
  writeQueue(queue);

  return item;
}

export function removeQueuedRequest(id) {
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function clearOfflineQueue() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getOfflineQueueCount() {
  return readQueue().length;
}

export async function syncOfflineQueue(sendRequest) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, remaining: readQueue().length };
  }

  const queue = readQueue();
  let synced = 0;

  for (const item of queue) {
    try {
      await sendRequest(item);
      removeQueuedRequest(item.id);
      synced += 1;
    } catch {
      break;
    }
  }

  return {
    synced,
    remaining: getOfflineQueueCount(),
  };
}
