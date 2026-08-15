const { chromium } = require("playwright");
const { fulfillJson, hotel, kitchenOrder, dishes = [] } = (() => {
  try { return require("./tests/e2e/helpers.js"); } catch { return {}; }
})();
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 900 } });
  // replicate the failing test exactly (mocks copied inline)
  const H = {
    "staff-kitchen.spec.js": true
  };
  const ff = (route, data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  const hotelBase = { _id: "hotel-1", name: "Probe Hotel", orderingEnabled: true };
  const kitchenOrders = [{ _id: "o1", status: "pending", orderType: "dinein", locationType: "table", locationNumber: "8", guestName: "Guest", createdAt: new Date().toISOString(), items: [{ name: "Paneer", quantity: 1 }] }];
  await g.addInitScript(() => {
    localStorage.setItem("user", JSON.stringify({ _id: "staff-1", email: "staff@flexi.test", role: "staff", hotelId: "hotel-1" }));
    localStorage.setItem("token", "fake-token-" + "x".repeat(30) + "." + "y".repeat(60) + "." + "x".repeat(20));
  });
  await g.route("**/hotel/me", (route) => ff(route, { ...hotelBase, featureSettings: { staffCapabilities: { changeOrdering: true } } }));
  await g.route(/\/kitchen\/orders(?:\?.*)?$/, (route) => ff(route, { orders: kitchenOrders }));
  await g.route("**/menu/hotel-1", (route) => ff(route, []));
  await g.route("**/table", (route) => ff(route, { tables: [] }));
  const payloads = [];
  let n = 0;
  await g.route("**/hotel/profile", async (route) => {
    n++; const p = JSON.parse(route.request().postData()); payloads.push(p);
    if (n === 1) return ff(route, { message: "Setting could not be saved" }, 500);
    return ff(route, { hotel: { ...hotelBase, orderingEnabled: p.orderingEnabled } });
  });
  g.on("dialog", d => d.accept());
  g.on("console", m => { if (m.type() !== "log") console.log("PAGE["+m.type()+"]:", m.text().slice(0,160)); });
  await g.goto("http://127.0.0.1:4173/owner/order", { waitUntil: "networkidle", timeout: 60000 });
  await g.getByRole("button", { name: "More waiter options" }).click();
  const pause = g.getByRole("button", { name: "Pause customer ordering" });
  console.log("pause visible:", await pause.count());
  await pause.click(); await g.waitForTimeout(1500);
  console.log("after attempt1 label still 'Pause':", await g.getByRole("button", { name: "Pause customer ordering" }).count());
  await pause.click(); await g.waitForTimeout(1500);
  console.log("'Turn customer ordering on' count:", await g.getByRole("button", { name: "Turn customer ordering on" }).count());
  console.log("'Pause customer ordering' count:", await g.getByRole("button", { name: "Pause customer ordering" }).count());
  console.log("payloads:", JSON.stringify(payloads));
  await browser.close();
})();
