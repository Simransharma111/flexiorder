import { expect, test } from "@playwright/test";
import { fulfillJson, hotel, installSession, kitchenOrder } from "./helpers";

const openOwnerTab = async (page, name) => {
  if ((page.viewportSize()?.width || 0) < 768) {
    await page.getByRole("button", { name: "Open owner menu" }).click();
  }
  await page.getByRole("button", { name, exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await installSession(page, "owner");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel }));
  await page.route("**/kitchen/orders?type=kitchen", (route) => fulfillJson(route, { orders: [] }));
});

test("owner opens on a compact Today surface", async ({ page }) => {
  await page.goto("/owner/dashboard");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("Welcome back")).toHaveCount(0);
  await expect(page.getByText("Revenue", { exact: true })).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.locator(".owner-shell")).toHaveCSS("--primary", "#f97316");
});

test("owner theme selection applies immediately and survives reload", async ({ page }) => {
  let savedHotel = { ...hotel, theme: { id: "mint_glow" } };
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel: savedHotel }));
  await page.route("**/hotel/branding", async (route) => {
    const body = route.request().postData() || "";
    expect(body).toMatch(/name="themeId"\r?\n\r?\nlavender_hues\r?\n/);
    savedHotel = {
      ...savedHotel,
      theme: {
        id: "lavender_hues",
        primary: "#ffffff",
        secondary: "#f5f3ff",
        accent: "#a78bfa",
      },
    };
    return fulfillJson(route, { hotel: savedHotel });
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");
  await page.getByRole("button", { name: /Lavender Hues/ }).click();
  await expect(page.locator(".owner-shell")).toHaveCSS("--primary", "#a78bfa");
  const savedDialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Save Branding" }).click();
  await (await savedDialog).accept();

  await page.reload();
  await expect(page.locator(".owner-shell")).toHaveCSS("--primary", "#a78bfa");
});

test("staff creation reports a duplicate email and can retry successfully", async ({ page }) => {
  let attempts = 0;
  await page.route("**/staff", (route) => fulfillJson(route, []));
  await page.route("**/staff/create", async (route) => {
    attempts += 1;
    if (attempts === 1) return fulfillJson(route, { message: "Email already exists" }, 409);
    return fulfillJson(route, { staff: { _id: "staff-new", name: "Ravi", email: "ravi@example.com", position: "Waiter", role: "staff" } }, 201);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Staff");
  await expect(page.locator(".owner-header strong")).toHaveText("Staff");
  await page.getByPlaceholder("Staff name").fill("Ravi");
  await page.getByPlaceholder("Email").fill("ravi@example.com");
  await page.getByPlaceholder("Password").fill("secret12");
  await page.getByRole("combobox").selectOption("Waiter");
  await page.getByRole("button", { name: "Add staff" }).click();
  await expect(page.getByRole("alert")).toContainText("Email already exists");
  await expect(page.getByRole("button", { name: "Add staff" })).toBeEnabled();
  await page.getByRole("button", { name: "Add staff" }).click();
  await expect(page.getByRole("status")).toContainText("Staff account created");
  await expect(page.getByText("ravi@example.com")).toBeVisible();
});

test("owner can inspect completed order history", async ({ page }) => {
  await page.unroute("**/kitchen/orders?type=kitchen");
  await page.route("**/kitchen/orders?type=kitchen", (route) => fulfillJson(route, {
    orders: [{ ...kitchenOrder(), status: "delivered" }],
  }));

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "History");
  await expect(page.locator(".owner-header strong")).toHaveText("History");
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText("Table 8", { exact: true })).toBeVisible();
});

