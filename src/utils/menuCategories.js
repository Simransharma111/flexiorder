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

  const ranks = new Map();
  for (const category of defaults) {
    const value = Number(category?.displayOrder);
    if (Number.isFinite(value) && value >= 0) ranks.set(categoryKey(category), value > 0 ? value : Infinity);
  }
  for (const dish of dishes) {
    const value = Number(dish.category?.displayOrder ?? dish.categoryId?.displayOrder);
    if (Number.isFinite(value) && value > 0 && !ranks.has(categoryKey(dishCategoryName(dish)))) ranks.set(categoryKey(dishCategoryName(dish)), value);
  }
  return ["All", ...[...labels.values()].sort((a, b) =>
    (ranks.get(categoryKey(a)) ?? Infinity) - (ranks.get(categoryKey(b)) ?? Infinity) || a.localeCompare(b)
  )];
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

/*
 * Older backends return the public QR menu with a raw ObjectId in
 * `categoryId` and no populated category name. The categories catalog is
 * public, so resolve those ids to names here and attach them as
 * `categoryName` (picked up last by `dishCategoryName`), keeping the
 * original dish data untouched.
 */
export const resolveDishCategoryNames = (dishes = [], categories = []) => {
  const catalog = (
    Array.isArray(categories)
      ? categories
      : categories?.categories || []
  )
    .map((category) => ({
      ...category,
      _id: categoryId(category),
      name: categoryName(category),
      displayOrder: category.displayOrder ?? 0,
    }))
    .filter(
      (category) =>
        isCategoryObjectId(category._id) && category.name
    );

  if (!catalog.length) return dishes;

  const nameById = new Map(
    catalog.map((category) => [
      category._id.toLowerCase(),
      category,
    ])
  );

  return dishes.map((dish) => {
    const ref =
      categoryId(dish?.categoryId) ||
      categoryId(dish?.category);
    const record = ref && nameById.get(ref.toLowerCase());

    return record ? {
      ...dish,
      category: record,
      ...(typeof dish.categoryId === "object" ? { categoryId: record } : {}),
      categoryName: record.name,
    } : dish;
  });
};
