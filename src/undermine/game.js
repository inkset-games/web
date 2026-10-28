(() => {
"use strict";

// Undermine: tap a block to hit it. Every hit is a swing, and when the swings run out the run is over.
// Gems you dig up stay yours, so a failed run still buys a better pick for the next try.

// ================= constants =================
const COLS = 9;
const E = 0, DIRT = 1, STONE = 2, HARD = 3, BED = 4, GAS = 5, CRYSTAL = 6, TNT = 7, DYN = 8, APPLE = 9, LUNCH = 10, CHAMBER = 11;
const BASE_HP = { [DIRT]: 2, [STONE]: 6, [HARD]: 14, [GAS]: 1, [CRYSTAL]: 2, [TNT]: 1, [DYN]: 1, [APPLE]: 2, [LUNCH]: 2 };
const FOOD = { [APPLE]: 5, [LUNCH]: 12 };                 // swings each one gives back
const GEM_KINDS = ["amber", "emerald", "sapphire", "ruby", "diamond"];
const GEM_VALUE = [1, 2, 4, 8, 15];
const GEMC = { amber: "#ffcf5a", emerald: "#5fe08a", sapphire: "#5aa8ff", ruby: "#ff5a6e", diamond: "#e8fbff" };
const BIOMES = [
  { id: "top", dust: "#9c6b45", chip: "#a39b8f" },
  { id: "clay", dust: "#c8693e", chip: "#b07c69" },
  { id: "stone", dust: "#86817a", chip: "#737b88" },
  { id: "cryst", dust: "#5d4f8e", chip: "#56a8bb" },
  { id: "magma", dust: "#66332b", chip: "#615654" },
  { id: "abyss", dust: "#2a3a52", chip: "#46527a" },
];
const ADJ = ["Crumbly", "Sticky", "Gloomy", "Glittering", "Rumbling", "Twisty", "Hollow", "Dusty", "Lucky", "Sneaky", "Bumpy", "Sleepy", "Deep", "Wobbly", "Shiny", "Muddy"];
const NOUN = ["Burrow", "Pit", "Shaft", "Hollow", "Warren", "Seam", "Den", "Tunnel", "Vein", "Grotto", "Cellar", "Dig"];

// the shop: what each level costs and does
const UPGRADES = [
  { id: "power", name: "Power", icon: "i_power", max: 99, base: 30, grow: 1.32 },
  { id: "swings", name: "Swings", icon: "i_swings", max: 99, base: 25, grow: 1.32 },
  { id: "luck", name: "Luck", icon: "i_clover", max: 8, base: 40, grow: 1.6 },
  { id: "bombs", name: "Bombs", icon: "i_bomb", max: 5, base: 45, grow: 1.9 },
];
// power and swings never max out (prices flatten to +12% a level after 12), so the endless mines always have an answer
for (const up of UPGRADES) up.cost = Array.from({ length: up.max }, (_, i) => Math.round(up.base * Math.pow(up.grow, Math.min(i, 12)) * Math.pow(1.12, Math.max(0, i - 12)) / 5) * 5);
const pickDamage = (lv) => 2 + lv;
const maxSwings = (lv) => 50 + lv * 10;
const luckMul = (lv) => 1 + lv * 0.15;

const COARSE = matchMedia("(pointer: coarse)").matches;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (COARSE) document.body.classList.add("coarse");

// ================= helpers =================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (id) => document.getElementById(id);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hash2(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const store = {
  get(k, d) { try { const v = localStorage.getItem("undermine3:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("undermine3:" + k, JSON.stringify(v)); } catch {} },
};
// everything that carries over between runs
const save = {
  gems: store.get("gems", 0),
  lv: Object.assign({ power: 0, swings: 0, luck: 0, bombs: 0 }, store.get("lv", {})),
  stars: store.get("stars", {}),
  flush() { store.set("gems", this.gems); store.set("lv", this.lv); store.set("stars", this.stars); },
};

// ================= sprites =================
const SPR = {};
const rasterCache = new Map();
function loadSprites() {
  const jobs = [];
  for (const [name, svg] of Object.entries(ASSETS.sprites)) {
    const m = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
    const w = m ? +m[3] : 32, h = m ? +m[4] : 32;
    const img = new Image();
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    SPR[name] = { img, w, h, url };
    jobs.push(new Promise((res) => { img.onload = res; img.onerror = res; img.src = url; }));
  }
  return Promise.all(jobs);
}
function raster(name, scale) {
  const s = SPR[name]; if (!s) return null;
  const pw = Math.max(1, Math.round(s.w * scale)), ph = Math.max(1, Math.round(s.h * scale));
  const key = name + "@" + pw;
  let c = rasterCache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = pw; c.height = ph;
    c.getContext("2d").drawImage(s.img, 0, 0, pw, ph);
    rasterCache.set(key, c);
  }
  return c;
}
// draw a sprite centred on (cx, cy) in CSS px; `u` = CSS px per art unit
function spr(name, cx, cy, u, opt) {
  const s = SPR[name]; if (!s) return;
  const c = raster(name, u * DPR);
  const w = s.w * u, h = s.h * u;
  if (!opt) { ctx.drawImage(c, cx - w / 2, cy - h / 2, w, h); return; }
  ctx.save(); ctx.translate(cx, cy);
  if (opt.rot) ctx.rotate(opt.rot);
  ctx.scale((opt.flip ? -1 : 1) * (opt.sx || 1), opt.sy || 1);
  if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
  ctx.drawImage(c, -w / 2, -h / 2, w, h);
  ctx.restore();
}
function fillIcons() { for (const el of document.querySelectorAll("img[data-s]")) { const s = SPR[el.dataset.s]; if (s) el.src = s.url; } }
const iconURL = (n) => SPR[n] ? SPR[n].url : "";

// ================= audio =================
let actx = null, master = null, musicGain = null, muted = store.get("muted", false);
const BUF = {};
let musicSrc = null;
function decode(buf) { return new Promise((res, rej) => { const p = actx.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); }); }
async function initAudio() {
  if (actx) { if (actx.state === "suspended") actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(actx.destination);
  musicGain = actx.createGain(); musicGain.gain.value = 0.4; musicGain.connect(master);
  await Promise.all(Object.entries(ASSETS.sounds).map(async ([k, uri]) => {
    try { const bin = atob(uri.slice(uri.indexOf(",") + 1)); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); BUF[k] = await decode(u8.buffer); } catch (e) { /* skip */ }
  }));
  if (!musicSrc && BUF.theme) { musicSrc = actx.createBufferSource(); musicSrc.buffer = BUF.theme; musicSrc.loop = true; musicSrc.connect(musicGain); musicSrc.start(); }
}
const lastPlay = {};
function sfx(name, vol = 1, rate = 1) {
  if (!actx || muted || !BUF[name] || mode === "title") return;
  const now = actx.currentTime;
  if (name !== "gem" && lastPlay[name] && now - lastPlay[name] < 0.03) return;
  lastPlay[name] = now;
  const src = actx.createBufferSource(); src.buffer = BUF[name]; src.playbackRate.value = rate;
  const g = actx.createGain(); g.gain.value = vol; src.connect(g); g.connect(master); src.start();
}
function uiSfx(name, vol = 0.7, rate = 1) { if (!actx || muted || !BUF[name]) return; const src = actx.createBufferSource(); src.buffer = BUF[name]; src.playbackRate.value = rate; const g = actx.createGain(); g.gain.value = vol; src.connect(g); g.connect(master); src.start(); }
function setMuted(m) {
  muted = m; store.set("muted", m);
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, actx.currentTime, 0.05);
  const t = "Sound: " + (m ? "off" : "on");
  $("btnSound").textContent = t; $("btnPauseSound").textContent = t;
}

// ================= canvas =================
const cv = $("cv"), ctx = cv.getContext("2d");
let W = 0, H = 0, DPR = 1, TS = 40, OX = 0, VIEW_ROWS = 14, TOP = 0;
const SHADOW = {};
function makeShadows() {
  const mk = (w, h, x0, y0, x1, y1, a) => {
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR));
    const g = c.getContext("2d"), gr = g.createLinearGradient(x0 * DPR, y0 * DPR, x1 * DPR, y1 * DPR);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); return c;
  };
  SHADOW.top = mk(TS, TS * 0.4, 0, 0, 0, TS * 0.4, 0.55);
  SHADOW.left = mk(TS * 0.3, TS, 0, 0, TS * 0.3, 0, 0.4);
  SHADOW.right = mk(TS * 0.3, TS, TS * 0.3, 0, 0, 0, 0.4);
}
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  TS = Math.floor(Math.min(W / (COLS + (W > 600 ? 0.6 : 0.1)), H / 12));
  TS = Math.max(24, TS);
  OX = Math.round((W - COLS * TS) / 2);
  VIEW_ROWS = H / TS;
  const hud = $("hud"); TOP = hud && !hud.hidden ? hud.getBoundingClientRect().bottom : 0;
  rasterCache.clear();
  makeShadows();
}
window.addEventListener("resize", resize);

