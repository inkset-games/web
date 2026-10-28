// Bots for sim.js. "idle" never touches anything, "naive" only steers when stuck,
// "good" steps out from under loose blocks, detours for oil cans and avoids rock.
window.botStep = (U, mem, skill = "good") => {
  const S = U.S, P = S.P;
  U.held.L = U.held.R = 0;
  if (P.dead || S.won || P.moving || skill === "idle") return;
  const g = (x, y) => U.get(x, y);
  const cost = (x, y) => { const q = g(x, y); return q === 0 ? 0 : q === 4 || q === 9 ? 99 : q === 2 ? 5 : q === 1 ? [0.6, 1, 2.5, 4][U.tough(x, y)] : 1; };
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
  // 2. plan: cheapest route over the next rows by dig time, counting oil cans as a saving
  const H = Math.min(S.D, P.y + 14), W = U.COLS;
  const step = (x, y) => { const q = g(x, y); return q === 0 ? 0.12 : q === 4 || q === 9 ? Infinity : q === 2 ? 1.15 : q === 1 ? [0.27, 0.41, 0.71, 1.06][U.tough(x, y)] : 0.3; };
  const key = (x, y) => (y - P.y) * W + x, dist = new Map([[key(P.x, P.y), 0]]), prev = new Map(), todo = [[0, P.x, P.y]];
  while (todo.length) {
    todo.sort((a, b) => a[0] - b[0]);
    const [d, x, y] = todo.shift();
    if (d > dist.get(key(x, y)) || y >= H) continue;
    for (const [ax, ay] of [[0, 1], [-1, 0], [1, 0]]) {
      const nx = x + ax, ny = y + ay; if (nx < 0 || nx >= W) continue;
      let c = step(nx, ny); if (!isFinite(c)) continue;
      if (ax && threat(nx, y, 6)) c += 2;
      const nd = d + c, k = key(nx, ny);
      if (nd < (dist.get(k) ?? Infinity)) { dist.set(k, nd); prev.set(k, key(x, y)); todo.push([nd, nx, ny]); }
    }
  }
  const want = S.oil < 95 ? 4 + (100 - S.oil) * 0.1 : 0;
  let goal = null, gs = Infinity;
  for (const [k, d] of dist) {
    const y = P.y + Math.floor(k / W), x = k % W;
    const sc = d + (H - y) * 0.45 - (g(x, y) === 8 ? want : 0);
    if ((y === H || g(x, y) === 8) && sc < gs) { gs = sc; goal = k; }
  }
  if (goal == null) return;
  let k = goal, first = null;
  while (prev.has(k) && prev.get(k) !== key(P.x, P.y)) k = prev.get(k);
  first = k;
  const fx = first % W;
  if (fx !== P.x) go(fx - P.x);
};
