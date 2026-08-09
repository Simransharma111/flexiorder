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
  const snapshot = getPendingKitchenUpdates().filter((item) => readyToRetry(item, force));
  const failed = [];
  const syncedOrders = [];
  for (const update of snapshot) {
    try {
      const response = await api.put(`/kitchen/orders/${update.orderId}`, {
        status: update.status,
        pauseReason: update.pauseReason || null,
        clientMutationId: update.clientMutationId,
      });
      if (response.data?.order) syncedOrders.push(response.data.order);
    } catch (error) {
      failed.push(recordKitchenUpdateFailure(update, error));
    }
  }
  reconcileKitchenUpdateSync(snapshot, failed);
  const result = {
    syncedOrders,
    pending: getPendingKitchenUpdates().length,
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
