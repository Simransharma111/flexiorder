export default function SimpleMenuSection({
  categories,
  dishes,
  activeCategory,
  setActiveCategory,
  getCartQuantity,
  addToCart,
  orderingEnabled = true,
}) {
  const filteredDishes =
    activeCategory === "All"
      ? dishes
      : dishes.filter((dish) => {
          const category =
            typeof dish.category === "object"
              ? dish.category?.name
              : dish.category;
          return category === activeCategory;
        });

  return (
    <section className="mx-auto mt-6 max-w-3xl px-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              activeCategory === category
                ? "bg-orange-500 text-white"
                : "border border-gray-200 bg-white text-gray-600"
            }`}
          >
            {category}
          </button>
        ))}
        {categories.length > 5 && (
          <span className="sticky right-0 shrink-0 self-center bg-gray-50 px-2 text-xs font-semibold text-gray-500">
            More ›
          </span>
        )}
      </div>

      <div className="mt-4 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
        {filteredDishes.map((dish) => {
          const quantity = getCartQuantity(dish._id);
          const isVeg = dish.foodType === "veg";
          const basePrice = Number(dish.price || 0);
          const discountValue = Number(
            dish.discountValue ?? dish.discount ?? 0
          );
          const discountAmount =
            dish.discountType === "fixed"
              ? discountValue
              : basePrice * discountValue / 100;
          const finalPrice = Math.max(0, basePrice - discountAmount);
          const hasDiscount = discountAmount > 0 && finalPrice < basePrice;

          return (
            <button
              key={dish._id}
              type="button"
              disabled={!orderingEnabled}
              onClick={() => addToCart(dish)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left first:rounded-t-2xl last:rounded-b-2xl hover:bg-gray-50 disabled:cursor-default"
            >
              <span
                aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
                className={`h-3 w-3 shrink-0 rounded-full ${
                  isVeg ? "bg-green-600" : "bg-red-600"
                }`}
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-gray-900">
                  {dish.name}
                </span>
                {dish.prepTime && (
                  <span className="mt-1 block text-xs text-gray-400">
                    {dish.prepTime} min
                  </span>
                )}
              </span>

              <span className="shrink-0 font-semibold text-gray-900">
                {hasDiscount && (
                  <span className="mr-1 text-xs text-gray-400 line-through">
                    ₹{basePrice.toFixed(0)}
                  </span>
                )}
                <span className={hasDiscount ? "text-green-600" : ""}>
                  ₹{finalPrice.toFixed(0)}
                </span>
              </span>

              {orderingEnabled && quantity > 0 && (
                <span className="min-w-7 rounded-full bg-orange-100 px-2 py-1 text-center text-xs font-bold text-orange-700">
                  {quantity}
                </span>
              )}
            </button>
          );
        })}

        {filteredDishes.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            No dishes available
          </p>
        )}
      </div>
    </section>
  );
}
