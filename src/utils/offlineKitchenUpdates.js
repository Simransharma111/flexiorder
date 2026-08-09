import { getScopedStorageKey } from "./storageScope";

const STORAGE_KEY = "flexiorder_pending_kitchen_updates";
const currentStorageKey = () => getScopedStorageKey(STORAGE_KEY);

const readQueue = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(currentStorageKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (updates) => {
  localStorage.setItem(currentStorageKey(), JSON.stringify(updates));
};

const errorMessage = (error) => (
  error?.response?.data?.message || error?.message || "Sync failed"
);

const isAmbiguousFailure = (error) => !error?.response ||
  Number(error.response.status || 0) >= 500;

const needsAttention = (item, error) => {
  const status = Number(error?.response?.status || 0);
  // Only terminal client errors (4xx, excluding transient 408/429) need user action.
  // Network failures, 5xx, and timeouts are retried silently forever.
  return status >= 400 && status < 500 && ![408, 429].includes(status);
};

export const getPendingKitchenUpdates = () => readQueue();
export const getKitchenUpdateErrors = () =>
  readQueue()
    .filter((item) => item.requiresAttention && item.lastError)
    .map((item) => ({ orderId: item.orderId, error: item.lastError }));
export const getKitchenUpdatesNeedingAttention = () => (
  readQueue().filter((item) => item.requiresAttention)
);
export const getKitchenUpdatesEligibleForHandled = () => (
  readQueue().filter((item) => item.requiresAttention && item.ambiguousOutcome !== false)
);

export const retryKitchenUpdatesNeedingAttention = () => {
  const next = readQueue().map((item) => item.requiresAttention ? {
    ...item,
    requiresAttention: false,
    attemptCount: 0,
    nextAttemptAt: null,
    lastError: null,
  } : item);
  writeQueue(next);
  return next;
};

export const markKitchenUpdatesHandled = () => {
  const next = readQueue().map((item) => item.requiresAttention && item.ambiguousOutcome !== false ? {
    ...item,
    status: "delivered",
    alreadyHandled: true,
    requiresAttention: false,
    attemptCount: 0,
    nextAttemptAt: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
  } : item);
  writeQueue(next);
  return next;
};

export const queueKitchenUpdate = (update) => {
  const queue = readQueue();
  const existingIndex = queue.findIndex(
    (item) => item.orderId === update.orderId
  );

  if (existingIndex === -1) {
    writeQueue([...queue, {
      ...update,
      clientMutationId:
        update.clientMutationId ||
        globalThis.crypto?.randomUUID?.() ||
        `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      queuedAt: update.queuedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attemptCount: Number(update.attemptCount || 0),
      lastAttemptAt: update.lastAttemptAt || null,
      nextAttemptAt: update.nextAttemptAt || null,
      lastError: update.lastError || null,
    }]);
    return;
  }

  const nextQueue = [...queue];
  nextQueue[existingIndex] = {
    ...nextQueue[existingIndex],
    ...update,
    updatedAt: new Date().toISOString(),
    lastError: null,
    requiresAttention: false,
  };
  writeQueue(nextQueue);
};

export const reconcileKitchenUpdateSync = (snapshot, failed) => {
  const snapshotById = new Map(
    snapshot.map((item) => [item.clientMutationId, item])
  );
  const changedDuringSync = readQueue().filter((item) => {
    const original = snapshotById.get(item.clientMutationId);
    return !original ||
      original.updatedAt !== item.updatedAt ||
      original.status !== item.status ||
      original.pauseReason !== item.pauseReason;
  });
  const changedIds = new Set(changedDuringSync.map((item) => item.clientMutationId));
  writeQueue([
    ...failed.filter((item) => !changedIds.has(item.clientMutationId)),
    ...changedDuringSync,
  ]);
  return readQueue();
};

export const recordKitchenUpdateFailure = (update, error) => ({
  ...update,
  attemptCount: Number(update.attemptCount || 0) + 1,
  lastAttemptAt: new Date().toISOString(),
  nextAttemptAt: needsAttention(update, error)
    ? null
    : new Date(Date.now() + Math.min(
      120000,
      1000 * (2 ** Math.min(Number(update.attemptCount || 0) + 1, 7))
    )).toISOString(),
  lastError: errorMessage(error),
  ambiguousOutcome: isAmbiguousFailure(error),
  requiresAttention: needsAttention(update, error),
});
