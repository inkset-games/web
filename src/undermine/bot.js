// Bots for sim.js. "idle" never touches anything, "naive" only steers when stuck,
// "good" steps out from under loose blocks, detours for oil cans and avoids rock.
window.botStep = (U, mem, skill = "good") => {
  const S = U.S, P = S.P;
  U.held.L = U.held.R = 0;
  if (P.dead || S.won || P.moving || skill === "idle") return;
  const g = (x, y) => U.get(x, y);
  const cost = (x, y) => { const q = g(x, y); return q === 0 ? 0 : q === 4 || q === 9 ? 99 : q === 2 ? 4 : 1; };
  // is something loose above column x (shaking or falling) with only air between it and row y?
  const threat = (x, y, near = 99) => {
    let top = null;
    for (const b of S.bodies) for (const q of b.cells) if (q.x === x && q.y + b.d < y + 0.5) top = Math.max(top ?? -1, Math.floor(q.y + b.d));
    for (const w of S.wobbles) for (const [wx, wy] of w.cells) if (wx === x && wy < y) top = Math.max(top ?? -1, wy);
    if (top == null || y - top > near) return false;
    for (let k = top + 1; k < y; k++) if (g(x, k) !== 0) return false;
    return true;
  };
  const go = (dx) => { U.held[dx < 0 ? "L" : "R"] = 1; };
  const blocked = cost(P.x, P.y + 1) >= 99;
  if (skill === "naive") {
    if (!blocked) return;
    for (const dx of [-1, 1, -2, 2, -3, 3]) if (cost(P.x + Math.sign(dx), P.y) < 99 && P.x + dx >= 0 && P.x + dx < U.COLS && cost(P.x + dx, P.y + 1) < 99) return go(dx);
    return;
  }
  // 1. get out from under anything coming down when it is close and the way down is slow
  if (threat(P.x, P.y, cost(P.x, P.y + 1) > 1 ? 4 : 2)) {
    let best = 0, bc = 1e9;
    for (const dx of [-1, 1]) {
      const x = P.x + dx;
      if (x < 0 || x >= U.COLS || cost(x, P.y) >= 99 || threat(x, P.y)) continue;
      const c = cost(x, P.y) + cost(x, P.y + 1) + (dx === mem.lastDx ? -0.5 : 0);
      if (c < bc) { bc = c; best = dx; }
    }
    if (best) { mem.lastDx = best; return go(best); }
  }
  // 2. detour for a nearby oil can when the lamp needs it
  if (S.oil < 95) {
    let can = null, cd = 1e9;
    for (let y = P.y; y <= P.y + 12 && y < S.D; y++) for (let x = 0; x < U.COLS; x++) if (g(x, y) === 8) {
      const d = (y - P.y) + Math.abs(x - P.x) * 1.4;
      let open = true; for (let k = P.y + 1; k < y; k++) if (cost(x, k) >= 99) open = false;
      if (open && Math.abs(x - P.x) <= y - P.y + 2 && d < cd) { cd = d; can = { x, y }; }
    }
    if (can && can.x !== P.x) {
      const dx = Math.sign(can.x - P.x);
      if (cost(P.x + dx, P.y) < 99 && !threat(P.x + dx, P.y, 6)) return go(dx);
    }
    if (can && can.x === P.x) { if (!blocked) return; }
  }
  // 3. go round rock, bedrock and lava toward the cheapest nearby column, and stick with the choice
  if (mem.tgt != null && mem.ty === P.y && P.x !== mem.tgt && cost(P.x + Math.sign(mem.tgt - P.x), P.y) < 99 && !threat(P.x + Math.sign(mem.tgt - P.x), P.y, 5)) return go(mem.tgt - P.x);
  mem.tgt = null;
  const cb = cost(P.x, P.y + 1);
  if (cb < 4) return;
  let best = null, bc = cb;
  for (let dx = -8; dx <= 8; dx++) {
    const x = P.x + dx; if (!dx || x < 0 || x >= U.COLS) continue;
    let c = 0; for (let k = Math.sign(dx); Math.abs(k) <= Math.abs(dx); k += Math.sign(dx)) c += cost(P.x + k, P.y);
    if (c >= 99) continue;
    c += cost(x, P.y + 1) * 0.8;
    for (let k = Math.sign(dx); Math.abs(k) <= Math.abs(dx); k += Math.sign(dx)) if (threat(P.x + k, P.y, 5)) c += 6;
    if (c < bc - 1) { bc = c; best = x; }
  }
  if (best != null) { mem.tgt = best; mem.ty = P.y; go(best - P.x); }
};
