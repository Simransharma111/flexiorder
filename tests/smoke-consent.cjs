const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await g.goto("http://127.0.0.1:4173/register", { waitUntil: "networkidle", timeout: 90000 });
  await g.waitForTimeout(2500);
  const boxes = await g.locator('input[type="checkbox"]').count();
  const link = await g.locator('a[href="/privacy"]').count();
  console.log("checkboxes:", boxes, "| privacy link in form:", link);
  // fill fields but DO NOT tick
  await g.fill('input[name="name"]', "Smoke Test");
  await g.fill('input[name="email"]', "smoke.consent@example.com");
  await g.fill('input[name="phone"]', "9876543210");
  await g.fill('input[name="password"]', "Smoke123!");
  await g.fill('input[name="confirmPassword"]', "Smoke123!");
  await g.locator('button[type="submit"]').first().click({ force: true });
  await g.waitForTimeout(700);
  const err = await g.locator("text=/tick both boxes/i").count();
  console.log("blocked without ticks:", err);
  // tick both & submit → should proceed to an API call (may 409 if email exists → fine)
  await g.locator('input[type="checkbox"]').nth(0).check();
  await g.locator('input[type="checkbox"]').nth(1).check();
  await g.locator('button[type="submit"]').first().click({ force: true });
  await g.waitForTimeout(2500);
  const stillErr = await g.locator("text=/tick both boxes/i").count();
  console.log("consent error cleared after ticks:", stillErr === 0);
  await browser.close();
})();
