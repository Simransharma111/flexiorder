import { getScopedStorageKey } from "./storageScope";

const STORAGE_KEY = "flexiorder_pending_staff_orders";
const currentStorageKey = () => getScopedStorageKey(STORAGE_KEY);

const readQueue = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(currentStorageKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (orders) => {
  localStorage.setItem(currentStorageKey(), JSON.stringify(orders));
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

export const getPendingStaffOrders = () => readQueue();
export const getStaffOrdersNeedingAttention = () => (
  readQueue().filter((item) => item.requiresAttention)
);
export const getStaffOrdersEligibleForHandled = () => (
  readQueue().filter((item) => item.requiresAttention && item.ambiguousOutcome !== false)
);

export const retryStaffOrdersNeedingAttention = () => {
  const next = readQueue().map((item) => item.requiresAttention ? {
    ...item,
    requiresAttention: false,
    attemptCount: 0,
    nextAttemptAt: null,
    lastError: null,
    updatedAt: new Date().toISOString(),
  } : item);
  writeQueue(next);
  return next;
};

export const markStaffOrdersHandled = () => {
  const next = readQueue().map((item) => item.requiresAttention && item.ambiguousOutcome !== false ? {
    ...item,
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

export const queueStaffOrder = (payload) => {
  const clientOrderId =
    payload?.clientOrderId || globalThis.crypto?.randomUUID?.() ||
    `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const existing = readQueue().find((item) => item.clientOrderId === clientOrderId);
  if (existing) return existing;

  const now = new Date().toISOString();

  const queuedOrder = {
    clientOrderId,
    queuedAt: now,
    updatedAt: now,
    attemptCount: 0,
    lastAttemptAt: null,
    lastError: null,
    payload: { ...payload, clientOrderId },
  };

  writeQueue([...readQueue(), queuedOrder]);
  return queuedOrder;
};

export const reconcileStaffOrderSync = (snapshot, failed) => {
  const snapshotById = new Map(snapshot.map((item) => [item.clientOrderId, item]));
  const changedDuringSync = readQueue().filter((item) => {
    const original = snapshotById.get(item.clientOrderId);
    return !original || original.updatedAt !== item.updatedAt ||
      original.alreadyHandled !== item.alreadyHandled;
  });
  const changedIds = new Set(changedDuringSync.map((item) => item.clientOrderId));
  writeQueue([
    ...failed.filter((item) => !changedIds.has(item.clientOrderId)),
    ...changedDuringSync,
  ]);
  return readQueue();
};

export const recordStaffOrderFailure = (queuedOrder, error) => ({
  ...queuedOrder,
  attemptCount: Number(queuedOrder.attemptCount || 0) + 1,
  lastAttemptAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nextAttemptAt: needsAttention(queuedOrder, error)
    ? null
    : new Date(Date.now() + Math.min(
      120000,
      1000 * (2 ** Math.min(Number(queuedOrder.attemptCount || 0) + 1, 7))
    )).toISOString(),
  lastError: errorMessage(error),
  ambiguousOutcome: isAmbiguousFailure(error),
  requiresAttention: needsAttention(queuedOrder, error),
});
