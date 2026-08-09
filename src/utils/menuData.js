import { categoryId, categoryName } from "./menuCategories";

export const MENU_FIELD_NAMES = [
  "name",
  "description",
  "foodType",
  "containsEgg",
  "price",
  "discountType",
  "discountValue",
  "prepTime",
  "isAvailable",
  "isRecommended",
  "isBestseller",
  "featured",
  "todaySpecial",
  "isPopular",
  "isNewArrival",
  "chefChoice",
  "spiceLevel",
  "displayOrder",
];

const arrayFromEnvelope = (payload, depth = 0) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object" || depth > 2) return null;

  for (const key of ["dishes", "menu", "items"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return arrayFromEnvelope(payload.data, depth + 1);
};

export const normalizeDish = (dish) => {
  if (!dish || typeof dish !== "object") return null;
  const id = dish._id ?? dish.id ?? dish.clientDishId;
  return {
    ...dish,
    ...(id ? { _id: String(id) } : {}),
    category: dish.category ?? dish.categoryName ?? "Uncategorized",
    tags: Array.isArray(dish.tags)
      ? dish.tags
      : String(dish.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
  };
};

export const normalizeMenuResponse = (payload) => {
  const dishes = arrayFromEnvelope(payload);
  if (!dishes) return null;
  return dishes.map(normalizeDish).filter(Boolean);
};

export const normalizeDishResponse = (payload) => {
  const candidate = payload?.dish ?? payload?.data?.dish ?? payload?.data ?? payload;
  return Array.isArray(candidate) ? null : normalizeDish(candidate);
};

export const dishFieldsFromForm = (formData, category) => ({
  ...Object.fromEntries(MENU_FIELD_NAMES.map((field) => [field, formData[field]])),
  category,
  tags: Array.isArray(formData.tags) ? formData.tags : [],
});

const dataUrlToBlob = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const [header, encoded] = dataUrl.split(",", 2);
  if (!encoded) return null;
  const mime = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = globalThis.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
};

export const buildDishFormData = (fields, {
  image = null,
  clientMutationId,
  clientDishId,
} = {}) => {
  const form = new FormData();
  MENU_FIELD_NAMES.forEach((field) => {
    if (fields[field] !== undefined && fields[field] !== null) {
      form.append(field, fields[field]);
    }
  });

  if (fields.category !== undefined && fields.category !== null) {
    const name = categoryName(fields.category);
    const id = categoryId(fields.category);
    if (id || name) form.append("category", id || name);
    if (id && name) form.append("categoryName", name);
  }
  form.append("tags", Array.isArray(fields.tags) ? fields.tags.join(",") : String(fields.tags || ""));
  if (clientMutationId) form.append("clientMutationId", clientMutationId);
  if (clientDishId) form.append("clientDishId", clientDishId);

  if (image?.dataUrl) {
    const blob = dataUrlToBlob(image.dataUrl);
    if (blob) form.append("image", blob, image.name || "dish-image");
  } else if (image instanceof Blob) {
    form.append("image", image, image.name || "dish-image");
  }
  return form;
};

export const readImageForStorage = (file) => {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      dataUrl: String(reader.result || ""),
      name: file.name || "dish-image",
      type: file.type || "application/octet-stream",
    });
    reader.onerror = () => reject(new Error("The dish image could not be saved on this device."));
    reader.readAsDataURL(file);
  });
};
