import { getScopedStorageKey } from "./storageScope";

const STORAGE_KEY = "flexiorder_pending_kitchen_updates";
const currentStorageKey = () => getScopedStorageKey(STORAGE_KEY);
const memoryQueues = new Map();

const readQueue = () => {
  const key = currentStorageKey();
  try {
    const stored = localStorage.getItem(key);
    const parsed = JSON.parse(stored ?? JSON.stringify(memoryQueues.get(key) || []));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryQueues.get(key) || [];
  }
};

const writeQueue = (updates) => {
  const key = currentStorageKey();
  try {
    localStorage.setItem(key, JSON.stringify(updates));
    memoryQueues.delete(key);
  } catch {
    memoryQueues.set(key, updates);
  }
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

export const discardKitchenUpdatesNeedingAttention = () => {
  const queue = readQueue();
  const rejectedOrderIds = new Set(queue
    .filter((item) => item.requiresAttention)
    .map((item) => String(item.orderId)));
  const next = queue.filter((item) => !rejectedOrderIds.has(String(item.orderId)));
  writeQueue(next);
  return next;
};

export const getKitchenRejectedRestorations = () => {
  const restorations = new Map();
  readQueue().forEach((item) => {
    if (!item.requiresAttention || restorations.has(String(item.orderId))) return;
    restorations.set(String(item.orderId), {
      orderId: item.orderId,
      status: item.confirmedStatus || "pending",
    });
  });
  return [...restorations.values()];
};

export const markKitchenUpdatesHandled = () => {
  const queue = readQueue();
  const handledOrderIds = new Set(queue
    .filter((item) => item.requiresAttention && item.ambiguousOutcome !== false)
    .map((item) => String(item.orderId)));
  const emitted = new Set();
  const next = queue.flatMap((item) => {
    const orderId = String(item.orderId);
    if (!handledOrderIds.has(orderId)) return [item];
    if (emitted.has(orderId)) return [];
    emitted.add(orderId);
    return [{
      ...item,
      status: "delivered",
      alreadyHandled: true,
      clientMutationId: globalThis.crypto?.randomUUID?.() ||
        `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requiresAttention: false,
      attemptCount: 0,
      nextAttemptAt: null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    }];
  });
  writeQueue(next);
  return next;
};

const mutationId = () => globalThis.crypto?.randomUUID?.() ||
  `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const appendKitchenUpdate = (queue, update) => {
  const existingMutation = update.clientMutationId && queue.find(
    (item) => item.clientMutationId === update.clientMutationId
  );
  if (existingMutation) return { queue, queued: existingMutation };

  const latestForOrder = [...queue].reverse().find(
    (item) => String(item.orderId) === String(update.orderId)
  );
  if (
    latestForOrder &&
    latestForOrder.status === update.status &&
    (latestForOrder.pauseReason || null) === (update.pauseReason || null) &&
    !latestForOrder.requiresAttention
  ) return { queue, queued: latestForOrder };

  const now = new Date().toISOString();
  const queued = {
    ...update,
    confirmedStatus: update.preserveConfirmedStatus
      ? update.confirmedStatus
      : latestForOrder?.confirmedStatus || update.confirmedStatus,
    clientMutationId: update.clientMutationId || mutationId(),
    queuedAt: update.queuedAt || now,
    updatedAt: now,
    attemptCount: Number(update.attemptCount || 0),
    lastAttemptAt: update.lastAttemptAt || null,
    nextAttemptAt: update.nextAttemptAt || null,
    lastError: update.lastError || null,
    requiresAttention: Boolean(update.requiresAttention),
  };
  return { queue: [...queue, queued], queued };
};

export const queueKitchenUpdates = (updates = []) => {
  let queue = readQueue();
  const queued = [];
  (Array.isArray(updates) ? updates : []).forEach((update) => {
    if (!update?.orderId || !update?.status) return;
    const result = appendKitchenUpdate(queue, update);
    queue = result.queue;
    if (!queued.some((item) => item.clientMutationId === result.queued.clientMutationId)) {
      queued.push(result.queued);
    }
  });
  writeQueue(queue);
  return queued;
};

export const queueKitchenUpdate = (update) => {
  const [queued] = queueKitchenUpdates([update]);
  return queued;
};

export const reconcileKitchenOrderId = (localOrderId, serverOrderId) => {
  if (!localOrderId || !serverOrderId) return readQueue();
  const next = readQueue().map((item) => (
    String(item.orderId) === String(localOrderId)
      ? {
        ...item,
        orderId: serverOrderId,
        localOrderId: item.localOrderId || localOrderId,
        updatedAt: new Date().toISOString(),
      }
      : item
  ));
  writeQueue(next);
  return next;
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
