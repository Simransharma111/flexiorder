import {
  buildDishFormData,
  normalizeDish,
  normalizeDishResponse,
  normalizeMenuResponse,
} from "./menuData";
import { getRestaurantId, getRestaurantStorageKey, getUserId } from "./storageScope";

const CACHE_KEY = "flexiorder_menu";
const QUEUE_KEY = "flexiorder_pending_menu_mutations";
export const MENU_CHANGED_EVENT = "flexiorder:menu-changed";
export const SYNC_REQUEST_EVENT = "flexiorder:sync-requested";

const activeSyncs = new Map();

const currentActor = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return { id: getUserId(user), role: String(user?.role || "").toLowerCase() };
  } catch {
    return { id: "", role: "" };
  }
};

const operationId = (prefix) => (
  globalThis.crypto?.randomUUID?.() ||
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

const keysFor = (restaurant) => ({
  cache: getRestaurantStorageKey(CACHE_KEY, restaurant),
  queue: getRestaurantStorageKey(QUEUE_KEY, restaurant),
});

const readJson = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const notifyMenuChanged = (restaurant) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MENU_CHANGED_EVENT, {
    detail: { restaurantId: getRestaurantId(restaurant) },
  }));
};

const writeState = (restaurant, dishes, queue) => {
  const keys = keysFor(restaurant);
  const previousCache = localStorage.getItem(keys.cache);
  const previousQueue = localStorage.getItem(keys.queue);
  try {
    localStorage.setItem(keys.cache, JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      dishes,
    }));
    localStorage.setItem(keys.queue, JSON.stringify(queue));
  } catch (error) {
    if (previousCache === null) localStorage.removeItem(keys.cache);
    else localStorage.setItem(keys.cache, previousCache);
    if (previousQueue === null) localStorage.removeItem(keys.queue);
    else localStorage.setItem(keys.queue, previousQueue);
    throw new Error("This change could not be saved on this device. Free some storage and try again.", {
      cause: error,
    });
  }
  notifyMenuChanged(restaurant);
};

export const readMenuCache = (restaurant) => {
  const restaurantId = getRestaurantId(restaurant);
  if (!restaurantId) return [];
  const cached = readJson(keysFor(restaurantId).cache, null);
  const normalized = normalizeMenuResponse(cached);
  if (normalized) return normalized;

  const legacy = normalizeMenuResponse(readJson(`staff_menu_${restaurantId}`, null));
  if (legacy) {
    try {
      writeState(restaurantId, legacy, readMenuQueue(restaurantId));
    } catch {
      // A readable legacy cache is still useful when storage is full.
    }
    return legacy;
  }
  return [];
};

export const readMenuQueue = (restaurant) => {
  const restaurantId = getRestaurantId(restaurant);
  if (!restaurantId) return [];
  const queue = readJson(keysFor(restaurantId).queue, []);
  return Array.isArray(queue) ? queue : [];
};

const dishKey = (dish) => String(dish?._id || dish?.id || dish?.clientDishId || "");

const upsertDish = (dishes, dish, replacingId = null) => {
  const normalized = normalizeDish(dish);
  if (!normalized) return dishes;
  const key = replacingId || dishKey(normalized);
  const withoutTarget = dishes.filter((item) => {
    const itemKey = dishKey(item);
    return itemKey !== key && itemKey !== dishKey(normalized) &&
      (!normalized.clientDishId || item.clientDishId !== normalized.clientDishId);
  });
  return [normalized, ...withoutTarget];
};

const applyPendingOperations = (serverDishes, cachedDishes, queue) => {
  let next = [...serverDishes];
  queue.forEach((operation) => {
    if (operation.type === "create") {
      const local = cachedDishes.find((dish) => dishKey(dish) === operation.dishId) || {
        ...operation.fields,
        _id: operation.dishId,
        clientDishId: operation.dishId,
      };
      next = upsertDish(next, { ...local, pendingSync: true, syncError: operation.lastError || null });
    } else if (operation.type === "update") {
      const hasServerDish = next.some((dish) => dishKey(dish) === operation.dishId);
      next = next.map((dish) => dishKey(dish) === operation.dishId
        ? { ...dish, ...operation.fields, pendingSync: true, syncError: operation.lastError || null }
        : dish);
      if (!hasServerDish) {
        const cached = cachedDishes.find((dish) => dishKey(dish) === operation.dishId);
        if (cached) next = upsertDish(next, {
          ...cached,
          ...operation.fields,
          pendingSync: true,
          syncError: operation.lastError || null,
        });
      }
    } else if (operation.type === "delete") {
      next = next.filter((dish) => dishKey(dish) !== operation.dishId);
    }
  });
  return next;
};

