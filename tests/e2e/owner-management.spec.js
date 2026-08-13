import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fulfillJson, hotel, installSession, kitchenOrder } from "./helpers";

const demoMenuFile = path.resolve(
  process.cwd(),
  "public/examples/flexiorder-menu-demo.json"
);

const readDownloadJson = async (download) => {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const openOwnerTab = async (page, name) => {
  if ((page.viewportSize()?.width || 0) < 768) {
    const menu = page.getByRole("button", { name: "Open owner menu" });
    await expect(menu).toBeVisible();
    await menu.click();
  }
  const tab = page.getByRole("button", { name, exact: true }).filter({ visible: true });
  await expect(tab).toBeVisible();
  await tab.click();
};

test.beforeEach(async ({ page }) => {
  await installSession(page, "owner");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel }));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => (
    route.request().method() === "GET"
      ? fulfillJson(route, { orders: [] })
      : route.fallback()
  ));
  await page.route("**/menu/categories/hotel-1", (route) => fulfillJson(route, []));
});

test("owner opens on a compact Today surface", async ({ page }) => {
  await page.goto("/owner/dashboard");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("Welcome back")).toHaveCount(0);
  await expect(page.getByText("Revenue", { exact: true })).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.locator(".owner-shell")).toHaveCSS("--primary", "#f97316");
});

test("owner connection status stays compact without an empty sync bar", async ({ page }) => {
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));
  await page.goto("/owner/dashboard");

  await expect(page.locator(".owner-header .ops-connection-dot")).toBeVisible();
  await expect(page.locator(".ops-sync-strip, .ops-attention-panel")).toHaveCount(0);

  await openOwnerTab(page, "Menu");
  await expect(page.locator(".owner-header .ops-connection-dot")).toBeVisible();
  await expect(page.locator(".ops-sync-strip, .ops-attention-panel")).toHaveCount(0);
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

test("owner ordering toggle follows the server response and rolls back failures", async ({ page }) => {
  const renderPhaseWarnings = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes(
      "Cannot update a component (`OwnerDashboard`) while rendering a different component (`OwnerHotelSettings`)"
    )) {
      renderPhaseWarnings.push(message.text());
    }
  });
  const payloads = [];
  let attempt = 0;
  await page.route("**/hotel/profile", async (route) => {
    attempt += 1;
    expect(route.request().method()).toBe("PATCH");
    const payload = route.request().postDataJSON();
    payloads.push(payload);
    if (attempt === 1) {
      return fulfillJson(route, { hotel: { ...hotel, orderingEnabled: true } });
    }
    return fulfillJson(route, { message: "Ordering setting was not saved" }, 500);
  });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");
  const orderingToggle = page.getByRole("checkbox", { name: "Customer ordering enabled" });
  await expect(orderingToggle).toBeChecked();

  await orderingToggle.uncheck();
  await expect(orderingToggle).toBeChecked();
  await orderingToggle.uncheck();
  await expect(orderingToggle).toBeChecked();
  expect(payloads).toEqual([
    { orderingEnabled: false },
    { orderingEnabled: false },
  ]);
  expect(renderPhaseWarnings).toEqual([]);
});