// ================= input: tap a block, drag to look around =================
let downAt = null;
cv.addEventListener("pointerdown", (e) => {
  if (mode !== "play") return;
  e.preventDefault(); initAudio();
  downAt = { id: e.pointerId, x: e.clientX, y: e.clientY, cam: S.cam, drag: false, t: performance.now() };
  try { cv.setPointerCapture(e.pointerId); } catch {}
});
cv.addEventListener("pointermove", (e) => {
  if (mode === "play" && !COARSE) S.hover = cellAt(e.clientX, e.clientY);
  if (!downAt || downAt.id !== e.pointerId) return;
  const dy = e.clientY - downAt.y;
  if (!downAt.drag && Math.abs(dy) > 10) downAt.drag = true;
  if (downAt.drag) { S.free = true; S.cam = clampCam(downAt.cam - dy / TS); S.camT = S.cam; }
});
cv.addEventListener("pointerup", (e) => {
  if (!downAt || downAt.id !== e.pointerId) return;
  const d = downAt; downAt = null;
  if (d.drag || mode !== "play") return;
  const c = cellAt(e.clientX, e.clientY);
  if (c) tapCell(c.x, c.y);
});
cv.addEventListener("pointercancel", () => { downAt = null; });
cv.addEventListener("pointerleave", () => { if (S) S.hover = null; });
cv.addEventListener("wheel", (e) => { if (mode !== "play") return; e.preventDefault(); S.free = true; S.camT = clampCam(S.camT + e.deltaY / TS * 0.6); }, { passive: false });
cv.addEventListener("contextmenu", (e) => e.preventDefault());
function cellAt(px, py) {
  const x = Math.floor((px - OX) / TS), y = Math.floor(py / TS + S.cam);
  if (x < 0 || x >= COLS || y < 0 || y > S.D) return null;
  return { x, y };
}
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.code === "Space" || e.code === "Enter") {
    if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
    e.preventDefault();
    if (mode === "title" && !$("btnPlay").hidden && $("shop").hidden) startMine(nextMine());
    else if (mode === "pause") resume();
    return;
  }
  if (e.code === "KeyB" && mode === "play") toggleBomb();
  if (e.code === "KeyP" || e.code === "Escape") { if (!$("shop").hidden) closeShop(); else if (mode === "play") pause(); else if (mode === "pause") resume(); return; }
  if (e.code === "KeyM") setMuted(!muted);
});
window.addEventListener("blur", () => { if (mode === "play") pause(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "play") pause(); });

// ================= mines: numbered, procedural, endless =================
function mineSpec(n) {
  const t = clamp((n - 1) / 20, 0, 1);              // ramps over ~20 mines, then holds; the shop keeps pace after that
  const r = mulberry32(n * 7919 + 13);
  return {
    n, seed: (n * 2654435761) >>> 0, t,
    name: ADJ[(r() * ADJ.length) | 0] + " " + NOUN[(r() * NOUN.length) | 0],
    depth: Math.round(Math.min(150, 30 + n * 6)),
    biome: (n - 1) % BIOMES.length,
    hpMul: 1 + 0.12 * (n - 1),                       // deeper mines have tougher rock: the shop is how you keep up
    stone: 0.22 + 0.16 * t,                          // share of stone and of hard rock, more of both further down
    hard: n < 2 ? 0.04 : 0.07 + 0.13 * t,
    apple: 0.024 - 0.008 * t, lunch: 0.005,
    tnt: 0.012, gas: n < 2 ? 0 : 0.05 + 0.04 * t, crystal: n < 3 ? 0 : 0.008, dyn: n < 4 ? 0 : 0.006,
    ledge: n < 3 ? 0 : 0.03 + 0.04 * t,
    gem: 0.075,
  };
}

// ================= run state =================
let S = null, rnd = Math.random, mode = "title";

function newMine(n, demo) {
  const spec = mineSpec(n);
  rnd = mulberry32(spec.seed);
  const D = spec.depth;
  S = {
    spec, mine: n, D, demo: !!demo,
    t: new Uint8Array(COLS * (D + 3)), hp: new Float32Array(COLS * (D + 3)), max: new Float32Array(COLS * (D + 3)),
    g: new Uint8Array(COLS * (D + 3)), v: new Uint8Array(COLS * (D + 3)),
    P: { x: 4, y: -1, fx: 4, fy: -1, ox: 4, oy: -1, mv: 1, face: 1, swing: 0, sdx: 0, sdy: 1, blink: 2, cheer: 0 },
    dmg: pickDamage(save.lv.power), swings: maxSwings(save.lv.swings), maxSw: maxSwings(save.lv.swings),
    luck: luckMul(save.lv.luck), bombs: save.lv.bombs, armed: false,
    runGems: 0, gemCount: 0, gemTotal: 0, deepest: 0, eaten: 0,
    fuses: [], bolts: [], parts: [], floats: [], icons: [], flashes: [], hits: new Map(),
    shake: 0, flash: 0, flashC: "#fff", time: 0, cam: -3, camT: -3, free: false, hover: null,
    won: false, over: false, endT: 0,
  };
  genMine();
}
const K = (x, y) => y * COLS + x;
function get(x, y) {
  if (x < 0 || x >= COLS) return BED;
  if (y < 0) return E;
  if (y > S.D + 2) return BED;
  return S.t[K(x, y)];
}
function setT(x, y, t) { const k = K(x, y); S.t[k] = t; S.hp[k] = S.max[k] = t === E || t === BED || t === CHAMBER ? 0 : Math.max(1, Math.round(BASE_HP[t] * (t <= HARD ? S.spec.hpMul : 1))); }

