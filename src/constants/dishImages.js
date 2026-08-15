// Default artwork for dishes the owner never photographed.
// Restores the pre-redesign behavior (every dish shows a food image),
// upgraded: specific dish-name keywords win, each standard category has a
// relevant photo, and every other category still gets a varied appetizing
// photo (deterministic per category name, never a broken link).
const u = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=480&q=60`;

export const DEFAULT_DISH_IMAGE = u("photo-1546069901-ba9599a7e63c");

// 1) Specific dishes — matched against the dish name first.
const NAME_RULES = [
  [["pizza"], u("photo-1513104890138-7c749659a591")],
  [["burger"], u("photo-1568901346375-23c9450c58cd")],
  [["sandwich", "wrap", "sub "], u("photo-1528735602780-2552fd46c7af")],
  [["biryani", "pulao", "risotto", "fried rice", "rice"], u("photo-1589302168068-964664d93dc0")],
  [["noodle", "chow", "hakka", "pasta", "spaghetti", "manchur"], u("photo-1585032226651-759b368d7246")],
  [["dosa", "idli", "uttapam"], u("photo-1630383249896-424e482df921")],
  [["naan", "roti", "kulcha", "paratha", "bread", "toast"], u("photo-1509440159596-0249088772ff")],
  [["cake", "ice cream", "brownie", "pastry", "kheer", "gulab", "rasgulla", "halwa", "pudding", "sundae"], u("photo-1551024506-0bccd828d307")],
  [["coffee", "tea", "shake", "smoothie", "juice", "soda", "cola", "mocktail", "lassi", "milkshake"], u("photo-1544145945-f90425340c7e")],
  [["soup"], u("photo-1547592166-23ac45744acd")],
  [["salad"], u("photo-1512621776951-a57141f2eefd")],
  [["tikka", "kebab", "tandoori", "seekh"], u("photo-1555939594-58d7cb561ad1")],
  [["fish", "prawn", "seafood"], u("photo-1559339352-11d035aa65de")],
  [["fries", "chips", "nachos"], u("photo-1573080496219-bb080dd4f877")],
  [["curry", "paneer", "masala", "kofta", "dal", "sabzi", "bhaji"], u("photo-1565557623262-b51c2513a641")],
];

// 2) Standard categories — every common section maps to a relevant photo.
const CATEGORY_RULES = [
  [["starter", "appetizer", "appetiser"], u("photo-1555939594-58d7cb561ad1")],
  [["main course", "main", "curries", "curry", "veg"], u("photo-1565557623262-b51c2513a641")],
  [["dessert", "sweet", "ice cream", "cake"], u("photo-1551024506-0bccd828d307")],
  [["drink", "beverage", "juice", "shake", "coffee", "tea", "bar"], u("photo-1544145945-f90425340c7e")],
  [["bread", "roti", "naan"], u("photo-1509440159596-0249088772ff")],
  [["rice", "biryani", "pulao"], u("photo-1589302168068-964664d93dc0")],
  [["chinese", "oriental", "pan asian", "noodle"], u("photo-1585032226651-759b368d7246")],
  [["south indian", "breakfast"], u("photo-1533089860892-a7c6f0a88666")],
  [["tandoor", "bbq", "grill", "kebab"], u("photo-1555939594-58d7cb561ad1")],
  [["fast food", "burger"], u("photo-1568901346375-23c9450c58cd")],
  [["pizza", "italian"], u("photo-1513104890138-7c749659a591")],
  [["salad", "soup", "healthy"], u("photo-1512621776951-a57141f2eefd")],
  [["snack", "chaat", "quick bite"], u("photo-1573080496219-bb080dd4f877")],
  [["fish", "sea", "prawn"], u("photo-1559339352-11d035aa65de")],
  [["combo", "thali"], u("photo-1565557623262-b51c2513a641")],
];

// 3) Anything else: rotate through varied appetizing photos, chosen
//    deterministically from the category/dish text so it is stable.
const GENERIC_POOL = [
  u("photo-1546069901-ba9599a7e63c"),
  u("photo-1565299585323-38d6b0865b47"),
  u("photo-1565958011703-44f9829ba187"),
  u("photo-1528735602780-2552fd46c7af"),
];

const matchRule = (rules, text) => {
  for (const [keywords, image] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) return image;
  }
  return null;
};

export function getDefaultDishImage(dish) {
  const name = String(dish?.name || "").toLowerCase();
  const category = [
    dish?.category?.name,
    dish?.categoryName,
    typeof dish?.category === "string" ? dish.category : "",
    dish?.subCategory,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hit = matchRule(NAME_RULES, name) || matchRule(NAME_RULES, category) || matchRule(CATEGORY_RULES, category);
  if (hit) return hit;

  const seed = (name + category) || "food";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GENERIC_POOL[hash % GENERIC_POOL.length];
}

export const getDishImage = (dish) =>
  dish?.image || getDefaultDishImage(dish);

export const getCategoryImage = (category) =>
  getDefaultDishImage({ name: "", category });
