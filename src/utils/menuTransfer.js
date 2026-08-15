import api from "../api/axios";
import { buildDishFormData } from "./menuData";
import {
  categoryKey,
  categoryName,
  dishCategoryName,
  findCategoryByName,
  normalizeCategoryRecord,
} from "./menuCategories";

export const MENU_TRANSFER_FORMAT = "flexiorder-menu";
export const MENU_TRANSFER_VERSION = 1;
export const MENU_TRANSFER_MAX_BYTES = 1024 * 1024;
export const MENU_TRANSFER_MAX_DISHES = 500;

const BOOLEAN_FIELDS = [
  "isAvailable",
  "isRecommended",
  "isBestseller",
  "featured",
  "todaySpecial",
  "isPopular",
  "isNewArrival",
  "chefChoice",
];

const DEFAULT_FLAGS = {
  isAvailable: true,
  isRecommended: false,
  isBestseller: false,
  featured: false,
  todaySpecial: false,
  isPopular: false,
  isNewArrival: false,
  chefChoice: false,
};

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const fail = (message) => {
  throw new Error(message);
};

const text = (value, label, { required = false, maxLength = 200 } = {}) => {
  if (value === undefined || value === null) {
    if (required) fail(`${label} is required.`);
    return "";
  }
  if (typeof value !== "string") fail(`${label} must be text.`);
  const cleaned = value.trim();
  if (required && !cleaned) fail(`${label} is required.`);
  if (cleaned.length > maxLength) {
    fail(`${label} must be ${maxLength} characters or fewer.`);
  }
  return cleaned;
};

const number = (
  value,
  label,
  { defaultValue, nullable = false, integer = false, max = Number.MAX_SAFE_INTEGER } = {}
) => {
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    fail(`${label} is required.`);
  }
  if (value === null && nullable) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    fail(`${label} must be a valid${integer ? " whole" : ""} number.`);
  }
  return value;
};

const tags = (value, label) => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`${label} must be a list of text values.`);
  if (value.length > 30) fail(`${label} cannot contain more than 30 values.`);
  const seen = new Set();
  return value.reduce((result, tag, index) => {
    const cleaned = text(tag, `${label} item ${index + 1}`, {
      required: true,
      maxLength: 60,
    });
    const key = cleaned.toLocaleLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cleaned);
    }
    return result;
  }, []);
};

const categoryValue = (dish) => {
  const rawCategory = (value) => {
    if (typeof value === "string") return value.trim();
    return categoryName(value);
  };

  const directName = rawCategory(dish.category);
  if (directName) return directName;
  const legacyName = rawCategory(dish.categoryName);
  if (legacyName) return legacyName;
  return rawCategory(dish.categoryId);
};

export const normalizePortableDish = (dish, index = 0) => {
  const row = `Dish ${index + 1}`;
  if (!dish || typeof dish !== "object" || Array.isArray(dish)) {
    fail(`${row} must be an object.`);
  }

  const foodType = text(dish.foodType ?? "veg", `${row} food type`, {
    required: true,
    maxLength: 20,
  });
  if (!["veg", "nonveg"].includes(foodType)) {
    fail(`${row} food type must be “veg” or “nonveg”.`);
  }
  const spiceLevel = text(dish.spiceLevel ?? "", `${row} spice level`, {
    maxLength: 20,
  });
  if (!["", "mild", "medium", "hot"].includes(spiceLevel)) {
    fail(`${row} spice level must be empty, mild, medium, or hot.`);
  }

  const portableCategory = text(categoryValue(dish), `${row} category`, {
    required: true,
    maxLength: 100,
  });
  if (OBJECT_ID_PATTERN.test(portableCategory)) {
    fail(`${row} category must use its name, not a database ID.`);
  }

  const normalized = {
    category: portableCategory,
    subCategory: text(dish.subCategory ?? "", `${row} subcategory`, {
      maxLength: 100,
    }),
    name: text(dish.name, `${row} name`, { required: true, maxLength: 200 }),
    description: text(dish.description ?? "", `${row} description`, {
      maxLength: 4000,
    }),
    price: number(dish.price, `${row} price`),
    prepTime: number(dish.prepTime, `${row} preparation time`, {
      defaultValue: 15,
      integer: true,
    }),
    foodType,
    spiceLevel,
    tags: tags(dish.tags, `${row} tags`),
    gst: number(dish.gst, `${row} GST`, {
      defaultValue: null,
      nullable: true,
      max: 100,
    }),
    displayOrder: number(dish.displayOrder, `${row} display order`, {
      defaultValue: 0,
      integer: true,
    }),
  };

  BOOLEAN_FIELDS.forEach((field) => {
    if (dish[field] !== undefined && typeof dish[field] !== "boolean") {
      fail(`${row} ${field} must be true or false.`);
    }
    normalized[field] = dish[field] ?? DEFAULT_FLAGS[field];
  });

  return normalized;
};

