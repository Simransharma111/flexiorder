const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 420, height: 860 } });
  await g.goto("http://127.0.0.1:4173/privacy", { waitUntil: "networkidle", timeout: 90000 });
  const btn = g.locator(".privacy-page__deletion-button");
  console.log("deletion button:", await btn.count(), "| href:", (await btn.getAttribute("href") || "").slice(0, 60));
  const sections = await g.locator(".privacy-page__section").count();
  console.log("sections:", sections);
  await browser.close();
})();
