export const hotel = {
  _id: "hotel-1",
  name: "Flexi Test Kitchen",
  description: "Fresh food, served simply.",
  orderingEnabled: true,
  gstEnabled: true,
  gstPercentage: 5,
  menuMode: "graphic",
  theme: { primary: "#f97316" },
};

export const table = {
  _id: "table-8",
  tableNumber: "8",
  locationNumber: "8",
  type: "table",
};

export const dishes = [
  {
    _id: "dish-paneer",
    name: "Paneer Tikka",
    description: "Charred paneer with peppers",
    price: 300,
    discountType: "percentage",
    discountValue: 10,
    foodType: "veg",
    containsEgg: false,
    category: "Starters",
    prepTime: 15,
    spiceLevel: "medium",
    isAvailable: true,
  },
  {
    _id: "dish-cake",
    name: "Eggless-style Cake",
    description: "Vegetarian dish containing egg",
    price: 120,
    foodType: "veg",
    containsEgg: true,
    category: "Desserts",
    isAvailable: true,
  },
  {
    _id: "dish-sold-out",
    name: "Sold Out Soup",
    price: 100,
    foodType: "veg",
    category: "Starters",
    isAvailable: false,
  },
];

const TEST_NOW_MS = Date.UTC(2100, 0, 1);

export const makeToken = (subject = "staff-1", nowMs = TEST_NOW_MS) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    sub: subject,
    exp: Math.floor(nowMs / 1000) + 3600,
  })}.signature`;
};

export const installSession = async (page, role = "staff") => {
  const user = {
    _id: `${role}-1`,
    email: `${role}@flexi.test`,
    role,
    hotelId: "hotel-1",
  };
  const token = makeToken(user._id);

  await page.addInitScript(({ storedUser, storedToken }) => {
    localStorage.setItem("user", JSON.stringify(storedUser));
    localStorage.setItem("token", storedToken);
  }, { storedUser: user, storedToken: token });

  return { user, token };
};

export const fulfillJson = (route, body, status = 200) => route.fulfill({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

export const mockGuestMenu = async (page, overrides = {}) => {
  const menuHotel = { ...hotel, ...(overrides.hotel || {}) };
  const menuDishes = overrides.dishes || dishes;
  const activeOrders = overrides.orders || [];

  await page.route("**/qr/menu/qr-123", (route) => fulfillJson(route, {
    hotel: menuHotel,
    table,
    dishes: menuDishes,
  }));
  await page.route("**/orders/table/table-8", (route) => fulfillJson(route, {
    orders: activeOrders,
  }));
};

export const mockStaffWorkspace = async (page, orders = []) => {
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => (
    route.request().method() === "GET"
      ? fulfillJson(route, { orders })
      : route.fallback()
  ));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, dishes));
  await page.route("**/table", (route) => fulfillJson(route, {
    tables: [table, { _id: "room-101", tableNumber: "101", type: "room" }],
  }));
};

export const kitchenOrder = (overrides = {}) => ({
  _id: "order-00008",
  status: "pending",
  orderType: "dinein",
  locationType: "table",
  locationNumber: "8",
  guestName: "Guest",
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  items: [
    { name: "Paneer Tikka", quantity: 2 },
    { name: "Naan", quantity: 1 },
  ],
  ...overrides,
});
