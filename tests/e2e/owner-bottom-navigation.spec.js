import { expect, test } from "@playwright/test";
import { fulfillJson, installNativeBridge, installSession, mockStaffWorkspace } from "./helpers";

const primaryNav = page => page.getByRole("navigation", { name: "Owner primary navigation" });
const moreMenu = page => page.getByRole("dialog", { name: "Owner menu" });

const openOwner = async page => {
  await installSession(page, "owner");
  await mockStaffWorkspace(page);
  await page.route("**/menu/categories/hotel-1", route => fulfillJson(route, []));
  await page.route("**/staff", route => fulfillJson(route, { staff: [] }));
  await page.goto("/owner/dashboard");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
};

test("owner primary tabs are one tap away on narrow screens and retain the desktop sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openOwner(page);
  const nav = primaryNav(page);
  await expect(nav.getByRole("button")).toHaveText(["Home", "Menu", "Analytics", "QR", "Theme", "More"]);
  await expect(page.getByRole("button", { name: "Open owner menu" })).toHaveCount(0);
  for (const [tab, title] of [["Menu", "Menu"], ["Analytics", "Analytics"], ["QR", "Tables & Rooms"], ["Theme", "Themes"], ["Home", "Home"]]) {
    const button = nav.getByRole("button", { name: tab, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".owner-header strong")).toHaveText(title);
    await expect(moreMenu(page)).toHaveCount(0);
    const size = await button.boundingBox();
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate(element => getComputedStyle(element, "::before").content)).toBe('""');
    await expect(button.locator("svg")).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(nav).toBeHidden();
  const sidebar = page.getByRole("navigation", { name: "Owner navigation", exact: true });
  await expect(sidebar).toBeVisible();
  await sidebar.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.locator(".owner-header strong")).toHaveText("Menu");
});

test("More keeps secondary tools reachable and correctly marks their active group", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openOwner(page);
  for (const destination of ["Settings", "Themes", "Analytics", "Staff", "Tables & Rooms", "About Us"]) {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await moreMenu(page).getByRole("button", { name: destination, exact: true }).click();
    await expect(moreMenu(page)).toHaveCount(0);
    await expect(page.locator(".owner-header strong")).toHaveText(destination);
    await expect(primaryNav(page).getByRole("button", { name: "Orders" })).toHaveCount(0);
  }
  await page.getByRole("button", { name: "More", exact: true }).click();
  await expect(moreMenu(page).getByRole("button", { name: "Waiter", exact: true })).toBeVisible();
  await expect(moreMenu(page).getByRole("button", { name: "Kitchen", exact: true })).toBeVisible();
  await moreMenu(page).getByRole("button", { name: "Waiter", exact: true }).click();
  await expect(page).toHaveURL(/\/owner\/order$/);
  await expect(primaryNav(page)).toHaveCount(0);
  await page.goto("/kitchen");
  await expect(primaryNav(page)).toHaveCount(0);
});

test("More traps focus, dismisses without navigating, and handles native Back before app exit", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await installNativeBridge(page);
  await openOwner(page);
  const more = page.getByRole("button", { name: "More", exact: true });
  await more.click();
  await expect(moreMenu(page)).toBeVisible();
  await expect(moreMenu(page).getByRole("button", { name: "Close menu" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await moreMenu(page).evaluate(dialog => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(moreMenu(page)).toHaveCount(0);
  await expect(more).toBeFocused();
  await more.click();
  await page.evaluate(() => window.__emitNativeEvent("App", "backButton"));
  await expect(moreMenu(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.__nativeExitCount)).toBe(0);
  await expect(page.locator(".owner-header strong")).toHaveText("Home");
  await more.click();
  await moreMenu(page).click({ position: { x: 350, y: 350 } });
  await expect(moreMenu(page)).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await more.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(moreMenu(page)).toHaveCount(0);
});

test("bottom bar reserves space for the final settings action", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openOwner(page);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await moreMenu(page).getByRole("button", { name: "Settings", exact: true }).click();
  const action = page.getByRole("button", { name: "Save Branding", exact: true });
  await action.scrollIntoViewIfNeeded();
  await page.locator(".owner-shell > .flex").evaluate(element => element.scrollTo(0, element.scrollHeight));
  const actionBox = await action.boundingBox();
  const barBox = await primaryNav(page).boundingBox();
  expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(barBox.y);
  expect(await primaryNav(page).evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
});

test("editing staff from a long list reveals the form above the bottom bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openOwner(page);
  await page.route("**/staff", route => fulfillJson(route, { staff: Array.from({ length: 35 }, (_, i) => ({
    _id: `staff-${i}`, name: `Member ${i}`, email: `member${i}@flexi.test`, position: "Waiter",
  })) }));
  await page.getByRole("button", { name: "More", exact: true }).click();
  await moreMenu(page).getByRole("button", { name: "Staff", exact: true }).click();
  await page.getByRole("button", { name: "Edit Member 34", exact: true }).click();
  await expect(page.getByPlaceholder("Staff name")).toHaveValue("Member 34");
  await expect(page.getByPlaceholder("Staff name")).toBeInViewport();
});

test("offline tab navigation keeps the saved session and queued order IDs", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openOwner(page);
  await primaryNav(page).getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByText("Paneer Tikka", { exact: true }).filter({ visible: true })).toBeVisible();
  await context.setOffline(true);
  const before = await page.evaluate(() => {
    const key = "flexiorder_pending_staff_orders:owner-1%3Ahotel-1";
    const queue = JSON.stringify([{ clientOrderId: "offline-owner-nav-order", requiresAttention: true }]);
    localStorage.setItem(key, queue);
    return { key, queue, token: localStorage.getItem("token") };
  });
  for (const tab of ["Analytics", "Home", "Menu"]) {
    await primaryNav(page).getByRole("button", { name: tab, exact: true }).click();
    await expect(primaryNav(page).getByRole("button", { name: tab, exact: true })).toHaveAttribute("aria-current", "page");
  }
  expect(await page.evaluate(key => localStorage.getItem(key), before.key)).toBe(before.queue);
  expect(await page.evaluate(() => localStorage.getItem("token"))).toBe(before.token);
});

test("Menu keeps Add Dish and search visible while secondary tools are disclosed", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openOwner(page);
  await primaryNav(page).getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add Dish', exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create menu PDF' })).toBeHidden();
  await page.locator('.owner-menu-tools summary').click();
  await expect(page.getByRole('button', { name: 'Create menu PDF' })).toBeVisible();
  await page.getByRole('button', { name: 'Manage categories' }).click();
  await expect(page.getByRole('region', { name: 'Manage menu categories' })).toBeVisible();
});