function genMine() {
  const sp = S.spec, D = S.D, f = (y) => y / D;
  // rock type comes from noise plus a pull toward the bottom, split by share so every mine gets its mix
  const score = [];
  for (let y = 0; y < D; y++) for (let x = 0; x < COLS; x++) {
    const n = vnoise(x * 0.42, y * 0.2, sp.seed) * 0.7 + vnoise(x * 1.1 + 40, y * 0.55, sp.seed + 5) * 0.3;
    score.push({ k: K(x, y), y, s: n + f(y) * 0.15 });
  }
  const sorted = score.map((q) => q.s).sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  const hardT = at(1 - sp.hard), stoneT = at(1 - sp.hard - sp.stone);
  for (const q of score) {
    const x = q.k % COLS;
    let t = q.y < 2 ? DIRT : q.s >= hardT ? HARD : q.s >= stoneT ? STONE : DIRT;
    S.v[q.k] = (hash2(x, q.y, sp.seed) * 2) | 0;
    if (q.y >= 2) {
      const gasN = vnoise(x * 0.7 + 300, q.y * 0.7, sp.seed + 9);
      const r = rnd();
      if (sp.gas && gasN > 1 - sp.gas * 2.2 && q.y > 4) t = GAS;
      else if (r < sp.tnt) t = TNT;
      else if (r < sp.tnt + sp.crystal) t = CRYSTAL;
      else if (r < sp.tnt + sp.crystal + sp.dyn) t = DYN;
      else if (t === DIRT && r < sp.tnt + sp.crystal + sp.dyn + sp.lunch) t = LUNCH;
      else if (t === DIRT && r < sp.tnt + sp.crystal + sp.dyn + sp.lunch + sp.apple) t = APPLE;
    }
    setT(x, q.y, t);
    // gems: richer in hard rock and further down
    if ((t === DIRT || t === STONE || t === HARD) && q.y > 0 && rnd() < sp.gem * (t === HARD ? 1.8 : t === STONE ? 1.3 : 1)) {
      const tier = clamp(Math.floor(rnd() * 2 + f(q.y) * 1.5 + sp.t * 0.8 + (t === HARD ? 1.5 : t === STONE ? 0.6 : 0)), 0, 4);
      S.g[q.k] = tier + 1; S.gemTotal++;
    }
  }
  // short bedrock ledges to go round
  for (let y = 6; y < D - 3; y++) if (sp.ledge && rnd() < sp.ledge) {
    const len = 2 + ((rnd() * 2) | 0), x0 = (rnd() * (COLS - len + 1)) | 0;
    for (let x = x0; x < x0 + len; x++) { setT(x, y, BED); S.g[K(x, y)] = 0; }
  }
  for (let x = 0; x < COLS; x++) { setT(x, D, CHAMBER); setT(x, D + 1, BED); setT(x, D + 2, BED); }
  S.gemGoal = Math.max(3, Math.round(S.gemTotal * 0.3));
}

// a block can be hit when it touches open space (or the sky)
function exposed(x, y) {
  const t = get(x, y);
  if (t === E || t === BED || t === CHAMBER) return false;
  if (y === 0) return true;
  return get(x - 1, y) === E || get(x + 1, y) === E || get(x, y - 1) === E || get(x, y + 1) === E;
}
const hitsLeft = (x, y) => Math.ceil(S.hp[K(x, y)] / S.dmg);

// ================= tapping =================
function tapCell(x, y) {
  if (S.won || S.over) return;
  if (!exposed(x, y)) { if (get(x, y) !== E) nope(x, y); return; }
  S.free = false;
  if (S.armed) { placeBomb(x, y); return; }
  if (S.swings <= 0) return;
  S.swings--;
  moveNextTo(x, y);
  const k = K(x, y), t = S.t[k];
  S.hp[k] -= S.dmg;
  S.hits.set(k, 0.12);
  const B = BIOMES[S.spec.biome];
  const cx = x + 0.5, cy = y + 0.5;
  if (t === STONE || t === HARD) { sfx(t === HARD ? "clank" : "chip", 0.8, 0.9 + rnd() * 0.25); burst(cx, cy, 4, B.chip, 2.4); }
  else { sfx("dig" + (1 + ((rnd() * 3) | 0)), 0.7); burst(cx, cy, 4, B.dust, 2); }
  if (S.hp[k] <= 0) breakCell(x, y, "dig");
  else if (hitsLeft(x, y) >= 1) S.icons.push({ x: cx, y: y + 0.15, txt: String(hitsLeft(x, y)), c: "#fff4dc", t: 0, max: 0.55, sc: 0.75 });
  if (S.swings <= 0) checkOut();
}
function nope(x, y) {
  S.hits.set(K(x, y), -0.18);
  sfx("click", 0.5, 0.7);
}
// the mole hops into the open cell next to the block it is hitting, whichever is nearest
function moveNextTo(x, y) {
  const P = S.P;
  let best = null, bd = 1e9;
  for (const [ax, ay] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
    const nx = x + ax, ny = y + ay;
    if (nx < 0 || nx >= COLS || get(nx, ny) !== E) continue;
    const d = Math.abs(nx - P.x) + Math.abs(ny - P.y) + (ay === 1 ? 0.5 : 0);
    if (d < bd) { bd = d; best = [nx, ny]; }
  }
  if (!best) return;
  if (best[0] !== P.x || best[1] !== P.y) {
    P.ox = P.fx; P.oy = P.fy; P.x = best[0]; P.y = best[1]; P.mv = 0;
    if (bd > 2) burst(P.ox + 0.5, P.oy + 0.9, 4, BIOMES[S.spec.biome].dust, 1.5);
  }
  P.sdx = x - P.x; P.sdy = y - P.y; P.swing = 1;
  if (P.sdx) P.face = P.sdx;
}

