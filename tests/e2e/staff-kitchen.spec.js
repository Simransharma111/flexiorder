import { expect, test } from "@playwright/test";
import {
  fulfillJson,
  hotel,
  installSession,
  kitchenOrder,
  mockGuestMenu,
  mockStaffWorkspace,
} from "./helpers";

test("waiter saves an offline order and automatically syncs it after reconnection", async ({ page, context }) => {
  await installSession(page, "staff");
  await mockStaffWorkspace(page);

  const submitted = [];
  const statusUpdates = [];
  await page.route("**/orders", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submitted.push(route.request().postDataJSON());
    return fulfillJson(route, { success: true, order: { _id: "synced-order" } }, 201);
  });
  await page.route("**/kitchen/orders/synced-order", async (route) => {
    const body = route.request().postDataJSON();
    statusUpdates.push(body);
    return fulfillJson(route, { order: { _id: "synced-order", status: body.status } });
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
  await page.getByRole("button", { name: /^Accept Table 8 order/ }).click();
  await expect(page.locator(".ops-order-card--preparing")).toBeVisible();
  await page.getByRole("button", { name: /^Finish Table 8 order/ }).click();
  await expect(page.locator(".ops-order-card--ready")).toBeVisible();
  await page.getByRole("button", { name: /^Deliver Table 8 order/ }).click();
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
  const queuedStatus = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("flexiorder_pending_kitchen_updates:"));
    return JSON.parse(localStorage.getItem(key) || "[]");
  });
  expect(queuedStatus.map((item) => item.status)).toEqual(["preparing", "ready", "delivered"]);
  expect(queuedStatus.every((item) => item.orderId === queued[0].clientOrderId)).toBe(true);

  await context.setOffline(false);
  await expect.poll(() => submitted.length).toBe(1);
  await expect.poll(() => statusUpdates.length).toBe(3);
  expect(statusUpdates.map((item) => item.status)).toEqual(["preparing", "ready", "delivered"]);
  expect(submitted[0].clientOrderId).toBe(queued[0].clientOrderId);
  await expect.poll(async () => page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("flexiorder_pending_staff_orders:"));
    return JSON.parse(localStorage.getItem(key) || "[]").length;
  })).toBe(0);
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByRole("button", { name: "More options for Table 8" })).toHaveCount(1);
});

test("kitchen advances an order from new to preparing to ready with one tap", async ({ page }) => {
  await installSession(page, "staff");
  let currentOrder = kitchenOrder({ specialInstructions: "Less spicy, please" });
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
  const newCard = page.locator(".ops-order-card--new");
  let orderCard = page.getByRole("button", { name: /^Accept Table 8 order/ });
  await expect(orderCard).toBeVisible();
  await expect(newCard.getByText("NEW ORDER", { exact: true })).toBeVisible();
  await expect(newCard.getByText("Table 8", { exact: true })).toBeVisible();
  await expect(newCard.locator(".ops-order-card__meta")).toContainText(/Received \d+ min ago/);
  await expect(newCard.getByText("Immediate", { exact: true })).toBeVisible();
  await expect(newCard.getByText("3 items", { exact: true })).toBeVisible();
  await expect(newCard.locator(".ops-order-card__item-row").filter({ hasText: "Paneer Tikka" })).toContainText("2 ×");
  await expect(newCard.getByText("Less spicy, please", { exact: true })).toBeVisible();

  await orderCard.click();
  await expect(page.locator(".ops-order-card--preparing")).toBeVisible();
  await expect.poll(() => statuses).toEqual(["preparing"]);
  await expect(page.locator(".ops-order-card__new-banner")).toHaveCount(0);
  orderCard = page.getByRole("button", { name: /^Finish Table 8 order/ });
  await orderCard.click();
  await expect(page.locator(".ops-order-card--ready")).toBeVisible();
  await expect.poll(() => statuses).toEqual(["preparing", "ready"]);

  const readyColumn = page.getByRole("heading", { name: /READY/ }).locator("../..");
  await expect(readyColumn.getByText("Table 8")).toBeVisible();
});