test("owner pauses and resumes customer ordering from Settings", async ({ page }) => {
  const payloads = [];
  let attempt = 0;
  await page.route("**/hotel/profile", async (route) => {
    attempt += 1;
    expect(route.request().method()).toBe("PATCH");
    const payload = route.request().postDataJSON();
    payloads.push(payload);
    if (attempt === 1) {
      return fulfillJson(route, { hotel: { ...hotel, orderingEnabled: false } });
    }
    return fulfillJson(route, { message: "Ordering setting was not saved" }, 500);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");
  const orderingToggle = page.getByRole("checkbox", { name: "Customer ordering enabled" });
  await orderingToggle.uncheck();
  await expect(orderingToggle).not.toBeChecked();

  const failedSaveDialog = page.waitForEvent("dialog");
  await orderingToggle.check();
  await expect((await failedSaveDialog).message()).toContain("Ordering setting was not saved");
  await (await failedSaveDialog).accept();
  await expect(orderingToggle).not.toBeChecked();
  expect(payloads).toEqual([
    { orderingEnabled: false },
    { orderingEnabled: true },
  ]);
});

test("owner menu mode and GST settings save canonically and survive reload", async ({ page }) => {
  let savedHotel = {
    ...hotel,
    menuMode: "visual",
    gstEnabled: false,
    gstPercentage: 0,
  };
  let submittedPayload;
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel: savedHotel }));
  await page.route("**/hotel/profile", async (route) => {
    submittedPayload = route.request().postDataJSON();
    savedHotel = {
      ...savedHotel,
      menuMode: submittedPayload.menuMode,
      gstEnabled: submittedPayload.gstEnabled,
      gstPercentage: submittedPayload.gstPercentage,
    };
    return fulfillJson(route, { hotel: savedHotel });
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");
  await page.getByRole("button", { name: /^Simple menu/ }).click();
  await page.getByRole("checkbox", { name: "Enable GST" }).check();
  await page.getByPlaceholder("e.g. 5").fill("12");
  const savedDialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Save Settings" }).click();
  const dialog = await savedDialog;
  expect(dialog.message()).toBe("Profile updated successfully");
  await dialog.accept();

  expect(submittedPayload).toMatchObject({
    menuMode: "simple",
    gstEnabled: true,
    gstPercentage: 12,
  });
  expect(submittedPayload).not.toHaveProperty("menuDisplayMode");
  expect(submittedPayload).not.toHaveProperty("simpleMenu");
  expect(submittedPayload).not.toHaveProperty("enableGST");
  expect(submittedPayload).not.toHaveProperty("gstRate");
  expect(submittedPayload).not.toHaveProperty("gst");

  await page.reload();
  await openOwnerTab(page, "Settings");
  await expect(page.getByRole("button", { name: /^Simple menu/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("checkbox", { name: "Enable GST" })).toBeChecked();
  await expect(page.getByPlaceholder("e.g. 5")).toHaveValue("12");
});

test("owner settings restore confirmed state after rejection or an unconfirmed response", async ({ page }) => {
  const confirmedHotel = {
    ...hotel,
    menuMode: "visual",
    gstEnabled: false,
    gstPercentage: 0,
  };
  let attempt = 0;
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel: confirmedHotel }));
  await page.route("**/hotel/profile", (route) => {
    attempt += 1;
    if (attempt === 1) {
      return fulfillJson(route, { message: "GST setting rejected" }, 400);
    }
    return fulfillJson(route, { hotel: confirmedHotel });
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");

  const submitDraft = async () => {
    await page.getByRole("button", { name: /^Simple menu/ }).click();
    await page.getByRole("checkbox", { name: "Enable GST" }).check();
    await page.getByPlaceholder("e.g. 5").fill("12");
    const alertDialog = page.waitForEvent("dialog");
    await page.getByRole("button", { name: "Save Settings" }).click();
    return alertDialog;
  };

  const rejectedDialog = await submitDraft();
  expect(rejectedDialog.message()).toBe("GST setting rejected");
  await rejectedDialog.accept();
  await expect(page.getByRole("button", { name: /^Visual menu/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("checkbox", { name: "Enable GST" })).not.toBeChecked();

  const unconfirmedDialog = await submitDraft();
  expect(unconfirmedDialog.message()).toBe("The restaurant did not confirm the saved menu and GST settings.");
  await unconfirmedDialog.accept();
  await expect(page.getByRole("button", { name: /^Visual menu/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("checkbox", { name: "Enable GST" })).not.toBeChecked();
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
  await page.unroute(/\/kitchen\/orders(?:\?.*)?$/);
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => fulfillJson(route, {
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
  await expect(page.getByRole("checkbox", { name: "God Mode" })).toBeVisible();
  if ((page.viewportSize()?.width || 0) < 768) {
    await page.getByRole("button", { name: "Open owner menu" }).click();
  }
  await expect(page.getByRole("button", { name: "Staff", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Analytics", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "QR Tables", exact: true })).toBeVisible();
});

test("God Mode defaults on and owner-saved values survive reload", async ({ page }) => {
  let savedHotel = { ...hotel };
  delete savedHotel.featureSettings;
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel: savedHotel }));
  await page.route("**/hotel/profile", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.godModeEnabled).toBe(body.featureSettings.godModeEnabled);
    expect(typeof body.godModeEnabled).toBe("boolean");
    savedHotel = { ...savedHotel, featureSettings: body.featureSettings };
    return fulfillJson(route, { hotel: savedHotel });
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Settings");
  const toggle = page.getByRole("checkbox", { name: "God Mode" });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  const savedDialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Save app settings" }).click();
  await (await savedDialog).accept();

  await page.reload();
  await openOwnerTab(page, "Settings");
  const restoredToggle = page.getByRole("checkbox", { name: "God Mode" });
  await expect(restoredToggle).not.toBeChecked();
  await restoredToggle.check();
  const enabledDialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Save app settings" }).click();
  await (await enabledDialog).accept();

  await page.reload();
  await openOwnerTab(page, "Settings");
  await expect(page.getByRole("checkbox", { name: "God Mode" })).toBeChecked();
});

test("owner dashboard order board follows God Mode", async ({ page }) => {
  let currentOrder = kitchenOrder({ orderNumber: "3042" });
  const statuses = [];
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    hotel: { ...hotel, featureSettings: { godModeEnabled: true } },
  }));
  await page.unroute(/\/kitchen\/orders(?:\?.*)?$/);
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => (
    fulfillJson(route, { orders: [currentOrder] })
  ));
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    statuses.push(body.status);
    currentOrder = { ...currentOrder, status: body.status };
    return fulfillJson(route, { order: currentOrder });
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "History");
  await page.getByRole("button", { name: /^Mark ready Table 8 order/ }).click();
  await expect(page.locator(".ops-order-card--ready")).toBeVisible();
  await expect.poll(() => statuses).toEqual(["ready"]);
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
  await page.getByRole("button", { name: "Add Dish" }).first().click();
  await expect(page.getByText("Display Sections", { exact: true })).toBeVisible();
  await expect(page.getByText("Menu priority (optional)", { exact: true })).toBeVisible();
});

test("menu export downloads canonical portable data without restaurant ids or images", async ({ page }) => {
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    hotel: { ...hotel, featureSettings: { appLevel: "advanced" } },
  }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, [{
    _id: "dish-export",
    hotelId: "hotel-1",
    name: "Export Curry",
    description: "Portable curry",
    categoryId: { _id: "category-main", name: "Main Course" },
    image: "https://example.test/curry.jpg",
    price: 250,
    prepTime: 0,
    foodType: "veg",
    isAvailable: true,
    isRecommended: true,
    isBestseller: false,
    featured: false,
    todaySpecial: true,
    isPopular: false,
    isNewArrival: false,
    chefChoice: true,
    spiceLevel: "mild",
    tags: ["Dinner"],
    gst: 5,
    displayOrder: 4,
  }]));

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export menu" }).click();
  const exported = await readDownloadJson(await downloadPromise);

  expect(exported).toMatchObject({
    format: "flexiorder-menu",
    version: 1,
    dishes: [{
      category: "Main Course",
      name: "Export Curry",
      price: 250,
      prepTime: 0,
    }],
  });
  expect(exported.dishes[0]).not.toHaveProperty("_id");
  expect(exported.dishes[0]).not.toHaveProperty("hotelId");
  expect(exported.dishes[0]).not.toHaveProperty("categoryId");
  expect(exported.dishes[0]).not.toHaveProperty("image");
});