// ================= breaking things =================
function breakCell(x, y, cause) {
  const k = K(x, y), t = S.t[k];
  if (t === E || t === BED || t === CHAMBER) return;
  const B = BIOMES[S.spec.biome], cx = x + 0.5, cy = y + 0.5;
  if (S.g[k]) collectGem(x, y, S.g[k] - 1);
  S.g[k] = 0;
  setT(x, y, E);
  if (y + 1 > S.deepest) S.deepest = y + 1;
  if (t === STONE || t === HARD) { sfx("break", 0.8, t === HARD ? 0.8 : 1); burst(cx, cy, 12, B.chip, 3.4); }
  else if (t === GAS) { /* the explosion is the show */ }
  else burst(cx, cy, 9, B.dust, 2.6);
  if (FOOD[t]) eat(x, y, FOOD[t]);
  if (t === TNT) light(x, y, "tnt", cause === "dig" ? 0.55 : 0.12);
  if (t === DYN) light(x, y, "dyn", cause === "dig" ? 0.55 : 0.12);
  if (t === GAS) light(x, y, "gas", cause === "dig" ? 0.05 : 0.09);
  if (t === CRYSTAL) zap(x, y);
  // broke through into the treasure chamber
  if (y === S.D - 1 && !S.won) win(x);
}
function collectGem(x, y, tier) {
  const v = Math.max(1, Math.round(GEM_VALUE[tier] * S.luck));
  S.runGems += v; S.gemCount++;
  if (!S.demo) { save.gems += v; }
  sfx("gem", 0.6, 1 + tier * 0.08);
  sparkle(x + 0.5, y + 0.5, GEM_KINDS[tier]);
  S.floats.push({ x: x + 0.5, y: y + 0.5, gem: GEM_KINDS[tier], t: 0, max: 0.6 });
  if (v > 1) S.icons.push({ x: x + 0.5, y: y + 0.1, txt: "+" + v, c: GEMC[GEM_KINDS[tier]], t: 0, max: 0.9, sc: 0.8 });
}
function eat(x, y, n) {
  S.swings = Math.min(S.maxSw + 40, S.swings + n); S.eaten += n;
  sfx("heart", 0.8, n > 10 ? 0.85 : 1.05);
  S.icons.push({ x: x + 0.5, y: y + 0.2, txt: "+" + n, c: "#7fe08a", icon: "i_swings", t: 0, max: 1.1, sc: 1.1 });
}
function light(x, y, kind, fuse) {
  S.fuses.push({ x, y, kind, t: fuse, max: fuse });
  if (kind !== "gas") sfx("fuse", 0.7);
}
function placeBomb(x, y) {
  if (S.bombs <= 0) { S.armed = false; return; }
  S.bombs--; S.armed = false; updateBombBtn();
  S.fuses.push({ x, y, kind: "bomb", t: 0.5, max: 0.5, placed: true });
  sfx("fuse", 0.8);
}
function updateFuses(dt) {
  for (let i = S.fuses.length - 1; i >= 0; i--) {
    const f = S.fuses[i];
    f.t -= dt;
    if (f.kind !== "gas" && Math.random() < 0.5) S.parts.push({ x: f.x + 0.5 + (Math.random() - 0.5) * 0.3, y: f.y + 0.1, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, life: 0.3, max: 0.3, c: "#ffd25a", s: 0.06, g: 6, glow: true });
    if (f.t > 0) continue;
    S.fuses.splice(i, 1);
    if (f.kind === "dyn") column(f.x, f.y);
    else blast(f.x, f.y, 1, f.kind === "gas");
  }
}
// a 3x3 blast; gas burns green and sets off the gas next to it
function blast(cx, cy, R, gas) {
  sfx("bomb", gas ? 0.7 : 0.95, gas ? 1.25 : 1); shake(gas ? 0.3 : 0.5);
  S.flashes.push({ x: cx + 0.5, y: cy + 0.5, r: R + 1.6, t: 0.3, max: 0.3, c: gas ? "#9cf07a" : "#ffcf4a" });
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    if (x < 0 || x >= COLS || y < 0 || y >= S.D) continue;
    fire(x + 0.5, y + 0.5, 3, gas);
    if (get(x, y) !== E) breakCell(x, y, "blast");
  }
  for (let i = 0; i < 10; i++) S.parts.push({ x: cx + 0.5, y: cy + 0.5, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 0.8 + Math.random() * 0.5, max: 1.3, c: gas ? "#2f4a2a" : "#3a332c", s: 0.35 + Math.random() * 0.3, g: -1, smoke: true });
}
// dynamite drills a column straight down
function column(x, y) {
  sfx("bomb", 1, 0.85); shake(0.6);
  for (let k = -1; k <= 8; k++) {
    const yy = y + k; if (yy < 0 || yy >= S.D) continue;
    S.flashes.push({ x: x + 0.5, y: yy + 0.5, r: 1.1, t: 0.25 + k * 0.02, max: 0.35, c: "#ffcf4a" });
    fire(x + 0.5, yy + 0.5, 3);
    if (get(x, yy) !== E) breakCell(x, yy, "blast");
  }
}
// a crystal throws lightning at the nearest gems
function zap(x, y) {
  sfx("powerup", 0.8, 1.2); shake(0.25);
  const targets = [];
  for (let yy = Math.max(0, y - 7); yy < Math.min(S.D, y + 8); yy++) for (let xx = 0; xx < COLS; xx++) {
    const k = K(xx, yy);
    if (S.g[k] && S.t[k] !== E) targets.push({ x: xx, y: yy, d: Math.hypot(xx - x, yy - y) });
  }
  targets.sort((a, b) => a.d - b.d);
  for (const tg of targets.slice(0, 6)) {
    S.bolts.push({ x0: x + 0.5, y0: y + 0.5, x1: tg.x + 0.5, y1: tg.y + 0.5, t: 0.35, seed: Math.random() * 1000 });
    breakCell(tg.x, tg.y, "zap");
  }
}

// ================= ending a run =================
function checkOut() {
  if (S.swings > 0 || S.won || S.over) return;
  S.over = true; S.endT = 0;
}
function win(x) {
  S.won = true; S.endT = 0;
  for (let xx = 0; xx < COLS; xx++) S.t[K(xx, S.D)] = E;
  const P = S.P; P.ox = P.fx; P.oy = P.fy; P.x = x; P.y = S.D; P.mv = 0; P.cheer = 1;
  const bonus = Math.round((10 + S.mine * 3) * S.luck);
  S.chestGems = bonus; S.runGems += bonus; if (!S.demo) save.gems += bonus;
  sfx("win", 0.9); sfx("crate", 0.7);
  for (let i = 0; i < 70; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 4 + Math.random() * 8; S.parts.push({ x: 4.5, y: S.D + 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 + Math.random() * 0.8, max: 1.8, c: Object.values(GEMC)[i % 5], s: 0.1 + Math.random() * 0.1, g: 14, glow: i % 3 === 0 }); }
  S.icons.push({ x: 4.5, y: S.D - 0.6, txt: "+" + bonus, c: "#ffd25a", icon: "i_gem", t: 0, max: 1.6, sc: 1.6 });
  shake(0.3);
}