test("God Mode kitchen moves only the activated order directly to compact Ready", async ({ page }) => {
  await installSession(page, "staff");
  const orders = [
    kitchenOrder({ _id: "god-order-a", orderNumber: "1042", specialInstructions: "No onion" }),
    kitchenOrder({ _id: "god-order-b", orderNumber: "1043", items: [{ name: "Dal", quantity: 3 }] }),
  ];
  const updates = [];
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    ...hotel,
    featureSettings: { godModeEnabled: true },
  }));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => fulfillJson(route, { orders }));
  await page.route("**/kitchen/orders/*", async (route) => {
    const body = route.request().postDataJSON();
    updates.push({ url: route.request().url(), ...body });
    const id = route.request().url().split("/").pop();
    const order = orders.find((item) => item._id === id);
    return fulfillJson(route, { order: { ...order, status: body.status } });
  });

  await page.goto("/kitchen");
  await expect(page.locator(".ops-order-card--new")).toHaveCount(2);
  const first = page.getByRole("button", { name: /^Mark ready Table 8 order/ }).first();
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ops-order-card--ready")).toHaveCount(1);
  await expect(page.locator(".ops-order-card--new")).toHaveCount(1);
  await expect(page.locator(".ops-order-card--ready")).toHaveClass(/is-compact/);
  await expect.poll(() => updates.map((item) => item.status)).toEqual(["ready"]);
  await expect(page.locator(".ops-order-card--ready")).toContainText("Order #1042");
  await expect(page.locator(".ops-order-card--new")).toContainText("Order #1043");
});

test("God Mode waiter blocks an accidental double click then delivers deliberately", async ({ page }) => {
  await installSession(page, "owner");
  let currentOrder = kitchenOrder({ orderNumber: "2042", specialInstructions: "Allergy: peanuts" });
  const statuses = [];
  await page.route("**/table", (route) => fulfillJson(route, { tables: [] }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    ...hotel,
    featureSettings: { godModeEnabled: true },
  }));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => fulfillJson(route, { orders: [currentOrder] }));
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    statuses.push(body.status);
    currentOrder = { ...currentOrder, status: body.status, updatedAt: new Date().toISOString() };
    return fulfillJson(route, { order: currentOrder });
  });

  await page.goto("/owner/order");
  const card = page.locator(".ops-order-card--new");
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: /^Mark ready Table 8 order/ }).evaluate((element) => {
    element.click();
    element.click();
  });
  await expect(page.locator(".ops-order-card--ready")).toBeVisible();
  await expect(page.locator(".ops-order-card--ready")).not.toHaveClass(/is-compact/);
  await expect(page.getByText("Paneer Tikka", { exact: true })).toBeVisible();
  await expect(page.getByText("Allergy: peanuts", { exact: true })).toBeVisible();
  await expect.poll(() => statuses).toEqual(["ready"]);

  const deliver = page.getByRole("button", { name: /^Deliver Table 8 order/ });
  await expect(deliver).toBeVisible();
  await deliver.click();
  await expect.poll(() => statuses).toEqual(["ready", "delivered"]);
  await expect(page.locator(".ops-order-card--delivered")).toHaveClass(/is-compact/);
});

test("God Mode queues direct Ready offline once and replays the same mutation id", async ({ page, context }) => {
  await installSession(page, "staff");
  const order = kitchenOrder();
  const updates = [];
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    ...hotel,
    featureSettings: { godModeEnabled: true },
  }));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => fulfillJson(route, { orders: [order] }));
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    updates.push(body);
    return fulfillJson(route, { order: { ...order, status: body.status } });
  });

  await page.goto("/kitchen");
  await context.setOffline(true);
  await page.getByRole("button", { name: /^Mark ready Table 8 order/ }).click();
  await expect(page.locator(".ops-order-card--ready")).toBeVisible();
  const queued = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((item) => item.startsWith("flexiorder_pending_kitchen_updates:"));
    return JSON.parse(localStorage.getItem(key) || "[]");
  });
  expect(queued).toHaveLength(1);
  expect(queued[0]).toMatchObject({ status: "ready" });
  expect(queued[0].clientMutationId).toBeTruthy();

  await context.setOffline(false);
  await expect.poll(() => updates).toHaveLength(1);
  expect(updates[0]).toMatchObject({
    status: "ready",
    clientMutationId: queued[0].clientMutationId,
  });
});

