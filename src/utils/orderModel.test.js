import { describe, expect, it } from "vitest";
import {
  groupOrdersByLocation,
  mergeOrderUpdate,
  mergeOrders,
  nextOrderStatus,
  orderLocation,
  reconcileAuthoritativeOrders,
} from "./orderModel";

describe("order model", () => {
  it("never lets stale polling regress an optimistic status", () => {
    const current = [{ _id: "1", status: "ready", updatedAt: "2026-01-02" }];
    const incoming = [{ _id: "1", status: "pending", updatedAt: "2026-01-03" }];
    expect(mergeOrders(current, incoming)[0].status).toBe("ready");
  });

  it("deduplicates socket and polling copies", () => {
    expect(mergeOrders([{ _id: "1", status: "pending" }], [{ _id: "1", status: "accepted" }]))
      .toEqual([{ _id: "1", status: "accepted" }]);
  });

  it("groups separate records by location without losing order boundaries", () => {
    const grouped = groupOrdersByLocation([
      { _id: "1", status: "pending", locationNumber: "8", items: [{ name: "Naan", quantity: 1 }] },
      { _id: "2", status: "pending", locationNumber: "8", items: [{ name: "Dal", quantity: 2 }] },
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].orders.map((order) => order._id)).toEqual(["1", "2"]);
    expect(grouped[0].items).toHaveLength(2);
  });

  it("keeps kitchen ready cards stationary and lets waiter deliver", () => {
    expect(nextOrderStatus("pending", "kitchen")).toBe("preparing");
    expect(nextOrderStatus("preparing", "kitchen")).toBe("ready");
    expect(nextOrderStatus("accepted", "kitchen")).toBe("ready");
    expect(nextOrderStatus("paused", "kitchen")).toBe("preparing");
    expect(nextOrderStatus("ready", "kitchen")).toBeNull();
    expect(nextOrderStatus("ready", "waiter")).toBe("delivered");
    expect(orderLocation({ locationType: "room", locationNumber: 101 })).toBe("Room 101");
  });

  it("uses direct God Mode transitions without changing paused or kitchen Ready rules", () => {
    const godMode = { godModeEnabled: true };
    expect(nextOrderStatus("pending", "kitchen", godMode)).toBe("ready");
    expect(nextOrderStatus("accepted", "kitchen", godMode)).toBe("ready");
    expect(nextOrderStatus("preparing", "waiter", godMode)).toBe("ready");
    expect(nextOrderStatus("ready", "waiter", godMode)).toBe("delivered");
    expect(nextOrderStatus("ready", "kitchen", godMode)).toBeNull();
    expect(nextOrderStatus("paused", "kitchen", godMode)).toBe("preparing");
  });

  it("reads nested table records and common takeaway shapes", () => {
    expect(orderLocation({ tableId: { tableNumber: "8", type: "table" } })).toBe("Table 8");
    expect(orderLocation({ table: { locationNumber: "101", locationType: "room" } })).toBe("Room 101");
    expect(orderLocation({ orderType: "take-away", tableId: null })).toBe("Takeaway");
    expect(orderLocation({ serviceType: "pickup" })).toBe("Takeaway");
  });

  it("reconciles an offline placeholder with its server id", () => {
    const merged = mergeOrders(
      [{ _id: "local-1", clientOrderId: "client-1", status: "pending", pendingSync: true }],
      [{ _id: "server-1", clientOrderId: "client-1", status: "accepted" }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ _id: "server-1", status: "accepted", pendingSync: false });
  });

  it("deduplicates an id-only server update and clears completed mutation state", () => {
    const result = mergeOrderUpdate(
      [{
        _id: "server-1",
        clientOrderId: "client-1",
        status: "ready",
        pendingMutation: true,
        updatedAt: "2026-08-11T12:00:00Z",
      }],
      { _id: "server-1", status: "ready" },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      _id: "server-1",
      clientOrderId: "client-1",
      status: "ready",
      pendingMutation: false,
    });
  });

  it("uses an authoritative snapshot while retaining queued local mutations", () => {
    const result = reconcileAuthoritativeOrders(
      [{ _id: "one", status: "ready" }, { _id: "removed", status: "pending" }],
      [{ _id: "one", status: "pending" }],
      [{ orderId: "one", status: "preparing" }],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ _id: "one", status: "preparing", pendingMutation: true });
  });

  it("does not let a stale authoritative snapshot resurrect a delivered order", () => {
    const result = reconcileAuthoritativeOrders(
      [{ _id: "one", status: "delivered", updatedAt: "2026-08-11T12:00:00Z" }],
      [{ _id: "one", status: "ready", updatedAt: "2026-08-11T12:00:01Z" }],
      [],
    );
    expect(result[0].status).toBe("delivered");
  });

  it("does not group unrelated takeaway or unknown-location orders", () => {
    const groups = groupOrdersByLocation([
      { _id: "take-1", orderType: "takeaway", status: "pending", items: [] },
      { _id: "take-2", orderType: "takeaway", status: "pending", items: [] },
      { _id: "unknown-1", status: "pending", items: null },
      { _id: "unknown-2", status: "pending", items: {} },
    ]);
    expect(groups).toHaveLength(4);
  });
});
