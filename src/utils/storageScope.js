const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const normalizeEntityId = (value) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (!value || typeof value !== "object") return "";

  return normalizeEntityId(
    value._id ?? value.id ?? value.value ?? value.uuid ?? ""
  );
};

export const getUserId = (user = readStoredUser()) => (
  normalizeEntityId(user?._id ?? user?.id) || String(user?.email || "").trim()
);

export const getRestaurantId = (source) => {
  const usesStoredUser = source === undefined;
  const value = usesStoredUser ? readStoredUser() : source;
  if (!value) return "";
  if (typeof value !== "object") return normalizeEntityId(value);

  const nestedRestaurant = value.hotelId ?? value.restaurantId ?? value.hotel ?? value.restaurant;
  if (nestedRestaurant !== undefined && nestedRestaurant !== null) {
    return normalizeEntityId(nestedRestaurant);
  }
  const looksLikeUser = Boolean(value.role || value.email || value.permissions);
  if (!looksLikeUser) return normalizeEntityId(value);
  if (!usesStoredUser) return "";
  try {
    return normalizeEntityId(localStorage.getItem("flexiorder_active_restaurant"));
  } catch {
    return "";
  }
};

export const rememberRestaurantId = (restaurant) => {
  const restaurantId = getRestaurantId(restaurant);
  if (!restaurantId) return "";
  try {
    localStorage.setItem("flexiorder_active_restaurant", restaurantId);
  } catch {
    // The in-memory restaurant still remains usable.
  }
  return restaurantId;
};

export const getStorageScope = () => {
  const user = readStoredUser();
  const parts = [getUserId(user), getRestaurantId(user) || getRestaurantId()].filter(Boolean);
  return parts.length ? parts.join(":") : "anonymous";
};

const getLegacyStorageScope = () => {
  const user = readStoredUser();
  const userId = user?._id || user?.id || user?.email;
  const hotelId = user?.hotelId || user?.hotel?._id || user?.hotel?.id;
  const parts = [userId, hotelId].filter(Boolean).map(String);
  return parts.length ? parts.join(":") : "anonymous";
};

export const getScopedStorageKey = (baseKey) => {
  const currentKey = `${baseKey}:${encodeURIComponent(getStorageScope())}`;
  const legacyKey = `${baseKey}:${encodeURIComponent(getLegacyStorageScope())}`;
  if (legacyKey !== currentKey) {
    try {
      if (localStorage.getItem(currentKey) === null) {
        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue !== null) localStorage.setItem(currentKey, legacyValue);
      }
    } catch {
      // Callers can still use the canonical key when storage is restricted.
    }
  }
  return currentKey;
};

export const getRestaurantStorageKey = (baseKey, restaurant) => {
  const restaurantId = getRestaurantId(restaurant);
  return `${baseKey}:${encodeURIComponent(restaurantId || "unknown")}`;
};
