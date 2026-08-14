import { describe, expect, it } from "vitest";
import {
  getActiveOrderIds,
  groupOrdersByLocation,
  mergeOrderUpdate,
  mergeOrders,
  nextOrderStatus,
  orderBelongsToHotel,
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

  it("accepts realtime orders only for the active restaurant", () => {
    expect(orderBelongsToHotel({ hotelId: "hotel-1" }, "hotel-1")).toBe(true);
    expect(orderBelongsToHotel({ hotelId: { _id: "hotel-1" } }, "hotel-1")).toBe(true);
    expect(orderBelongsToHotel({ hotelId: "hotel-2" }, "hotel-1")).toBe(false);
    expect(orderBelongsToHotel({ _id: "order-without-hotel" }, "hotel-1")).toBe(false);
  });

  it("freezes and revalidates every unblocked active order identity", () => {
    const initial = [
      { _id: "pending-1", status: "pending" },
      { _id: "ready-2", clientOrderId: "local-ready-2", status: "ready" },
      { _id: "preparing-1", status: "preparing" },
      { _id: "paused-1", status: "paused" },
      { _id: "attention-1", status: "accepted" },
      { _id: "delivered-1", status: "delivered" },
      { _id: "cancelled-1", status: "cancelled" },
    ];
    const frozen = getActiveOrderIds(initial, null, ["attention-1"]);
    expect(frozen).toEqual(["pending-1", "ready-2", "preparing-1", "paused-1"]);

    const changed = [
      { _id: "pending-1", status: "delivered" },
      { _id: "ready-2", clientOrderId: "local-ready-2", status: "ready" },
      { _id: "preparing-1", status: "cancelled" },
      { _id: "paused-1", status: "preparing" },
      { _id: "new-active", status: "pending" },
    ];
    expect(getActiveOrderIds(changed, frozen)).toEqual(["ready-2", "paused-1"]);
  });

  it("deduplicates active aliases and excludes a terminal duplicate", () => {
    expect(getActiveOrderIds([
      { _id: "server-ready", clientOrderId: "local-ready", status: "ready" },
      { _id: "local-ready", status: "ready" },
    ])).toEqual(["server-ready"]);
    expect(getActiveOrderIds([
      { _id: "local-terminal", status: "pending" },
      { _id: "server-terminal", clientOrderId: "local-terminal", status: "delivered" },
    ])).toEqual([]);
  });

  it("uses a newer explicit correction and the real server id across aliases", () => {
    expect(getActiveOrderIds([
      {
        _id: "server-1",
        clientOrderId: "local-1",
        status: "delivered",
        updatedAt: "2026-08-11T12:00:01Z",
      },
      {
        _id: "local-1",
        clientOrderId: "local-1",
        status: "ready",
        reverted: true,
        statusChangeType: "revert",
        updatedAt: "2026-08-11T12:00:02Z",
      },
    ])).toEqual(["server-1"]);
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

  it("clears correction markers after authoritative confirmation", () => {
    const result = mergeOrderUpdate(
      [{
        _id: "server-1",
        status: "ready",
        reverted: true,
        statusChangeType: "revert",
        pendingMutation: true,
        updatedAt: "2026-08-11T12:00:00Z",
      }],
      { _id: "server-1", status: "ready", updatedAt: "2026-08-11T12:00:01Z" },
      [],
    );
    expect(result[0]).toMatchObject({
      status: "ready",
      pendingMutation: false,
      reverted: false,
    });
    expect(result[0].statusChangeType).toBeUndefined();
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

  it("does not let an older terminal snapshot overwrite an explicit correction", () => {
    const result = mergeOrders(
      [{
        _id: "one",
        status: "ready",
        reverted: true,
        statusChangeType: "revert",
        updatedAt: "2026-08-11T12:00:02Z",
      }],
      [{ _id: "one", status: "delivered", updatedAt: "2026-08-11T12:00:01Z" }],
    );
    expect(result[0].status).toBe("ready");
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
