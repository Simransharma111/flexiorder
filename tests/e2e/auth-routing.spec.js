import { expect, test } from "@playwright/test";
import { fulfillJson, hotel, kitchenOrder, makeToken } from "./helpers";

test("returns a staff member to the protected kitchen page after login", async ({ page }) => {
  const user = {
    _id: "staff-1",
    email: "staff@flexi.test",
    role: "staff",
    hotelId: "hotel-1",
  };

  await page.route("**/auth/login", (route) => fulfillJson(route, {
    user,
    token: makeToken(user._id),
    hotelSetupCompleted: true,
  }));
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, {
    orders: [kitchenOrder()],
  }));

  await page.goto("/kitchen");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByPlaceholder("Email Address").fill(user.email);
  await page.getByPlaceholder("Password").fill("correct-password");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/kitchen$/);
  await expect(page.getByRole("button", { name: /^Accept Table 8 order/ })).toBeVisible();
  await expect(page.evaluate(() => JSON.parse(localStorage.getItem("user"))?.role)).resolves.toBe("staff");
});

test("does not allow staff to open owner-only settings", async ({ page }) => {
  const user = {
    _id: "staff-1",
    email: "staff@flexi.test",
    role: "staff",
    hotelId: "hotel-1",
  };
  await page.addInitScript(({ storedUser, storedToken }) => {
    localStorage.setItem("user", JSON.stringify(storedUser));
    localStorage.setItem("token", storedToken);
  }, { storedUser: user, storedToken: makeToken(user._id) });

  await page.goto("/owner/hotel/settings");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Run Your Restaurant Smarter/ })).toBeVisible();
});

test("owner login ignores a stale kitchen redirect and opens owner Today", async ({ page }) => {
  const user = {
    _id: "owner-1",
    email: "owner@flexi.test",
    role: "owner",
    hotelId: "hotel-1",
  };
  await page.route("**/auth/login", (route) => fulfillJson(route, {
    user,
    token: makeToken(user._id),
    hotelSetupCompleted: true,
  }));
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel }));
  await page.route("**/kitchen/orders?type=kitchen", (route) => fulfillJson(route, { orders: [] }));

  await page.goto("/kitchen");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByPlaceholder("Email Address").fill(user.email);
  await page.getByPlaceholder("Password").fill("correct-password");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/owner\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});
