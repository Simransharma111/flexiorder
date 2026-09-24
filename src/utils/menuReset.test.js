import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { resetMenuItems } from "./menuReset";
import { enqueueMenuCreate, readMenuCache, readMenuQueue, reconcileMenuFromServer } from "./offlineMenu";

const dishes = [{ _id: "a", name: "Soup" }, { _id: "b", name: "Rice" }];
let api;
beforeEach(() => {
  const values = new Map([["user", JSON.stringify({ _id: "owner", role: "owner", hotelId: "hotel-1" })], ["token", "session"]]);
  vi.stubGlobal("localStorage", { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) });
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  vi.stubGlobal("navigator", { onLine: true });
  api = { get: vi.fn().mockResolvedValueOnce({ data: dishes }).mockResolvedValue({ data: [] }), delete: vi.fn().mockResolvedValue({ data: { success: true } }) };
  reconcileMenuFromServer("hotel-1", dishes);
});
afterEach(() => vi.unstubAllGlobals());

it("deletes the confirmed snapshot and refreshes only this restaurant's cache", async () => {
  reconcileMenuFromServer("hotel-2", dishes);
  const result = await resetMenuItems(api, "hotel-1");
  expect(result).toEqual({ completed: 2, total: 2, remaining: 0 });
  expect(api.delete.mock.calls.map(call => call[0])).toEqual(["/menu/dish/a", "/menu/dish/b"]);
  expect(readMenuCache("hotel-1")).toEqual([]);
  expect(readMenuCache("hotel-2")).toHaveLength(2);
});

it("blocks offline reset and preserves pending edits", async () => {
  navigator.onLine = false;
  await expect(resetMenuItems(api, "hotel-1")).rejects.toThrow("Connect to the internet");
  navigator.onLine = true;
  enqueueMenuCreate("hotel-1", { name: "Pending", price: 1 });
  const queue = readMenuQueue("hotel-1");
  await expect(resetMenuItems(api, "hotel-1")).rejects.toThrow("Sync all pending menu changes");
  expect(api.get).not.toHaveBeenCalled();
  expect(api.delete).not.toHaveBeenCalled();
  expect(readMenuQueue("hotel-1")).toEqual(queue);
});

it("stops on a failure and removes only acknowledged items from the cache", async () => {
  api.delete.mockResolvedValueOnce({ data: { success: true } }).mockRejectedValueOnce(new Error("Connection lost"));
  await expect(resetMenuItems(api, "hotel-1")).rejects.toThrow("1 of 2 menu items deleted. Connection lost");
  expect(readMenuCache("hotel-1").map(dish => dish._id)).toEqual(["b"]);
});

it("stops if another tab queues an edit during deletion without discarding that work", async () => {
  api.delete.mockImplementationOnce(async () => {
    enqueueMenuCreate("hotel-1", { name: "Pending", price: 1 });
    return { data: { success: true } };
  });
  await expect(resetMenuItems(api, "hotel-1")).rejects.toThrow("1 of 2 menu items deleted. Sync all pending");
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(readMenuQueue("hotel-1")).toHaveLength(1);
});

it("rejects another restaurant and a changed session before further writes", async () => {
  await expect(resetMenuItems(api, "hotel-2")).rejects.toThrow("owner session changed");
  expect(api.get).not.toHaveBeenCalled();
  api.delete.mockImplementationOnce(async () => {
    localStorage.setItem("token", "another-session");
    return { data: { success: true } };
  });
  await expect(resetMenuItems(api, "hotel-1")).rejects.toThrow("owner session changed");
  expect(api.delete).toHaveBeenCalledTimes(1);
});

it("requires positive deletion acknowledgement and shows remaining remote additions", async () => {
  api.delete.mockResolvedValueOnce({ data: {} });
  await expect(resetMenuItems(api, "hotel-1")).rejects.toThrow("did not confirm deletion");
  expect(readMenuCache("hotel-1")).toHaveLength(2);
  api.get.mockReset().mockResolvedValueOnce({ data: dishes }).mockResolvedValue({ data: [{ _id: "new", name: "New dish" }] });
  expect(await resetMenuItems(api, "hotel-1")).toEqual({ completed: 2, total: 2, remaining: 1 });
});

it("does not mistake a route 404 for a deleted dish", async () => {
  api.delete.mockRejectedValue({ response: { status: 404, data: { message: "Route unavailable" } } });
  api.get.mockReset().mockResolvedValue({ data: dishes });
  await expect(resetMenuItems(api, "hotel-1")).rejects.toThrow("0 of 2 menu items deleted. Route unavailable");
  expect(readMenuCache("hotel-1")).toHaveLength(2);
});

it("accepts an already deleted dish only after verifying its absence", async () => {
  api.delete.mockRejectedValueOnce({ response: { status: 404 } });
  api.get.mockReset().mockResolvedValueOnce({ data: dishes }).mockResolvedValueOnce({ data: [dishes[1]] }).mockResolvedValue({ data: [] });
  expect(await resetMenuItems(api, "hotel-1")).toEqual({ completed: 2, total: 2, remaining: 0 });
});