export const reconcileMenuFromServer = (restaurant, payload) => {
  const incoming = normalizeMenuResponse(payload);
  if (!incoming) throw new Error("The menu response was not valid.");
  const cached = readMenuCache(restaurant);
  const queue = readMenuQueue(restaurant);
  const next = applyPendingOperations(incoming, cached, queue);
  writeState(restaurant, next, queue);
  return next;
};

export const enqueueMenuCreate = (restaurant, fields, image = null) => {
  const restaurantId = getRestaurantId(restaurant);
  if (!restaurantId) throw new Error("Restaurant details are not ready yet. Try again in a moment.");
  const clientMutationId = operationId("menu-create");
  const clientDishId = `local-${operationId("dish")}`;
  const now = new Date().toISOString();
  const operation = {
    id: clientMutationId,
    clientMutationId,
    restaurantId,
    actorId: currentActor().id,
    actorRole: currentActor().role,
    type: "create",
    dishId: clientDishId,
    fields,
    image,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    nextAttemptAt: null,
    status: "pending",
    lastError: null,
  };
  const dish = normalizeDish({
    ...fields,
    _id: clientDishId,
    clientDishId,
    image: image?.dataUrl || null,
    pendingSync: true,
    createdAt: now,
    updatedAt: now,
  });
  writeState(restaurantId, upsertDish(readMenuCache(restaurantId), dish), [
    ...readMenuQueue(restaurantId),
    operation,
  ]);
  return dish;
};

export const enqueueMenuUpdate = (restaurant, dishId, fields, image = null) => {
  const restaurantId = getRestaurantId(restaurant);
  const dishes = readMenuCache(restaurantId);
  const queue = readMenuQueue(restaurantId);
  const existingDish = dishes.find((dish) => dishKey(dish) === String(dishId));
  if (!existingDish) throw new Error("This dish is no longer available. Refresh the menu and try again.");

  const now = new Date().toISOString();
  const createIndex = queue.findIndex((item) => item.type === "create" && item.dishId === String(dishId));
  let nextQueue;
  if (createIndex >= 0) {
    nextQueue = [...queue];
    nextQueue[createIndex] = {
      ...nextQueue[createIndex],
      fields: { ...nextQueue[createIndex].fields, ...fields },
      image: image || nextQueue[createIndex].image,
      updatedAt: now,
      status: "pending",
      lastError: null,
    };
  } else {
    const updateIndex = queue.findIndex((item) => item.type === "update" && item.dishId === String(dishId));
    const operation = {
      id: updateIndex >= 0 ? queue[updateIndex].id : operationId("menu-update"),
      clientMutationId: updateIndex >= 0 ? queue[updateIndex].clientMutationId : operationId("menu-update-op"),
      restaurantId,
      actorId: currentActor().id,
      actorRole: currentActor().role,
      type: "update",
      dishId: String(dishId),
      fields: updateIndex >= 0 ? { ...queue[updateIndex].fields, ...fields } : fields,
      image: image || (updateIndex >= 0 ? queue[updateIndex].image : null),
      previousDish: updateIndex >= 0 ? queue[updateIndex].previousDish : existingDish,
      createdAt: updateIndex >= 0 ? queue[updateIndex].createdAt : now,
      updatedAt: now,
      attemptCount: 0,
      nextAttemptAt: null,
      status: "pending",
      lastError: null,
    };
    nextQueue = updateIndex >= 0
      ? queue.map((item, index) => index === updateIndex ? operation : item)
      : [...queue, operation];
  }

  const nextDish = { ...existingDish, ...fields, ...(image?.dataUrl ? { image: image.dataUrl } : {}), pendingSync: true, syncError: null, updatedAt: now };
  writeState(restaurantId, upsertDish(dishes, nextDish, String(dishId)), nextQueue);
  return nextDish;
};

