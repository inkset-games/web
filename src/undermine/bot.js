// shared bot: window.botStep(U, mem, skill) sets held keys for one tick
window.botStep = (U, mem, skill = "good") => {
  const S = U.S, P = S.P;
  for (const k of ["L", "R", "D"]) U.held[k] = 0;
  if (P.dead) return;
  const cost = (x, y) => { const q = U.get(x, y); return q === 0 ? 0 : q === 4 ? 99 : q === 9 ? 99 : q === 8 ? 50 : q === 3 ? 6 : q === 2 ? 3 : q === 5 ? 4 : 1; };
  let dir = "D";
  if (mem.tgt != null && P.x !== mem.tgt && mem.ty === P.y) dir = P.x < mem.tgt ? "R" : "L";
  else {
    mem.tgt = null;
    const cb = cost(P.x, P.y + 1);
    if (cb >= (skill === "good" ? 3 : 50)) {
      let best = null, bc = skill === "good" ? cb : 98;
      for (let dx = -3; dx <= 3; dx++) {
        const x = P.x + dx; if (!dx || x < 0 || x >= U.COLS) continue;
        let c = 0; for (let k = Math.sign(dx); Math.abs(k) <= Math.abs(dx); k += Math.sign(dx)) c += cost(P.x + k, P.y);
        c += cost(x, P.y + 1) * 0.8;
        if (c < bc - 1) { bc = c; best = x; }
      }
      if (best != null) { mem.tgt = best; mem.ty = P.y; dir = best < P.x ? "L" : "R"; }
      else if (cb >= 99 && S.bombs > 0) U.useBomb();
    }
  }
  if (skill === "good" && S.worm.active && U.lead() < 3 && S.bombs > 0) U.useBomb();
  U.held[dir] = 1;
};
