const finiteNonNegative = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const getDishPricing = (dish = {}) => {
  const basePrice = finiteNonNegative(dish.price);
  const discountValue = finiteNonNegative(
    dish.discountValue ?? dish.discount ?? 0
  );
  const discountType = dish.discountType || "percentage";

  const discountAmount = discountType === "fixed"
    ? discountValue
    : discountType === "percentage"
      ? basePrice * Math.min(discountValue, 100) / 100
      : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return {
    basePrice,
    discountValue,
    finalPrice,
    hasDiscount: discountAmount > 0 && finalPrice < basePrice,
  };
};
