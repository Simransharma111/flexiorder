const STORAGE_KEY = "flexiorder_pending_staff_orders";

const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeQueue = (orders) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const getPendingStaffOrders = () => readQueue();

export const queueStaffOrder = (payload) => {
  const clientOrderId =
    globalThis.crypto?.randomUUID?.() ||
    `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const queuedOrder = {
    clientOrderId,
    queuedAt: new Date().toISOString(),
    payload: { ...payload, clientOrderId },
  };

  writeQueue([...readQueue(), queuedOrder]);
  return queuedOrder;
};

export const replacePendingStaffOrders = (orders) => {
  writeQueue(orders);
};