test("grouped new orders preserve item, timing, and instruction boundaries", async ({ page }) => {
  await installSession(page, "staff");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const scheduledFor = new Date(Date.now() + 60 * 60_000).toISOString();
  const orders = [
    kitchenOrder({
      _id: "order-group-a",
      items: [{ name: "Paneer Tikka", quantity: 2 }],
      note: "Less spicy",
    }),
    kitchenOrder({
      _id: "order-group-b",
      orderType: "schedule",
      scheduledFor,
      guestName: "Anika",
      items: [
        { name: "Hakka Noodles", quantity: 1 },
        { name: "Removed dish", quantity: 0 },
      ],
      note: "No onion",
    }),
  ];

  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders }));

  await page.goto("/kitchen");
  const newCard = page.locator(".ops-order-card--new");
  await expect(newCard).toHaveCount(1);
  await expect(newCard.getByText("2 separate orders", { exact: true })).toBeVisible();
  await expect(newCard.getByText("3 items", { exact: true })).toBeVisible();

  const orderBlocks = newCard.locator(".ops-order-card__order-block");
  await expect(orderBlocks).toHaveCount(2);
  const immediateBlock = orderBlocks.filter({ hasText: "Paneer Tikka" });
  const scheduledBlock = orderBlocks.filter({ hasText: "Hakka Noodles" });
  await expect(immediateBlock.getByText("Immediate", { exact: true })).toBeVisible();
  await expect(immediateBlock.getByText("Less spicy", { exact: true })).toBeVisible();
  await expect(immediateBlock.getByText("No onion", { exact: true })).toHaveCount(0);

  await expect(scheduledBlock.getByText(/^Scheduled ·/)).toBeVisible();
  await expect(scheduledBlock.getByText("Removed dish", { exact: true })).toHaveCount(0);
  await expect(scheduledBlock.getByText("No onion", { exact: true })).toBeVisible();
  await expect(scheduledBlock.getByText("Less spicy", { exact: true })).toHaveCount(0);
  await expect(newCard).toHaveCSS("animation-name", "none");
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
  expect(queued[0]).toMatchObject({ orderId: "order-00008", status: "preparing" });
  expect(queued[0].clientMutationId).toBeTruthy();

  await context.setOffline(false);
  await expect.poll(() => updates.length).toBe(1);
  expect(updates[0]).toMatchObject({
    status: "preparing",
    clientMutationId: queued[0].clientMutationId,
  });
});

test("a slow save does not block the next distinct kitchen transition", async ({ page }) => {
  await installSession(page, "staff");
  let releasePreparing;
  const preparingResponse = new Promise((resolve) => { releasePreparing = resolve; });
  const statuses = [];
  let currentOrder = kitchenOrder();

  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [currentOrder] }));
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    statuses.push(body.status);
    if (body.status === "preparing") await preparingResponse;
    currentOrder = { ...currentOrder, status: body.status, updatedAt: new Date().toISOString() };
    return fulfillJson(route, { order: currentOrder });
  });

  await page.goto("/kitchen");
  await page.getByRole("button", { name: /^Accept Table 8 order/ }).click();
  const finish = page.getByRole("button", { name: /^Finish Table 8 order/ });
  await expect(finish).toBeVisible();
  await expect(page.getByText("Syncing", { exact: true })).toBeVisible();
  await finish.click();
  await expect(page.locator(".ops-order-card--ready")).toBeVisible();
  await expect(page.locator(".ops-order-card--ready").getByText("Syncing", { exact: true })).toBeVisible();
  expect(statuses).toEqual(["preparing"]);

  releasePreparing();
  await expect.poll(() => statuses).toEqual(["preparing", "ready"]);
  await expect(page.locator(".ops-order-card--ready").getByText("Syncing", { exact: true })).toHaveCount(0);
});

test("kitchen ready cards remain non-interactive", async ({ page }) => {
  await installSession(page, "staff");
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, {
    orders: [kitchenOrder({ status: "ready", readyAt: new Date().toISOString() })],
  }));

  await page.goto("/kitchen");
  await expect(page.locator(".ops-order-card--ready")).toBeVisible();
  await expect(page.locator(".ops-order-card--ready .ops-order-card__primary-action")).toHaveCount(0);
});

