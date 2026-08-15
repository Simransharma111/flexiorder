const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await g.goto("http://127.0.0.1:4173/login", { waitUntil: "networkidle", timeout: 60000 });
  await g.locator('input[type="email"]').fill("probe.waiter@example.com");
  await g.locator('input[type="password"]').fill("TempPass123");
  await g.locator('button[type="submit"]').first().click();
  await g.waitForTimeout(6000);
  // kitchen board: preparing card shows items inline
  await g.goto("http://127.0.0.1:4173/kitchen", { waitUntil: "networkidle", timeout: 60000 });
  await g.waitForTimeout(4500);
  const prepCards = await g.locator(".ops-order-card--preparing").count();
  const rows = await g.locator(".ops-order-card--preparing .ops-order-card__item-row").count();
  console.log("preparing cards:", prepCards, "| inline item rows:", rows);
  // open ⋯ then Order details
  await g.locator('.ops-order-card--preparing [aria-label^="More actions"]').first().click();
  await g.waitForTimeout(500);
  const detailsBtn = g.getByRole("button", { name: "Order details" });
  console.log("details button in sheet:", await detailsBtn.count());
  await detailsBtn.click();
  await g.waitForTimeout(700);
  const dialog = g.locator(".ops-order-details");
  const txt = (await dialog.innerText()).replace(/\s+/g, " ");
  console.log("dialog text:", txt.slice(0, 220));
  const total = g.locator(".ops-order-details__total");
  const cs = await dialog.locator(".ops-order-details__total").evaluate(el => {
    const s = getComputedStyle(el); return { fs: s.fontSize, fw: s.fontWeight };
  });
  console.log("total style:", JSON.stringify(cs));
  await browser.close();
})();
