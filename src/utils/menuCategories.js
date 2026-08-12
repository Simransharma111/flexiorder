// src/utils/menuCategories.js

export const categoryName = (category) => {
  if (!category) return "";

  if (typeof category === "object") {
    return String(
      category.name ||
      category.label ||
      category.categoryName ||
      ""
    ).trim();
  }

  return String(category).trim();
};

export const categoryId = (category) => {
  if (!category || typeof category !== "object") return "";

  return String(
    category._id ||
    category.id ||
    category.categoryId ||
    ""
  ).trim();
};

export const categoryKey = (category) =>
  categoryName(category).toLocaleLowerCase();

export const buildCategoryList = (dishes = [], defaults = []) => {
  const labels = new Map();

  [
    ...defaults,
    ...dishes.map((dish) => dish?.categoryId || dish?.category)
  ]
    .map(categoryName)
    .filter(Boolean)
    .forEach((category) => {
      const key = categoryKey(category);

      if (key !== "all" && !labels.has(key)) {
        labels.set(key, category);
      }
    });

  return ["All", ...labels.values()];
};

export const normalizeCategory = (category, categories = []) => {
  const name = categoryName(category);

  return (
    categories.find(
      (existing) =>
        categoryKey(existing) === categoryKey(name)
    ) || name
  );
};

export const resolveCategoryReference = (
  category,
  dishes = []
) => {
  const name = categoryName(category);

  const match = dishes
    .map((dish) => dish?.categoryId || dish?.category)
    .find(
      (existing) =>
        categoryKey(existing) === categoryKey(name)
    );

  return match || category;
};