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
  "gst",
];

const isObjectId = (value) =>
  typeof value === "string" &&
  /^[0-9a-fA-F]{24}$/.test(value.trim());

export const normalizeEntityId = (value) => {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value).trim();
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  return normalizeEntityId(
    value._id ??
      value.id ??
      value.value ??
      value.uuid ??
      ""
  );
};

export const categoryId = (category) => {
  if (!category) return "";

  if (typeof category === "object") {
    return normalizeEntityId(
      category._id ??
        category.id ??
        category.categoryId ??
        ""
    );
  }

  const value = String(category).trim();

  return isObjectId(value) ? value : "";
};

export const categoryName = (category) => {
  if (!category) return "";

  if (typeof category === "object") {
    return String(
      category.name ??
        category.label ??
        category.categoryName ??
        ""
    ).trim();
  }

  const value = String(category).trim();

  return isObjectId(value) ? "" : value;
};

export const categoryKey = (category) =>
  categoryName(category).toLowerCase();

export const normalizeDish = (dish) => {
  if (!dish || typeof dish !== "object") {
    return null;
  }

  const id =
    dish._id ??
    dish.id ??
    dish.clientDishId;

  const category =
    dish.categoryId &&
    typeof dish.categoryId === "object"
      ? dish.categoryId
      : dish.category ||
        dish.categoryName ||
        "";

  const idValue = categoryId(category);
  const nameValue = categoryName(category);

  return {
    ...dish,

    ...(id
      ? {
          _id: String(id),
        }
      : {}),

    categoryId: idValue,

    category,

    categoryName:
      nameValue || "Uncategorized",

    tags: Array.isArray(dish.tags)
      ? dish.tags
      : String(dish.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
  };
};

const arrayFromEnvelope = (
  payload,
  depth = 0
) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    depth > 3
  ) {
    return null;
  }

  for (const key of [
    "dishes",
    "menu",
    "items",
  ]) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return arrayFromEnvelope(
    payload.data,
    depth + 1
  );
};

export const normalizeMenuResponse = (
  payload
) => {
  const dishes =
    arrayFromEnvelope(payload);

  if (!dishes) return null;

  return dishes
    .map(normalizeDish)
    .filter(Boolean);
};

export const normalizeDishResponse = (
  payload
) => {
  const candidate =
    payload?.dish ??
    payload?.data?.dish ??
    payload?.data ??
    payload;

  if (Array.isArray(candidate)) {
    return null;
  }

  return normalizeDish(candidate);
};

export function dishFieldsFromForm(formData, category) {
  return {
    name: String(formData.name || "").trim(),
    description: String(formData.description || "").trim(),

    // IMPORTANT
    category: String(category || "").trim(),

    foodType: formData.foodType || "veg",
    containsEgg: Boolean(formData.containsEgg),

    price: Number(formData.price || 0),

    discountType: formData.discountType || "percentage",
    discountValue: Number(formData.discountValue || 0),

    prepTime: Number(formData.prepTime || 0),

    isAvailable: formData.isAvailable !== false,

    isRecommended: Boolean(formData.isRecommended),
    isBestseller: Boolean(formData.isBestseller),

    featured: Boolean(formData.featured),
    todaySpecial: Boolean(formData.todaySpecial),
    isPopular: Boolean(formData.isPopular),
    isNewArrival: Boolean(formData.isNewArrival),
    chefChoice: Boolean(formData.chefChoice),

    spiceLevel: formData.spiceLevel || "",

    tags: Array.isArray(formData.tags)
      ? formData.tags
      : [],

    displayOrder: Number(formData.displayOrder || 0),
  };
}

const dataUrlToBlob = (dataUrl) => {
  if (
    !dataUrl ||
    typeof dataUrl !== "string"
  ) {
    return null;
  }

  const [header, encoded] =
    dataUrl.split(",", 2);

  if (!encoded) return null;

  const mime =
    header.match(
      /^data:([^;]+)/
    )?.[1] ||
    "application/octet-stream";

  const binary =
    globalThis.atob(encoded);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return new Blob(
    [bytes],
    {
      type: mime,
    }
  );
};

export const buildDishFormData = (
  fields,
  {
    image = null,
    clientMutationId,
    clientDishId,
  } = {}
) => {
  const form = new FormData();

  MENU_FIELD_NAMES.forEach(
    (field) => {
      if (
        fields[field] !== undefined &&
        fields[field] !== null
      ) {
        form.append(
          field,
          String(fields[field])
        );
      }
    }
  );

  /*
   * CATEGORY
   *
   * Always send categoryId as the Mongo ID.
   */
  const resolvedCategoryId =
    categoryId(
      fields.categoryId
    );

  if (!resolvedCategoryId) {
    throw new Error(
      "Please select a valid category."
    );
  }

  form.append(
    "categoryId",
    resolvedCategoryId
  );

  const resolvedCategoryName =
    categoryName(
      fields.categoryName
    );

  if (resolvedCategoryName) {
    form.append(
      "categoryName",
      resolvedCategoryName
    );
  }

  form.delete("category");

  const tags =
    Array.isArray(fields.tags)
      ? fields.tags
      : String(fields.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);

  form.append(
    "tags",
    tags.join(",")
  );

  if (clientMutationId) {
    form.append(
      "clientMutationId",
      clientMutationId
    );
  }

  if (clientDishId) {
    form.append(
      "clientDishId",
      clientDishId
    );
  }

  if (image?.dataUrl) {
    const blob =
      dataUrlToBlob(
        image.dataUrl
      );

    if (blob) {
      form.append(
        "image",
        blob,
        image.name || "dish-image"
      );
    }
  } else if (
    image instanceof Blob
  ) {
    form.append(
      "image",
      image,
      image.name || "dish-image"
    );
  }

  return form;
};

export const readImageForStorage = (
  file
) => {
  if (!file) {
    return Promise.resolve(null);
  }

  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve({
          dataUrl: String(
            reader.result || ""
          ),
          name:
            file.name ||
            "dish-image",
          type:
            file.type ||
            "application/octet-stream",
        });

      reader.onerror = () =>
        reject(
          new Error(
            "The dish image could not be saved on this device."
          )
        );

      reader.readAsDataURL(file);
    }
  );
};

export const buildCategoryList = (
  dishes = [],
  defaults = []
) => {
  const labels = new Map();

  [
    ...defaults,
    ...dishes.map(
      (dish) =>
        dish.categoryId
          ? categoryName(
              dish.categoryId
            )
          : categoryName(
              dish.category
            )
    ),
  ]
    .filter(Boolean)
    .forEach((name) => {
      const key =
        categoryKey(name);

      if (
        key !== "all" &&
        !labels.has(key)
      ) {
        labels.set(
          key,
          name
        );
      }
    });

  return [
    "All",
    ...labels.values(),
  ];
};