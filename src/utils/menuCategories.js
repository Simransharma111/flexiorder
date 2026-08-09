export const categoryName = (category) => String(
  typeof category === "object"
    ? category?.name || category?.label || category?.categoryName || ""
    : category || ""
).trim();

export const categoryId = (category) => (
  typeof category === "object"
    ? String(category?._id || category?.id || "").trim()
    : ""
);

export const categoryKey = (category) => categoryName(category).toLocaleLowerCase();

export const buildCategoryList = (dishes = [], defaults = []) => {
  const labels = new Map();
  [...defaults, ...dishes.map((dish) => categoryName(dish.category))]
    .filter(Boolean)
    .forEach((category) => {
      const key = categoryKey(category);
      if (key !== "all" && !labels.has(key)) labels.set(key, category);
    });
  return ["All", ...labels.values()];
};

export const normalizeCategory = (category, categories = []) => {
  const name = categoryName(category);
  return categories.find((existing) => categoryKey(existing) === categoryKey(name)) || name;
};

export const resolveCategoryReference = (category, dishes = []) => {
  const name = categoryName(category);
  const match = dishes
    .map((dish) => dish?.category)
    .find((existing) => categoryKey(existing) === categoryKey(name));
  return match || name;
};
