import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readRestaurantBilling, saveRestaurantBilling } from "./restaurantBilling";
import { getRestaurantStorageKey } from "./storageScope";

const GSTIN = "27AAPFU0939F1ZV";
let values;
beforeEach(() => {
  values = new Map();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(key => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, value)),
    removeItem: vi.fn(key => values.delete(key)),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("device-only restaurant receipt details", () => {
  it("normalizes and persists GSTIN only under the explicit restaurant key", () => {
    expect(saveRestaurantBilling({ _id: "hotel-1" }, { gstin: ` ${GSTIN.toLowerCase()} ` })).toEqual({ gstin: GSTIN });
    expect(readRestaurantBilling({ hotelId: "hotel-1" })).toEqual({ gstin: GSTIN });
    expect(readRestaurantBilling("hotel-2")).toEqual({ gstin: "" });
    expect([...values.keys()]).toEqual([getRestaurantStorageKey("flexiorder_restaurant_billing", "hotel-1")]);
  });
  it("does not borrow the active user's restaurant when the explicit identity is missing", () => {
    values.set("user", JSON.stringify({ role: "owner", hotelId: "hotel-1" }));
    values.set("flexiorder_active_restaurant", "hotel-1");
    saveRestaurantBilling("hotel-1", { gstin: GSTIN });
    for (const hotel of [undefined, null, {}, { role: "owner" }, "", false, "bad\nidentity"]) {
      expect(readRestaurantBilling(hotel)).toEqual({ gstin: "" });
      expect(() => saveRestaurantBilling(hotel, { gstin: GSTIN })).toThrow("Restaurant details are not ready");
    }
  });
  it("returns blank in environments without local storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readRestaurantBilling("hotel-1")).toEqual({ gstin: "" });
    expect(() => saveRestaurantBilling("hotel-1", { gstin: GSTIN })).toThrow("could not be saved");
  });
  it("clears only this restaurant's value when saved empty", () => {
    saveRestaurantBilling("hotel-1", { gstin: GSTIN });
    saveRestaurantBilling("hotel-2", { gstin: GSTIN });
    expect(saveRestaurantBilling("hotel-1", { gstin: "  " })).toEqual({ gstin: "" });
    expect(readRestaurantBilling("hotel-1")).toEqual({ gstin: "" });
    expect(readRestaurantBilling("hotel-2")).toEqual({ gstin: GSTIN });
  });
  it("rejects malformed GSTIN without changing saved data", () => {
    saveRestaurantBilling("hotel-1", { gstin: GSTIN });
    for (const gstin of ["1234", "27AAPFU0939F1XV", "27AAPFU0939F0ZV", 123, null]) {
      expect(() => saveRestaurantBilling("hotel-1", { gstin })).toThrow();
      expect(readRestaurantBilling("hotel-1")).toEqual({ gstin: GSTIN });
    }
  });
  it("reports inaccessible, corrupt and failed storage rather than claiming a save", () => {
    localStorage.getItem.mockImplementationOnce(() => { throw new Error("blocked"); });
    expect(() => readRestaurantBilling("hotel-1")).toThrow("Could not read receipt details");
    values.set(getRestaurantStorageKey("flexiorder_restaurant_billing", "hotel-1"), "broken json");
    expect(() => readRestaurantBilling("hotel-1")).toThrow("Could not read receipt details");
    localStorage.setItem.mockImplementationOnce(() => { throw new Error("quota"); });
    expect(() => saveRestaurantBilling("hotel-1", { gstin: GSTIN })).toThrow("could not be saved");
    localStorage.removeItem.mockImplementationOnce(() => { throw new Error("blocked"); });
    expect(() => saveRestaurantBilling("hotel-1", { gstin: "" })).toThrow("could not be saved");
  });
});
