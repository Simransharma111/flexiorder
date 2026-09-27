// Only explicit customer fields identify a guest; a dish/table name never does.
export const customerName = (order) => {
  for (const value of [order?.guestName, order?.customerName]) {
    if (typeof value !== "string") continue;
    const name = value.trim();
    if (name && name.toLocaleLowerCase() !== "guest") return name;
  }
  return "";
};

// Call only for the same order, or for its own submission acknowledgement.
// Financials and all other server fields remain untouched.
export const preserveCustomerName = (order, previous) => {
  const name = customerName(order) || customerName(previous);
  return name ? { ...order, guestName: name } : order;
};
