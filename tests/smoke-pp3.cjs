const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 860 } });
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 90000 });
  await g.locator('input[type="email"]').fill("probe.hotel@example.com");
  await g.locator('input[type="password"]').fill("Probe123x");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(6000);
  // open Manage → About tab via the dashboard tab state
  const manageBtn = g.locator("button", { hasText: "Manage" }).first();
  if (await manageBtn.count()) { await manageBtn.click(); await g.waitForTimeout(800); }
  const aboutBtn = g.locator("button", { hasText: "About" }).first();
  console.log("about button:", await aboutBtn.count());
  if (await aboutBtn.count()) {
    await g.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find(x => /About/.test(x.innerText));
      b?.click();
    });
    await g.waitForTimeout(1500);
    console.log("about panel privacy link:", await g.locator('.owner-about__version a[href="/privacy"]').count());
  }
  await browser.close();
})();
