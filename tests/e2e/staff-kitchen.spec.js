import { expect, test } from "@playwright/test";
import {
  fulfillJson,
  hotel,
  installSession,
  kitchenOrder,
  mockStaffWorkspace,
} from "./helpers";

test("waiter saves an offline order and automatically syncs it after reconnection", async ({ page, context }) => {
  await installSession(page, "staff");
  await mockStaffWorkspace(page);

  const submitted = [];
  await page.route("**/orders", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submitted.push(route.request().postDataJSON());
    return fulfillJson(route, { success: true, order: { _id: "synced-order" } }, 201);
  });

  await page.goto("/owner/order");
  await expect(page.getByRole("tab", { name: "Take Order" })).toBeVisible();
  await page.getByRole("tab", { name: "Take Order" }).click();
  await expect(page.getByRole("heading", { name: "Staff Ordering" })).toBeVisible();

  await context.setOffline(true);
  await page.getByRole("button", { name: "Table 8" }).click();
  await page.getByRole("button", { name: "Add Paneer Tikka" }).click();
  await page.getByRole("button", { name: "Place Order" }).click();

  await expect(page.getByLabel("Offline")).toBeVisible();
  await expect(page.getByText("Syncing", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Accept Table 8 order/ })).toHaveCount(0);
  const queued = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("flexiorder_pending_staff_orders:"));
    return JSON.parse(localStorage.getItem(key) || "[]");
  });
  expect(queued).toHaveLength(1);
  expect(queued[0].payload).toMatchObject({
    tableId: "table-8",
    items: [{ menuId: "dish-paneer", quantity: 1 }],
  });
  expect(queued[0].payload.clientOrderId).toBeTruthy();

  await context.setOffline(false);
  await expect.poll(() => submitted.length).toBe(1);
  expect(submitted[0].clientOrderId).toBe(queued[0].clientOrderId);
  await expect.poll(async () => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("flexiorder_pending_staff_orders:"));
    return JSON.parse(localStorage.getItem(key) || "[]").length;
  })).toBe(0);
});

test("kitchen advances an order from new to preparing to ready with one tap", async ({ page }) => {
  await installSession(page, "staff");
  let currentOrder = kitchenOrder();
  const statuses = [];

  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, {
    orders: [currentOrder],
  }));
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    statuses.push(body.status);
    currentOrder = { ...currentOrder, status: body.status };
    return fulfillJson(route, { order: currentOrder });
  });

  await page.goto("/kitchen");
  let orderCard = page.getByRole("button", { name: /^Accept Table 8 order/ });
  await expect(orderCard).toBeVisible();

  await orderCard.click();
  await expect.poll(() => statuses).toEqual(["accepted"]);
  orderCard = page.getByRole("button", { name: /^Finish Table 8 order/ });
  await orderCard.click();
  await expect.poll(() => statuses).toEqual(["accepted", "preparing"]);
  await orderCard.click();
  await expect.poll(() => statuses).toEqual(["accepted", "preparing", "ready"]);

  const readyColumn = page.getByRole("heading", { name: /READY/ }).locator("../..");
  await expect(readyColumn.getByText("Table 8")).toBeVisible();
});

test("kitchen queues a status change offline and replays it with a mutation id", async ({ page, context }) => {
  await installSession(page, "staff");
  const order = kitchenOrder();
  const updates = [];

  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [order] }));
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    updates.push(body);
    return fulfillJson(route, { order: { ...order, status: body.status } });
  });

  await page.goto("/kitchen");
  const orderCard = page.getByRole("button", { name: /^Accept Table 8 order/ });
  await expect(orderCard).toBeVisible();

  await context.setOffline(true);
  await orderCard.click();
  await expect(page.getByLabel("Offline")).toBeVisible();
  await expect(page.getByText(/1 syncing/)).toBeVisible();

  const queued = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("flexiorder_pending_kitchen_updates:"));
    return JSON.parse(localStorage.getItem(key) || "[]");
  });
  expect(queued).toHaveLength(1);
  expect(queued[0]).toMatchObject({ orderId: "order-00008", status: "accepted" });
  expect(queued[0].clientMutationId).toBeTruthy();

  await context.setOffline(false);
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toMatchObject({
    status: "accepted",
    clientMutationId: queued[0].clientMutationId,
  });
});
