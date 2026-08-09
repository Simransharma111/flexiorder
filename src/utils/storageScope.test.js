import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRestaurantId,
  getRestaurantStorageKey,
  getScopedStorageKey,
  getStorageScope,
  normalizeEntityId,
} from "./storageScope";

const createStorage = () => {
  const values = new Map();
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
  };
};

describe("storage scope", () => {
  beforeEach(() => vi.stubGlobal("localStorage", createStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes scalar and populated identifiers", () => {
    expect(normalizeEntityId(" hotel-1 ")).toBe("hotel-1");
    expect(normalizeEntityId({ _id: "hotel-2" })).toBe("hotel-2");
    expect(getRestaurantId({ hotelId: { _id: "hotel-3" } })).toBe("hotel-3");
    expect(getRestaurantId({ hotel: { id: "hotel-4" } })).toBe("hotel-4");
    expect(getRestaurantId({ _id: "user-1", role: "owner", email: "owner@test" })).toBe("");
    expect(getRestaurantId({ _id: "hotel-5", name: "Restaurant" })).toBe("hotel-5");
  });

  it("never serializes a populated restaurant as object text", () => {
    localStorage.setItem("user", JSON.stringify({
      _id: "owner-1",
      hotelId: { _id: "hotel-1", name: "Test" },
    }));
    expect(getStorageScope()).toBe("owner-1:hotel-1");
    expect(getRestaurantStorageKey("menu", { _id: "hotel-1" })).toBe("menu:hotel-1");
  });

  it("copies data from the legacy object-valued scope without deleting it", () => {
    localStorage.setItem("user", JSON.stringify({
      _id: "owner-1",
      hotelId: { _id: "hotel-1" },
    }));
    const legacyKey = "orders:owner-1%3A%5Bobject%20Object%5D";
    localStorage.setItem(legacyKey, "saved-work");
    const key = getRestaurantStorageKey("unused", "hotel-1");
    expect(key).toBe("unused:hotel-1");

    const migratedKey = getScopedStorageKey("orders");
    expect(localStorage.getItem(migratedKey)).toBe("saved-work");
    expect(localStorage.getItem(legacyKey)).toBe("saved-work");
  });

  it("uses a remembered restaurant only for the stored user fallback", () => {
    localStorage.setItem("user", JSON.stringify({ _id: "owner-1", role: "owner" }));
    localStorage.setItem("flexiorder_active_restaurant", "hotel-remembered");
    expect(getRestaurantId()).toBe("hotel-remembered");
    expect(getRestaurantId({ _id: "owner-1", role: "owner" })).toBe("");
    expect(getStorageScope()).toBe("owner-1:hotel-remembered");
  });
});
