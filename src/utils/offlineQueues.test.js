import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getKitchenUpdatesEligibleForHandled,
  getPendingKitchenUpdates,
  markKitchenUpdatesHandled,
  queueKitchenUpdate,
  reconcileKitchenUpdateSync,
  recordKitchenUpdateFailure,
} from "./offlineKitchenUpdates";
import {
  getPendingStaffOrders,
  getStaffOrdersEligibleForHandled,
  markStaffOrdersHandled,
  queueStaffOrder,
  reconcileStaffOrderSync,
  recordStaffOrderFailure,
} from "./offlineOrders";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
  };
};

describe("offline queues", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assigns an id and retry metadata to offline staff orders", () => {
    const queued = queueStaffOrder({ tableId: "table-1", items: [] });
    expect(queued.clientOrderId).toBeTruthy();
    expect(queued.payload.clientOrderId).toBe(queued.clientOrderId);
    expect(getPendingStaffOrders()).toHaveLength(1);

    const failed = recordStaffOrderFailure(queued, new Error("offline"));
    expect(failed.attemptCount).toBe(1);
    expect(failed.lastError).toBe("offline");
    expect(failed.lastAttemptAt).toBeTruthy();
  });

  it("keeps only the latest kitchen mutation for each order", () => {
    queueKitchenUpdate({ orderId: "order-1", status: "preparing" });
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    queueKitchenUpdate({ orderId: "order-2", status: "cancelled" });

    const queue = getPendingKitchenUpdates();
    expect(queue).toHaveLength(2);
    expect(queue.find((item) => item.orderId === "order-1")?.status).toBe("ready");
    expect(queue[0].clientMutationId).toBeTruthy();
  });

  it("records failed kitchen retries without losing the mutation", () => {
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    const failed = recordKitchenUpdateFailure(
      getPendingKitchenUpdates()[0],
      new Error("timeout")
    );
    expect(failed.attemptCount).toBe(1);
    expect(failed.lastError).toBe("timeout");
  });

  it("keeps work queued while an earlier replay snapshot is in flight", () => {
    const firstOrder = queueStaffOrder({ tableId: "table-1", items: [] });
    const staffSnapshot = getPendingStaffOrders();
    queueStaffOrder({ tableId: "table-2", items: [] });
    expect(reconcileStaffOrderSync(staffSnapshot, [firstOrder])).toHaveLength(2);

    queueKitchenUpdate({ orderId: "order-1", status: "preparing" });
    const kitchenSnapshot = getPendingKitchenUpdates();
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    expect(reconcileKitchenUpdateSync(kitchenSnapshot, [kitchenSnapshot[0]])[0].status).toBe("ready");
  });

  it("isolates offline orders between authenticated users", () => {
    localStorage.setItem("user", JSON.stringify({ _id: "staff-1" }));
    queueStaffOrder({ tableId: "table-1", items: [] });
    localStorage.setItem("user", JSON.stringify({ _id: "staff-2" }));
    expect(getPendingStaffOrders()).toEqual([]);
  });

  it("recovers from valid non-array queue data", () => {
    localStorage.setItem(
      "flexiorder_pending_staff_orders:anonymous",
      JSON.stringify({ invalid: true })
    );
    expect(getPendingStaffOrders()).toEqual([]);
  });

  it("batch-clears only ambiguous work marked as already handled", () => {
    const staff = queueStaffOrder({ tableId: "table-1", items: [] });
    const staffFailure = recordStaffOrderFailure({ ...staff, attemptCount: 7 }, new Error("connection lost"));
    reconcileStaffOrderSync([staff], [staffFailure]);
    expect(markStaffOrdersHandled()).toEqual([expect.objectContaining({ alreadyHandled: true, requiresAttention: false })]);

    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    const kitchen = getPendingKitchenUpdates()[0];
    const kitchenFailure = recordKitchenUpdateFailure({ ...kitchen, attemptCount: 7 }, new Error("connection lost"));
    reconcileKitchenUpdateSync([kitchen], [kitchenFailure]);
    expect(markKitchenUpdatesHandled()).toEqual([expect.objectContaining({ alreadyHandled: true, requiresAttention: false, status: "delivered" })]);
  });

  it("does not mark rejected mutations as already handled", () => {
    const staff = queueStaffOrder({ tableId: "table-1", items: [] });
    const rejectedStaff = recordStaffOrderFailure(staff, { response: { status: 400 } });
    reconcileStaffOrderSync([staff], [rejectedStaff]);
    expect(getStaffOrdersEligibleForHandled()).toHaveLength(0);
    expect(markStaffOrdersHandled()[0].requiresAttention).toBe(true);

    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    const kitchen = getPendingKitchenUpdates()[0];
    const rejectedKitchen = recordKitchenUpdateFailure(kitchen, { response: { status: 409 } });
    reconcileKitchenUpdateSync([kitchen], [rejectedKitchen]);
    expect(getKitchenUpdatesEligibleForHandled()).toHaveLength(0);
    expect(markKitchenUpdatesHandled()[0]).toMatchObject({ status: "ready", requiresAttention: true });
  });
});
