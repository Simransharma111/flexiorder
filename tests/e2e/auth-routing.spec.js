import { expect, test } from "@playwright/test";
import { fulfillJson, hotel, installNativeBridge, installSession, isolateTestNetwork, kitchenOrder, makeToken, mockGuestMenu, mockStaffWorkspace } from "./helpers";

test.beforeEach(async ({ page }) => { await isolateTestNetwork(page); });

test("signed-out website root retains its landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByPlaceholder("Email Address")).toHaveCount(0);
  await expect(page.locator("body")).toContainText("FlexiOrder");
});

test("signed-out native root opens login, including after invalid session restoration", async ({ page }) => {
  await installNativeBridge(page);
  await page.addInitScript(() => {
    localStorage.setItem("user", "{malformed saved user");
    localStorage.setItem("token", "invalid-token");
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByPlaceholder("Email Address")).toBeVisible();
  await expect(page.getByRole("button", { name: "Login", exact: true })).toBeVisible();
});

for (const [role, destination] of [["owner", "/owner/dashboard"], ["staff", "/owner/order"], ["kitchen", "/kitchen"]]) {
  test(`native root restores the ${role} workspace without losing its session`, async ({ page }) => {
    await installNativeBridge(page);
    const { token } = await installSession(page, role);
    await mockStaffWorkspace(page);
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(token);
  });
}

test("native explicit public links retain their own routes", async ({ page }) => {
  await installNativeBridge(page);
  await mockGuestMenu(page);
  for (const path of ["/qr/qr-123", "/track-order/missing-order", "/forgot-password", "/reset-password/example-token"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("navigation", { name: "Owner primary navigation" })).toHaveCount(0);
  }
  await page.goto("/qr/qr-123");
  await expect(page.getByText("Paneer Tikka", { exact: true }).first()).toBeVisible();
});

test("native Back exits cold-start login without a history entry", async ({ page }) => {
  await installNativeBridge(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.evaluate(() => window.__emitNativeEvent("App", "backButton", { canGoBack: false }));
  expect(await page.evaluate(() => window.__nativeExitCount)).toBe(1);
});

test("native protected deep link preserves its authenticated destination", async ({ page }) => {
  await installNativeBridge(page);
  await installSession(page, "owner");
  await mockStaffWorkspace(page);
  await page.goto("/kitchen");
  await expect(page).toHaveURL(/\/kitchen$/);
  await expect(page.getByRole("navigation", { name: "Owner primary navigation" })).toHaveCount(0);
});

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
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [kitchenOrder()] }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));
  await page.route("**/table", (route) => fulfillJson(route, { tables: [] }));

  await page.goto("/owner/hotel/settings");

  await expect(page).toHaveURL(/\/owner\/order$/);
  await expect(page.getByRole("tab", { name: "Take Order" })).toBeVisible();
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

test("a restored owner session bypasses landing and login after reload", async ({ page }) => {
  const user = { _id: "owner-1", email: "owner@flexi.test", role: "owner", hotelId: "hotel-1" };
  await page.addInitScript(({ storedUser, storedToken }) => {
    localStorage.setItem("user", JSON.stringify(storedUser));
    localStorage.setItem("token", storedToken);
  }, { storedUser: user, storedToken: makeToken(user._id) });
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel }));
  await page.route("**/kitchen/orders?type=kitchen", (route) => fulfillJson(route, { orders: [] }));

  await page.goto("/");
  await expect(page).toHaveURL(/\/owner\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  await page.goto("/login");
  await expect(page).toHaveURL(/\/owner\/dashboard$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("a restored waiter session opens its operational workspace from login", async ({ page }) => {
  const user = { _id: "staff-1", email: "staff@flexi.test", role: "staff", hotelId: "hotel-1" };
  await page.addInitScript(({ storedUser, storedToken }) => {
    localStorage.setItem("user", JSON.stringify(storedUser));
    localStorage.setItem("token", storedToken);
  }, { storedUser: user, storedToken: makeToken(user._id) });
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [kitchenOrder()] }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));
  await page.route("**/table", (route) => fulfillJson(route, { tables: [] }));

  await page.goto("/login");
  await expect(page).toHaveURL(/\/owner\/order$/);
  await expect(page.getByRole("tab", { name: "Take Order" })).toBeVisible();
});
