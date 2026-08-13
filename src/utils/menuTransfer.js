import { categoryName } from "./menuCategories";

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