test("paused orders resume preparing with one tap", async ({ page }) => {
  await installSession(page, "staff");
  const statuses = [];
  const pausedOrder = kitchenOrder({ status: "paused" });
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [pausedOrder] }));
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    statuses.push(body.status);
    return fulfillJson(route, { order: { ...pausedOrder, status: body.status } });
  });

  await page.goto("/kitchen");
  await page.getByRole("button", { name: "More actions for paused Table 8" }).click();
  await expect(page.getByRole("dialog", { name: "Actions for Table 8" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Resume preparing Table 8 order" }).click();
  await expect(page.locator(".ops-order-card--preparing")).toBeVisible();
  await expect.poll(() => statuses).toEqual(["preparing"]);
});

test("terminal status rejection offers restore confirmed recovery", async ({ page }) => {
  await installSession(page, "staff");
  const pendingOrder = kitchenOrder();
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [pendingOrder] }));
  await page.route("**/kitchen/orders/order-00008", (route) => fulfillJson(route, {
    message: "Transition rejected",
  }, 409));

  await page.goto("/kitchen");
  await page.getByRole("button", { name: /^Accept Table 8 order/ }).click();
  await expect(page.locator(".ops-order-card--preparing")).toBeVisible();
  await expect(page.getByText("1 need attention")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.getByRole("button", { name: "Restore confirmed" }).click();
  await expect(page.locator(".ops-order-card--new")).toBeVisible();
  await expect(page.getByText("1 need attention")).toHaveCount(0);
});

test("delivered leaves active orders immediately and history exposes full details", async ({ page }) => {
  await installSession(page, "staff");
  const readyOrder = kitchenOrder({
    status: "ready",
    subtotal: 300,
    discountAmount: 30,
    gstRate: 5,
    gstAmount: 13.5,
    totalAmount: 283.5,
    readyAt: new Date().toISOString(),
  });
  await mockStaffWorkspace(page, [readyOrder]);
  await page.route("**/kitchen/orders/order-00008", async (route) => {
    const body = route.request().postDataJSON();
    return fulfillJson(route, {
      order: { ...readyOrder, status: body.status, deliveredAt: new Date().toISOString() },
    });
  });

  await page.goto("/owner/order");
  await page.getByRole("button", { name: /^Deliver Table 8 order/ }).click();
  await expect(page.getByRole("button", { name: /^Deliver Table 8 order/ })).toHaveCount(0);

  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByRole("button", { name: "More options for Table 8" })).toBeVisible();
  await page.getByRole("button", { name: "More options for Table 8" }).click();
  await page.getByRole("button", { name: "View full details" }).click();
  await expect(page.getByRole("dialog", { name: "Order details for Table 8" })).toBeVisible();
  await expect(page.getByText("₹283.50")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timing" })).toBeVisible();
});

test("Simple mode keeps workspace switching but hides optional staff controls", async ({ page }) => {
  await installSession(page, "staff");
  const simpleHotel = {
    ...hotel,
    featureSettings: {
      appLevel: "simple",
      staffCapabilities: {
        editMenu: true,
        changeOrdering: true,
        switchWorkspaces: true,
        usePublicDisplay: true,
      },
    },
  };
  await page.route("**/hotel/me", (route) => fulfillJson(route, simpleHotel));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => fulfillJson(route, { orders: [] }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, []));
  await page.route("**/table", (route) => fulfillJson(route, { tables: [] }));

  await page.goto("/owner/order");
  await page.getByRole("button", { name: "More waiter options" }).click();
  await expect(page.getByRole("button", { name: "Kitchen workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit menu" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /customer ordering/ })).toHaveCount(0);

  await page.goto("/staff/menu");
  await expect(page.getByText("Menu editing is not enabled for staff.")).toBeVisible();
});

