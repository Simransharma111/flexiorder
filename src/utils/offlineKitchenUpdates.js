const STORAGE_KEY = "flexiorder_pending_kitchen_updates";

const readQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeQueue = (updates) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
};

export const getPendingKitchenUpdates = () => readQueue();

export const queueKitchenUpdate = (update) => {
  writeQueue([...readQueue(), update]);
};

export const replacePendingKitchenUpdates = (updates) => {
  writeQueue(updates);
};
