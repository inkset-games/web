// Headless smoke test: at phone size, open every pack from the gallery and finish its first world by tapping
// like a player would (striped areas first, otherwise tap an area to pick its paint). Fails on page errors or a world
// that can't be finished. Needs Playwright + Chromium. Usage: node src/tiny-worlds/check.js
const path = require("path");
const { chromium, devices } = require("playwright");
const page = "file://" + path.join(__dirname, "..", "..", "docs", "experiments", "tiny-worlds", "index.html");

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices["iPhone 13"] });
  const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(page);
  const packs = await p.evaluate(() => PACKS.map((P) => P.name));
  let bad = 0;
  for (let i = 0; i < packs.length; i++) {
    if (i) { await p.tap("#galBtn"); await p.waitForTimeout(350); }
    const card = (await p.$$(".card"))[i]; await card.scrollIntoViewIfNeeded(); await card.tap();
    await p.waitForTimeout(1400);
    let taps = 0;
    for (; taps < 600; taps++) {
      const pt = await p.evaluate(() => {
        const w = mod(focus), t = tAt(focus); if (isDone(w)) return null;
        let other = null;
        for (let r = 0; r < worlds[w].n; r++) if (!fills[w][r]) {
          const s = samplesOf(worlds[w], r).pts; if (!s.length) continue;
          const k = (s.length >> 2) << 1, q = { x: s[k] * t.s + t.tx, y: s[k + 1] * t.s + t.ty };
          if (isHinted(w, r, selected)) return q; other ||= q;
        }
        return other;
      });
      if (!pt) break;
      await p.touchscreen.tap(pt.x, pt.y);
    }
    await p.waitForTimeout(300);
    const done = await p.evaluate(() => isDone(mod(focus)));
    console.log(`${done ? "ok  " : "FAIL"} ${packs[i]}: first world finished in ${taps} taps`);
    if (!done) bad++;
  }
  if (errs.length) console.log("page errors:\n" + errs.join("\n"));
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