// ================= particles =================
function shake(a) { if (!reduceMotion && mode === "play") S.shake = Math.max(S.shake, a); }
function burst(x, y, n, c, sp) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: (Math.random() - 0.5) * sp * 2, vy: -Math.random() * sp * 1.4 - 0.5, life: 0.35 + Math.random() * 0.45, max: 0.8, c, s: 0.06 + Math.random() * 0.09, g: 22 }); }
function fire(x, y, n, gas) { for (let i = 0; i < n; i++) S.parts.push({ x: x + (Math.random() - 0.5) * 0.6, y: y + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, life: 0.3 + Math.random() * 0.4, max: 0.7, c: gas ? (Math.random() < 0.5 ? "#c8ff9a" : "#5fe08a") : Math.random() < 0.5 ? "#ffcf4a" : "#ff6a1a", s: 0.18 + Math.random() * 0.18, g: -3, glow: true }); }
function sparkle(x, y, id) { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; S.parts.push({ x, y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 0.4, max: 0.4, c: GEMC[id], s: 0.07, g: 0, glow: true, drag: 3 }); } }
function updateParts(dt) {
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.life -= dt; if (p.life <= 0) { S.parts.splice(i, 1); continue; }
    p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    if (p.smoke) { p.vx *= 1 - 2.5 * dt; p.vy *= 1 - 2.5 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  if (S.parts.length > 700) S.parts.splice(0, S.parts.length - 700);
  for (const arr of [S.floats, S.icons]) for (let i = arr.length - 1; i >= 0; i--) { const f = arr[i]; f.t += dt; if (f.t > f.max) arr.splice(i, 1); }
  for (const arr of [S.flashes, S.bolts]) for (let i = arr.length - 1; i >= 0; i--) { const f = arr[i]; f.t -= dt; if (f.t <= 0) arr.splice(i, 1); }
}

// ================= main update =================
function clampCam(c) { return clamp(c, -3, S.D + 3 - (VIEW_ROWS - TOP / TS)); }
function update(dt) {
  S.time += dt;
  const P = S.P;
  P.mv = Math.min(1, P.mv + dt / 0.12);
  P.fx = lerp(P.ox, P.x, easeOut(P.mv)); P.fy = lerp(P.oy, P.y, easeOut(P.mv));
  P.swing = Math.max(0, P.swing - dt * 7);
  P.blink -= dt; if (P.blink < -0.12) P.blink = 2 + Math.random() * 3;
  for (const [k, v] of S.hits) { const nv = v > 0 ? v - dt : v + dt; if (Math.abs(nv) < 0.01 || Math.sign(nv) !== Math.sign(v)) S.hits.delete(k); else S.hits.set(k, nv); }
  updateFuses(dt);
  updateParts(dt);
  S.shake = Math.max(0, S.shake - dt * 1.8);
  S.flash = Math.max(0, S.flash - dt * 1.6);
  if (S.over && !S.fuses.length) { S.endT += dt; if (S.endT > 0.9 && mode === "play") showResult(); }
  if (S.won) { S.endT += dt; if (S.endT > 1.8 && mode === "play") showResult(); }
  // camera: keep the mole a little above the middle, unless the player has dragged to look around
  if (!S.free) S.camT = clampCam(P.fy - (VIEW_ROWS - TOP / TS) * 0.42 - TOP / TS);
  S.cam = lerp(S.cam, S.camT, 1 - Math.exp(-dt * 8));
}
const easeOut = (k) => 1 - (1 - k) * (1 - k);

// ================= rendering =================
function draw() {
  const P = S.P;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = "#0b0807"; ctx.fillRect(0, 0, W, H);
  let sx = 0, sy = 0;
  if (S.shake > 0) { const a = S.shake * S.shake * TS * 0.35; sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; }
  ctx.save(); ctx.translate(sx, sy);
  const cam = S.cam;
  const Y = (y) => (y - cam) * TS;
  const X = (x) => OX + x * TS;
  const u = TS / 32;
  const bi = BIOMES[S.spec.biome].id;
  const y0 = Math.floor(cam) - 1, y1 = Math.min(S.D + 3, Math.ceil(cam + VIEW_ROWS) + 1);
  // sky
  if (y0 < 0) {
    const g = ctx.createLinearGradient(0, Y(-6), 0, Y(0));
    g.addColorStop(0, "#5aa8e8"); g.addColorStop(1, "#ffe0b0");
    ctx.fillStyle = g; ctx.fillRect(0, Y(-12), W, Y(0) - Y(-12) + 1);
    ctx.fillStyle = "#fff4c8"; ctx.beginPath(); ctx.arc(X(COLS - 1.2), Y(-3.4), TS * 0.8, 0, 7); ctx.fill();
    ctx.fillStyle = "#3f8f4f";
    ctx.beginPath(); ctx.moveTo(0, Y(0));
    for (let i = 0; i <= 12; i++) ctx.lineTo((i / 12) * W, Y(-0.8 - Math.sin(i * 1.3) * 0.5 - 0.4));
    ctx.lineTo(W, Y(0)); ctx.closePath(); ctx.fill();
  }
  // side walls
  for (let y = Math.max(0, y0); y <= y1 + 2; y++) {
    for (let x = -Math.ceil(OX / TS) - 1; x < 0; x++) spr(`dirt_${bi}_${(x + y) & 1}`, X(x) + TS / 2, Y(y) + TS / 2, u * 1.002);
    for (let x = COLS; x < COLS + Math.ceil(OX / TS) + 1; x++) spr(`dirt_${bi}_${(x + y) & 1}`, X(x) + TS / 2, Y(y) + TS / 2, u * 1.002);
  }
  if (OX > 0) {
    const top = Y(Math.max(0, y0));
    ctx.fillStyle = "rgba(5,3,2,.6)"; ctx.fillRect(0, top, OX, H + TS * 4); ctx.fillRect(X(COLS), top, W - X(COLS), H + TS * 4);
  }
  // tiles
  for (let y = Math.max(0, y0); y <= y1; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = K(x, y), t = y > S.D + 2 ? BED : S.t[k];
      let cx = X(x) + TS / 2, cy = Y(y) + TS / 2;
      if (t === E || t === CHAMBER) {
        spr(`wall_${bi}`, cx, cy, u * 1.002);
        if (t === CHAMBER) { ctx.fillStyle = "rgba(10,7,5,.55)"; ctx.fillRect(X(x), Y(y), TS, TS); }
        const up = get(x, y - 1);
        if (y > 0 && up !== E) ctx.drawImage(SHADOW.top, X(x), Y(y), TS, TS * 0.4);
        if (get(x - 1, y) !== E) ctx.drawImage(SHADOW.left, X(x), Y(y), TS * 0.3, TS);
        if (get(x + 1, y) !== E) ctx.drawImage(SHADOW.right, X(x) + TS * 0.7, Y(y), TS * 0.3, TS);
        continue;
      }
      const hit = S.hits.get(k);
      let sc = 1;
      if (hit > 0) sc = 1 - hit * 0.5;
      if (hit < 0) cx += Math.sin(S.time * 80) * TS * 0.05;
      drawTile(t, S.v[k], cx, cy, u * sc, bi);
      if (S.g[k]) spr("gem_" + GEM_KINDS[S.g[k] - 1], cx, cy, u * 0.62 * sc);
      if (S.max[k] > 0 && S.hp[k] < S.max[k]) drawCracks(X(x), Y(y), 1 - S.hp[k] / S.max[k], k);
      // what you can't reach yet sits in shadow
      if (!exposed(x, y)) { ctx.fillStyle = "rgba(8,5,4,.38)"; ctx.fillRect(X(x), Y(y), TS, TS); }
      if (hit < 0) { ctx.fillStyle = `rgba(226,71,75,${-hit * 2})`; ctx.fillRect(X(x), Y(y), TS, TS); }
      if (y === 0) { ctx.fillStyle = "#4fae55"; ctx.fillRect(X(x), Y(0) - TS * 0.06, TS, TS * 0.12); }
    }
  }
  // the treasure chamber
  if (S.D <= y1 + 1) {
    const gy = Y(S.D);
    ctx.fillStyle = S.won ? "rgba(255,210,90,.2)" : "rgba(255,210,90,.08)"; ctx.fillRect(X(0), gy, COLS * TS, TS);
    ctx.fillStyle = "#ffd25a"; ctx.fillRect(X(0), gy + TS - 3, COLS * TS, 3);
    spr(S.won ? "chest_open" : "chest", X(4.5), gy + TS * 0.5 + (S.won ? -TS * 0.05 : Math.sin(S.time * 3) * TS * 0.04), u * 1.15);
  }
  // hover and armed-bomb hints
  if (S.hover && exposed(S.hover.x, S.hover.y) && !S.won && !S.over) {
    ctx.strokeStyle = S.armed ? "rgba(255,120,80,.95)" : "rgba(255,244,220,.75)"; ctx.lineWidth = 2.5;
    if (S.armed) { ctx.setLineDash([5, 4]); ctx.strokeRect(X(S.hover.x - 1) + 2, Y(S.hover.y - 1) + 2, TS * 3 - 4, TS * 3 - 4); ctx.setLineDash([]); }
    else ctx.strokeRect(X(S.hover.x) + 2, Y(S.hover.y) + 2, TS - 4, TS - 4);
  }
  // fuses burning
  for (const f of S.fuses) {
    const k = 1 - f.t / f.max;
    if (f.placed) spr("i_bomb", X(f.x) + TS / 2, Y(f.y) + TS / 2, u * 1.1 * (1 + Math.sin(S.time * 30) * 0.06));
    ctx.fillStyle = `rgba(255,${f.kind === "gas" ? 255 : 200},${f.kind === "gas" ? 120 : 80},${0.25 + 0.35 * k * (0.5 + 0.5 * Math.sin(S.time * 40))})`;
    ctx.fillRect(X(f.x), Y(f.y), TS, TS);
  }
  drawMole(X, Y, u);
  // lightning
  for (const b of S.bolts) {
    ctx.globalAlpha = clamp(b.t / 0.35, 0, 1);
    ctx.strokeStyle = "#ffe86a"; ctx.lineWidth = Math.max(2, TS * 0.07); ctx.lineJoin = "round";
    ctx.shadowColor = "#58b6ff"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(X(b.x0), Y(b.y0));
    for (let i = 1; i < 6; i++) { const k = i / 6, j = (hash2(i, Math.floor(S.time * 30), b.seed) - 0.5) * 0.7; ctx.lineTo(X(lerp(b.x0, b.x1, k) + j), Y(lerp(b.y0, b.y1, k) + j)); }
    ctx.lineTo(X(b.x1), Y(b.y1)); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
  for (const f of S.flashes) {
    const k = f.t / f.max;
    const g = ctx.createRadialGradient(X(f.x), Y(f.y), 0, X(f.x), Y(f.y), TS * f.r);
    g.addColorStop(0, f.c); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = k; ctx.fillStyle = g; ctx.fillRect(X(f.x) - TS * f.r, Y(f.y) - TS * f.r, TS * f.r * 2, TS * f.r * 2);
  }
  ctx.globalAlpha = 1;
  for (const p of S.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.smoke ? a * 0.5 : a;
    ctx.fillStyle = p.c;
    const s = p.s * TS * (p.smoke ? (2 - a) : 1);
    if (p.smoke || p.glow) { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), s, 0, 7); ctx.fill(); }
    else ctx.fillRect(X(p.x) - s / 2, Y(p.y) - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  for (const f of S.floats) { const k = f.t / f.max; ctx.globalAlpha = 1 - k; spr("gem_" + f.gem, X(f.x), Y(f.y - k * 1.2), u * (0.6 + k * 0.3)); }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of S.icons) {
    const k = f.t / f.max;
    const pop = k < 0.15 ? 0.5 + (k / 0.15) * 0.6 : k < 0.25 ? 1.1 - (k - 0.15) : 1;
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const yy = Y(f.y) - k * TS * 0.8;
    if (f.icon) spr(f.icon, X(f.x) + (f.txt ? TS * 0.28 : 0), yy, u * f.sc * pop * 0.8);
    if (f.txt) {
      const fs = Math.round(TS * 0.55 * f.sc * pop);
      ctx.font = `${fs}px "Lilita One", "Arial Black", sans-serif`;
      ctx.lineWidth = Math.max(3, fs * 0.2); ctx.strokeStyle = "rgba(0,0,0,.9)"; ctx.lineJoin = "round";
      const tx = X(f.x) - (f.icon ? TS * 0.22 : 0);
      ctx.strokeText(f.txt, tx, yy); ctx.fillStyle = f.c; ctx.fillText(f.txt, tx, yy);
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  // depth gets gloomier, but never hides what you can tap
  const dark = clamp(P.fy / 60, 0, 1) * 0.35;
  if (dark > 0.01) {
    const g = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(4,2,6,${dark})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (S.swings <= 10 && !S.won && mode === "play") {
    const a = (1 - S.swings / 10) * (0.25 + 0.15 * Math.sin(S.time * 8));
    const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(120,0,10,0)"); g.addColorStop(1, `rgba(150,10,20,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
function drawTile(t, v, cx, cy, u, bi) {
  if (t === STONE) { spr(`dirt_${bi}_${v}`, cx, cy, u * 1.002); spr(`rock_${bi}`, cx, cy, u * 1.002); return; }
  if (t === HARD) { spr(`hard_${bi}`, cx, cy, u * 1.002); return; }
  if (t === BED) { spr("bedrock", cx, cy, u * 1.002); return; }
  if (t === GAS) { spr("gas", cx, cy, u * 1.002); return; }
  if (t === CRYSTAL) { spr("crystal", cx, cy, u * 1.002); return; }
  if (t === TNT) { spr("tnt", cx, cy, u * 1.002); return; }
  if (t === DYN) { spr("dynamite", cx, cy, u * 1.002); return; }
  spr(`dirt_${bi}_${v}`, cx, cy, u * 1.002);
  if (t === APPLE) spr("apple", cx, cy, u * 0.95);
  else if (t === LUNCH) spr("lunch", cx, cy, u * 0.95);
}
function drawCracks(x, y, hp, seed) {
  ctx.strokeStyle = "rgba(10,6,4,.75)"; ctx.lineWidth = Math.max(1.4, TS * 0.05); ctx.lineCap = "round";
  const n = 1 + Math.floor(hp * 5);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = hash2(seed, i, 1) * Math.PI * 2, len = TS * (0.2 + 0.3 * hp);
    const mx = x + TS / 2 + Math.cos(a + 0.5) * len * 0.5, my = y + TS / 2 + Math.sin(a + 0.5) * len * 0.5;
    ctx.moveTo(x + TS / 2, y + TS / 2); ctx.lineTo(mx, my); ctx.lineTo(x + TS / 2 + Math.cos(a) * len, y + TS / 2 + Math.sin(a) * len);
  }
  ctx.stroke();
}
function drawMole(X, Y, u) {
  const P = S.P;
  const cx = X(P.fx) + TS / 2, cy = Y(P.fy) + TS / 2;
  let oy = 0;
  if (P.mv < 1) oy -= Math.sin(P.mv * Math.PI) * TS * 0.25;
  if (S.won) oy -= Math.abs(Math.sin(S.time * 10)) * TS * 0.25 * Math.min(1, S.endT * 3);
  const name = S.over ? "mole_hurt" : P.blink < 0 ? "mole_blink" : "mole";
  const face = P.face < 0;
  ctx.save(); ctx.translate(cx, cy + oy + TS * 0.04);
  spr(name, 0, 0, u * 0.9, face ? { flip: true } : undefined);
  ctx.restore();
  // the pick swings toward the block being hit
  const sw = P.swing;
  let a;
  if (S.won) a = (face ? 1 : -1) * 1.2;
  else if (P.sdy > 0 && !P.sdx) a = (face ? 1 : -1) * (0.3 + sw * 1.1) + (face ? -0.3 : 0.3);
  else if (P.sdy < 0 && !P.sdx) a = (face ? 1 : -1) * (-1.4 + sw * 0.6);
  else a = (face ? -1 : 1) * (-0.6 + sw * 1.3);
  ctx.save(); ctx.translate(cx + (face ? -1 : 1) * TS * 0.22, cy + TS * 0.08 + oy); ctx.rotate(a); spr("pick", TS * (face ? -0.12 : 0.12), -TS * 0.2, u * 0.78, face ? { flip: true } : undefined); ctx.restore();
}

// ================= HUD =================
const hud = { sw: -1, gems: -1, prog: -1, mine: -1 };
function updateHUD() {
  if (hud.mine !== S.mine) { hud.mine = S.mine; $("hMine").textContent = S.mine; $("hMine").style.fontSize = S.mine > 99 ? "11px" : S.mine > 9 ? "13px" : ""; }
  const d = S.deepest;
  if (hud.prog !== d) { hud.prog = d; $("hDepth").innerHTML = Math.max(0, S.D - d) + "<small>m</small>"; $("hProg").style.width = clamp(d / S.D, 0, 1) * 100 + "%"; }
  if (hud.gems !== S.runGems) { hud.gems = S.runGems; $("hGems").textContent = S.runGems; }
  if (hud.sw !== S.swings) {
    hud.sw = S.swings;
    $("hSwings").textContent = S.swings;
    $("hSw").classList.toggle("low", S.swings <= 10);
    $("hSwFill").style.transform = `scaleX(${clamp(S.swings / S.maxSw, 0.02, 1)})`;
  }
}
function updateBombBtn() {
  const b = $("btnBomb");
  b.hidden = S.bombs <= 0 && !S.armed;
  $("hBombs").textContent = S.bombs;
  b.classList.toggle("armed", S.armed);
  b.setAttribute("aria-pressed", S.armed ? "true" : "false");
}
function toggleBomb() {
  if (mode !== "play" || S.won || S.over) return;
  if (!S.armed && S.bombs <= 0) return;
  S.armed = !S.armed; updateBombBtn(); uiSfx("click", 0.6, S.armed ? 1.2 : 0.9);
}
function banner(k, n, h) {
  if (mode === "title") return;
  const b = $("banner");
  $("bnK").textContent = k || ""; $("bnN").textContent = n || ""; $("bnH").textContent = h || "";
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

// ================= shop =================
function renderShop() {
  $("shopGems").textContent = save.gems;
  $("shopCards").innerHTML = UPGRADES.map((up) => {
    const lv = save.lv[up.id], maxed = lv >= up.max, price = maxed ? 0 : up.cost[lv];
    const can = !maxed && save.gems >= price;
    const now = up.id === "power" ? pickDamage(lv) + " per hit" : up.id === "swings" ? maxSwings(lv) + " swings" : up.id === "luck" ? "×" + luckMul(lv).toFixed(2).replace(/0$/, "") + " gems" : lv + " per run";
    return `<button class="up${can ? " can" : ""}" data-id="${up.id}" ${maxed ? "disabled" : ""} aria-label="${up.name}, level ${lv} of ${up.max}${maxed ? ", maxed" : ", costs " + price + " gems"}">
      <img alt="" src="${iconURL(up.icon)}"><b>${up.name}</b><span class="now">${now}</span>
      <span class="lv">Level ${lv}${up.max < 99 ? `<small> / ${up.max}</small>` : ""}</span>
      <span class="price">${maxed ? "Max" : `<img alt="" src="${iconURL("i_gem")}">${price}`}</span></button>`;
  }).join("");
  for (const b of $("shopCards").querySelectorAll(".up")) b.addEventListener("click", () => buy(b.dataset.id));
}
function buy(id) {
  const up = UPGRADES.find((u) => u.id === id), lv = save.lv[id];
  if (lv >= up.max || save.gems < up.cost[lv]) { uiSfx("click", 0.5, 0.7); return; }
  initAudio();
  save.gems -= up.cost[lv]; save.lv[id]++; save.flush();
  uiSfx("craft", 0.8, 1 + save.lv[id] * 0.04);
  renderShop(); renderGrid(); refreshGemLabels();
  const b = $("shopCards").querySelector(`[data-id="${id}"]`); if (b) { b.classList.add("bought"); b.focus({ preventScroll: true }); }
}
let shopFrom = "title";
function openShop(from) { shopFrom = from; renderShop(); $("shop").hidden = false; $(from).hidden = true; uiSfx("click", 0.5); const f = $("shopCards").querySelector(".up.can") || $("btnShopBack"); f.focus({ preventScroll: true }); }
function closeShop() { $("shop").hidden = true; $(shopFrom).hidden = false; refreshGemLabels(); if (shopFrom === "over") renderOverButtons(); }
function refreshGemLabels() { for (const el of document.querySelectorAll(".bank")) el.textContent = save.gems; const can = UPGRADES.some((u) => save.lv[u.id] < u.max && save.gems >= u.cost[save.lv[u.id]]); for (const el of document.querySelectorAll(".shopbtn")) el.classList.toggle("can", can); }

// ================= progress =================
function unlocked() { let n = 1; while (save.stars[n]) n++; return n; }
function nextMine() { return unlocked(); }
function renderGrid() {
  const s = save.stars, u = unlocked();
  const first = Math.max(1, u - 7);
  let h = "";
  for (let n = first; n < first + 10; n++) {
    const st = s[n] || 0, open = n <= u;
    h += `<button class="mb${n === u ? " next" : ""}" data-n="${n}" ${open ? "" : "disabled"} aria-label="Mine ${n}${st ? ", " + st + " stars" : ""}"><b>${n}</b><span class="st">${[1, 2, 3].map((i) => `<img alt="" src="${iconURL(i <= st ? "i_star" : "i_star_off")}">`).join("")}</span></button>`;
  }
  $("mineGrid").innerHTML = h;
  for (const b of $("mineGrid").querySelectorAll(".mb")) b.addEventListener("click", () => startMine(+b.dataset.n));
  $("btnPlay").textContent = u > 1 ? "Dig: mine " + u : "Dig";
}

// ================= flow =================
function startMine(n) {
  initAudio();
  newMine(n);
  for (const k in hud) hud[k] = -1;
  mode = "play";
  for (const id of ["title", "over", "pause", "shop"]) $(id).hidden = true;
  $("hud").hidden = false;
  resize();
  S.cam = S.camT = -3;
  updateBombBtn();
  last = performance.now();
  banner("Mine " + n, S.spec.name, n === 1 && !save.stars[1] ? "Tap a block to hit it. Every hit costs a swing." : "");
}
function pause() {
  if (mode !== "play") return;
  mode = "pause";
  $("pause").hidden = false;
  if (actx) actx.suspend();
}
function resume() {
  if (mode !== "pause") return;
  $("pause").hidden = true; mode = "play"; last = performance.now();
  if (actx) actx.resume();
}
function showResult() {
  if (mode !== "play") return;
  mode = "over";
  save.flush();
  const won = S.won;
  const rows = [
    { txt: "Reached the treasure", ok: won },
    { txt: `${S.gemGoal}+ gems dug (got ${S.gemCount})`, ok: won && S.gemCount >= S.gemGoal },
    { txt: `A quarter of your swings left`, ok: won && S.swings >= S.maxSw * 0.25 },
  ];
  const stars = rows.filter((r) => r.ok).length;
  if (won) { save.stars[S.mine] = Math.max(save.stars[S.mine] || 0, stars); save.flush(); }
  $("ovMine").textContent = "Mine " + S.mine;
  $("ovCause").textContent = won ? "Treasure!" : "Out of swings!";
  $("ovCause").classList.toggle("win", won);
  $("ovEarn").innerHTML = `<img alt="" src="${iconURL("i_gem")}">+${S.runGems}<small>${won ? "" : " · " + Math.round(100 * S.deepest / S.D) + "% of the way down"}</small>`;
  $("ovStars").hidden = !won; $("ovRows").hidden = !won;
  $("ovStars").innerHTML = [0, 1, 2].map((i) => `<img alt="" src="${iconURL(i < stars ? "i_star" : "i_star_off")}">`).join("");
  $("ovRows").innerHTML = rows.map((r) => `<div class="${r.ok ? "on" : ""}"><img alt="" src="${iconURL(r.ok ? "i_star" : "i_star_off")}"><span>${r.txt}</span></div>`).join("");
  renderOverButtons();
  $("over").hidden = false; $("hud").hidden = true;
  if (won) $("ovStars").querySelectorAll("img").forEach((im, i) => setTimeout(() => { im.classList.add("pop"); if (i < stars) uiSfx("star", 0.8, 1 + i * 0.12); }, 250 + i * 280));
  else uiSfx("gameover", 0.6);
}
function renderOverButtons() {
  const won = S.won;
  refreshGemLabels();
  $("btnNext").hidden = !won;
  $("btnAgain").className = won ? "big ghost" : "big";
  (won ? $("btnNext") : $("btnAgain")).focus({ preventScroll: true });
}
function toTitle() {
  mode = "title";
  for (const id of ["over", "pause", "shop"]) $(id).hidden = true;
  $("hud").hidden = true;
  $("title").hidden = false;
  renderGrid(); refreshGemLabels();
  newMine(1, true); S.demoT = 0;
  resize();
}

$("btnPlay").addEventListener("click", () => startMine(nextMine()));
$("btnNext").addEventListener("click", () => startMine(S.mine + 1));
$("btnAgain").addEventListener("click", () => startMine(S.mine));
$("btnMenu").addEventListener("click", toTitle);
$("btnPause").addEventListener("click", pause);
$("btnResume").addEventListener("click", resume);
$("btnQuit").addEventListener("click", () => { $("pause").hidden = true; if (actx) actx.resume(); toTitle(); });
$("btnSound").addEventListener("click", () => { setMuted(!muted); if (!muted) initAudio(); });
$("btnPauseSound").addEventListener("click", () => setMuted(!muted));
$("btnBomb").addEventListener("click", toggleBomb);
$("btnShopTitle").addEventListener("click", () => openShop("title"));
$("btnShopOver").addEventListener("click", () => openShop("over"));
$("btnShopBack").addEventListener("click", closeShop);

// ================= loop =================
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === "play" || mode === "over") update(dt);
  else if (mode === "title" && S) attract(dt);
  if (S) { draw(); if (mode === "play") updateHUD(); }
}
// the title screen: the mole digs mine 1 on its own behind the menu
function attract(dt) {
  S.demoT -= dt;
  S.swings = 999;
  if (S.demoT <= 0) { S.demoT = 0.28; const c = botChoice(); if (c) tapCell(c.x, c.y); }
  update(dt);
  if (S.won && S.endT > 1.5 || S.P.y > 30) { newMine(1, true); S.demoT = 0; }
}
// a greedy chooser, used by the title demo and the balance check: value per swing, with depth counting as value
function botChoice(opt = {}) {
  let best = null, bs = -1e9;
  const deep = S.deepest;
  for (let y = Math.max(0, deep - 14); y < Math.min(S.D, deep + 2); y++) for (let x = 0; x < COLS; x++) {
    if (!exposed(x, y)) continue;
    const k = K(x, y), t = S.t[k];
    const hits = Math.max(1, Math.ceil(S.hp[k] / S.dmg));
    let v = (y >= deep ? 2.2 : 0.2) + (y + 1 - deep > 0 ? 0.6 : 0);
    if (S.g[k]) v += GEM_VALUE[S.g[k] - 1] * (opt.greed ?? 0.6);
    if (FOOD[t]) v += FOOD[t] * (S.swings < 40 ? 1.2 : 0.6);
    if (t === TNT || t === GAS) v += 4; if (t === DYN) v += 7; if (t === CRYSTAL) v += 3;
    const s = v / hits - (hits > 3 ? 0.3 : 0) + y * 0.01;
    if (s > bs) { bs = s; best = { x, y }; }
  }
  return best;
}

// ================= boot =================
setMuted(muted);
resize();
loadSprites().then(() => {
  fillIcons();
  toTitle();
  $("loading").hidden = true; $("btnPlay").hidden = false;
  if (!COARSE) $("btnPlay").focus();
  requestAnimationFrame(frame);
});
// test hooks (used by sim.js)
window.__um = {
  get S() { return S; }, get mode() { return mode; }, save, UPGRADES, startMine, tapCell, botChoice, exposed, get,
  step(dt) { if (mode === "play") update(dt); }, buy, reset() { save.gems = 0; save.lv = { power: 0, swings: 0, luck: 0, bombs: 0 }; save.stars = {}; save.flush(); },
};
})();
