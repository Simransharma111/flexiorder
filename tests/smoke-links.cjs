const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await g.goto("http://127.0.0.1:4173/qr/Hvfv0S-9", { waitUntil: "networkidle", timeout: 90000 });
  await g.waitForTimeout(5000);
  const links = await g.locator(".guest-secondary-actions a").evaluateAll(els =>
    els.map(e => ({ text: e.innerText.trim(), href: e.href })));
  console.log("brand links:", JSON.stringify(links));
  const sched = await g.locator(".guest-secondary-actions button").count();
  console.log("schedule button count:", sched);
  await browser.close();
})();
