const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 90000 });
  await g.locator('input[type="email"]').fill("probe.hotel@example.com");
  await g.locator('input[type="password"]').fill("Probe123x");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(5000);
  await g.goto("http://127.0.0.1:4173/owner/hotel/settings", { waitUntil: "networkidle", timeout: 90000 });
  await g.waitForTimeout(5000);
  const present = await g.evaluate(() => {
    const ph = (p) => !!document.querySelector(`input[placeholder="${p}"]`);
    return { name: ph("Hotel name"), tagline: ph("Tagline"), address: ph("Address"),
             website: ph("Website"), instagram: ph("Instagram") };
  });
  console.log("Hotel Information inputs:", JSON.stringify(present));
  await browser.close();
})();
