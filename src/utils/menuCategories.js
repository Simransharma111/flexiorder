// src/utils/menuCategories.js

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

export const isCategoryObjectId = (value) =>
  typeof value === "string" &&
  OBJECT_ID_PATTERN.test(value.trim());

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

  const value = String(category).trim();

  return isCategoryObjectId(value) ? "" : value;
};

export const categoryId = (category) => {
  if (!category) return "";

  if (typeof category !== "object") {
    const value = String(category).trim();
    return isCategoryObjectId(value) ? value : "";
  }

  return String(
    category._id ||
    category.id ||
    category.categoryId ||
    ""
  ).trim();
};

export const categoryKey = (category) =>
  categoryName(category).toLocaleLowerCase();

export const dishCategoryName = (dish) => {
  if (!dish || typeof dish !== "object") return "";

  return (
    categoryName(dish.category) ||
    categoryName(dish.categoryId) ||
    categoryName(dish.categoryName)
  );
};

export const normalizeCategoryRecord = (category) => {
  const id = categoryId(category);
  const name = categoryName(category);

  if (
    !isCategoryObjectId(id) ||
    !name ||
    name === "Uncategorized" ||
    category?.isActive === false
  ) return null;

  return {
    ...(typeof category === "object" ? category : {}),
    _id: id,
    name,
  };
};

export const findCategoryByName = (categories = [], name) => {
  const key = categoryKey(name);
  if (!key) return null;

  return (
    categories.find(
      (category) => categoryKey(category) === key
    ) || null
  );
};

export const buildCategoryList = (dishes = [], defaults = []) => {
  const labels = new Map();

  [
    ...defaults,
    ...dishes.map(dishCategoryName)
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
    .map((dish) => {
      const id =
        categoryId(dish?.categoryId) ||
        categoryId(dish?.category);
      const label = dishCategoryName(dish);

      return id && label
        ? { _id: id, name: label }
        : label;
    })
    .find(
      (existing) =>
        categoryKey(existing) === categoryKey(name)
    );

  return match || category;
};
