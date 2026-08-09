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
  await openOwnerTab(page, "Orders");
  await expect(page.locator(".owner-header strong")).toHaveText("Orders");
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText("Table 8", { exact: true })).toBeVisible();
});
