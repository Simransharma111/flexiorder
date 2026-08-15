const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 60000 });
  await g.locator('input[type="email"]').fill("probe.waiter@example.com");
  await g.locator('input[type="password"]').fill("TempPass123");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(6000);
  await g.goto("http://127.0.0.1:4173/kitchen", { waitUntil: "networkidle", timeout: 60000 });
  await g.waitForTimeout(5000);
  await g.screenshot({ path: "/tmp/kitchen-board.png", fullPage: false });
  await browser.close();
})();
