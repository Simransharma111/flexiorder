const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 60000 });
  await g.locator('input[type="email"]').fill("probe.waiter@example.com");
  await g.locator('input[type="password"]').fill("TempPass123");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(7000);
  console.log("post-login url:", g.url());
  await g.getByRole("tab", { name: "Take Order" }).first().click();
  await g.waitForTimeout(3000);
  const tiles = await g.locator(".staff-location-tile").count();
  console.log("table tiles:", tiles, "| first:", tiles ? JSON.stringify((await g.locator(".staff-location-tile").first().innerText()).trim()) : "-");
  if (tiles) {
    await g.locator(".staff-location-tile").first().click();
    await g.waitForTimeout(3000);
    const dishes = ["Masala Dosa"].filter(async d => d); // noop
    console.log("Masala Dosa visible:", await g.locator("text=Masala Dosa").count());
    console.log("add buttons:", await g.locator("button:has-text('Add')").count());
  }
  const noEdit = await g.getByRole("button", { name: "Edit menu" }).count();
  console.log("Edit menu buttons (must be 0):", noEdit);
  await browser.close();
})();
