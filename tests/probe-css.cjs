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
  const data = await g.evaluate(() => {
    const out = [];
    document.querySelectorAll(".ops-order-card").forEach(card => {
      const lane = card.className.match(/--(\w+)/)?.[1];
      const badge = card.querySelector(".ops-order-card__price-badge");
      const cs = badge ? getComputedStyle(badge) : null;
      const cardcs = getComputedStyle(card);
      const meta = card.querySelector(".ops-order-card__meta");
      out.push({
        lane,
        cardBg: cardcs.backgroundColor,
        badge: cs && { color: cs.color, bg: cs.backgroundColor, fs: cs.fontSize, fw: cs.fontWeight, pad: cs.padding },
        metaFs: meta ? getComputedStyle(meta).fontSize : null,
        metaColor: meta ? getComputedStyle(meta).color : null,
        text: card.innerText.replace(/\n/g, " | ").slice(0, 140),
      });
    });
    return out;
  });
  console.log(JSON.stringify(data, null, 1));
  await browser.close();
})();
