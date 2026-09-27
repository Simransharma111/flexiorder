import { getRestaurantId, getRestaurantStorageKey } from "./storageScope";

const STORAGE_KEY = "flexiorder_restaurant_billing";
const GSTIN_FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Require an explicit restaurant; undefined must not resolve the active user.
const restaurantId = hotel => {
  if (hotel === undefined || hotel === null || typeof hotel === "boolean") return "";
  const id = getRestaurantId(hotel);
  return id && [...id].every(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127) ? id : "";
};
const normalizeGstin = value => typeof value === "string" ? value.trim().toUpperCase() : "";

export function readRestaurantBilling(hotel) {
  const id = restaurantId(hotel);
  if (!id || typeof localStorage === "undefined") return { gstin: "" };
  try {
    const saved = localStorage.getItem(getRestaurantStorageKey(STORAGE_KEY, id));
    if (saved === null) return { gstin: "" };
    const record = JSON.parse(saved);
    if (!record || typeof record.gstin !== "string") throw new Error("Invalid saved details");
    const gstin = normalizeGstin(record.gstin);
    if (gstin && !GSTIN_FORMAT.test(gstin)) throw new Error("Invalid saved GSTIN");
    return { gstin };
  } catch (error) {
    throw new Error("Could not read receipt details saved on this device. Save the details again or check browser storage access.", { cause: error });
  }
}

export function saveRestaurantBilling(hotel, { gstin } = {}) {
  const id = restaurantId(hotel);
  if (!id) throw new Error("Restaurant details are not ready. Reload settings before saving receipt details.");
  if (typeof gstin !== "string") throw new Error("Enter a GSTIN or leave it empty to clear it.");
  const normalized = normalizeGstin(gstin);
  if (normalized && !GSTIN_FORMAT.test(normalized)) {
    throw new Error("Enter a 15-character GSTIN in the expected format, or leave it empty to clear it. This checks format only, not registration.");
  }
  const details = { gstin: normalized };
  try {
    const key = getRestaurantStorageKey(STORAGE_KEY, id);
    if (normalized) localStorage.setItem(key, JSON.stringify(details));
    else localStorage.removeItem(key);
  } catch (error) {
    throw new Error("Receipt details could not be saved on this device. Check browser storage access and try again.", { cause: error });
  }
  return details;
}
