import { categoryKey, dishCategoryName } from "./menuCategories";
import { sortDishesForDisplay } from "./menuOrdering";
import { isSimpleMenu } from "./menuPresentation";
import { getDishPricing } from "./pricing";

const cleanText = (value) => String(value ?? "").trim();
const finitePrice = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export const menuPrintDishId = (dish = {}) => cleanText(
  dish._id || dish.id || dish.clientDishId
);

const money = (price) => price === null
  ? "Price on request"
  : `₹${price.toFixed(2)}`;

const printPricing = (dish) => {
  const recorded = finitePrice(dish?.price);
  if (recorded === null) return { basePrice: null, finalPrice: null, hasDiscount: false, label: money(null) };
  const pricing = getDishPricing(dish);
  const finalPrice = finitePrice(pricing.finalPrice);
  const hasDiscount = Boolean(pricing.hasDiscount && finalPrice !== null && finalPrice < recorded);
  return {
    basePrice: recorded,
    finalPrice: finalPrice ?? recorded,
    hasDiscount,
    label: hasDiscount ? `${money(finalPrice)} · was ${money(recorded)}` : money(finalPrice ?? recorded),
  };
};

const buildCombo = (dish, warnings) => {
  const config = dish?.comboConfig;
  if (!config || typeof config !== "object") return null;
  const included = (Array.isArray(config.includedItems) ? config.includedItems : [])
    .map(cleanText)
    .filter(Boolean);
  const choices = [];

  (Array.isArray(config.selectionGroups) ? config.selectionGroups : []).forEach((group, index) => {
    const name = cleanText(group?.name) || `Choice ${index + 1}`;
    const items = (Array.isArray(group?.items) ? group.items : [])
      .map(cleanText)
      .filter(Boolean);
    const min = Number(group?.minSelections);
    const max = Number(group?.maxSelections);
    const valid = Number.isInteger(min) && Number.isInteger(max)
      && min >= 0 && max >= min && max <= items.length;
    if (!valid || !items.length) {
      warnings.push(`Check combo choices for ${cleanText(dish.name) || "an unnamed dish"}.`);
      choices.push({ name, items, instruction: "Choice details need confirmation", malformed: true });
      return;
    }
    choices.push({
      name,
      items,
      instruction: min === max ? `Choose exactly ${min}` : `Choose ${min}–${max}`,
      malformed: false,
    });
  });

  if (!included.length && !choices.length) {
    warnings.push(`Check combo choices for ${cleanText(dish.name) || "an unnamed dish"}.`);
  }
  return included.length || choices.length ? { included, choices } : null;
};

const orderedCategories = (categories = []) => [...categories]
  .map((category, index) => ({ category, index }))
  .sort((left, right) => {
    const leftOrder = Number(left.category?.displayOrder);
    const rightOrder = Number(right.category?.displayOrder);
    const leftRank = Number.isFinite(leftOrder) && leftOrder > 0 ? leftOrder : Infinity;
    const rightRank = Number.isFinite(rightOrder) && rightOrder > 0 ? rightOrder : Infinity;
    return leftRank - rightRank || left.index - right.index;
  })
  .map(({ category }) => categoryKey(category));

const validatedQrUrl = (value) => {
  const source = cleanText(value);
  if (!source) return "";
  try {
    const url = new URL(source);
    return /^https?:$/.test(url.protocol) && /^\/qr\/[^/]+\/?$/.test(url.pathname) ? url.href : "";
  } catch {
    return "";
  }
};

const freezeDish = (dish) => Object.freeze({
  ...dish,
  combo: dish.combo ? Object.freeze({
    included: Object.freeze([...dish.combo.included]),
    choices: Object.freeze(dish.combo.choices.map((choice) => Object.freeze({
      ...choice,
      items: Object.freeze([...choice.items]),
    }))),
  }) : null,
});

/**
 * Captures only printable menu data. The returned object is detached from the
 * live/cache records, so preview and download always use the same snapshot.
 */
