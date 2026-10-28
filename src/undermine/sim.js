// Balance check: a bot plays mines at a fixed timestep. Usage: node sim.js [firstMine] [lastMine] [good|naive|idle] [triesPerMine]
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const [vw, vh] = (process.env.VP || "800x800").split("x").map(Number);
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  await p.addInitScript({ path: path.join(__dirname, "bot.js") });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "..", "..", "docs", "experiments", "undermine", "index.html"));
  await p.waitForTimeout(1200);
  const [a, z, skill, tries] = [+(process.argv[2] || 1), +(process.argv[3] || 10), process.argv[4] || "good", +(process.argv[5] || 1)];
  const res = await p.evaluate(({ a, z, skill, tries }) => {
    const U = window.__um, out = [];
    for (let n = a; n <= z; n++) for (let k = 0; k < tries; k++) {
      U.startMine(n);
      const mem = {}; let t = 0;
      while (!U.S.won && !U.S.P.dead && t < 300) { window.botStep(U, mem, skill); U.step(1 / 60); t += 1 / 60; }
      const S = U.S;
      out.push({ n, D: S.D, won: S.won, why: S.won ? "" : S.cause || "time", t: Math.round(t), depth: S.maxDepth, oil: Math.round(S.oil), hurt: S.hurt, combo: S.bestCombo, cans: S.cans, from: Object.fromEntries(Object.entries(S.oilFrom).map(([k, v]) => [k, Math.round(v)])), gems: S.gems, gemGoal: S.gemGoal, stars: S.won ? 1 + (S.gems >= S.gemGoal) + (S.hurt === 0) : 0 });
    }
    return out;
  }, { a, z, skill, tries });
  for (const r of res) console.log(JSON.stringify(r));
  console.log("cleared", res.filter((r) => r.won).length + "/" + res.length, "errors:", errs.slice(0, 5).join(" | ") || "none");
  await b.close();
})();
