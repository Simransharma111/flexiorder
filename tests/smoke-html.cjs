const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const g = await browser.newPage({ viewport: { width: 760, height: 1000 } });
  await g.goto("file:///home/ishwar/Company/2/index.html");
  await g.waitForTimeout(800);
  const docs = await g.locator("section.doc").evaluateAll(els => els.map(e => e.id));
  const delBtn = await g.locator('a.btn[href^="mailto:ishwrknt.gmail".replace(".gmail","@gmail")]'.replace('ishwrknt.gmail','ishwrknt')); // placeholder guard
  const btn = await g.locator('a.btn[href^="mailto:flexiorderofficial@gmail.com"]').count();
  const toc = await g.locator("nav.toc a").count();
  console.log("documents:", JSON.stringify(docs), "| toc links:", toc, "| deletion button:", btn);
  await g.screenshot({ path: "/tmp/legal-index-top.png" });
  const h = await g.evaluate(() => document.documentElement.scrollHeight);
  console.log("page height:", h);
  await browser.close();
})();
