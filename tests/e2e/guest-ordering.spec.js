import { expect, test } from "@playwright/test";
import { fulfillJson, hotel, mockGuestMenu, table } from "./helpers";

test.describe("customer QR ordering", () => {
  test("applies the host theme to guest branding and menu controls", async ({ page }) => {
    await mockGuestMenu(page, {
      hotel: { theme: { id: "lavender_hues" } },
    });

    await page.goto("/qr/qr-123");

    await expect(page.getByRole("banner")).toHaveCSS("background-color", "rgb(167, 139, 250)");
    await expect(page.locator(".guest-menu-page")).toHaveCSS("--primary", "#a78bfa");
  });

  test("shows the available menu, discount, dietary details, and places an order with GST", async ({ page }) => {
    await mockGuestMenu(page);

    const submittedOrders = [];
    await page.route("**/orders", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const submittedOrder = route.request().postDataJSON();
      submittedOrders.push(submittedOrder);
      return fulfillJson(route, {
        success: true,
        order: {
          _id: "order-created-" + submittedOrders.length,
          status: "pending",
          ...submittedOrder,
        },
      }, 201);
    });

    await page.goto("/qr/qr-123");

    await expect(page.getByRole("banner").getByRole("heading", { name: hotel.name })).toBeVisible();
    await expect(page.getByText("Sold Out Soup")).toHaveCount(0);
    await expect(page.getByText("₹300")).toBeVisible();
    await expect(page.getByText("₹270")).toBeVisible();
    await expect(page.getByText("Contains egg")).toBeVisible();

    await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();

    await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
    await expect(page.getByText("Discount")).toBeVisible();
    await expect(page.getByText("GST (5%)")).toBeVisible();
    await expect(page.getByText("₹283.50", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Contact number (optional)").fill("9876543210");
    await page.getByPlaceholder("Enter your name").fill("Aarav");
    await page.getByRole("button", { name: /Place Order/ }).click();

    await expect(page.getByRole("heading", { name: "Order Placed!" })).toBeVisible();
    expect(submittedOrders[0]).toMatchObject({
      tableId: table._id,
      guestName: "Aarav",
      guestContact: "9876543210",
      items: [{ menuId: "dish-paneer", quantity: 1 }],
      subtotal: 270,
      discountAmount: 30,
      gstRate: 5,
      gstAmount: 13.5,
      totalAmount: 283.5,
      orderType: "now",
    });
    expect(submittedOrders[0].clientOrderId).toBeTruthy();

    await expect(page).toHaveURL(/\/qr\/qr-123/);
    await expect(page.getByRole("region", { name: "Your active orders" })).toContainText("Received");
    await expect(page.getByRole("button", { name: /View Cart/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
    await expect(page.getByRole("button", { name: /View Cart/ })).toContainText("1 items");
    await page.getByRole("button", { name: /View Cart/ }).click();
    await page.getByRole("button", { name: /Place Order/ }).click();
    await expect(page.getByRole("heading", { name: "Order Placed!" })).toBeVisible();

    expect(submittedOrders).toHaveLength(2);
    expect(submittedOrders[1].items).toEqual([{ menuId: "dish-paneer", quantity: 1 }]);
    expect(submittedOrders[1].clientOrderId).not.toBe(submittedOrders[0].clientOrderId);
  });


  test("deduplicates rapid customer submission taps while the request is slow", async ({ page }) => {
    await mockGuestMenu(page);
    let postCount = 0;
    await page.route("**/orders", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      postCount += 1;
      const payload = route.request().postDataJSON();
      await new Promise((resolve) => setTimeout(resolve, 250));
      return fulfillJson(route, {
        order: { _id: "slow-order", status: "pending", ...payload },
      });
    });

    await page.goto("/qr/qr-123");
    await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();
    await page.getByRole("button", { name: /Place Order/ }).dblclick();

    await expect(page.getByRole("heading", { name: "Order Placed!" })).toBeVisible();
    expect(postCount).toBe(1);
  });

  test("keeps the full cart when customer submission fails", async ({ page }) => {
    await mockGuestMenu(page);
    await page.route("**/orders", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return fulfillJson(route, { success: false, message: "Kitchen cannot receive this order." });
    });

    await page.goto("/qr/qr-123");
    await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();
    await page.getByRole("button", { name: /Place Order/ }).click();

    await expect(page.getByText("Kitchen cannot receive this order.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your Cart" })).toBeVisible();
    await expect(page.getByText("Paneer Tikka", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Place Order/ })).toBeEnabled();
  });

  test("shows category names and one swipeable carousel for every special flag", async ({ page }) => {
    const rawCategoryId = "6a7d865d30af0144c44a9063";
    await mockGuestMenu(page, {
      dishes: [
        {
          _id: "dish-multi-special",
          name: "Celebration Platter",
          description: "A little of everything",
          price: 420,
          foodType: "veg",
          isAvailable: true,
          category: rawCategoryId,
          categoryId: { _id: rawCategoryId, name: "Starters" },
          featured: true,
          todaySpecial: true,
          chefChoice: true,
        },
        {
          _id: "dish-popular",
          name: "Pepper Chicken",
          price: 360,
          foodType: "nonveg",
          isAvailable: true,
          categoryId: { _id: "6a7d865d30af0144c44a9064", name: "Main Course" },
          isPopular: true,
        },
      ],
    });

    await page.goto("/qr/qr-123");

    await page.getByRole("button", { name: "Category All" }).click();
    await expect(page.getByRole("group", { name: "Category" })
      .getByRole("button", { name: "Starters" })).toBeVisible();
    await expect(page.getByText(rawCategoryId)).toHaveCount(0);
    const specials = page.getByRole("region", { name: "Special picks" });
    await expect(specials).toBeVisible();
    await expect(specials.getByRole("heading", { name: "Special picks" })).toHaveCount(1);
    await expect(specials.locator(".guest-specials__slide")).toHaveCount(2);
    await expect(specials.getByText("Featured", { exact: true })).toHaveCount(1);
    await expect(specials.getByText("Today’s special", { exact: true })).toHaveCount(1);
    await expect(specials.getByText("Chef’s choice", { exact: true })).toHaveCount(1);

    await expect(specials.getByRole("button", { name: /Show Celebration Platter/ })).toHaveAttribute("aria-current", "true");
    await expect(specials.getByRole("button", { name: /Show Pepper Chicken/ })).toHaveAttribute("aria-current", "true", { timeout: 4_500 });

    await page.getByRole("button", { name: "Veg", exact: true }).click();
    await expect(specials.locator(".guest-specials__slide")).toHaveCount(1);
    await expect(specials.getByText("Pepper Chicken", { exact: true })).toHaveCount(0);
  });
  test("keeps the menu viewable but removes ordering controls when the host pauses ordering", async ({ page }) => {
    await mockGuestMenu(page, {
      hotel: { orderingEnabled: false },
      orders: [{
        _id: "active-paused-order",
        status: "preparing",
        createdAt: new Date().toISOString(),
        items: [{ name: "Paneer Tikka", quantity: 1 }],
      }],
    });

    await page.goto("/qr/qr-123");

    await expect(page.getByText("Ordering is currently unavailable. You can still view the menu.")).toBeVisible();
    await expect(page.getByText("Paneer Tikka", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Your active orders" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add Paneer Tikka/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /View Cart/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Schedule order/ })).toHaveCount(0);
  });

  test("renders the paused simple menu as information instead of order buttons", async ({ page }) => {
    await mockGuestMenu(page, {
      hotel: { orderingEnabled: false, menuMode: "simple" },
    });

    await page.goto("/qr/qr-123");

    await expect(page.getByText("Paneer Tikka", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add Paneer Tikka/ })).toHaveCount(0);
    await expect(page.locator(".guest-simple-row__main").first()).toHaveJSProperty("tagName", "DIV");
    await expect(page.getByRole("button", { name: /View Cart/ })).toHaveCount(0);
  });

  test("fails closed until a fresh menu response confirms ordering", async ({ page }) => {
    let releaseMenu;
    const menuReady = new Promise((resolve) => { releaseMenu = resolve; });
    await page.route("**/qr/menu/qr-123", async (route) => {
      await menuReady;
      return fulfillJson(route, { hotel, table, dishes: [{
        _id: "dish-paneer", name: "Paneer Tikka", price: 270, isAvailable: true,
      }] });
    });
    await page.route("**/orders/table/table-8", (route) => fulfillJson(route, { orders: [] }));

    await page.goto("/qr/qr-123");
    await expect(page.getByRole("button", { name: /Add Paneer Tikka/ })).toHaveCount(0);
    releaseMenu();
    await expect(page.getByRole("button", { name: /Add Paneer Tikka/ })).toBeVisible();
  });

  test("does not enable ordering when a fresh QR response has no restaurant", async ({ page }) => {
    await page.route("**/qr/menu/qr-123", (route) => fulfillJson(route, {
      hotel: null,
      table,
      dishes: [{ _id: "dish-paneer", name: "Paneer Tikka", price: 270, isAvailable: true }],
    }));
    await page.route("**/orders/table/table-8", (route) => fulfillJson(route, { orders: [] }));

    await page.goto("/qr/qr-123");

    await expect(page.getByText("Confirming whether ordering is available. You can still view the menu.")).toBeVisible();
    await expect(page.getByText("Paneer Tikka", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add Paneer Tikka/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /View Cart/ })).toHaveCount(0);
  });

  test("preserves the cart when checkout preflight sees ordering paused", async ({ page }) => {
    let paused = false;
    let postCount = 0;
    await page.route("**/qr/menu/qr-123", (route) => fulfillJson(route, {
      hotel: { ...hotel, orderingEnabled: !paused },
      table,
      dishes: [{ _id: "dish-paneer", name: "Paneer Tikka", price: 270, isAvailable: true }],
    }));
    await page.route("**/orders/table/table-8", (route) => fulfillJson(route, { orders: [] }));
    await page.route("**/orders", (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      postCount += 1;
      return fulfillJson(route, {
        success: false,
        code: "ORDERING_PAUSED",
        message: "Customer ordering is currently paused",
      }, 409);
    });

    await page.goto("/qr/qr-123");
    await page.getByRole("button", { name: /Add Paneer Tikka/ }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();
    await expect(page.getByRole("button", { name: /Place Order/ })).toBeVisible();
    paused = true;
    await page.getByRole("button", { name: /Place Order/ }).click();

    await expect(page).toHaveURL(/\/qr\/qr-123/);
    await expect(page.getByText("Ordering is currently unavailable. You can still view the menu.")).toBeVisible();
    expect(postCount).toBe(0);

    paused = false;
    await page.goto("/cart/qr-123");
    await expect(page.getByText("Paneer Tikka")).toBeVisible();
  });

  test("preserves the cart when order creation returns ORDERING_PAUSED", async ({ page }) => {
    let paused = false;
    let postCount = 0;
    await page.route("**/qr/menu/qr-123", (route) => fulfillJson(route, {
      hotel: { ...hotel, orderingEnabled: !paused },
      table,
      dishes: [{ _id: "dish-paneer", name: "Paneer Tikka", price: 270, isAvailable: true }],
    }));
    await page.route("**/orders/table/table-8", (route) => fulfillJson(route, { orders: [] }));
    await page.route("**/orders", (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      postCount += 1;
      paused = true;
      return fulfillJson(route, {
        success: false,
        code: "ORDERING_PAUSED",
        message: "Customer ordering is currently paused",
      }, 409);
    });

    await page.goto("/qr/qr-123");
    await page.getByRole("button", { name: /Add Paneer Tikka/ }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();
    await page.getByRole("button", { name: /Place Order/ }).click();

    await expect.poll(() => postCount).toBe(1);
    await expect(page).toHaveURL(/\/qr\/qr-123/);
    await expect(page.getByText("Ordering is currently unavailable. You can still view the menu.")).toBeVisible();

    paused = false;
    await page.goto("/cart/qr-123");
    await expect(page.getByText("Paneer Tikka", { exact: true })).toBeVisible();
  });

  test("uses the configured GST percentage consistently", async ({ page }) => {
    await mockGuestMenu(page, { hotel: { gstEnabled: true, gstPercentage: 12 } });
    await page.goto("/qr/qr-123");
    await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();
    await expect(page.getByText("GST (12%)")).toBeVisible();
    await expect(page.getByText("₹302.40", { exact: true })).toBeVisible();

  });

  test("uses canonical saved settings for a simple menu with GST", async ({ page }) => {
    await mockGuestMenu(page, {
      hotel: { menuMode: "simple", gstEnabled: true, gstPercentage: 12 },
    });
    await page.goto("/qr/qr-123");

    await expect(page.locator(".guest-simple-menu")).toBeVisible();
    await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();
    await expect(page.getByText("GST (12%)")).toBeVisible();
    await expect(page.getByText("₹302.40", { exact: true })).toBeVisible();
  });

  test("removes GST when it is disabled", async ({ page }) => {
    await mockGuestMenu(page, { hotel: { gstEnabled: false, gstPercentage: 12 } });
    await page.goto("/qr/qr-123");
    await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
    await page.getByRole("button", { name: /View Cart/ }).click();
    await expect(page.getByText(/GST \(/)).toHaveCount(0);
    await expect(page.getByText("Total", { exact: true }).locator("..").getByText("₹270.00", { exact: true })).toBeVisible();
  });

  test("uses the warmed menu cache offline and remains view-only", async ({ page }) => {
    await mockGuestMenu(page);
    await page.goto("/qr/qr-123");
    await expect(page.getByText("Paneer Tikka")).toBeVisible();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
    });
    await page.route("**/qr/menu/qr-123", (route) => route.abort("internetdisconnected"));
    await page.reload();

    await expect(page.getByText("You are offline. The saved menu is available to view; ordering will return when connected.")).toBeVisible();
    await expect(page.getByText("Paneer Tikka")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add" })).toHaveCount(0);
  });
});
