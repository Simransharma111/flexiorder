export const categoryName = (category) => String(
  typeof category === "object" ? category?.name || "" : category || ""
).trim();

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