export const enqueueMenuDelete = (restaurant, dishId) => {
  const restaurantId = getRestaurantId(restaurant);
  const dishes = readMenuCache(restaurantId);
  const queue = readMenuQueue(restaurantId);
  const targetId = String(dishId);
  const previousDish = dishes.find((dish) => dishKey(dish) === targetId);
  if (!previousDish) return;

  const pendingCreate = queue.find((item) => item.type === "create" && item.dishId === targetId);
  let nextQueue = queue.filter((item) => item.dishId !== targetId);
  if (!pendingCreate) {
    const now = new Date().toISOString();
    const clientMutationId = operationId("menu-delete");
    nextQueue.push({
      id: clientMutationId,
      clientMutationId,
      restaurantId,
      actorId: currentActor().id,
      actorRole: currentActor().role,
      type: "delete",
      dishId: targetId,
      previousDish,
      createdAt: now,
      updatedAt: now,
      attemptCount: 0,
      nextAttemptAt: null,
      status: "pending",
      lastError: null,
    });
  }
  writeState(restaurantId, dishes.filter((dish) => dishKey(dish) !== targetId), nextQueue);
};

const errorMessage = (error, operation) => {
  const message = error?.response?.data?.message || error?.message || "Could not sync this menu change.";
  if (/invalid category/i.test(message)) {
    return `Couldn’t sync ${operation?.fields?.name || "this dish"}. Its category is no longer available; open the dish and choose the category again.`;
  }
  return message;
};

const isRetryable = (error) => {
  const status = Number(error?.response?.status || 0);
  return !error?.response || status >= 500 || [408, 429].includes(status);
};

const recordFailure = (restaurant, snapshot, error) => {
  const queue = readMenuQueue(restaurant);
  const current = queue.find((item) => item.id === snapshot.id);
  if (!current) return;
  const attemptCount = Number(current.attemptCount || 0) + 1;
  const retryable = isRetryable(error);
  const status = retryable && attemptCount < 8 ? "pending" : "attention";
  const delay = Math.min(60000, 1000 * (2 ** Math.min(attemptCount, 6)));
  const failed = {
    ...current,
    attemptCount,
    lastAttemptAt: new Date().toISOString(),
    nextAttemptAt: status === "pending" ? new Date(Date.now() + delay).toISOString() : null,
    status,
    lastError: errorMessage(error, current),
    ambiguousOutcome: retryable,
  };
  let dishes = readMenuCache(restaurant).map((dish) => dishKey(dish) === current.dishId
    ? { ...dish, pendingSync: true, syncError: failed.lastError }
    : dish);
  if (current.type === "delete" && status === "attention" && current.previousDish) {
    dishes = upsertDish(dishes, { ...current.previousDish, pendingSync: true, syncError: failed.lastError });
  }
  writeState(restaurant, dishes, queue.map((item) => item.id === current.id ? failed : item));
};

const completeOperation = (restaurant, snapshot, serverDish = null) => {
  let queue = readMenuQueue(restaurant);
  const current = queue.find((item) => item.id === snapshot.id);
  let dishes = readMenuCache(restaurant);

  if (snapshot.type === "create" && serverDish?._id) {
    if (!current) {
      const now = new Date().toISOString();
      const deleteId = operationId("menu-delete");
      queue.push({
        id: deleteId,
        clientMutationId: deleteId,
        restaurantId: getRestaurantId(restaurant),
        actorId: currentActor().id,
        actorRole: currentActor().role,
        type: "delete",
        dishId: serverDish._id,
        previousDish: serverDish,
        createdAt: now,
        updatedAt: now,
        attemptCount: 0,
        status: "pending",
      });
      dishes = dishes.filter((dish) => dishKey(dish) !== snapshot.dishId);
    } else if (current.updatedAt !== snapshot.updatedAt) {
      queue = queue.map((item) => item.id === current.id ? {
        ...current,
        type: "update",
        dishId: serverDish._id,
        previousDish: serverDish,
        updatedAt: new Date().toISOString(),
        attemptCount: 0,
        nextAttemptAt: null,
      } : item);
      dishes = upsertDish(dishes, { ...serverDish, ...current.fields, clientDishId: snapshot.dishId, pendingSync: true }, snapshot.dishId);
    } else {
      queue = queue.filter((item) => item.id !== current.id);
      dishes = upsertDish(dishes, { ...serverDish, clientDishId: snapshot.dishId, pendingSync: false, syncError: null }, snapshot.dishId);
    }
  } else if (current && current.updatedAt === snapshot.updatedAt) {
    queue = queue.filter((item) => item.id !== current.id);
    if (snapshot.type === "update" && serverDish) {
      dishes = upsertDish(dishes, { ...serverDish, pendingSync: false, syncError: null }, snapshot.dishId);
    } else if (snapshot.type === "delete") {
      dishes = dishes.filter((dish) => dishKey(dish) !== snapshot.dishId);
    }
  }
  writeState(restaurant, dishes, queue);
};