export const buildMenuPrintModel = ({
  restaurant = {},
  dishes = [],
  categories = [],
  selectedDishIds,
  selectedCategoryKeys,
  settings = {},
  capturedAt = new Date(),
} = {}) => {
  const warnings = [];
  const allowedDishes = selectedDishIds instanceof Set ? selectedDishIds : null;
  const allowedCategories = selectedCategoryKeys instanceof Set ? selectedCategoryKeys : null;
  const categoryOrder = orderedCategories(categories);
  const byCategory = new Map();

  sortDishesForDisplay(dishes).forEach((dish) => {
    const id = menuPrintDishId(dish);
    const category = dishCategoryName(dish) || "Uncategorized";
    const key = categoryKey(category);
    if (!id || dish?.isAvailable === false || (allowedDishes && !allowedDishes.has(id)) ||
      (allowedCategories && !allowedCategories.has(key))) return;

    const pricing = printPricing(dish);
    const foodType = cleanText(dish.foodType).toLowerCase().replace(/[\s_-]/g, "");
    const entry = {
      id,
      name: cleanText(dish.name) || "Unnamed dish",
      description: cleanText(dish.description),
      image: cleanText(dish.image),
      dietary: ["veg", "vegetarian"].includes(foodType) ? "Veg" :
        ["nonveg", "nonvegetarian"].includes(foodType) ? "Non-veg" : "",
      price: pricing.finalPrice,
      basePrice: pricing.basePrice,
      hasDiscount: pricing.hasDiscount,
      priceLabel: pricing.label,
      combo: buildCombo(dish, warnings),
      pendingSync: Boolean(dish.pendingSync),
      subcategory: cleanText(dish.subCategory || dish.subcategory),
    };
    if (entry.pendingSync) warnings.push(`${entry.name} has a pending menu change.`);
    if (!byCategory.has(key)) byCategory.set(key, { key, name: category, dishes: [] });
    byCategory.get(key).dishes.push(entry);
  });

  const sections = [...byCategory.values()].sort((left, right) => {
    const leftIndex = categoryOrder.indexOf(left.key);
    const rightIndex = categoryOrder.indexOf(right.key);
    return (leftIndex < 0 ? Infinity : leftIndex) - (rightIndex < 0 ? Infinity : rightIndex)
      || left.name.localeCompare(right.name);
  });
  const pending = sections.flatMap((section) => section.dishes).filter((dish) => dish.pendingSync).length;
  if (!sections.length) warnings.push("No available dishes are selected. Select at least one dish to create a PDF.");
  const possibleQr = cleanText(restaurant.publicQrUrl || restaurant.qrUrl);
  const qrUrl = validatedQrUrl(possibleQr);
  if (possibleQr && !qrUrl) warnings.push("The saved QR link is invalid and was omitted from the PDF.");

  return Object.freeze({
    restaurant: Object.freeze({
      name: cleanText(restaurant.name || restaurant.hotelName) || "Restaurant menu",
      tagline: cleanText(restaurant.tagline || restaurant.description),
      logo: cleanText(restaurant.logo || restaurant.logoUrl || restaurant.image),
      banner: cleanText(restaurant.coverImage || restaurant.bannerImage || restaurant.banner),
      address: cleanText(restaurant.address),
      phone: cleanText(restaurant.phone || restaurant.contact || restaurant.mobile),
      email: cleanText(restaurant.email),
      website: cleanText(restaurant.website),
      qrUrl,
    }),
    sections: Object.freeze(sections.map((section) => Object.freeze({
      ...section,
      dishes: Object.freeze(section.dishes.map(freezeDish)),
    }))),
    settings: Object.freeze({
      // Keep unsupported paper/layout combinations out of both preview and PDF.
      // Poster is intentionally A4/A3 only; booklet is intentionally A4/A5 only.
      layout: settings.layout === "booklet" ? "booklet" : "poster",
      format: settings.layout === "booklet"
        ? (settings.format === "A5" ? "A5" : "A4")
        : (settings.format === "A3" ? "A3" : "A4"),
      includeCover: Boolean(settings.includeCover),
      includeLogo: settings.includeLogo !== false,
      includePhotos: settings.includePhotos ?? !isSimpleMenu(restaurant),
      includeDescriptions: settings.includeDescriptions !== false,
      includeDietary: settings.includeDietary !== false,
      includeContact: settings.includeContact !== false,
      allowRemoteImages: settings.allowRemoteImages !== false,
      notes: cleanText(settings.notes),
    }),
    capturedAt: new Date(capturedAt).toISOString(),
    pending,
    warnings: Object.freeze([...new Set(warnings)]),
  });
};

export const defaultMenuPrintSelection = (dishes = []) => new Set(
  dishes.filter((dish) => dish?.isAvailable !== false).map(menuPrintDishId).filter(Boolean)
);
