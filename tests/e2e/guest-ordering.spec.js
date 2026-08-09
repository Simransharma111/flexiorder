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

    let submittedOrder;
    await page.route("**/orders", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      submittedOrder = route.request().postDataJSON();
      return fulfillJson(route, {
        success: true,
        order: {
          _id: "order-created",
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
    expect(submittedOrder).toMatchObject({
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
  });

  test("keeps the menu viewable but removes ordering controls when the host pauses ordering", async ({ page }) => {
    await mockGuestMenu(page, { hotel: { orderingEnabled: false } });

    await page.goto("/qr/qr-123");

    await expect(page.getByText("Ordering is currently unavailable. You can still view the menu.")).toBeVisible();
    await expect(page.getByText("Paneer Tikka")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /View Cart/ })).toHaveCount(0);
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
