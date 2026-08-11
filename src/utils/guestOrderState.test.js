import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mergeGuestActiveOrders,
  mergeGuestOrderItems,
  readGuestActiveOrders,
  saveGuestOrderHandoff,
  writeGuestActiveOrders,
} from "./guestOrderState";

describe("guest order handoff", () => {
  beforeEach(() => {
    const values = new Map();
    vi.stubGlobal("localStorage", {
      clear: () => values.clear(),
      getItem: (key) => values.has(key) ? values.get(key) : null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, String(value)),
    });
  });

  it("keeps a newly received order visible across repeated stale polls", () => {
    const handoff = saveGuestOrderHandoff("qr-1", {
      _id: "server-1",
      clientOrderId: "client-1",
      status: "pending",
      items: [{ name: "Paneer", quantity: 1 }],
    }, 1_000);

    const confirmed = mergeGuestActiveOrders([
      { _id: "server-1", clientOrderId: "client-1", status: "preparing" },
    ], [handoff], 1_100);
    const stale = mergeGuestActiveOrders([], confirmed, 1_200);

    expect(stale).toHaveLength(1);
    expect(stale[0]).toMatchObject({ status: "preparing", guestHandoffUntil: 301_000 });
  });

  it("reconciles sparse server items without losing submitted names", () => {
    expect(mergeGuestOrderItems(
      [{ menuId: "dish-1", quantity: 2 }],
      [{ menuId: "dish-1", name: "Paneer", quantity: 2 }],
    )).toEqual([{ menuId: "dish-1", name: "Paneer", quantity: 2 }]);
  });

  it("deduplicates server rows and prevents stale status regression", () => {
    const current = [{
      _id: "server-1",
      clientOrderId: "client-1",
      status: "preparing",
      guestHandoffUntil: 301_000,
    }];
    const merged = mergeGuestActiveOrders([
      { _id: "server-1", status: "pending" },
      { _id: "server-1", clientOrderId: "client-1", status: "pending" },
    ], current, 1_100);

    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("preparing");
  });

  it("keeps newest unmatched handoffs first", () => {
    const first = saveGuestOrderHandoff("qr-1", {
      clientOrderId: "client-1",
      status: "pending",
    }, 1_000);
    const second = saveGuestOrderHandoff("qr-1", {
      clientOrderId: "client-2",
      status: "pending",
    }, 2_000);

    expect(mergeGuestActiveOrders([], [second, first], 2_100)
      .map((order) => order.clientOrderId)).toEqual(["client-2", "client-1"]);
  });

  it("expires handoffs on merge and storage reads while keeping QR sessions isolated", () => {
    const first = saveGuestOrderHandoff("qr-1", {
      clientOrderId: "client-1",
      status: "pending",
    }, 1_000);
    saveGuestOrderHandoff("qr-2", {
      clientOrderId: "client-2",
      status: "pending",
    }, 1_000);

    expect(mergeGuestActiveOrders([], [first], 301_001)).toEqual([]);
    expect(readGuestActiveOrders("qr-1", 301_001)).toEqual([]);
    expect(readGuestActiveOrders("qr-2", 1_100)[0].clientOrderId).toBe("client-2");
  });

  it("returns the in-memory handoff when storage is unavailable", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(writeGuestActiveOrders("qr-1", [])).toBe(false);
    expect(saveGuestOrderHandoff("qr-1", {
      clientOrderId: "client-1",
      status: "pending",
    }, 1_000)).toMatchObject({
      clientOrderId: "client-1",
      guestHandoffUntil: 301_000,
    });
  });
});
