import { expect, test } from "@playwright/test";
import { dishes, fulfillJson, hotel, installNativeBridge, installSession } from "./helpers";

test.beforeEach(async ({ page }) => {
  await installSession(page, "owner");
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, dishes));
  await page.route("**/menu/categories/hotel-1", (route) => fulfillJson(route, [{ name: "Starters", displayOrder: 1 }, { name: "Desserts", displayOrder: 2 }]));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => fulfillJson(route, { orders: [] }));
});

test("owner creates a local menu PDF preview and downloads its exact selected menu", async ({ page }) => {
  await page.goto("/owner/dashboard");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator(".owner-menu-tools summary").click();
  await page.getByRole("button", { name: "Create menu PDF" }).click();
  await expect(page.getByRole("dialog", { name: "Create menu PDF" })).toBeVisible();
  await page.getByText("Select dishes (2)").click();
  await page.getByLabel(/Eggless-style Cake/).uncheck();
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText(/Preview ready|photo.*unavailable/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".menu-pdf-dialog__preview img")).toBeVisible();
  await expect(page.locator(".menu-pdf-dialog__accessibility")).toContainText("Paneer Tikka, ₹270.00 · was ₹300.00");
  await expect(page.locator(".menu-pdf-dialog__accessibility")).not.toContainText("Eggless-style Cake");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect((await download).suggestedFilename()).toBe("flexi-test-kitchen-menu.pdf");
  await expect(page.getByText("PDF downloaded.")).toBeVisible();
});

test("PDF creator closes with Escape and does not expose hidden dishes", async ({ page }) => {
  await page.goto("/owner/dashboard");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator(".owner-menu-tools summary").click();
  await page.getByRole("button", { name: "Create menu PDF" }).click();
  await expect(page.getByLabel(/Sold Out Soup/)).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Create menu PDF" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create menu PDF" })).toBeFocused();
});

test("owner previews an A5 booklet cover and complete print-only note", async ({ page }) => {
  await page.goto("/owner/dashboard");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator(".owner-menu-tools summary").click();
  await page.getByRole("button", { name: "Create menu PDF" }).click();
  await page.getByLabel("Multipage booklet").check();
  await page.getByLabel("Paper size").selectOption("A5");
  await page.getByLabel("Cover (booklet)").check();
  await page.getByLabel("Print-only note").fill("Please tell us about allergies before ordering.");
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText(/Preview ready|photo.*unavailable/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Page 1 of [2-9]/)).toBeVisible();
  await page.getByRole("button", { name: "Next PDF page" }).click();
  await expect(page.getByText(/Page 2 of [2-9]/)).toBeVisible();
});

test("Android owner saves the generated PDF through the native file helper", async ({ page }) => {
  await installNativeBridge(page);
  await page.goto("/owner/dashboard");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.locator(".owner-menu-tools summary").click();
  await page.getByRole("button", { name: "Create menu PDF" }).click();
  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText(/Preview ready|photo.*unavailable/i)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Download PDF" }).click();
  await expect.poll(() => page.evaluate(() => window.__nativeCalls.filter((call) =>
    call.plugin === "Filesystem" && call.method === "writeFile")))
    .toContainEqual(expect.objectContaining({
      options: expect.objectContaining({ path: expect.stringMatching(/^Download\/FlexiOrder\/.*-menu\.pdf$/) }),
    }));
  await expect(page.getByText(/Saved to Downloads\/FlexiOrder/)).toBeVisible();
  await page.getByRole("button", { name: "Save / share" }).click();
  await expect.poll(() => page.evaluate(() => window.__nativeCalls.some((call) =>
    call.plugin === "Share" && call.method === "share"))).toBe(true);
  await expect(page.getByText(/Share sheet opened/)).toBeVisible();
  await page.evaluate(() => window.__emitNativeEvent("App", "backButton", { canGoBack: true }));
  await expect(page.getByRole("dialog", { name: "Create menu PDF" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/owner\/dashboard$/);
});
