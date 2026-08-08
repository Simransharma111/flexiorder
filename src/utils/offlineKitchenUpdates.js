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

const needsAttention = (item, error) => {
  const status = Number(error?.response?.status || 0);
  const terminalClientError = status >= 400 && status < 500 && ![408, 429].includes(status);
  const queuedForTwoMinutes = Date.now() - new Date(item.queuedAt || 0).getTime() >= 120000;
  return terminalClientError || Number(item.attemptCount || 0) + 1 >= 8 || queuedForTwoMinutes;
};

export const getPendingKitchenUpdates = () => readQueue();
export const getKitchenUpdatesNeedingAttention = () => (
  readQueue().filter((item) => item.requiresAttention)
);

export const retryKitchenUpdatesNeedingAttention = () => {
  const next = readQueue().map((item) => item.requiresAttention ? {
    ...item,
    requiresAttention: false,
    attemptCount: 0,
    lastError: null,
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
  lastError: errorMessage(error),
  requiresAttention: needsAttention(update, error),
});
