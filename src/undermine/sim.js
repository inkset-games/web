// Balance check: a greedy bot plays the campaign from a fresh save, spending gems in the shop between runs.
// Usage: node sim.js [lastMine] [maxRunsPerMine]   (VP=390x844 for a phone-sized view)
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const [vw, vh] = (process.env.VP || "800x800").split("x").map(Number);
  const p = await b.newPage({ viewport: { width: vw, height: vh } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("file://" + path.join(__dirname, "..", "..", "docs", "experiments", "undermine", "index.html"));
  await p.waitForTimeout(1200);
  const [last, maxRuns] = [+(process.argv[2] || 12), +(process.argv[3] || 10)];
  const cont = !!process.env.CONTINUE;
  const res = await p.evaluate(({ last, maxRuns, cont }) => {
    const U = window.__um, out = [];
    U.reset();
    const shop = () => {
      // spend like a sensible player: keep power and swings level, then luck and bombs
      for (;;) {
        const opts = U.UPGRADES.filter((u) => U.save.lv[u.id] < u.max && U.save.gems >= u.cost[U.save.lv[u.id]]);
        if (!opts.length) return;
        opts.sort((a, b) => (U.save.lv[a.id] + (a.id === "luck" ? 1 : a.id === "bombs" ? 2 : 0)) - (U.save.lv[b.id] + (b.id === "luck" ? 1 : b.id === "bombs" ? 2 : 0)));
        U.buy(opts[0].id);
      }
    };
    for (let n = 1; n <= last; n++) {
      let runs = 0, won = false, log = [];
      while (!won && runs < maxRuns) {
        runs++;
        U.startMine(n);
        let t = 0;
        while (U.mode === "play" && t < 600) {
          const S = U.S;
          if (!S.won && !S.over && S.swings > 0) {
            if (S.bombs > 0 && S.swings < 20) { const c = U.botChoice(); if (c) { S.armed = true; U.tapCell(c.x, c.y); } }
            const c = U.botChoice(); if (c) U.tapCell(c.x, c.y); else break;
          }
          for (let i = 0; i < 6; i++) U.step(1 / 60); t += 0.1;
        }
        const S = U.S;
        won = S.won;
        log.push((won ? "W" : "L") + Math.round(100 * S.deepest / S.D) + "%+" + S.runGems + (won ? "s" + S.swings : ""));
        shop();
      }
      out.push({ n, D: U.S.D, runs, won, log: log.join(" "), lv: Object.values(U.save.lv).join("/"), bank: U.save.gems });
      if (!won && !cont) break;
    }
    return out;
  }, { last, maxRuns, cont });
  for (const r of res) console.log(JSON.stringify(r));
  console.log("errors:", errs.slice(0, 5).join(" | ") || "none");
  await b.close();
})();
