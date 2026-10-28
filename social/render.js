// Renders each .card in cards.html to docs/og/<id>.png at 1200x630, or to the path in its data-out
// (relative to the repo root; a .jpg path writes a JPEG).
// Usage (from repo root): node social/render.js   — needs Playwright + Chromium.
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file://' + path.join(__dirname, 'cards.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  for (const card of await page.$$('.card')) {
    const id = await card.getAttribute('id');
    const rel = await card.getAttribute('data-out');
    const out = rel ? path.join(__dirname, '..', rel) : path.join(__dirname, '..', 'docs', 'og', id + '.png');
    await card.screenshot(out.endsWith('.jpg') ? { path: out, type: 'jpeg', quality: 88 } : { path: out });
    console.log('wrote', path.relative(process.cwd(), out));
  }
  await browser.close();
})();
