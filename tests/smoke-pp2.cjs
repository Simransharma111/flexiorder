const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 860 } });
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 90000 });
  await g.locator('input[type="email"]').fill("probe.hotel@example.com");
  await g.locator('input[type="password"]').fill("Probe123x");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(5000);
  await g.goto("http://127.0.0.1:4173/owner/manage", { waitUntil: "networkidle", timeout: 60000 });
  await g.waitForTimeout(3000);
  const about = g.locator('button:has-text("About")').first();
  if (await about.count()) { await about.click(); await g.waitForTimeout(1500); }
  const aboutLink = await g.locator('.owner-about__version a[href="/privacy"]').count();
  console.log("about panel privacy link:", aboutLink);
  await browser.close();
})();
