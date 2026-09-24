import { normalizeMenuResponse } from "./menuData";
import { readMenuCache, readMenuQueue, reconcileMenuFromServer } from "./offlineMenu";
import { getRestaurantId } from "./storageScope";
import { getStoredAuthToken } from "./session";

// The existing API deletes individual dishes. Never queue a destructive reset
// or drop pending edits; acknowledge each accepted deletion independently.
export async function resetMenuItems(api, restaurant, { onProgress = () => {} } = {}) {
  const restaurantId = getRestaurantId(restaurant);
  const token = getStoredAuthToken();
  let completed = 0;
  let total = 0;
  const assertReady = () => {
    let user;
    try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { /* handled below */ }
    if (!restaurantId || !token || getStoredAuthToken() !== token ||
        user?.role !== "owner" || getRestaurantId(user) !== restaurantId) {
      throw new Error("Your owner session changed. Sign in to this restaurant before resetting its menu.");
    }
    if (navigator.onLine === false) throw new Error("Connect to the internet before resetting the menu.");
    if (readMenuQueue(restaurantId).length) {
      throw new Error("Sync all pending menu changes on this device before resetting the menu. Your unsynced changes have been kept.");
    }
  };

  try {
    assertReady();
    const response = await api.get(`/menu/${encodeURIComponent(restaurantId)}`, { timeout: 15000 });
    assertReady();
    const dishes = normalizeMenuResponse(response.data);
    if (!dishes || dishes.some(dish => !dish._id || dish.pendingSync)) {
      throw new Error("Could not confirm the current menu. Refresh and try again.");
    }
    const ids = [...new Set(dishes.map(dish => String(dish._id)))];
    total = ids.length;
    onProgress({ completed, total });
    for (const id of ids) {
      assertReady();
      try {
        const result = await api.delete(`/menu/dish/${encodeURIComponent(id)}`, { timeout: 15000 });
        if (result.data?.success !== true) throw new Error("The server did not confirm deletion. Refresh the menu before retrying.");
      } catch (error) {
        if (error?.response?.status !== 404) throw error;
        // A missing route/proxy also returns 404. Only accept an absent dish
        // after an authoritative read, never infer deletion from status alone.
        assertReady();
        const verification = await api.get(`/menu/${encodeURIComponent(restaurantId)}`, { timeout: 15000 });
        assertReady();
        const confirmed = normalizeMenuResponse(verification.data);
        if (!confirmed || confirmed.some(dish => String(dish._id) === id)) throw error;
      }
      completed += 1;
      reconcileMenuFromServer(restaurantId, readMenuCache(restaurantId).filter(dish => String(dish._id) !== id));
      onProgress({ completed, total });
    }
    assertReady();
    // Re-read to expose dishes added on another device during this snapshot.
    const refreshed = await api.get(`/menu/${encodeURIComponent(restaurantId)}`, { timeout: 15000 });
    assertReady();
    const remaining = reconcileMenuFromServer(restaurantId, refreshed.data);
    return { completed, total, remaining: remaining.length };
  } catch (error) {
    const reason = error?.response?.data?.message || error?.message || "Please retry.";
    throw new Error(`${completed} of ${total || "the"} menu items deleted. ${reason}`, { cause: error });
  }
}