test("waiter and kitchen keep Refresh outside their right-side overflow menus", async ({ page }) => {
  await installSession(page, "staff");
  await mockStaffWorkspace(page);

  await page.goto("/owner/order");
  await expect(page.getByRole("button", { name: "Refresh waiter workspace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "More waiter options" })).toBeVisible();
  await page.getByRole("button", { name: "More waiter options" }).click();
  await expect(page.locator(".ops-tools-sheet").getByRole("button", { name: /^Refresh/ })).toHaveCount(0);

  await page.route("**/kitchen/orders", (route) => fulfillJson(route, { orders: [kitchenOrder()] }));
  await page.goto("/kitchen");
  await expect(page.getByRole("button", { name: "Refresh kitchen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "More kitchen options" })).toBeVisible();
  await page.getByRole("button", { name: "More kitchen options" }).click();
  await expect(page.locator(".ops-tools-sheet").getByRole("button", { name: /^Refresh/ })).toHaveCount(0);
});

test("waiter subcategories use a compact chooser and filter the full dish list", async ({ page }) => {
  await installSession(page, "staff");
  const menu = [
    { _id: "dish-paneer", name: "Paneer Tikka", price: 250, category: "Starters", subCategory: "Grill", foodType: "veg", isAvailable: true },
    { _id: "dish-naan", name: "Butter Naan", price: 60, category: "Starters", subCategory: "Breads", foodType: "veg", isAvailable: true },
  ];
  await page.route("**/hotel/me", (route) => fulfillJson(route, hotel));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => fulfillJson(route, { orders: [] }));
  await page.route("**/menu/hotel-1", (route) => fulfillJson(route, menu));
  await page.route("**/table", (route) => fulfillJson(route, { tables: [{ _id: "table-8", tableNumber: "8", type: "table" }] }));

  await page.goto("/owner/order");
  await page.getByRole("tab", { name: "Take Order" }).click();
  await page.getByRole("button", { name: "Table 8" }).click();
  const chooser = page.locator(".staff-menu-step .menu-subcategory-trigger");
  await expect(chooser).toHaveAttribute("aria-expanded", "false");
  await chooser.click();
  await page.keyboard.press("End");
  await expect(page.getByRole("button", { name: "Breads" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(chooser).toBeFocused();
  await chooser.click();
  await page.locator(".staff-dish-search input").click();
  await expect(chooser).toHaveAttribute("aria-expanded", "false");
  await chooser.click();
  await page.getByRole("button", { name: "Breads" }).click();
  await expect(chooser).toHaveAttribute("aria-expanded", "false");
  await expect(chooser).toContainText("Breads");
  await expect(page.getByRole("button", { name: "Add Butter Naan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add Paneer Tikka" })).toHaveCount(0);
  await expect(page.locator(".staff-menu-step .guest-menu-sidebar")).toHaveCount(0);
});

test("customer ordering pause does not block permitted staff ordering", async ({ page }) => {
  await installSession(page, "staff");
  await mockStaffWorkspace(page);
  await page.unroute("**/hotel/me");
  await page.route("**/hotel/me", (route) => fulfillJson(route, {
    ...hotel,
    orderingEnabled: false,
    featureSettings: { staffCapabilities: { changeOrdering: true } },
  }));

  await page.goto("/owner/order");
  await page.getByRole("tab", { name: "Take Order" }).click();
  await page.getByRole("button", { name: "Table 8" }).click();
  await expect(page.getByRole("button", { name: "Add Paneer Tikka" })).toBeVisible();
});

test("customer visual and simple menus use the same compact subcategory chooser", async ({ page }) => {
  const menu = [
    { _id: "dish-paneer", name: "Paneer Tikka", price: 250, category: "Starters", subCategory: "Grill", foodType: "veg", isAvailable: true },
    { _id: "dish-naan", name: "Butter Naan", price: 60, category: "Starters", subCategory: "Breads", foodType: "veg", isAvailable: true },
  ];
  await mockGuestMenu(page, { dishes: menu });

  await page.goto("/qr/qr-123");
  const chooser = page.locator(".guest-menu-main-panel .menu-subcategory-trigger");
  await expect(page.locator(".guest-menu-sidebar")).toHaveCount(0);
  await expect(page.locator(".guest-category-bar").getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  await chooser.click();
  await page.getByPlaceholder("Search dishes...").click();
  await expect(chooser).toHaveAttribute("aria-expanded", "false");
  await chooser.click();
  await page.getByRole("button", { name: "Breads" }).click();
  await expect(chooser).toContainText("Breads");
  await expect(page.getByText("Butter Naan", { exact: true })).toBeVisible();
  await expect(page.getByText("Paneer Tikka", { exact: true })).toHaveCount(0);

  await page.unroute("**/qr/menu/qr-123");
  await mockGuestMenu(page, { hotel: { menuMode: "simple" }, dishes: menu });
  await page.reload();
  await expect(page.getByRole("button", { name: /Subcategory All/ })).toBeVisible();
});
