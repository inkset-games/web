// Balance check: a bot plays N runs at a fixed timestep. Usage: node sim.js [runs] [good|naive]
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 800, height: 800 } });
  await p.addInitScript({ path: path.join(__dirname, "bot.js") });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "..", "..", "docs", "experiments", "undermine", "index.html"));
  await p.waitForTimeout(1200);
  const runs = +(process.argv[2] || 8), skill = process.argv[3] || "good";
  const res = await p.evaluate(async ({ runs, skill }) => {
    const U = window.__um, out = [];
    for (let r = 0; r < runs; r++) {
      U.startRun();
      let t = 0, shrines = 0, stuck = 0, lastY = -9; const mem = {};
      const dt = 1 / 60;
      while (U.mode !== "over" && t < 900 && !U.S.P.dead) {
        if (U.mode === "shrine") { U.takeOffer((Math.random() * 3) | 0); shrines++; }
        const S = U.S, P = S.P;
        if (P.dead) break;
        window.botStep(U, mem, skill);
        U.step(dt); t += dt;
        if (P.y === lastY) stuck += dt; else { stuck = 0; lastY = P.y; }
        if (stuck > 25) break;
      }
      const S = U.S;
      out.push({ depth: S.maxDepth, t: Math.round(t), cause: S.cause || (t >= 900 ? "timeout" : "stuck"), gems: S.gems, score: Math.round(S.score), shrines, pacts: S.pacts.join(",") });
    }
    return out;
  }, { runs, skill });
  for (const r of res) console.log(JSON.stringify(r));
  const ds = res.map((r) => r.depth).sort((a, b) => a - b);
  console.log("median depth", ds[ds.length >> 1], "errors:", errs.slice(0, 5).join(" | ") || "none");
  await b.close();
})();
