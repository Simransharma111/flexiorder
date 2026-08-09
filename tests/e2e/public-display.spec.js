import { expect, test } from "@playwright/test";
import { fulfillJson, hotel, installSession, kitchenOrder } from "./helpers";

test("optional public display shows only safe preparing and ready cards", async ({ page }) => {
  await installSession(page, "owner");
  const displayHotel = {
    ...hotel,
    featureSettings: {
      appLevel: "basic",
      publicDisplayEnabled: true,
      staffCapabilities: { usePublicDisplay: true },
    },
  };
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel: displayHotel }));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, {
    orders: [
      kitchenOrder({ status: "preparing", guestName: "Private Guest", guestContact: "9999999999", note: "Private note" }),
      kitchenOrder({ _id: "ready-12", status: "ready", locationNumber: "12", items: [{ name: "Naan", quantity: 2 }] }),
    ],
  }));

  await page.goto("/display");
  await expect(page.getByRole("heading", { name: "Preparing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready" })).toBeVisible();
  await expect(page.getByText("Table 8", { exact: true })).toBeVisible();
  await expect(page.getByText("Table 12", { exact: true })).toBeVisible();
  await expect(page.getByText("Private Guest")).toHaveCount(0);
  await expect(page.getByText("9999999999")).toHaveCount(0);
  await expect(page.getByText("Private note")).toHaveCount(0);
});

test("public display stays unavailable in Simple mode even with a stale enabled flag", async ({ page }) => {
  await installSession(page, "owner");
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    hotel: {
      ...hotel,
      featureSettings: { appLevel: "simple", publicDisplayEnabled: true },
    },
  }));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [] }));

  await page.goto("/display");
  await expect(page.getByText("Public order display is not enabled.")).toBeVisible();
});

test("a warmed public display can reload from its local cache when APIs fail", async ({ page }) => {
  await installSession(page, "owner");
  const displayHotel = {
    ...hotel,
    featureSettings: { appLevel: "basic", publicDisplayEnabled: true },
  };
  await page.route("**/hotel/me", (route) => fulfillJson(route, { hotel: displayHotel }));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, {
    orders: [kitchenOrder({ status: "ready" })],
  }));

  await page.goto("/display");
  await expect(page.getByText("Table 8", { exact: true })).toBeVisible();

  await page.unroute("**/hotel/me");
  await page.unroute("**/kitchen/orders");
  await page.route("**/hotel/me", (route) => route.abort());
  await page.route("**/kitchen/orders", (route) => route.abort());
  await page.reload();

  await expect(page.getByText("Table 8", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready" })).toBeVisible();
});
