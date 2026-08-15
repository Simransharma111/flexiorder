const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 900 } });
  g.on("response", r2 => { if (/\/api\//.test(r2.url())) console.log("NET:", r2.status(), r2.url()); });
  g.on("requestfailed", r2 => console.log("REQFAIL:", r2.url(), r2.failure()?.errorText));
  g.on("console", m => { if (m.type() !== "log") console.log("PAGE[" + m.type() + "]:", m.text().slice(0, 200)); });
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 60000 });
  await g.locator('input[type="email"]').fill("probe.waiter@example.com");
  await g.locator('input[type="password"]').fill("TempPass123");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(8000);
  console.log("post-login url:", g.url());
  await g.getByRole("tab", { name: "Take Order" }).first().click();
  await g.waitForTimeout(5000);
  console.log("tiles:", await g.locator(".staff-location-tile").count());
  await browser.close();
})();