test("demo menu import survives reload, reimports as skips, and re-exports equivalently", async ({ page }) => {
  const demo = JSON.parse(await readFile(demoMenuFile, "utf8"));
  let serverMenu = [];
  let importCalls = 0;

  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    hotel: { ...hotel, featureSettings: { appLevel: "advanced" } },
  }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, serverMenu));
  await page.route("**/menu/import", async (route) => {
    importCalls += 1;
    const payload = route.request().postDataJSON();
    expect(payload.format).toBe("flexiorder-menu");
    expect(payload.version).toBe(1);
    expect(payload.dishes).toHaveLength(3);

    if (!serverMenu.length) {
      serverMenu = payload.dishes.map((dish, index) => ({
        ...dish,
        _id: `imported-${index + 1}`,
        categoryId: {
          _id: `category-${index + 1}`,
          name: dish.category,
        },
      }));
      return fulfillJson(route, {
        success: true,
        imported: 3,
        skipped: 0,
        errors: 0,
        total: 3,
      });
    }

    return fulfillJson(route, {
      success: true,
      imported: 0,
      skipped: 3,
      errors: 0,
      total: 3,
    });
  });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await expect(page.getByRole("link", { name: "Demo file" })).toHaveAttribute(
    "href",
    "/examples/flexiorder-menu-demo.json"
  );
  const demoDownloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Demo file" }).click();
  expect(await readDownloadJson(await demoDownloadPromise)).toEqual(demo);
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(demoMenuFile);
  await expect(page.getByRole("status")).toContainText("3 dishes imported. 0 skipped.");
  await expect(page.getByText("Demo Paneer Tikka", { exact: true }).filter({ visible: true })).toHaveCount(1);

  await page.reload();
  await openOwnerTab(page, "Menu");
  await expect(page.getByText("Demo Dal Tadka", { exact: true }).filter({ visible: true })).toHaveCount(1);
  await page.locator('input[type="file"][accept*="json"]').setInputFiles(demoMenuFile);
  await expect(page.getByRole("status")).toContainText("0 dishes imported. 3 skipped.");
  expect(importCalls).toBe(2);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export menu" }).click();
  const reExported = await readDownloadJson(await downloadPromise);
  expect(reExported.dishes).toEqual(demo.dishes);
});

