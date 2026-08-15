const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 860 } });
  // landing footer link
  await g.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", timeout: 90000 });
  await g.waitForTimeout(2000);
  const footerLink = await g.locator('footer a[href="/privacy"]').count();
  console.log("landing footer privacy link:", footerLink);
  // policy page
  await g.goto("http://127.0.0.1:4173/privacy", { waitUntil: "networkidle", timeout: 60000 });
  const sections = await g.locator(".privacy-page__section").count();
  const h1 = await g.locator("h1").innerText();
  console.log("page:", h1, "| sections:", sections);
  // about panel link (owner)
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 60000 });
  await g.locator('input[type="email"]').fill("probe.hotel@example.com");
  await g.locator('input[type="password"]').fill("Probe123x");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(5000);
  await g.goto("http://127.0.0.1:4173/owner", { waitUntil: "networkidle", timeout: 60000 });
  await g.waitForTimeout(3000);
  const about = g.locator('button:has-text("About"), [data-nav]:has-text("About")').first();
  if (await about.count()) await about.click();
  // the about tab may be inside Manage hotel sheet — also check direct presence
  await g.waitForTimeout(1500);
  const aboutLink = await g.locator('.owner-about__version a[href="/privacy"]').count();
  console.log("about panel privacy link:", aboutLink);
  await browser.close();
})();