const replayOperation = async (api, operation) => {
  if (operation.type === "create") {
    const response = await api.post("/menu/dish", buildDishFormData(operation.fields, {
      image: operation.image,
      clientMutationId: operation.clientMutationId,
      clientDishId: operation.dishId,
    }));
    const dish = normalizeDishResponse(response.data);
    if (!dish?._id) throw new Error("The server did not confirm the new dish.");
    return dish;
  }
  if (operation.type === "update") {
    const response = await api.put(`/menu/dish/${operation.dishId}`, buildDishFormData(operation.fields, {
      image: operation.image,
      clientMutationId: operation.clientMutationId,
    }));
    return normalizeDishResponse(response.data) || { ...operation.previousDish, ...operation.fields, _id: operation.dishId };
  }
  try {
    await api.delete(`/menu/dish/${operation.dishId}`, {
      data: { clientMutationId: operation.clientMutationId },
    });
  } catch (error) {
    if (error?.response?.status !== 404) throw error;
  }
  return null;
};

const runMenuSync = async (api, restaurant, { force = false } = {}) => {
  const restaurantId = getRestaurantId(restaurant);
  if (!restaurantId) return { synced: 0, pending: 0, attention: 0 };
  let synced = 0;
  const actor = currentActor();
  const canReplay = (operation) => !operation.actorId || operation.actorId === actor.id ||
    ["owner", "superadmin"].includes(actor.role);
  const snapshot = readMenuQueue(restaurantId).filter((operation) => (
    canReplay(operation) &&
    operation.status !== "attention" &&
    (force || !operation.nextAttemptAt || new Date(operation.nextAttemptAt).getTime() <= Date.now())
  ));
  for (const operation of snapshot) {
    try {
      const serverDish = await replayOperation(api, operation);
      completeOperation(restaurantId, operation, serverDish);
      synced += 1;
    } catch (error) {
      recordFailure(restaurantId, operation, error);
    }
  }
  const remaining = readMenuQueue(restaurantId);
  return {
    synced,
    pending: remaining.filter((item) => item.status !== "attention").length,
    attention: remaining.filter((item) => item.status === "attention").length,
  };
};

export const syncPendingMenu = (api, restaurant, options = {}) => {
  const restaurantId = getRestaurantId(restaurant);
  if (!restaurantId) return Promise.resolve({ synced: 0, pending: 0, attention: 0 });
  if (activeSyncs.has(restaurantId)) return activeSyncs.get(restaurantId);
  const promise = runMenuSync(api, restaurantId, options).finally(() => activeSyncs.delete(restaurantId));
  activeSyncs.set(restaurantId, promise);
  return promise;
};

export const retryMenuMutations = (restaurant) => {
  const queue = readMenuQueue(restaurant).map((item) => ({
    ...item,
    status: "pending",
    attemptCount: 0,
    nextAttemptAt: null,
    lastError: null,
  }));
  writeState(restaurant, readMenuCache(restaurant).map((dish) => ({ ...dish, syncError: null })), queue);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_REQUEST_EVENT));
};

export const getMenuSyncSummary = (restaurant) => {
  const queue = readMenuQueue(restaurant);
  return {
    pending: queue.filter((item) => item.status !== "attention").length,
    attention: queue.filter((item) => item.status === "attention").length,
  };
};

export const requestBackgroundSync = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_REQUEST_EVENT));
};