test("menu import rejects invalid and offline files without a write", async ({ page, context }) => {
  let importCalls = 0;
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    hotel: { ...hotel, featureSettings: { appLevel: "advanced" } },
  }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));
  await page.route("**/menu/import", (route) => {
    importCalls += 1;
    return fulfillJson(route, { success: true, imported: 1, skipped: 0, errors: 0 });
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  const input = page.locator('input[type="file"][accept*="json"]');
  await input.setInputFiles({
    name: "invalid-menu.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ format: "wrong", version: 1, dishes: [] })),
  });
  await expect(page.getByRole("alert")).toContainText("Unsupported menu format");
  expect(importCalls).toBe(0);

  await input.setInputFiles({
    name: "oversized-menu.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(1024 * 1024 + 1, 32),
  });
  await expect(page.getByRole("alert")).toContainText("1 MB or smaller");
  expect(importCalls).toBe(0);

  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await input.setInputFiles(demoMenuFile);
  await expect(page.getByRole("alert")).toContainText("Connect to the internet to import");
  expect(importCalls).toBe(0);
  await context.setOffline(false);
});

test("owner can type and save a custom dish category", async ({ page }) => {
  let submittedBody = "";
  let createdDish = null;
  let categories = [];
  await page.unroute("**/menu/categories/hotel-1");
  await page.route("**/menu/categories/hotel-1", (route) => fulfillJson(route, categories));
  await page.route("**/menu/category", async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload.name).toBe("House Specials");
    const category = { _id: "6a7d865d30af0144c44a9071", name: payload.name, isActive: true };
    categories = [category];
    return fulfillJson(route, category, 201);
  });
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, createdDish ? [createdDish] : []));
  await page.route("**/menu/dish", async (route) => {
    submittedBody = route.request().postData() || "";
    createdDish = {
      _id: "dish-custom",
      name: "House Platter",
      categoryId: { _id: "6a7d865d30af0144c44a9071", name: "House Specials" },
      foodType: "veg",
      price: 450,
      prepTime: 20,
      isAvailable: true,
    };
    return fulfillJson(route, createdDish, 201);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await page.getByRole("button", { name: "Add Dish" }).first().click();

  const form = page.locator("form");
  await form.getByPlaceholder("e.g. Paneer Butter Masala").fill("House Platter");
  await form.getByLabel("Price").fill("450");
  await form.getByLabel("Category").fill("House Specials");
  await form.getByLabel("Preparation Time").fill("20");
  await form.getByRole("button", { name: "Add Dish" }).click();

  await expect(page.getByRole("button", { name: "House Specials" })).toBeVisible();
  await expect.poll(() => submittedBody).toMatch(/name="category"\r?\n\r?\n6a7d865d30af0144c44a9071\r?\n/);
  expect(submittedBody).toMatch(/name="categoryName"\r?\n\r?\nHouse Specials\r?\n/);
  await page.getByRole("button", { name: "House Specials" }).click();
  await expect(page.getByText("House Platter", { exact: true }).filter({ visible: true })).toHaveCount(1);

  await page.reload();
  await openOwnerTab(page, "Menu");
  await expect(page.getByRole("button", { name: "House Specials" })).toBeVisible();
});

