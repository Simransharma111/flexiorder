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
  const terminalClientError = status >= 400 && status < 500 && ![408, 429].includes(status);
  const queuedForTwoMinutes = Date.now() - new Date(item.queuedAt || 0).getTime() >= 120000;
  return terminalClientError || Number(item.attemptCount || 0) + 1 >= 8 || queuedForTwoMinutes;
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
    lastError: null,
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
    lastError: null,
  } : item);
  writeQueue(next);
  return next;
};

export const queueStaffOrder = (payload) => {
  const clientOrderId =
    globalThis.crypto?.randomUUID?.() ||
    `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const queuedOrder = {
    clientOrderId,
    queuedAt: new Date().toISOString(),
    attemptCount: 0,
    lastAttemptAt: null,
    lastError: null,
    payload: { ...payload, clientOrderId },
  };

  writeQueue([...readQueue(), queuedOrder]);
  return queuedOrder;
};

export const reconcileStaffOrderSync = (snapshot, failed) => {
  const snapshotIds = new Set(snapshot.map((item) => item.clientOrderId));
  const additions = readQueue().filter(
    (item) => !snapshotIds.has(item.clientOrderId)
  );
  writeQueue([...failed, ...additions]);
  return readQueue();
};

export const recordStaffOrderFailure = (queuedOrder, error) => ({
  ...queuedOrder,
  attemptCount: Number(queuedOrder.attemptCount || 0) + 1,
  lastAttemptAt: new Date().toISOString(),
  lastError: errorMessage(error),
  ambiguousOutcome: isAmbiguousFailure(error),
  requiresAttention: needsAttention(queuedOrder, error),
});
