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
  const queue = readQueue();
  const existingIndex = queue.findIndex(
    (item) => item.orderId === update.orderId
  );

  if (existingIndex === -1) {
    writeQueue([...queue, update]);
    return;
  }

  const nextQueue = [...queue];
  nextQueue[existingIndex] = {
    ...nextQueue[existingIndex],
    ...update,
  };
  writeQueue(nextQueue);
};

export const replacePendingKitchenUpdates = (updates) => {
  writeQueue(updates);
};