export const buildMenuExport = (dishes, exportedAt = new Date().toISOString()) => {
  if (!Array.isArray(dishes) || dishes.length === 0) {
    fail("There are no dishes to export.");
  }
  if (dishes.length > MENU_TRANSFER_MAX_DISHES) {
    fail(`A menu file cannot contain more than ${MENU_TRANSFER_MAX_DISHES} dishes.`);
  }
  return {
    format: MENU_TRANSFER_FORMAT,
    version: MENU_TRANSFER_VERSION,
    exportedAt,
    dishes: dishes.map(normalizePortableDish),
  };
};

export const serializeMenuExport = (dishes, exportedAt) => {
  const serialized = JSON.stringify(buildMenuExport(dishes, exportedAt), null, 2);
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > MENU_TRANSFER_MAX_BYTES) {
    fail("The exported menu is larger than 1 MB. Split it into smaller menu files.");
  }
  return serialized;
};

export const parseMenuImport = (source, sizeInBytes) => {
  const measuredSize = sizeInBytes ?? (
    typeof source === "string"
      ? new TextEncoder().encode(source).byteLength
      : new TextEncoder().encode(JSON.stringify(source)).byteLength
  );
  if (measuredSize > MENU_TRANSFER_MAX_BYTES) {
    fail("The menu file must be 1 MB or smaller.");
  }

  let payload;
  try {
    payload = typeof source === "string" ? JSON.parse(source) : source;
  } catch {
    fail("The selected file is not valid JSON.");
  }

  const legacy = Array.isArray(payload);
  if (!legacy && (!payload || typeof payload !== "object")) {
    fail("The menu file must contain a FlexiOrder menu object or a legacy dish array.");
  }
  if (!legacy && payload.format !== MENU_TRANSFER_FORMAT) {
    fail(`Unsupported menu format. Expected “${MENU_TRANSFER_FORMAT}”.`);
  }
  if (!legacy && payload.version !== MENU_TRANSFER_VERSION) {
    fail(`Unsupported menu version. Expected version ${MENU_TRANSFER_VERSION}.`);
  }

  let exportedAt = new Date().toISOString();
  if (!legacy) {
    if (
      typeof payload.exportedAt !== "string" ||
      !Number.isFinite(Date.parse(payload.exportedAt))
    ) {
      fail("The menu file must contain a valid exportedAt timestamp.");
    }
    exportedAt = new Date(payload.exportedAt).toISOString();
  }

  const dishes = legacy ? payload : payload.dishes;
  if (!Array.isArray(dishes) || dishes.length === 0) {
    fail("The menu file does not contain any dishes.");
  }
  if (dishes.length > MENU_TRANSFER_MAX_DISHES) {
    fail(`A menu file cannot contain more than ${MENU_TRANSFER_MAX_DISHES} dishes.`);
  }

  return {
    format: MENU_TRANSFER_FORMAT,
    version: MENU_TRANSFER_VERSION,
    exportedAt,
    dishes: dishes.map(normalizePortableDish),
  };
};

/* =====================================================
   FALLBACK IMPORT VIA SINGLE-DISH ENDPOINTS
===================================================== */

/*
 * Older deployments do not expose POST /menu/import. Replicate the same
 * import with the long-standing single-category/single-dish endpoints so
 * the portable menu format keeps working everywhere. Mirrors the bulk
 * endpoint semantics: categories are resolved before any dish write,
 * duplicate (name, category) pairs are skipped, and the result follows
 * { success, imported, skipped, errors: 0, total }.
 */

// Byte-identical to the backend menuTransferKey separator (NUL character).
const importKeyJoiner = String.fromCharCode(0);

const importDuplicateKey = (name, category) =>
  `${String(category || "").trim().toLocaleLowerCase()}${importKeyJoiner}${String(name || "")
    .trim()
    .toLocaleLowerCase()}`;

const importFailureMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const DUPLICATE_MESSAGE_PATTERN = /already exists|duplicate/i;

const readCategoryCatalog = async (hotelId) => {
  const response = await api.get(`/menu/categories/${hotelId}`);
  const source = Array.isArray(response.data)
    ? response.data
    : Array.isArray(response.data?.categories)
      ? response.data.categories
      : [];

  return source
    .map(normalizeCategoryRecord)
    .filter((category) => category && category.name);
};

