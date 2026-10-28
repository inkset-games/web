// A simple bot for sim.js: dig down, steer around rock, bedrock and lava toward the cheapest column.
window.botStep = (U, mem, skill = "good") => {
  const S = U.S, P = S.P;
  U.held.L = U.held.R = 0;
  if (P.dead || S.won || P.moving) return;
  const cost = (x, y) => { const q = U.get(x, y); return q === 0 ? 0 : q === 4 || q === 9 ? 99 : q === 2 ? 5 : q === 5 ? 4 : 1; };
  if (mem.tgt != null && P.x !== mem.tgt && mem.ty === P.y) { U.held[P.x < mem.tgt ? "R" : "L"] = 1; return; }
  mem.tgt = null;
  const cb = cost(P.x, P.y + 1);
  if (cb < (skill === "good" ? 4 : 50)) return;
  let best = null, bc = cb;
  for (let dx = -3; dx <= 3; dx++) {
    const x = P.x + dx; if (!dx || x < 0 || x >= U.COLS) continue;
    let c = 0; for (let k = Math.sign(dx); Math.abs(k) <= Math.abs(dx); k += Math.sign(dx)) c += cost(P.x + k, P.y);
    c += cost(x, P.y + 1) * 0.8;
    if (c < bc - 1) { bc = c; best = x; }
  }
  if (best != null) { mem.tgt = best; mem.ty = P.y; U.held[best < P.x ? "L" : "R"] = 1; }
};
