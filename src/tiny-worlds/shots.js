// Renders the gameplay slice used by the share cards (social/tiny-worlds-play.png) and the app icon
// (docs/experiments/tiny-worlds/icon.png) from the built page. Run after build.js, from anywhere:
//   node src/tiny-worlds/shots.js        — needs Playwright + Chromium
// Then run `node social/render.js` twice from the repo root (the experiments card uses the fresh thumbnail).
const path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..", "..");
const page = "file://" + path.join(root, "docs", "experiments", "tiny-worlds", "index.html");

(async () => {
  const b = await chromium.launch();

  // Gameplay: the Stained Glass pack, the outer window mostly painted and the worlds inside it finished.
  const ctx = await b.newContext({ viewport: { width: 470, height: 630 }, deviceScaleFactor: 2, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(page);
  await p.evaluate(() => {
    const i = PACKS.findIndex((P) => P.id === "glass"), Ws = worldsOf(i);
    const fills = Ws.map((W, k) => W.colorOf.map((c, r) => (k > 0 || (c !== 3 && !(c === 4 && r % 3))) ? W.pal[c] : null));
    localStorage.setItem("tiny-worlds:paint:glass", JSON.stringify({ fills, strokes: Ws.map((W) => W.colorOf.map(() => [])) }));
    localStorage.setItem("tiny-worlds:style", JSON.stringify({ free: false, brush: false, mute: true }));
  });
  await p.reload();
  await p.evaluate(() => { const i = PACKS.findIndex((P) => P.id === "glass"); openPack(i, null); });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const g = targetCircle(); place(0, g.x, g.y, g.r * 1.06); flight = null; updateFocus(); select(3); dirty = true; });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(root, "social", "tiny-worlds-play.png") });
  console.log("wrote social/tiny-worlds-play.png");

  // Icon: the first Stained Glass window, finished, with the next world showing through it.
  const ic = await b.newPage({ viewport: { width: 180, height: 180 } });
  await ic.goto(page);
  const data = await ic.evaluate(() => {
    const i = PACKS.findIndex((P) => P.id === "glass"), Ws = worldsOf(i);
    const c = document.createElement("canvas"); c.style.width = c.style.height = "180px"; c.dataset.size = 180; document.body.appendChild(c);
    drawPreview(c, Ws[0], null, null, 2.2, Ws.slice(1));
    const out = document.createElement("canvas"); out.width = out.height = 180;
    const g = out.getContext("2d"); g.fillStyle = "#fffaf2"; g.fillRect(0, 0, 180, 180);
    g.drawImage(c, 6, 6, 168, 168);
    return out.toDataURL("image/png");
  });
  require("fs").writeFileSync(path.join(root, "docs", "experiments", "tiny-worlds", "icon.png"), Buffer.from(data.split(",")[1], "base64"));
  console.log("wrote docs/experiments/tiny-worlds/icon.png");
  await b.close();
})();
