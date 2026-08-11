import {
  getPendingStaffOrders,
  getStaffOrdersNeedingAttention,
  reconcileStaffOrderSync,
  recordStaffOrderFailure,
} from "./offlineOrders";
import {
  getKitchenUpdatesNeedingAttention,
  getPendingKitchenUpdates,
  queueKitchenUpdate,
  reconcileKitchenOrderId,
  reconcileKitchenUpdateSync,
  recordKitchenUpdateFailure,
} from "./offlineKitchenUpdates";

export const SYNC_STATE_EVENT = "flexiorder:sync-state-changed";

let staffSync = null;
let kitchenSync = null;

const readyToRetry = (item, force = false) => !item.requiresAttention && (
  force || !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= Date.now()
);

const notify = (kind, detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_STATE_EVENT, { detail: { kind, ...detail } }));
};

const runStaffSync = async (api, { force = false } = {}) => {
  const snapshot = getPendingStaffOrders().filter((item) => readyToRetry(item, force));
  const failed = [];
  const syncedOrders = [];
  for (const queued of snapshot) {
    try {
      const response = await api.post("/orders", queued.payload);
      const order = response.data?.order || response.data;
      if (!order?._id) throw new Error("The server did not confirm the order.");
      syncedOrders.push({
        ...order,
        clientOrderId: queued.clientOrderId,
        pendingSync: false,
      });
      reconcileKitchenOrderId(queued.clientOrderId, order._id);
      if (queued.alreadyHandled && order?._id) {
        try {
          await api.put(`/kitchen/orders/${order._id}`, {
            status: "delivered",
            clientMutationId: queued.clientMutationId || queued.clientOrderId,
          });
        } catch {
          queueKitchenUpdate({
            orderId: order._id,
            status: "delivered",
            alreadyHandled: true,
            clientMutationId: queued.clientMutationId || queued.clientOrderId,
          });
        }
      }
    } catch (error) {
      const existingOrder = error?.response?.status === 409
        ? error.response.data?.order
        : null;
      if (existingOrder?._id) {
        syncedOrders.push({
          ...existingOrder,
          clientOrderId: queued.clientOrderId,
          pendingSync: false,
        });
        reconcileKitchenOrderId(queued.clientOrderId, existingOrder._id);
        if (queued.alreadyHandled) {
          queueKitchenUpdate({
            orderId: existingOrder._id,
            status: "delivered",
            alreadyHandled: true,
            clientMutationId: queued.clientMutationId || queued.clientOrderId,
          });
        }
      } else {
        failed.push(recordStaffOrderFailure(queued, error));
      }
    }
  }
  reconcileStaffOrderSync(snapshot, failed);
  const result = {
    syncedOrders,
    pending: getPendingStaffOrders().length,
    attention: getStaffOrdersNeedingAttention().length,
  };
  notify("staff-orders", result);
  return result;
};

export const syncPendingStaffOrders = (api, options = {}) => {
  if (staffSync) return staffSync;
  staffSync = runStaffSync(api, options).finally(() => { staffSync = null; });
  return staffSync;
};

const runKitchenSync = async (api, { force = false } = {}) => {
  const syncedByOrder = new Map();
  let firstPass = true;

  while (true) {
    const localOrderIds = new Set(getPendingStaffOrders().map((item) => String(item.clientOrderId)));
    const blockedBeforeReplay = new Set();
    const snapshot = [];
    getPendingKitchenUpdates().forEach((item) => {
      const orderId = String(item.orderId);
      if (blockedBeforeReplay.has(orderId)) return;
      if (
        localOrderIds.has(orderId) ||
        !readyToRetry(item, firstPass ? force : false)
      ) {
        blockedBeforeReplay.add(orderId);
        return;
      }
      snapshot.push(item);
    });
    firstPass = false;
    if (!snapshot.length) break;

    const failed = [];
    const updatesByOrder = new Map();
    snapshot.forEach((update) => {
      const orderId = String(update.orderId);
      updatesByOrder.set(orderId, [...(updatesByOrder.get(orderId) || []), update]);
    });
    await Promise.all([...updatesByOrder.entries()].map(async ([orderId, updates]) => {
      for (let index = 0; index < updates.length; index += 1) {
        const update = updates[index];
        try {
          const response = await api.put(`/kitchen/orders/${update.orderId}`, {
            status: update.status,
            pauseReason: update.pauseReason || null,
            clientMutationId: update.clientMutationId,
          });
          const responseOrder = response.data?.order || {
            _id: update.orderId,
            status: update.status,
            pauseReason: update.pauseReason || null,
          };
          syncedByOrder.set(orderId, {
            order: responseOrder,
            clientOrderId: update.localOrderId || responseOrder.clientOrderId,
          });
        } catch (error) {
          failed.push(recordKitchenUpdateFailure(update, error));
          failed.push(...updates.slice(index + 1));
          break;
        }
      }
    }));
    reconcileKitchenUpdateSync(snapshot, failed);
  }

  const pending = getPendingKitchenUpdates();
  const syncedOrders = [...syncedByOrder.entries()].map(([orderId, synced]) => ({
    ...synced.order,
    clientOrderId: synced.clientOrderId,
    pendingMutation: pending.some((item) => String(item.orderId) === orderId),
  }));
  const result = {
    syncedOrders,
    pending: pending.length,
    attention: getKitchenUpdatesNeedingAttention().length,
  };
  notify("kitchen-updates", result);
  return result;
};

export const syncPendingKitchenUpdates = (api, options = {}) => {
  if (kitchenSync) return kitchenSync;
  kitchenSync = runKitchenSync(api, options).finally(() => { kitchenSync = null; });
  return kitchenSync;
};