export const importMenuViaSingleDishEndpoints = async (
  payload,
  { hotelId, existingDishes = [], onProgress } = {}
) => {
  if (!hotelId) {
    throw new Error("A valid hotel is required to import this menu.");
  }

  let categories = await readCategoryCatalog(hotelId);

  /*
   * CATEGORIES
   *
   * Resolve every category before writing any dish, matching the bulk
   * endpoint. Missing categories are created; existing ones gain any
   * file-only subcategories (existing order preserved).
   */
  const requirements = new Map();

  payload.dishes.forEach((dish) => {
    const key = categoryKey(dish.category);
    const requirement =
      requirements.get(key) || {
        name: dish.category,
        subCategories: [],
        knownSubKeys: new Set(),
        matched: null,
      };
    if (
      dish.subCategory &&
      !requirement.knownSubKeys.has(categoryKey(dish.subCategory))
    ) {
      requirement.knownSubKeys.add(categoryKey(dish.subCategory));
      requirement.subCategories.push(dish.subCategory);
    }
    requirements.set(key, requirement);
  });

  for (const [key, requirement] of requirements) {
    let match = findCategoryByName(categories, requirement.name);

    if (!match) {
      try {
        const response = await api.post("/menu/category", {
          name: requirement.name,
          subCategories: requirement.subCategories,
        });
        const created = normalizeCategoryRecord(
          response.data?.category || response.data
        );
        if (!created || !created.name) {
          throw new Error("The restaurant did not confirm the new category.");
        }
        categories = [
          ...categories.filter(
            (category) => categoryKey(category) !== categoryKey(created)
          ),
          created,
        ];
        requirement.matched = created;
        continue;
      } catch (error) {
        // A parallel session may have created the category: refresh once.
        categories = await readCategoryCatalog(hotelId);
        match = findCategoryByName(categories, requirement.name);
        if (!match) {
          throw new Error(
            importFailureMessage(
              error,
              `Could not create category “${requirement.name}”.`
            ),
            { cause: error }
          );
        }
      }
    }

    const existingSubs = Array.isArray(match.subCategories)
      ? match.subCategories
      : [];
    const existingSubKeys = new Set(
      existingSubs.map((sub) => categoryKey(sub))
    );
    const additions = requirement.subCategories.filter(
      (sub) => !existingSubKeys.has(categoryKey(sub))
    );

    if (additions.length) {
      const response = await api.put(`/menu/category/${match._id}`, {
        name: match.name,
        subCategories: [...existingSubs, ...additions],
      });
      const updated = normalizeCategoryRecord(
        response.data?.category || response.data
      );
      if (updated && updated.name) {
        categories = categories.map((category) =>
          categoryKey(category) === key ? updated : category
        );
        match = updated;
      }
    }

    requirement.matched = match;
  }

  /*
   * DISHES
   *
   * Duplicate names inside a category are skipped — against the existing
   * menu snapshot and repeats within the file itself (bulk parity).
   */
  const usedKeys = new Set(
    existingDishes.map((dish) =>
      importDuplicateKey(dish?.name, dishCategoryName(dish))
    )
  );

  let imported = 0;
  let skipped = 0;
  const total = payload.dishes.length;
  onProgress?.(0, total);

  for (const dish of payload.dishes) {
    const key = importDuplicateKey(dish.name, dish.category);
    if (usedKeys.has(key)) {
      skipped += 1;
    } else {
      usedKeys.add(key);
      const category = requirements.get(categoryKey(dish.category))?.matched;
      if (!category) {
        throw new Error(
          `Category “${dish.category}” could not be resolved for “${dish.name}”.`
        );
      }

      const formData = buildDishFormData(
        {
          ...dish,
          category: category.name,
          categoryId: category._id,
          categoryName: category.name,
        },
        {
          clientMutationId: `menu-import-${Date.now()}-${imported + skipped + 1}`,
          restaurant: hotelId,
        }
      );

      try {
        await api.post("/menu/dish", formData);
        imported += 1;
      } catch (error) {
        const message = String(error?.response?.data?.message || "");
        if (DUPLICATE_MESSAGE_PATTERN.test(message)) {
          // Menu changed since the snapshot: another session added this
          // dish. Count it as skipped, matching the bulk endpoint.
          skipped += 1;
        } else {
          throw new Error(
            `${imported} dishes imported and ${skipped} skipped before the import stopped: ${importFailureMessage(error, "a dish could not be created.")}`,
            { cause: error }
          );
        }
      }
    }
    onProgress?.(imported + skipped, total);
  }

  return { success: true, imported, skipped, errors: 0, total };
};
