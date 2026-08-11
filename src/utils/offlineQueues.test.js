import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  discardKitchenUpdatesNeedingAttention,
  getKitchenRejectedRestorations,
  getKitchenUpdatesEligibleForHandled,
  getPendingKitchenUpdates,
  markKitchenUpdatesHandled,
  queueKitchenUpdate,
  queueKitchenUpdates,
  reconcileKitchenOrderId,
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
import { syncPendingKitchenUpdates, syncPendingStaffOrders } from "./syncQueues";

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

  it("uses one stable staff order id before and during replay", () => {
    const first = queueStaffOrder({ clientOrderId: "client-order-1", tableId: "table-1", items: [] });
    const duplicate = queueStaffOrder({ clientOrderId: "client-order-1", tableId: "table-1", items: [] });
    expect(first.clientOrderId).toBe("client-order-1");
    expect(duplicate).toEqual(first);
    expect(getPendingStaffOrders()).toHaveLength(1);
  });

  it("keeps distinct kitchen transitions ordered and deduplicates repeated taps", () => {
    queueKitchenUpdate({ orderId: "order-1", status: "preparing" });
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    queueKitchenUpdate({ orderId: "order-2", status: "cancelled" });

    const queue = getPendingKitchenUpdates();
    expect(queue).toHaveLength(3);
    expect(queue.filter((item) => item.orderId === "order-1").map((item) => item.status))
      .toEqual(["preparing", "ready"]);
    expect(queue[0].clientMutationId).toBeTruthy();
    expect(queue[1].clientMutationId).not.toBe(queue[0].clientMutationId);
  });

  it("queues a bulk status update with one durable write and one stable id per order", () => {
    localStorage.setItem.mockClear();
    const queued = queueKitchenUpdates([
      { orderId: "ready-1", status: "delivered", confirmedStatus: "ready" },
      { orderId: "ready-2", status: "delivered", confirmedStatus: "ready" },
      { orderId: "ready-1", status: "delivered", confirmedStatus: "ready" },
    ]);

    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(queued).toHaveLength(2);
    expect(new Set(queued.map((item) => item.clientMutationId)).size).toBe(2);
    expect(getPendingKitchenUpdates()).toEqual(queued);

    const replayed = queueKitchenUpdates([
      { orderId: "ready-1", status: "delivered", confirmedStatus: "ready" },
      { orderId: "ready-2", status: "delivered", confirmedStatus: "ready" },
    ]);
    expect(replayed.map((item) => item.clientMutationId))
      .toEqual(queued.map((item) => item.clientMutationId));
    expect(getPendingKitchenUpdates()).toHaveLength(2);
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
    expect(reconcileKitchenUpdateSync(kitchenSnapshot, [kitchenSnapshot[0]])
      .map((item) => item.status)).toEqual(["preparing", "ready"]);
  });

  it("serializes a next transition added while the first request is slow", async () => {
    let releaseFirst;
    const firstResponse = new Promise((resolve) => { releaseFirst = resolve; });
    const statuses = [];
    const api = {
      put: vi.fn(async (_url, payload) => {
        statuses.push(payload.status);
        if (payload.status === "preparing") await firstResponse;
        return { data: { order: { _id: "order-1", status: payload.status } } };
      }),
    };

    queueKitchenUpdate({ orderId: "order-1", status: "preparing" });
    const syncing = syncPendingKitchenUpdates(api);
    await vi.waitFor(() => expect(statuses).toEqual(["preparing"]));
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    releaseFirst();
    await syncing;

    expect(statuses).toEqual(["preparing", "ready"]);
    expect(getPendingKitchenUpdates()).toEqual([]);
  });

  it("syncs different server orders concurrently while preserving per-order order", async () => {
    let releaseFirst;
    const firstResponse = new Promise((resolve) => { releaseFirst = resolve; });
    const started = [];
    const api = {
      put: vi.fn(async (url, payload) => {
        started.push(`${url}:${payload.status}`);
        if (url.endsWith("order-1") && payload.status === "preparing") await firstResponse;
        return { data: { order: { _id: url.split("/").pop(), status: payload.status } } };
      }),
    };
    queueKitchenUpdate({ orderId: "order-1", status: "preparing" });
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    queueKitchenUpdate({ orderId: "order-2", status: "preparing" });

    const syncing = syncPendingKitchenUpdates(api);
    await vi.waitFor(() => expect(started).toContain("/kitchen/orders/order-2:preparing"));
    expect(started).not.toContain("/kitchen/orders/order-1:ready");
    releaseFirst();
    await syncing;
    expect(started.indexOf("/kitchen/orders/order-1:ready"))
      .toBeGreaterThan(started.indexOf("/kitchen/orders/order-1:preparing"));
  });

  it("clears pending state when a successful PUT omits the order body", async () => {
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    const result = await syncPendingKitchenUpdates({
      put: vi.fn(async () => ({ data: { success: true } })),
    });
    expect(result.syncedOrders).toEqual([
      expect.objectContaining({ _id: "order-1", status: "ready", pendingMutation: false }),
    ]);
    expect(getPendingKitchenUpdates()).toEqual([]);
  });

  it("keeps queue operations usable when localStorage writes fail", () => {
    localStorage.setItem.mockImplementation(() => { throw new Error("storage full"); });
    expect(() => queueKitchenUpdate({ orderId: "order-storage", status: "preparing" }))
      .not.toThrow();
    expect(getPendingKitchenUpdates()).toEqual([
      expect.objectContaining({ orderId: "order-storage", status: "preparing" }),
    ]);
    expect(() => queueStaffOrder({ clientOrderId: "staff-storage", items: [] })).not.toThrow();
    expect(getPendingStaffOrders()).toEqual([
      expect.objectContaining({ clientOrderId: "staff-storage" }),
    ]);
    localStorage.setItem.mockImplementation(() => {});
    reconcileKitchenUpdateSync(getPendingKitchenUpdates(), []);
    reconcileStaffOrderSync(getPendingStaffOrders(), []);
  });

  it("reconciles a local order id before replaying its queued transition", async () => {
    queueStaffOrder({ clientOrderId: "local-order", tableId: "table-1", items: [] });
    queueKitchenUpdate({ orderId: "local-order", status: "preparing" });
    const api = {
      post: vi.fn(async () => ({ data: { order: { _id: "server-order", status: "pending" } } })),
      put: vi.fn(async (url, payload) => ({ data: { order: { _id: "server-order", status: payload.status, url } } })),
    };

    await syncPendingKitchenUpdates(api);
    expect(api.put).not.toHaveBeenCalled();
    await syncPendingStaffOrders(api);
    expect(getPendingKitchenUpdates()[0].orderId).toBe("server-order");
    await syncPendingKitchenUpdates(api);
    expect(api.put).toHaveBeenCalledWith(
      "/kitchen/orders/server-order",
      expect.objectContaining({ status: "preparing" }),
    );
  });

  it("can remap every queued transition for an unsynced local order", () => {
    queueKitchenUpdate({ orderId: "local-order", status: "preparing" });
    queueKitchenUpdate({ orderId: "local-order", status: "ready" });
    expect(reconcileKitchenOrderId("local-order", "server-order").map((item) => item.orderId))
      .toEqual(["server-order", "server-order"]);
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
    // Use a 503 (ambiguous server error) to set requiresAttention via the
    // legacy markStaffOrdersHandled path. Note: with the new retry policy
    // pure network errors no longer set requiresAttention; only 4xx terminal
    // errors do. The markHandled path still clears ambiguous (5xx) items that
    // were manually flagged, so we force requiresAttention directly here.
    const staffFailure = { ...recordStaffOrderFailure(staff, new Error("connection lost")), requiresAttention: true, ambiguousOutcome: true };
    reconcileStaffOrderSync([staff], [staffFailure]);
    expect(markStaffOrdersHandled()).toEqual([expect.objectContaining({ alreadyHandled: true, requiresAttention: false })]);

    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    const kitchen = getPendingKitchenUpdates()[0];
    const kitchenFailure = { ...recordKitchenUpdateFailure(kitchen, new Error("connection lost")), requiresAttention: true, ambiguousOutcome: true };
    reconcileKitchenUpdateSync([kitchen], [kitchenFailure]);
    expect(markKitchenUpdatesHandled()).toEqual([expect.objectContaining({ alreadyHandled: true, requiresAttention: false, status: "delivered" })]);
  });

  it("collapses handled mutation chains so delivered cannot replay backward", () => {
    queueKitchenUpdate({ orderId: "order-1", status: "preparing" });
    const first = getPendingKitchenUpdates()[0];
    const failed = {
      ...recordKitchenUpdateFailure(first, new Error("unknown outcome")),
      requiresAttention: true,
      ambiguousOutcome: true,
    };
    reconcileKitchenUpdateSync([first], [failed]);
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });

    const handled = markKitchenUpdatesHandled();
    expect(handled).toHaveLength(1);
    expect(handled[0]).toMatchObject({ orderId: "order-1", status: "delivered", alreadyHandled: true });
    expect(handled[0].clientMutationId).not.toBe(first.clientMutationId);
  });

  it("discards a rejected chain and exposes its confirmed restoration", () => {
    queueKitchenUpdate({ orderId: "order-1", status: "preparing", confirmedStatus: "pending" });
    const first = getPendingKitchenUpdates()[0];
    reconcileKitchenUpdateSync([first], [recordKitchenUpdateFailure(first, { response: { status: 409 } })]);
    queueKitchenUpdate({ orderId: "order-1", status: "ready" });
    expect(getKitchenRejectedRestorations()).toEqual([{ orderId: "order-1", status: "pending" }]);
    expect(discardKitchenUpdatesNeedingAttention()).toEqual([]);
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