test("Simple app level hides optional owner controls immediately", async ({ page }) => {
  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");
  await page.getByRole("button", { name: /^Simple Orders/ }).click();

  await expect(page.getByText("Staff access", { exact: true })).toHaveCount(0);
  if ((page.viewportSize()?.width || 0) < 768) {
    await page.getByRole("button", { name: "Open owner menu" }).click();
  }
  await expect(page.getByRole("button", { name: "Staff", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Analytics", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "QR Tables", exact: true })).toBeVisible();
});

test("Advanced explains inherited features and exposes working menu data tools", async ({ page }) => {
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, [{
    _id: "dish-1", name: "Visible Curry", category: "Main Course", price: 250, isAvailable: true,
  }]));
  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");
  await page.getByRole("button", { name: /^Advanced Everything/ }).click();
  await expect(page.getByText(/Bulk menu import/)).toBeVisible();
  await expect(page.getByText(/Daily analytics CSV export/)).toBeVisible();

  await openOwnerTab(page, "Menu");
  await expect(page.getByText("Import menu", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export menu" })).toBeVisible();
  await page.getByRole("button", { name: "Add Dish" }).click();
  await expect(page.getByText("Display Sections", { exact: true })).toBeVisible();
  await expect(page.getByText("Menu priority (optional)", { exact: true })).toBeVisible();
});

test("owner can type and save a custom dish category", async ({ page }) => {
  let submittedBody = "";
  let createdDish = null;
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, createdDish ? [createdDish] : []));
  await page.route("**/menu/dish", async (route) => {
    submittedBody = route.request().postData() || "";
    createdDish = {
      _id: "dish-custom",
      name: "House Platter",
      category: "House Specials",
      foodType: "veg",
      price: 450,
      prepTime: 20,
      isAvailable: true,
    };
    return fulfillJson(route, createdDish, 201);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await page.getByRole("button", { name: "Add Dish" }).click();

  const form = page.locator("form");
  await form.getByPlaceholder("e.g. Paneer Butter Masala").fill("House Platter");
  await form.getByPlaceholder("Price").fill("450");
  await form.getByLabel("Category").fill("House Specials");
  await form.getByPlaceholder("Minutes").fill("20");
  await form.getByRole("button", { name: "Add Dish" }).click();

  await expect(page.getByRole("button", { name: "House Specials" })).toBeVisible();
  await expect.poll(() => submittedBody).toMatch(/name="category"\r?\n\r?\nHouse Specials\r?\n/);
  await page.getByRole("button", { name: "House Specials" }).click();
  await expect(page.getByText("House Platter", { exact: true }).filter({ visible: true })).toHaveCount(1);

  await page.reload();
  await openOwnerTab(page, "Menu");
  await expect(page.getByRole("button", { name: "House Specials" })).toBeVisible();
});

test("owner reads wrapped menus with a populated restaurant id", async ({ page }) => {
  await page.addInitScript(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    localStorage.setItem("user", JSON.stringify({
      ...user,
      hotelId: { _id: "hotel-1", name: "Flexi Test Kitchen" },
    }));
  });
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, {
    dishes: [{
      _id: "dish-old",
      name: "Old Family Curry",
      category: { _id: "category-main", name: "Main Course" },
      price: 320,
      prepTime: 20,
      foodType: "veg",
      isAvailable: true,
    }],
  }));

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await expect(page.getByText("Old Family Curry", { exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText("No dishes found")).toHaveCount(0);
});

test("existing populated category keeps its server id when adding a dish", async ({ page }) => {
  let submittedBody = "";
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, {
    dishes: [{
      _id: "dish-reference",
      name: "Reference Curry",
      category: { _id: "category-main", name: "Main Course" },
      price: 300,
      prepTime: 20,
      foodType: "veg",
      isAvailable: true,
    }],
  }));
  await page.route("**/menu/dish", async (route) => {
    submittedBody = route.request().postData() || "";
    return fulfillJson(route, {
      dish: {
        _id: "dish-created",
        name: "ID Curry",
        category: { _id: "category-main", name: "Main Course" },
        price: 340,
        prepTime: 18,
        foodType: "veg",
        isAvailable: true,
      },
    }, 201);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await page.getByRole("button", { name: "Add Dish" }).click();
  const form = page.locator("form");
  await form.getByPlaceholder("e.g. Paneer Butter Masala").fill("ID Curry");
  await form.getByPlaceholder("Price").fill("340");
  await form.getByLabel("Category").fill("Main Course");
  await form.getByPlaceholder("Minutes").fill("18");
  await form.getByRole("button", { name: "Add Dish" }).click();

  await expect.poll(() => submittedBody).toMatch(/name="category"\r?\n\r?\ncategory-main\r?\n/);
  expect(submittedBody).toMatch(/name="categoryName"\r?\n\r?\nMain Course\r?\n/);
});

test("owner and waiter reuse the same restaurant menu cache", async ({ page }) => {
  let menuEndpointAvailable = true;
  const sharedDish = {
    _id: "dish-shared",
    name: "Shared Dal",
    category: "Main Course",
    price: 220,
    prepTime: 15,
    foodType: "veg",
    isAvailable: true,
  };
  await page.route("**/menu/hotel-1", (route) => menuEndpointAvailable
    ? fulfillJson(route, { dishes: [sharedDish] })
    : route.abort("internetdisconnected"));
  await page.route("**/table", (route) => fulfillJson(route, {
    tables: [{ _id: "table-8", tableNumber: "8", type: "table" }],
  }));

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await expect(page.getByText("Shared Dal", { exact: true }).filter({ visible: true })).toHaveCount(1);

  menuEndpointAvailable = false;
  await page.goto("/owner/order");
  await page.getByRole("tab", { name: "Take Order" }).click();
  await page.getByRole("button", { name: /Table 8/ }).click();
  await expect(page.getByText("Shared Dal", { exact: true })).toBeVisible();
});

test("offline-created dish survives reload and syncs when the API returns", async ({ page }) => {
  let apiOffline = false;
  let syncedDish = null;
  let successfulCreates = 0;

  await page.route("**/menu/hotel-1", (route) => {
    if (apiOffline) return route.abort("internetdisconnected");
    return fulfillJson(route, syncedDish ? [syncedDish] : []);
  });
  await page.route("**/menu/dish", async (route) => {
    if (apiOffline) return route.abort("internetdisconnected");
    successfulCreates += 1;
    syncedDish = {
      _id: "dish-offline-server",
      name: "Offline Thali",
      category: "Main Course",
      foodType: "veg",
      price: 280,
      prepTime: 18,
      isAvailable: true,
    };
    return fulfillJson(route, { dish: syncedDish }, 201);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  apiOffline = true;
  await page.getByRole("button", { name: "Add Dish" }).click();
  const form = page.locator("form");
  await form.getByPlaceholder("e.g. Paneer Butter Masala").fill("Offline Thali");
  await form.getByPlaceholder("Price").fill("280");
  await form.getByLabel("Category").fill("Main Course");
  await form.getByPlaceholder("Minutes").fill("18");
  await form.getByRole("button", { name: "Add Dish" }).click();
  await expect(page.getByText("Offline Thali", { exact: true }).filter({ visible: true })).toHaveCount(1);

  await page.reload();
  await openOwnerTab(page, "Menu");
  await expect(page.getByText("Offline Thali", { exact: true }).filter({ visible: true })).toHaveCount(1);

  apiOffline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => successfulCreates).toBe(1);
  await expect(page.getByText("Waiting to sync")).toHaveCount(0);
});
