import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueMenuCreate,
  enqueueMenuDelete,
  enqueueMenuUpdate,
  readMenuCache,
  readMenuQueue,
  reconcileMenuFromServer,
  syncPendingMenu,
} from "./offlineMenu";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
  };
};

describe("offline menu", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps restaurant menus isolated", () => {
    enqueueMenuCreate("hotel-1", { name: "Soup", category: "Starters", tags: [] });
    expect(readMenuCache("hotel-1")).toHaveLength(1);
    expect(readMenuCache("hotel-2")).toEqual([]);
    expect(readMenuQueue("hotel-2")).toEqual([]);
  });

  it("folds edits into an offline create and cancels it on delete", () => {
    const dish = enqueueMenuCreate("hotel-1", { name: "Soup", price: 100, category: "Starters", tags: [] });
    enqueueMenuUpdate("hotel-1", dish._id, { price: 120 });
    expect(readMenuQueue("hotel-1")).toHaveLength(1);
    expect(readMenuQueue("hotel-1")[0]).toMatchObject({ type: "create", fields: { price: 120 } });
    expect(readMenuCache("hotel-1")[0].price).toBe(120);

    enqueueMenuDelete("hotel-1", dish._id);
    expect(readMenuQueue("hotel-1")).toEqual([]);
    expect(readMenuCache("hotel-1")).toEqual([]);
  });

  it("reconciles server data without dropping pending local work", () => {
    enqueueMenuCreate("hotel-1", { name: "Offline Dish", category: "Mains", tags: [] });
    const next = reconcileMenuFromServer("hotel-1", {
      dishes: [{ _id: "old-dish", name: "Old Dish", category: "Mains" }],
    });
    expect(next.map((dish) => dish.name)).toEqual(expect.arrayContaining(["Offline Dish", "Old Dish"]));
  });

  it("serializes concurrent replay and replaces the local id", async () => {
    const local = enqueueMenuCreate("hotel-1", { name: "Soup", category: "Starters", tags: [] });
    let release;
    const response = new Promise((resolve) => { release = resolve; });
    const api = {
      post: vi.fn(() => response),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const first = syncPendingMenu(api, "hotel-1");
    const second = syncPendingMenu(api, "hotel-1");
    expect(first).toBe(second);
    release({ data: { _id: "server-dish", name: "Soup", category: "Starters" } });
    await first;

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(readMenuQueue("hotel-1")).toEqual([]);
    expect(readMenuCache("hotel-1")).toEqual([
      expect.objectContaining({ _id: "server-dish", clientDishId: local._id, pendingSync: false }),
    ]);
  });

  it("retains a definitively rejected dish for correction", async () => {
    enqueueMenuCreate("hotel-1", { name: "Soup", category: "Invalid", tags: [] });
    const api = {
      post: vi.fn().mockRejectedValue({ response: { status: 400, data: { message: "Invalid category" } } }),
    };
    await syncPendingMenu(api, "hotel-1");
    expect(readMenuQueue("hotel-1")[0]).toMatchObject({
      status: "attention",
      lastError: "Couldn’t sync Soup. Its category is no longer available; open the dish and choose the category again.",
    });
    expect(readMenuCache("hotel-1")[0].syncError).toContain("choose the category again");
  });
});