test("dish editor controls remain readable in a dark restaurant theme", async ({ page }) => {
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel: {
    ...hotel,
    theme: {
      mode: "dark",
      primary: "#111827",
      secondary: "#0f172a",
      accent: "#f97316",
    },
  } }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await page.getByRole("button", { name: "Add Dish" }).first().click();
  const form = page.locator(".ops-menu-dish-form");
  await expect(form).toBeVisible();

  const controls = form.locator('input:not([type="checkbox"]):not([type="file"]), select, textarea');
  await expect(controls.first()).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
  const readable = await controls.evaluateAll((elements) => {
    const luminance = (cssColor) => {
      const [red, green, blue] = cssColor.match(/[\d.]+/g).slice(0, 3).map(Number).map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    return elements.every((element) => {
      const style = getComputedStyle(element);
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05) >= 4.5;
    });
  });
  expect(readable).toBe(true);
  const placeholderColor = await form.getByPlaceholder("e.g. Paneer Butter Masala").evaluate(
    (element) => getComputedStyle(element, "::placeholder").color
  );
  expect(placeholderColor).not.toBe("rgb(255, 255, 255)");
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
      category: { _id: "6a7d865d30af0144c44a9072", name: "Main Course" },
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
  await page.unroute("**/menu/categories/hotel-1");
  await page.route("**/menu/categories/hotel-1", (route) => fulfillJson(route, [{
    _id: "6a7d865d30af0144c44a9072",
    name: "Main Course",
    isActive: true,
  }]));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, {
    dishes: [{
      _id: "dish-reference",
      name: "Reference Curry",
      category: { _id: "6a7d865d30af0144c44a9072", name: "Main Course" },
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
        category: { _id: "6a7d865d30af0144c44a9072", name: "Main Course" },
        price: 340,
        prepTime: 18,
        foodType: "veg",
        isAvailable: true,
      },
    }, 201);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await page.getByRole("button", { name: "Add Dish" }).first().click();
  const form = page.locator("form");
  await form.getByPlaceholder("e.g. Paneer Butter Masala").fill("ID Curry");
  await form.getByLabel("Price").fill("340");
  await form.getByLabel("Category").fill("Main Course");
  await form.getByLabel("Preparation Time").fill("18");
  await form.getByRole("button", { name: "Add Dish" }).click();

  await expect.poll(() => submittedBody).toMatch(/name="category"\r?\n\r?\n6a7d865d30af0144c44a9072\r?\n/);
  expect(submittedBody).toMatch(/name="categoryName"\r?\n\r?\nMain Course\r?\n/);
});

test("owner adds the first dish to an empty saved category", async ({ page }) => {
  let submittedBody = "";
  let categoryCreateCalls = 0;
  await page.unroute("**/menu/categories/hotel-1");
  await page.route("**/menu/categories/hotel-1", (route) => fulfillJson(route, [{
    _id: "6a7d865d30af0144c44a9073",
    name: "Seasonal",
    isActive: true,
  }]));
  await page.route("**/menu/category", (route) => {
    categoryCreateCalls += 1;
    return fulfillJson(route, { message: "should not create" }, 500);
  });
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));
  await page.route("**/menu/dish", (route) => {
    submittedBody = route.request().postData() || "";
    return fulfillJson(route, {
      dish: {
        _id: "dish-seasonal",
        name: "Mango Salad",
        categoryId: { _id: "6a7d865d30af0144c44a9073", name: "Seasonal" },
        price: 190,
        prepTime: 8,
        foodType: "veg",
        isAvailable: true,
      },
    }, 201);
  });

  await page.goto("/owner/dashboard");
  await openOwnerTab(page, "Menu");
  await expect(page.getByRole("button", { name: "Seasonal" })).toBeVisible();
  await page.getByRole("button", { name: "Add Dish" }).first().click();
  const form = page.locator("form");
  await form.getByLabel("Dish Name").fill("Mango Salad");
  await form.getByLabel("Price").fill("190");
  await form.getByLabel("Category").fill("Seasonal");
  await form.getByLabel("Preparation Time").fill("8");
  await form.getByRole("button", { name: "Add Dish" }).click();

  await expect.poll(() => submittedBody).toMatch(/name="categoryId"\r?\n\r?\n6a7d865d30af0144c44a9073\r?\n/);
  expect(categoryCreateCalls).toBe(0);
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

  await page.unroute("**/menu/categories/hotel-1");
  await page.route("**/menu/categories/hotel-1", (route) => fulfillJson(route, [{
    _id: "6a7d865d30af0144c44a9072",
    name: "Main Course",
    isActive: true,
  }]));

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
  await page.getByRole("button", { name: "Add Dish" }).first().click();
  const form = page.locator("form");
  await form.getByPlaceholder("e.g. Paneer Butter Masala").fill("Offline Thali");
  await form.getByLabel("Price").fill("280");
  await form.getByLabel("Category").fill("Main Course");
  await form.getByLabel("Preparation Time").fill("18");
  await form.getByRole("button", { name: "Add Dish" }).click();
  await expect(page.getByText("Offline Thali", { exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(page.locator(".ops-sync-strip, .ops-attention-panel")).toHaveCount(0);

  await page.reload();
  await openOwnerTab(page, "Menu");
  await expect(page.getByText("Offline Thali", { exact: true }).filter({ visible: true })).toHaveCount(1);

  apiOffline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect.poll(() => successfulCreates).toBe(1);
  await expect(page.getByText("Waiting to sync")).toHaveCount(0);
  await expect(page.locator(".ops-sync-strip, .ops-attention-panel")).toHaveCount(0);
});
