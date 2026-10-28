(() => {
"use strict";

// ================= constants =================
const COLS = 9;
const E = 0, BLK = 1, ROCK = 2, BED = 4, CRATE = 7, OIL = 8, LAVA = 9;
const HARDNESS = { [BLK]: 0.3, [ROCK]: 1.05, [CRATE]: 0.2, [OIL]: 0.15 };
// coloured blocks come in four toughnesses: soft seams, normal, bolted and plated
const TOUGH = [0.16, 0.3, 0.6, 0.95];
const COLORS = ["r", "b", "g", "y"];
const COLOR_HEX = { r: "#ff6a6e", b: "#5aa8ff", g: "#6fd16a", y: "#ffd25a" };
const MOVE_T = 0.11, FALL_T0 = 0.14, FALL_TMIN = 0.08;
const GEM_KINDS = ["amber", "emerald", "sapphire", "ruby", "diamond"];
const BIOMES = [
  { id: "top", name: "Topsoil", dust: "#9c6b45", chip: "#a39b8f" },
  { id: "clay", name: "Clay Beds", dust: "#c8693e", chip: "#b07c69" },
  { id: "stone", name: "Old Stone", dust: "#86817a", chip: "#737b88" },
  { id: "cryst", name: "Crystal Hollow", dust: "#5d4f8e", chip: "#56a8bb" },
  { id: "magma", name: "Magma Veins", dust: "#66332b", chip: "#615654" },
  { id: "abyss", name: "The Abyss", dust: "#2a3a52", chip: "#46527a" },
];
const ADJ = ["Crumbly", "Sticky", "Gloomy", "Glittering", "Rumbling", "Twisty", "Hollow", "Dusty", "Lucky", "Sneaky", "Bumpy", "Sleepy", "Deep", "Wobbly", "Shiny", "Muddy"];
const NOUN = ["Burrow", "Pit", "Shaft", "Hollow", "Warren", "Seam", "Den", "Tunnel", "Vein", "Grotto", "Cellar", "Dig"];

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
function pickWeighted(list, r) { let tot = 0; for (const e of list) tot += e.w; let x = r * tot; for (const e of list) { x -= e.w; if (x <= 0) return e; } return list[list.length - 1]; }

const store = {
  get(k, d) { try { const v = localStorage.getItem("undermine2:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("undermine2:" + k, JSON.stringify(v)); } catch {} },
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
  if (name !== "pop" && lastPlay[name] && now - lastPlay[name] < 0.03) return;
  lastPlay[name] = now;
  const src = actx.createBufferSource(); src.buffer = BUF[name]; src.playbackRate.value = rate;
  const g = actx.createGain(); g.gain.value = vol; src.connect(g); g.connect(master); src.start();
}
function setMuted(m) {
  muted = m; store.set("muted", m);
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, actx.currentTime, 0.05);
  const t = "Sound: " + (m ? "off" : "on");
  $("btnSound").textContent = t; $("btnPauseSound").textContent = t;
}

// ================= canvas =================
const cv = $("cv"), ctx = cv.getContext("2d");
const dk = document.createElement("canvas"), dctx = dk.getContext("2d");
let hudBottom = 0;
let W = 0, H = 0, DPR = 1, TS = 40, OX = 0, VIEW_H = 0, VIEW_ROWS = 14;
const SHADOW = {};
// soft blocks look crumbly and pale; bolted ones get a dark rim and rivets; plated ones a steel band too
const TOUGH_OVER = [];
function makeTough() {
  const s = Math.max(8, Math.round(TS * DPR));
  for (const k of [0, 2, 3]) {
    const c = document.createElement("canvas"); c.width = c.height = s;
    const g = c.getContext("2d"), q = s / 32;
    if (k === 0) {
      g.fillStyle = "rgba(255,255,255,.26)"; g.fillRect(2 * q, 2 * q, 28 * q, 28 * q);
      g.fillStyle = "rgba(60,30,10,.28)";
      for (let i = 0; i < 7; i++) { const a = hash2(i, 3, 9), b = hash2(i, 7, 9); g.beginPath(); g.arc((6 + a * 20) * q, (6 + b * 20) * q, (1 + hash2(i, 1, 2) * 1.2) * q, 0, 7); g.fill(); }
    } else {
      g.strokeStyle = "rgba(20,14,12,.72)"; g.lineWidth = 3.2 * q;
      g.beginPath(); g.roundRect(3.5 * q, 3.5 * q, 25 * q, 25 * q, 4 * q); g.stroke();
      if (k === 3) {
        g.save(); g.beginPath(); g.roundRect(3.5 * q, 3.5 * q, 25 * q, 25 * q, 4 * q); g.clip();
        g.fillStyle = "rgba(205,212,222,.82)"; g.translate(16 * q, 16 * q); g.rotate(-Math.PI / 4); g.fillRect(-20 * q, -3.2 * q, 40 * q, 6.4 * q);
        g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(-20 * q, -3.2 * q, 40 * q, 1.4 * q);
        g.restore();
      }
      for (const [x, y] of [[7.5, 7.5], [24.5, 7.5], [7.5, 24.5], [24.5, 24.5]]) {
        g.fillStyle = "#2a2220"; g.beginPath(); g.arc(x * q, y * q, 2.6 * q, 0, 7); g.fill();
        g.fillStyle = "#d9d2c8"; g.beginPath(); g.arc(x * q, y * q, 1.7 * q, 0, 7); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc((x - 0.5) * q, (y - 0.6) * q, 0.6 * q, 0, 7); g.fill();
      }
    }
    TOUGH_OVER[k] = c;
  }
}
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
  dk.width = Math.round(W / 2); dk.height = Math.round(H / 2);
  VIEW_H = H;
  TS = Math.floor(Math.min(W / (COLS + (W > 600 ? 0.6 : 0.1)), VIEW_H / 13));
  TS = Math.max(24, TS);
  OX = Math.round((W - COLS * TS) / 2);
  VIEW_ROWS = VIEW_H / TS;
  rasterCache.clear();
  makeShadows(); makeTough();
  hudBottom = 0;
}
window.addEventListener("resize", resize);

// ================= input: hold the left or right half to steer =================
const held = { L: 0, R: 0 };
const tapped = { L: 0, R: 0 };   // a quick tap between two frames still counts
let heldOrder = 0;
const KEYMAP = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R" };
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const d = KEYMAP[e.code];
  if (d) { if (!held[d]) { held[d] = ++heldOrder; tapped[d] = performance.now(); } e.preventDefault(); return; }
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    if (mode === "over" && overReady) (S.won ? startMine(S.mine + 1) : startMine(S.mine));
    else if (mode === "title" && !$("btnPlay").hidden) startMine(nextMine());
    else if (mode === "pause") resume();
    return;
  }
  if (e.code === "KeyP" || e.code === "Escape") { if (mode === "play") pause(); else if (mode === "pause") resume(); return; }
  if (e.code === "KeyM") setMuted(!muted);
});
window.addEventListener("keyup", (e) => { const d = KEYMAP[e.code]; if (d) held[d] = 0; });
window.addEventListener("blur", () => { clearHeld(); if (mode === "play") pause(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "play") pause(); });
const pointers = new Map();
function syncPointers() {
  held.L = held.R = 0;
  for (const [, p] of pointers) held[p.side] = Math.max(held[p.side], p.order);
}
cv.addEventListener("pointerdown", (e) => {
  if (mode !== "play") return;
  e.preventDefault();
  const side = e.clientX < W / 2 ? "L" : "R";
  pointers.set(e.pointerId, { side, order: ++heldOrder });
  tapped[side] = performance.now();
  try { cv.setPointerCapture(e.pointerId); } catch {}
  syncPointers();
});
cv.addEventListener("pointermove", (e) => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const side = e.clientX < W / 2 ? "L" : "R";
  if (side !== p.side) { p.side = side; p.order = ++heldOrder; syncPointers(); }
});
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) cv.addEventListener(ev, (e) => { pointers.delete(e.pointerId); syncPointers(); });
cv.addEventListener("contextmenu", (e) => e.preventDefault());
function clearHeld() { pointers.clear(); for (const k in held) held[k] = 0; for (const k in tapped) tapped[k] = 0; }

function steer() {
  let best = null, bo = 0;
  for (const k of ["L", "R"]) if (held[k] && held[k] > bo) { bo = held[k]; best = k; }
  if (!best) { const now = performance.now(); for (const k of ["L", "R"]) if (now - tapped[k] < 140) { best = k; tapped[k] = 0; } }
  if (!best) return 0;
  let dx = best === "L" ? -1 : 1;
  if (S.fx.dizzy > 0) dx = -dx;
  return dx;
}

// ================= mines: numbered, procedural, endless =================
// The design in one line: digging straight down is the safe, slow, starving line. Oil cans sit off it,
// every sideways step leaves something hanging over you, and loose blocks that land on their own colour pop again.
function mineSpec(n) {
  // difficulty ramps over ~30 mines, then holds; within every five it climbs, peaks on the 4th and eases off on the 5th
  const wave = [-0.06, -0.02, 0.03, 0.08, -0.12][(n - 1) % 5];
  const t = clamp((n - 1) / 30 + wave, 0, 1);
  const breather = n % 5 === 0;
  const r = mulberry32(n * 7919 + 13);
  return {
    n, seed: (n * 2654435761) >>> 0, t,
    name: ADJ[(r() * ADJ.length) | 0] + " " + NOUN[(r() * NOUN.length) | 0],
    depth: Math.round(Math.min(130, 58 + n * 3 + (n > 10 ? (n - 10) : 0))),
    biome: Math.floor((n - 1) / 3) % BIOMES.length,
    colors: 4,
    clump: 0.34,                                      // chance a block copies a neighbour's colour (bigger groups, bigger collapses)
    rock: n < 2 ? 0.02 : 0.04 + 0.05 * t,              // rocks are slow to dig and fall like everything else
    slab: n < 3 ? 0 : 0.05 + 0.07 * t,                // bedrock ledges you have to go around
    lava: n < 12 ? 0 : 0.004 + 0.008 * t,
    caves: 0.86 - 0.06 * t,
    crate: n < 4 ? 0 : 0.014,
    gem: 0.07,
    tank: 15,                                         // seconds a full lamp lasts
    soft: 0.28 - 0.12 * t,                            // share of soft seams
    tough: 0.14 + 0.2 * t,                            // share that is bolted or plated
    plate: n < 4 ? 0 : 0.03 + 0.07 * t,               // share that is plated
    oilEvery: breather ? 6 : 7,                  // rows between oil cans
    wobble: 0.9 - 0.25 * t,
    fallMax: 1.6 + 0.2 * t,                           // rows per second; you dig about 4, so a drop only catches you when you stall                           // warning time before loose blocks drop
  };
}

// ================= crate effects (icons only, no reading) =================
const GOOD = [
  { id: "drill", icon: "i_drill", w: 3, t: 7 },
  { id: "oil", icon: "oil", w: 3 },
  { id: "boom", icon: "i_bomb", w: 2.5 },
  { id: "magnet", icon: "i_magnet", w: 2, t: 10 },
];
const BAD = [
  { id: "dizzy", icon: "i_dizzy", w: 2, t: 5 },
  { id: "sore", icon: "i_sore", w: 2, t: 6 },
  { id: "dark", icon: "i_dark", w: 2, t: 7 },
  { id: "rockfall", icon: "i_rockfall", w: 1.5 },
];
const FX_META = Object.fromEntries([...GOOD, ...BAD].filter((e) => e.t).map((e) => [e.id, e]));
const isBadFx = (id) => BAD.some((b) => b.id === id);

// ================= run state =================
let S = null, rnd = Math.random, mode = "title", overReady = false;

function newMine(n) {
  const spec = mineSpec(n);
  rnd = mulberry32(spec.seed);
  S = {
    spec, mine: n, rows: [], D: spec.depth,
    P: { x: 4, y: -1, fromX: 4, fromY: -1, mv: 1, mvDur: MOVE_T, moving: false, falling: false, fallN: 0, face: 1,
      dig: null, digAnim: 0, digTick: 0, squash: 0, blink: 2, hurtT: 0, inv: 0, dead: false, stuck: 0 },
    maxDepth: 0, gems: 0, gemsTotal: 0, chain: 0, bestChain: 0, hurt: 0, hearts: 3, cause: "",
    oil: 100, burn: 100 / spec.tank,
    combo: 0, comboT: 0, bestCombo: 0, cans: 0, oilFrom: { can: 0, combo: 0, chain: 0, crate: 0 },
    fx: { drill: 0, magnet: 0, dizzy: 0, sore: 0, dark: 0 },
    pops: [], popT: 0, popN: 0, popColor: 0, wobbles: [], wobKey: new Set(), quick: new Map(), bodies: [], dirty: true, settleT: 0,
    lavaT: new Map(), parts: [], floats: [], icons: [], flashes: [],
    shake: 0, hitstop: 0, time: 0, cam: -4.5, won: false, wonT: 0, magnetT: 0, flash: 0, flashC: "#fff",
  };
  for (let y = 0; y <= S.D + 2; y++) genRow(y);
  toughen();
  placeOil();
  presettle();
  for (let y = 0; y < S.D; y++) for (let x = 0; x < COLS; x++) if (S.rows[y].t[x] === BLK && S.rows[y].g[x]) S.gemsTotal++;
  // star targets
  S.gemGoal = Math.max(3, Math.round(S.gemsTotal * 0.3));
}
// split the toughness noise by share, so every mine gets the mix its spec asks for
function toughen() {
  const sp = S.spec, vals = [];
  for (let y = 0; y < S.D; y++) for (let x = 0; x < COLS; x++) vals.push(S.rows[y].k[x]);
  vals.sort((a, b) => a - b);
  const at = (f) => vals[Math.min(vals.length - 1, Math.floor(f * vals.length))];
  const soft = at(sp.soft), bolt = at(1 - sp.tough), plate = at(1 - sp.plate);
  for (let y = 0; y <= S.D + 2; y++) for (let x = 0; x < COLS; x++) {
    const r = S.rows[y], v = r.k[x];
    r.k[x] = y < 3 || y >= S.D ? 1 : v < soft ? 0 : v >= plate && sp.plate > 0 ? 3 : v >= bolt ? 2 : 1;
  }
}
// oil cans sit off the lazy line: never in the column you start in, and never two in a row in the same column
function placeOil() {
  const sp = S.spec;
  let last = 4;
  for (let y = 5; y < S.D - 3; y += sp.oilEvery) {
    const yy = y + ((rnd() * 3) | 0) - 1;
    let x;
    do x = (rnd() * COLS) | 0; while (x === 4 || x === last || Math.abs(x - last) > 5);
    last = x;
    S.rows[yy].t[x] = OIL; S.rows[yy].g[x] = 0;
  }
}

// ================= world =================
function rowAt(y) { return S.rows[y]; }
function get(x, y) {
  if (x < 0 || x >= COLS) return BED;
  if (y < 0) return E;
  if (y >= S.rows.length) return BED;
  return S.rows[y].t[x];
}
function setT(x, y, t) { if (x < 0 || x >= COLS || y < 0 || y >= S.rows.length) return; const r = S.rows[y]; r.t[x] = t; r.hp[x] = 0; if (t !== BLK) r.g[x] = 0; S.dirty = true; }

function genRow(y) {
  const sp = S.spec;
  const r = { t: new Uint8Array(COLS), hp: new Float32Array(COLS), c: new Uint8Array(COLS), g: new Uint8Array(COLS), v: new Uint8Array(COLS), k: new Uint8Array(COLS) };
  S.rows[y] = r;
  for (let x = 0; x < COLS; x++) r.v[x] = (hash2(x, y, sp.seed) * 2) | 0;
  if (y === S.D) return;                                       // the treasure chamber: open floor
  if (y > S.D) { r.t.fill(BED); return; }
  const up = y > 0 ? S.rows[y - 1] : null;
  for (let x = 0; x < COLS; x++) {
    let t = BLK;
    const cave = vnoise(x * 0.45, y * 0.22, sp.seed) * 0.65 + vnoise(x * 0.9 + 50, y * 0.5, sp.seed + 7) * 0.35;
    if (y > 4 && y < S.D - 2 && cave > sp.caves) t = E;
    else if (y > 2) {
      const q = rnd();
      if (q < sp.rock) t = ROCK;
      else if (q < sp.rock + sp.crate) t = CRATE;
      else if (y > 4 && q < sp.rock + sp.crate + sp.lava) t = LAVA;
    }
    r.t[x] = t;
    // colour: clump with the block to the left or above so chains form
    let c = (rnd() * sp.colors) | 0;
    const q = rnd();
    if (q < sp.clump) {
      const left = x > 0 && r.t[x - 1] === BLK, top = up && up.t[x] === BLK;
      if (left && (!top || rnd() < 0.5)) c = r.c[x - 1];
      else if (top) c = up.c[x];
    }
    r.c[x] = c;
    // toughness comes in bands and seams, so there is a route worth finding
    const n = vnoise(x * 0.38 + 200, y * 0.16, sp.seed + 3) * 0.7 + vnoise(x * 0.9 + 90, y * 0.45, sp.seed + 11) * 0.3;
    r.k[x] = clamp(Math.round(n * 255), 0, 255);                 // a noise value for now; toughen() turns it into a level
    if (t === BLK && y > 0 && rnd() < sp.gem) r.g[x] = 1 + Math.min(4, Math.floor(rnd() * (1.5 + sp.t * 3.5)));
  }
  if (sp.slab && y > 6 && y < S.D - 3 && rnd() < sp.slab) {
    const len = 2 + ((rnd() * 4) | 0), x0 = (rnd() * (COLS - len + 1)) | 0;
    for (let x = x0; x < x0 + len; x++) r.t[x] = BED;
  }
  if (up) for (let x = 0; x < COLS; x++) if (r.t[x] === E && up.t[x] === LAVA) up.t[x] = E;
}

// ================= gravity: loose blocks wobble, then drop =================
// Touching blocks of one colour stick together; rocks, crates and oil cans are loose singles.
// A group stays up while any of its cells rests on something that isn't part of it. The mole holds nothing up.
const FALLS = (t) => t === BLK || t === ROCK || t === CRATE || t === OIL;
function groupAt(x, y) {
  const t = get(x, y);
  if (!FALLS(t) || y >= S.D) return null;
  if (t !== BLK) return [[x, y]];
  const c = S.rows[y].c[x], seen = new Set([y * COLS + x]), out = [[x, y]];
  for (let i = 0; i < out.length; i++) {
    const [cx, cy] = out[i];
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + ax, ny = cy + ay, k = ny * COLS + nx;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= S.D || seen.has(k)) continue;
      const r = S.rows[ny];
      if (r.t[nx] === BLK && r.c[nx] === c) { seen.add(k); out.push([nx, ny]); }
    }
  }
  return out;
}
function supported(cells) {
  const own = new Set(cells.map(([x, y]) => y * COLS + x));
  for (const [x, y] of cells) {
    if (y + 1 >= S.D) return true;
    if (own.has((y + 1) * COLS + x)) continue;
    if (S.rows[y + 1].t[x] !== E) return true;
  }
  return false;
}
// mines are made settled: anything generated over a pocket drops into it straight away, quietly
function presettle() {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    const seen = new Set();
    for (let y = S.D - 1; y >= 0; y--) for (let x = 0; x < COLS; x++) {
      if (seen.has(y * COLS + x)) continue;
      const g = groupAt(x, y); if (!g) continue;
      for (const [gx, gy] of g) seen.add(gy * COLS + gx);
      if (supported(g)) continue;
      const cells = g.map(([gx, gy]) => ({ x: gx, y: gy, t: S.rows[gy].t[gx], c: S.rows[gy].c[gx], g: S.rows[gy].g[gx], k: S.rows[gy].k[gx] }));
      for (const q of cells) { S.rows[q.y].t[q.x] = E; S.rows[q.y].g[q.x] = 0; }
      let d = 0;
      while (cells.every((q) => q.y + d + 1 < S.D && S.rows[q.y + d + 1].t[q.x] === E)) d++;
      for (const q of cells) { const r = S.rows[q.y + d]; r.t[q.x] = q.t; r.c[q.x] = q.c; r.g[q.x] = q.g; r.k[q.x] = q.k; }
      moved = true;
    }
    if (!moved) break;
  }
}
function settle() {
  const top = Math.max(0, Math.floor(S.cam) - 10), bot = Math.min(S.D, Math.ceil(S.cam + VIEW_ROWS) + 6);
  const seen = new Set();
  for (let y = bot - 1; y >= top; y--) for (let x = 0; x < COLS; x++) {
    const k = y * COLS + x;
    if (seen.has(k) || S.wobKey.has(k)) continue;
    const g = groupAt(x, y); if (!g) continue;
    for (const [gx, gy] of g) seen.add(gy * COLS + gx);
    if (g.some(([gx, gy]) => S.wobKey.has(gy * COLS + gx) || S.pops.some((p) => p.x === gx && p.y === gy))) continue;
    if (supported(g)) continue;
    // something just fell out from under it: it goes with it instead of waiting its turn
    const quick = g.some(([gx, gy]) => S.quick.has((gy + 1) * COLS + gx));
    S.wobbles.push({ cells: g, t: quick ? 0.05 : S.spec.wobble, max: quick ? 0.05 : S.spec.wobble });
    for (const [gx, gy] of g) S.wobKey.add(gy * COLS + gx);
    if (!quick && mode !== "title") sfx("wobble", 0.5, 0.9 + rnd() * 0.3);
  }
}
function dropGroup(w) {
  // re-check: digging or a landing may have changed it while it shook
  const live = w.cells.find(([x, y]) => FALLS(get(x, y)));
  if (!live) return;
  const g = groupAt(live[0], live[1]);
  if (!g || supported(g)) return;
  const cells = g.map(([x, y]) => { const r = S.rows[y]; return { x, y, t: r.t[x], c: r.c[x], g: r.g[x], k: r.k[x] }; });
  for (const q of cells) { setT(q.x, q.y, E); S.quick.set(q.y * COLS + q.x, 0.15); }
  S.bodies.push({ cells, d: 0, vy: 1 });
  S.dirty = true;
}
function moleCell() {
  const P = S.P;
  return P.moving && P.mv < 0.5 ? { x: P.fromX, y: P.fromY } : { x: P.x, y: P.y };
}
function updateGravity(dt) {
  for (const [k, v] of S.quick) { if (v - dt <= 0) S.quick.delete(k); else S.quick.set(k, v - dt); }
  S.settleT -= dt;
  if (S.dirty && S.settleT <= 0) { S.dirty = false; S.settleT = 1 / 30; settle(); }
  for (let i = S.wobbles.length - 1; i >= 0; i--) {
    const w = S.wobbles[i];
    w.t -= dt;
    if (w.t > 0) continue;
    S.wobbles.splice(i, 1);
    for (const [x, y] of w.cells) S.wobKey.delete(y * COLS + x);
    dropGroup(w);
  }
  const P = S.P, pc = moleCell();
  for (let i = S.bodies.length - 1; i >= 0; i--) {
    const b = S.bodies[i];
    b.vy = Math.min(S.spec.fallMax, b.vy + 7 * dt);
    let nd = b.d + b.vy * dt, landed = false;
    // step one row at a time so nothing tunnels
    while (Math.floor(nd) > Math.floor(b.d)) {
      const next = Math.floor(b.d) + 1;
      if (b.cells.some((q) => q.y + next >= S.D || get(q.x, q.y + next) !== E)) { landed = true; nd = Math.floor(b.d); break; }
      b.d = next;
    }
    b.d = nd;
    if (!P.dead && !S.won && b.cells.some((q) => q.x === pc.x && Math.abs(q.y + b.d - pc.y) < 0.55)) { crush(b); S.bodies.splice(i, 1); continue; }
    if (landed) { land(b); S.bodies.splice(i, 1); }
  }
}
function land(b) {
  const d = Math.floor(b.d);
  let heavy = false;
  for (const q of b.cells) {
    const y = q.y + d, r = S.rows[y];
    r.t[q.x] = q.t; r.c[q.x] = q.c; r.g[q.x] = q.g; r.k[q.x] = q.k; r.hp[q.x] = 0;
    if (q.t !== BLK) heavy = true;
  }
  if (mode !== "title") sfx(heavy ? "crash" : "land", heavy ? 0.6 : 0.45, 0.9 + rnd() * 0.2);
  if (b.cells.length > 2 || heavy) shake(0.12);
  for (const q of b.cells) if (!b.cells.some((o) => o.x === q.x && o.y === q.y + 1)) burst(q.x + 0.5, q.y + d + 1, 3, BIOMES[S.spec.biome].dust, 1.6);
  // the payoff: a loose group landing on its own colour makes 4+ and pops again
  const done = new Set();
  for (const q of b.cells) {
    if (q.t !== BLK) continue;
    const y = q.y + d, k = y * COLS + q.x;
    if (done.has(k) || S.pops.some((p) => p.x === q.x && p.y === y)) continue;
    const g = groupAt(q.x, y);
    for (const [gx, gy] of g) done.add(gy * COLS + gx);
    if (g.length >= 4 && g.length > b.cells.filter((o) => o.t === BLK && o.c === q.c).length) chainPop(q.x, y, true);
  }
  S.dirty = true;
}
function crush(b) {
  const pc = moleCell(), d = b.d;
  for (const q of b.cells) {
    if (q.t === BLK && q.g) collectGem(q.x, Math.round(q.y + d), q.g - 1);
    burst(q.x + 0.5, q.y + d + 0.5, 8, q.t === BLK ? COLOR_HEX[COLORS[q.c]] : "#8d857b", 3.2);
  }
  sfx("crash", 0.9);
  burst(pc.x + 0.5, pc.y, 14, "#8d857b", 3.5);
  hurt("crush");
  S.dirty = true;
}

// ================= player =================
function digMul() {
  let m = 1;
  if (S.fx.drill > 0) m *= 3;
  if (S.fx.sore > 0) m *= 0.45;
  return m;
}
function startMove(dx, dy, dur) {
  const P = S.P;
  P.fromX = P.x; P.fromY = P.y; P.x += dx; P.y += dy; P.mv = 0; P.mvDur = dur; P.moving = true;
  if (P.y > S.maxDepth) S.maxDepth = P.y;
}
function updatePlayer(dt) {
  const P = S.P;
  if (P.dead || S.won) return;
  P.inv = Math.max(0, P.inv - dt);
  P.squash = Math.max(0, P.squash - dt * 4);
  P.hurtT = Math.max(0, P.hurtT - dt);
  P.blink -= dt; if (P.blink < -0.12) P.blink = 2 + rnd() * 3;
  if (P.moving) {
    P.mv += dt / P.mvDur;
    if (P.mv >= 1) { P.mv = 1; P.moving = false; if (P.y >= S.D) { win(); return; } }
    else return;
  }
  const below = get(P.x, P.y + 1);
  if (below === E) {
    P.falling = true; P.fallN++;
    startMove(0, 1, Math.max(FALL_TMIN, FALL_T0 - P.fallN * 0.008));
    return;
  }
  if (P.falling) {
    P.falling = false;
    if (P.fallN > 1) { P.squash = Math.min(1, 0.3 + P.fallN * 0.08); sfx("land", Math.min(1, 0.4 + P.fallN * 0.08)); burst(P.x + 0.5, P.y + 1, 6, BIOMES[S.spec.biome].dust, 2); if (P.fallN > 5) shake(0.15); }
    P.fallN = 0;
  }
  // steering wins; otherwise dig straight down
  let dx = steer(), dy = 0;
  if (dx) {
    P.face = dx;
    const tx = P.x + dx;
    if (tx < 0 || tx >= COLS || get(tx, P.y) === BED) { dx = 0; }
  }
  if (!dx) dy = 1;
  const tx = P.x + dx, ty = P.y + dy;
  const t = get(tx, ty);
  if (t === E) { P.dig = null; P.stuck = 0; startMove(dx, dy, MOVE_T); if (dx) sfx("step", 0.6, 0.9 + rnd() * 0.3); return; }
  if (t === LAVA) { if (dy) P.stuck += dt; hurt("lava"); P.dig = null; return; }
  if (t === BED) { P.stuck += dt; P.dig = null; return; }
  P.stuck = 0;
  if (S.pops.some((p) => p.x === tx && p.y === ty)) { P.dig = null; return; }   // already popping
  const r = S.rows[ty];
  if (!P.dig || P.dig.x !== tx || P.dig.y !== ty) { P.dig = { x: tx, y: ty, dx, dy }; P.digTick = 0.06; }
  r.hp[tx] += dt * digMul() / (t === BLK ? TOUGH[r.k[tx]] : HARDNESS[t]);
  P.digAnim += dt * (S.fx.drill > 0 ? 2.2 : 1);
  P.digTick += dt;
  if (P.digTick >= (S.fx.drill > 0 ? 0.06 : 0.11)) {
    P.digTick = 0;
    const cx = tx + 0.5 - dx * 0.45, cy = ty + 0.5 - dy * 0.45 + (dy ? 0 : 0.1);
    if (t === ROCK || (t === BLK && r.k[tx] >= 2)) { sfx("chip", 0.7, 0.9 + rnd() * 0.25); burst(cx, cy, 2, BIOMES[S.spec.biome].chip, 2.2); }
    else { sfx("dig" + (1 + ((rnd() * 3) | 0)), 0.6); burst(cx, cy, 2, t === BLK ? COLOR_HEX[COLORS[r.c[tx]]] : "#b77a3c", 2); }
  }
  if (r.hp[tx] >= 1) {
    r.hp[tx] = 0; P.dig = null;
    if (t === BLK) chainPop(tx, ty);
    else breakTile(tx, ty, "dig");
  }
}

// ================= the twist: colour chains =================
function chainPop(x0, y0, cascade) {
  const c = S.rows[y0].c[x0];
  const seen = new Set([y0 * COLS + x0]);
  const q = [[x0, y0, 0]];
  const list = [];
  while (q.length) {
    const [x, y, d] = q.shift();
    list.push({ x, y, d });
    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + ax, ny = y + ay;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= S.D) continue;
      const k = ny * COLS + nx;
      if (seen.has(k)) continue;
      const r = S.rows[ny];
      if (r.t[nx] === BLK && r.c[nx] === c) { seen.add(k); q.push([nx, ny, d + 1]); }
    }
  }
  const n = list.length;
  S.chain = n; S.bestChain = Math.max(S.bestChain, n);
  const step = n > 20 ? 0.025 : 0.04;
  for (const p of list) S.pops.push({ x: p.x, y: p.y, t: p.d * step + (cascade ? 0.08 : 0), c, n, i: 0 });
  S.popN = 0;
  const col = COLOR_HEX[COLORS[c]];
  if (cascade) {
    // the real payoff: drops that land on their colour. Each one in a row is worth more.
    S.combo++; S.comboT = 1.2; S.bestCombo = Math.max(S.bestCombo, S.combo);
    const gain = Math.min(10, (1 + n * 0.3) * (1 + (S.combo - 1) * 0.25));
    S.oil = Math.min(100, S.oil + gain); S.oilFrom.combo += gain;
    const big = S.combo >= 3 || n >= 10;
    S.icons.push({ x: x0 + 0.5, y: y0 + 0.2, txt: S.combo > 1 ? "Combo ×" + S.combo : "Combo!", c: col, t: 0, max: 1.3, sc: big ? 1.7 : 1.3 });
    S.icons.push({ x: x0 + 0.5, y: y0 + 1.1, txt: "+", c: "#ffd25a", icon: "oil", t: 0, max: 1.1, sc: 1 });
    if (mode !== "title") setTimeout(() => sfx("bigchain", 0.8, Math.min(1.8, 1 + (S.combo - 1) * 0.15)), 120);
    shake(big ? 0.35 : 0.18);
    if (big) flashScreen(col, 0.16);
    return;
  }
  // digging into a big group gives no oil, just speed: the hole it leaves is the point
  if (n >= 6) {
    const big = n >= 12;
    S.icons.push({ x: x0 + 0.5, y: y0 + 0.3, txt: "×" + n, c: col, t: 0, max: big ? 1.4 : 1.1, sc: big ? 1.9 : 1.3 });
    if (mode !== "title") setTimeout(() => sfx("bigchain", big ? 0.8 : 0.5, big ? 1 : 1.12), Math.min(600, n * step * 1000));
    if (big) shake(0.25);
  }
}
function updatePops(dt) {
  for (let i = S.pops.length - 1; i >= 0; i--) {
    const p = S.pops[i];
    p.t -= dt;
    if (p.t > 0) continue;
    S.pops.splice(i, 1);
    const r = S.rows[p.y];
    if (r.t[p.x] !== BLK) continue;
    if (r.g[p.x]) collectGem(p.x, p.y, r.g[p.x] - 1);
    setT(p.x, p.y, E);
    S.popN++;
    sfx("pop", 0.55, Math.min(2.4, Math.pow(2, S.popN / 14)));
    const col = COLOR_HEX[COLORS[p.c]];
    for (let k = 0; k < 7; k++) { const a = rnd() * Math.PI * 2, sp = 2 + rnd() * 4; S.parts.push({ x: p.x + 0.5, y: p.y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5, life: 0.5 + rnd() * 0.3, max: 0.8, c: col, s: 0.1 + rnd() * 0.08, g: 14, glow: k < 2 }); }
    S.flashes.push({ x: p.x + 0.5, y: p.y + 0.5, r: 1.2, t: 0.15, max: 0.15 });
  }
}

function hurt(cause) {
  const P = S.P;
  if (P.inv > 0 || P.dead) return;
  S.hearts--; S.hurt++;
  P.inv = 1.6; P.hurtT = 0.5;
  sfx(cause === "lava" ? "sizzle" : "hurt"); if (cause === "lava") sfx("hurt", 0.7);
  shake(0.5); S.hitstop = 0.1; flashScreen("#e2474b", 0.35);
  S.icons.push({ x: P.x + 0.5, y: P.y - 0.3, icon: "i_heart_empty", ring: "#e2474b", t: 0, max: 1.1, sc: 1.3 });
  if (S.hearts <= 0) outOfOil(cause);
}
function outOfOil(cause = "oil") {
  const P = S.P;
  if (P.dead || S.won) return;
  P.dead = true; S.cause = cause;
  sfx("powerdown", 0.9);
  const run = S;
  setTimeout(() => { if (S === run) sfx("gameover", 0.8); }, 400);
  setTimeout(() => { if (S === run) showResult(); }, 1500);
}
function win() {
  const P = S.P;
  if (S.won) return;
  S.won = true; S.wonT = 0;
  sfx("win", 0.9); sfx("crate", 0.7);
  for (let i = 0; i < 60; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, sp = 4 + rnd() * 8; S.parts.push({ x: 4.5, y: S.D + 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1 + rnd() * 0.8, max: 1.8, c: Object.values(COLOR_HEX)[i % 4], s: 0.1 + rnd() * 0.1, g: 14, glow: i % 3 === 0 }); }
  shake(0.3);
  const run = S;
  setTimeout(() => { if (S === run) showResult(); }, 1400);
}

// ================= tiles breaking =================
function breakTile(x, y, cause) {
  const t = get(x, y); if (t === E || t === BED && cause === "dig") return;
  const B = BIOMES[S.spec.biome];
  setT(x, y, E);
  const cx = x + 0.5, cy = y + 0.5;
  if (t === ROCK || t === BED) { sfx("break", 0.8, 0.9 + rnd() * 0.2); burst(cx, cy, 10, B.chip, 3.2); }
  else if (t === LAVA) burst(cx, cy, 8, "#ffb040", 3);
  else { burst(cx, cy, 8, "#b77a3c", 2.6); }
  if (t === CRATE) openCrate(x, y);
  if (t === OIL) { S.oil = Math.min(100, S.oil + 45); S.oilFrom.can += 45; S.cans++; sfx("heart", 0.8); S.icons.push({ x: cx, y: y, txt: "+", c: "#ffd25a", icon: "oil", t: 0, max: 1.1, sc: 1.3 }); }
}
function collectGem(x, y, g) {
  S.gems++;
  sfx("gem", 0.6, 1 + Math.min(0.6, S.popN * 0.03));
  sparkle(x + 0.5, y + 0.5, GEM_KINDS[g]);
  S.floats.push({ x: x + 0.5, y: y + 0.5, gem: GEM_KINDS[g], t: 0, max: 0.6 });
}
function openCrate(x, y) {
  sfx("crate");
  const good = rnd() < clamp(0.72 - S.spec.t * 0.15, 0.5, 0.9);
  const e = pickWeighted(good ? GOOD : BAD, rnd());
  setTimeout(() => sfx(good ? "powerup" : "powerdown", 0.85), 100);
  burst(x + 0.5, y + 0.5, 14, good ? "#7fe08a" : "#c77dff", 3);
  S.icons.push({ x: S.P.x + 0.5, y: S.P.y - 0.4, icon: e.icon, ring: good ? "#7fe08a" : "#c77dff", t: 0, max: 1.3, sc: 1.6 });
  if (e.t) S.fx[e.id] = Math.max(S.fx[e.id], e.t);
  if (e.id === "oil") S.oil = Math.min(100, S.oil + 35);
  if (e.id === "boom") explode(S.P.x, S.P.y + 2, 1);
  if (e.id === "rockfall") rockfall();
}
function rockfall() {
  const P = S.P;
  shake(0.4); sfx("wobble", 1);
  for (let k = 0; k < 3; k++) {
    const x = clamp(P.x + Math.round((rnd() - 0.5) * 3), 0, COLS - 1);
    for (let y = P.y - 3 - k * 2; y > P.y - 12 && y >= 0; y--) if (get(x, y) === E && get(x, y - 1) !== E) { setT(x, y, ROCK); break; }
  }
}
function explode(cx, cy, R) {
  sfx("bomb", 0.9); shake(0.55); S.hitstop = 0.05;
  S.flashes.push({ x: cx + 0.5, y: cy + 0.5, r: R + 2.5, t: 0.4, max: 0.4 });
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    if (x < 0 || x >= COLS || y < 0 || y >= S.D) continue;
    if (x === S.P.x && y === S.P.y) continue;
    const t = get(x, y);
    if (t === BLK) { if (S.rows[y].g[x]) collectGem(x, y, S.rows[y].g[x] - 1); setT(x, y, E); burst(x + 0.5, y + 0.5, 6, COLOR_HEX[COLORS[S.rows[y].c[x]]], 3); }
    else if (t !== E) breakTile(x, y, "blast");
    fire(x + 0.5, y + 0.5, 3);
  }
  for (let i = 0; i < 16; i++) S.parts.push({ x: cx + 0.5, y: cy + 0.5, vx: (rnd() - 0.5) * 9, vy: (rnd() - 0.5) * 9, life: 0.9 + rnd() * 0.6, max: 1.5, c: "#3a332c", s: 0.35 + rnd() * 0.3, g: -1, smoke: true });
}

// ================= hazards: boulders and lava =================
function updateHazards(dt) {
  const P = S.P;
  const top = Math.max(0, Math.floor(S.cam) - 6), bot = Math.min(S.D, Math.floor(S.cam + VIEW_ROWS) + 8);
  for (let y = top; y < bot; y++) {
    const r = S.rows[y], rb = S.rows[y + 1];
    for (let x = 0; x < COLS; x++) {
      if (r.t[x] !== LAVA || rb.t[x] !== E || y + 1 >= S.D) continue;
      const k = y * COLS + x;
      const tt = (S.lavaT.get(k) || 0) + dt;
      if (tt > 0.5) {
        S.lavaT.delete(k);
        r.t[x] = E; S.dirty = true;
        if (P.x === x && P.y === y + 1) { hurt("lava"); burst(x + 0.5, y + 1.2, 8, "#ffb040", 3); }
        else { rb.t[x] = LAVA; S.lavaT.set((y + 1) * COLS + x, -0.02); }
      } else S.lavaT.set(k, tt);
    }
  }
}

// ================= particles =================
function shake(a) { if (!reduceMotion) S.shake = Math.max(S.shake, a); }
function flashScreen(c, a) { S.flash = a; S.flashC = c; }
function burst(x, y, n, c, sp) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: (rnd() - 0.5) * sp * 2, vy: -rnd() * sp * 1.4 - 0.5, life: 0.35 + rnd() * 0.45, max: 0.8, c, s: 0.06 + rnd() * 0.09, g: 22 }); }
function fire(x, y, n) { for (let i = 0; i < n; i++) S.parts.push({ x: x + (rnd() - 0.5) * 0.6, y: y + (rnd() - 0.5) * 0.6, vx: (rnd() - 0.5) * 3, vy: -rnd() * 3, life: 0.3 + rnd() * 0.4, max: 0.7, c: rnd() < 0.5 ? "#ffcf4a" : "#ff6a1a", s: 0.18 + rnd() * 0.18, g: -3, glow: true }); }
const GEMC = { amber: "#ffcf5a", emerald: "#5fe08a", sapphire: "#5aa8ff", ruby: "#ff5a6e", diamond: "#e8fbff" };
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
  for (let i = S.flashes.length - 1; i >= 0; i--) { const f = S.flashes[i]; f.t -= dt; if (f.t <= 0) S.flashes.splice(i, 1); }
}

// ================= main update =================
function update(dt) {
  if (S.hitstop > 0) { S.hitstop -= dt; dt *= 0.08; }
  S.time += dt;
  for (const k in S.fx) if (S.fx[k] > 0) S.fx[k] = Math.max(0, S.fx[k] - dt);
  if (!S.won && !S.P.dead && S.P.y >= 0) {
    S.oil -= S.burn * dt;
    if (S.oil <= 0) { S.oil = 0; outOfOil(); }
  }
  if (S.fx.magnet > 0) {
    S.magnetT -= dt;
    if (S.magnetT <= 0) {
      S.magnetT = 0.12;
      const P = S.P;
      for (let y = P.y - 2; y <= P.y + 2; y++) for (let x = P.x - 2; x <= P.x + 2; x++) {
        if (y < 0 || y >= S.D || x < 0 || x >= COLS) continue;
        const r = S.rows[y];
        if (r.t[x] === BLK && r.g[x]) { collectGem(x, y, r.g[x] - 1); r.g[x] = 0; }
      }
    }
  }
  updatePlayer(dt);
  updatePops(dt);
  updateGravity(dt);
  updateHazards(dt);
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  updateParts(dt);
  S.shake = Math.max(0, S.shake - dt * 1.8);
  S.flash = Math.max(0, S.flash - dt * 1.6);
  const P = S.P;
  const py = P.moving ? lerp(P.fromY, P.y, P.mv) : P.y;
  const target = Math.min(py - VIEW_ROWS * 0.38, S.D + 2.5 - VIEW_ROWS);
  S.cam = lerp(S.cam, Math.max(-4.5, target), 1 - Math.exp(-dt * (P.falling ? 12 : 7)));
}

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
    ctx.fillStyle = "rgba(5,3,2,.55)"; ctx.fillRect(0, top, OX, H + TS * 4); ctx.fillRect(X(COLS), top, W - X(COLS), H + TS * 4);
  }
  // tiles
  for (let y = Math.max(0, y0); y <= y1; y++) {
    if (y > S.D) { for (let x = 0; x < COLS; x++) spr("bedrock", X(x) + TS / 2, Y(y) + TS / 2, u * 1.002); continue; }
    const r = S.rows[y];
    for (let x = 0; x < COLS; x++) {
      const t = r.t[x], cy = Y(y) + TS / 2;
      let cx = X(x) + TS / 2;
      if (t === E || t === LAVA) {
        spr(`wall_${bi}`, cx, cy, u * 1.002);
        const up = y > 0 ? S.rows[y - 1].t[x] : E;
        if (up !== E && up !== LAVA) ctx.drawImage(SHADOW.top, X(x), Y(y), TS, TS * 0.4);
        const l = get(x - 1, y), rr = get(x + 1, y);
        if (l !== E && l !== LAVA) ctx.drawImage(SHADOW.left, X(x), Y(y), TS * 0.3, TS);
        if (rr !== E && rr !== LAVA) ctx.drawImage(SHADOW.right, X(x) + TS * 0.7, Y(y), TS * 0.3, TS);
        if (t === LAVA) { spr("lava", cx, cy, u * 1.002); ctx.fillStyle = `rgba(255,240,160,${0.15 + 0.15 * Math.sin(S.time * 4 + x * 1.7 + y)})`; ctx.fillRect(X(x), Y(y), TS, TS); }
        continue;
      }
      const wob = S.wobKey.has(y * COLS + x);
      if (wob) { spr(`wall_${bi}`, cx, cy, u * 1.002); cx += Math.sin(S.time * 46 + x * 2) * TS * 0.06; }
      const pop = t === BLK && S.pops.find((p) => p.x === x && p.y === y);
      drawTile(t, r.c[x], r.g[x], r.v[x], cx, cy, u, bi, pop, r.k[x]);
      if (y === 0 && !wob) { ctx.fillStyle = "#4fae55"; ctx.fillRect(X(x), Y(0) - TS * 0.06, TS, TS * 0.12); }
      const hp = r.hp[x];
      if (hp > 0.02) drawCracks(cx - TS / 2, Y(y), hp, x * 7 + y * 13);
    }
  }
  // the treasure chamber
  if (S.D <= y1 + 1) {
    const gy = Y(S.D);
    ctx.fillStyle = "rgba(255,210,90,.12)"; ctx.fillRect(X(0), gy, COLS * TS, TS);
    for (let x = 0; x < COLS; x++) { ctx.fillStyle = "#ffd25a"; ctx.fillRect(X(x), gy + TS - 3, TS, 3); }
    spr(S.won ? "chest_open" : "chest", X(4.5), gy + TS * 0.5 + (S.won ? -TS * 0.05 : Math.sin(S.time * 3) * TS * 0.04), u * 1.15);
  }
  // loose blocks on their way down
  for (const bd of S.bodies) for (const q of bd.cells) drawTile(q.t, q.c, q.g, 0, X(q.x) + TS / 2, Y(q.y + bd.d) + TS / 2, u, bi, null, q.k);
  // danger lane: something loose is above the mole with nothing in between
  const th = threatAbove();
  if (th != null && !P.dead && !S.won) {
    const m = moleXY(), a = 0.16 + 0.1 * Math.sin(S.time * 14);
    const g = ctx.createLinearGradient(0, Y(th), 0, Y(m.y));
    g.addColorStop(0, "rgba(226,71,75,0)"); g.addColorStop(1, `rgba(226,71,75,${a})`);
    ctx.fillStyle = g; ctx.fillRect(X(P.x), Y(th + 1), TS, Y(m.y) - Y(th + 1));
  }
  drawMole(X, Y, u);
  for (const p of S.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.smoke ? a * 0.5 : a;
    ctx.fillStyle = p.c;
    const s = p.s * TS * (p.smoke ? (2 - a) : 1);
    if (p.smoke || p.glow) { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), s, 0, 7); ctx.fill(); }
    else ctx.fillRect(X(p.x) - s / 2, Y(p.y) - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  drawDark(X, Y, u);
  for (const p of S.parts) if (p.glow) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.8; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.s * TS * 0.8, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // gems flying out of popped blocks
  for (const f of S.floats) { const k = f.t / f.max; ctx.globalAlpha = 1 - k; spr("gem_" + f.gem, X(f.x), Y(f.y - k * 1.2), u * (0.6 + k * 0.3)); }
  ctx.globalAlpha = 1;
  // big chain numbers and crate icons
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of S.icons) {
    const k = f.t / f.max;
    const pop = k < 0.15 ? 0.5 + (k / 0.15) * 0.6 : k < 0.25 ? 1.1 - (k - 0.15) : 1;
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    const yy = Y(f.y) - k * TS * 0.8;
    if (f.icon) {
      if (f.ring) { ctx.fillStyle = "rgba(18,13,11,.8)"; ctx.strokeStyle = f.ring; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(f.x), yy, TS * 0.5 * f.sc * pop, 0, 7); ctx.fill(); ctx.stroke(); }
      spr(f.icon, X(f.x) + (f.txt ? TS * 0.2 : 0), yy, u * f.sc * pop * (f.ring ? 1 : 0.8));
    }
    if (f.txt) {
      const fs = Math.round(TS * 0.55 * f.sc * pop);
      ctx.font = `${fs}px "Lilita One", "Arial Black", sans-serif`;
      ctx.lineWidth = Math.max(3, fs * 0.2); ctx.strokeStyle = "rgba(0,0,0,.9)"; ctx.lineJoin = "round";
      const tx = X(f.x) - (f.icon ? TS * 0.35 : 0);
      ctx.strokeText(f.txt, tx, yy); ctx.fillStyle = f.c; ctx.fillText(f.txt, tx, yy);
    }
  }
  ctx.globalAlpha = 1;
  // stuck on bedrock: show which way to steer
  if (P.stuck > 0.5 && !P.dead && !S.won) {
    const m = moleXY(), b = Math.sin(S.time * 8) * TS * 0.08;
    ctx.globalAlpha = Math.min(1, (P.stuck - 0.5) * 3);
    if (get(P.x - 1, P.y) !== BED || get(P.x - 1, P.y + 1) !== BED) spr("arrow", X(m.x - 0.45) - b, Y(m.y + 0.5), u * 0.9);
    if (get(P.x + 1, P.y) !== BED || get(P.x + 1, P.y + 1) !== BED) spr("arrow", X(m.x + 1.45) + b, Y(m.y + 0.5), u * 0.9, { flip: true });
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // low oil: the edges go dark red
  const low = clamp(1 - S.oil / 25, 0, 1);
  if (low > 0 && !S.won && mode === "play") {
    const a = low * (0.35 + 0.2 * Math.sin(S.time * 8));
    const g = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(120,0,10,0)"); g.addColorStop(1, `rgba(150,10,20,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (S.flash > 0) { ctx.globalAlpha = S.flash; ctx.fillStyle = S.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function drawCracks(x, y, hp, seed) {
  ctx.strokeStyle = "rgba(10,6,4,.7)"; ctx.lineWidth = Math.max(1.2, TS * 0.045); ctx.lineCap = "round";
  const n = 1 + Math.floor(hp * 4);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = hash2(seed, i, 1) * Math.PI * 2, len = TS * (0.18 + 0.3 * hp);
    const mx = x + TS / 2 + Math.cos(a + 0.5) * len * 0.5, my = y + TS / 2 + Math.sin(a + 0.5) * len * 0.5;
    ctx.moveTo(x + TS / 2, y + TS / 2); ctx.lineTo(mx, my); ctx.lineTo(x + TS / 2 + Math.cos(a) * len, y + TS / 2 + Math.sin(a) * len);
  }
  ctx.stroke();
}
function drawTile(t, c, g, v, cx, cy, u, bi, pop, k = 1) {
  if (t === BLK) {
    let sc = 1;
    if (pop) sc = 1 + 0.12 * Math.max(0, 1 - pop.t * 8) + (pop.t < 0.05 ? 0.1 : 0);
    spr("blk_" + COLORS[c], cx, cy, u * sc);
    if (k !== 1 && TOUGH_OVER[k]) ctx.drawImage(TOUGH_OVER[k], cx - TS * sc / 2, cy - TS * sc / 2, TS * sc, TS * sc);
    if (pop && pop.t < 0.12) { ctx.fillStyle = `rgba(255,255,255,${0.5 - pop.t * 4})`; ctx.fillRect(cx - TS / 2 + 2, cy - TS / 2 + 2, TS - 4, TS - 4); }
    if (g) spr("gem_" + GEM_KINDS[g - 1], cx, cy + Math.sin(S.time * 3 + cx * 0.1) * TS * 0.02, u * 0.6);
    return;
  }
  if (t === OIL || t === CRATE) {
    spr(`dirt_${bi}_${v}`, cx, cy, u * 1.002);
    if (t === OIL) { ctx.fillStyle = `rgba(255,210,90,${0.18 + 0.1 * Math.sin(S.time * 5)})`; ctx.fillRect(cx - TS / 2, cy - TS / 2, TS, TS); }
    spr(t === OIL ? "oil" : "crate", cx, cy + (t === OIL ? Math.sin(S.time * 4) * TS * 0.03 : 0), u * (t === OIL ? 0.95 : 0.92));
    return;
  }
  spr(`dirt_${bi}_${v}`, cx, cy, u * 1.002);
  if (t === ROCK) spr(`rock_${bi}`, cx, cy, u * 1.002);
  else if (t === BED) spr("bedrock", cx, cy, u * 1.002);
}
// the nearest loose thing (shaking or falling) straight above the mole with only air between
function threatAbove() {
  const P = S.P, pc = moleCell();
  let best = null;
  for (const b of S.bodies) for (const q of b.cells) if (q.x === pc.x && q.y + b.d < pc.y) { const y = Math.floor(q.y + b.d); if (best == null || y > best) best = y; }
  for (const w of S.wobbles) for (const [x, y] of w.cells) if (x === pc.x && y < pc.y && (best == null || y > best)) best = y;
  if (best == null) return null;
  for (let y = Math.max(0, best + 1); y < pc.y; y++) if (get(P.x, y) !== E) return null;
  return best;
}
function moleXY() {
  const P = S.P;
  let k = P.moving ? P.mv : 1;
  if (P.moving && !P.falling) k = 1 - (1 - k) * (1 - k);
  return { x: lerp(P.fromX, P.x, k), y: lerp(P.fromY, P.y, k) };
}
function drawMole(X, Y, u) {
  const P = S.P;
  const m = moleXY();
  const cx = X(m.x) + TS / 2, cy = Y(m.y) + TS / 2;
  if (P.inv > 0 && Math.sin(S.time * 40) > 0.3 && !P.dead) ctx.globalAlpha = 0.45;
  let sx = 1, sy = 1, ox = 0, oy = 0;
  if (P.squash > 0) { sx = 1 + P.squash * 0.3; sy = 1 - P.squash * 0.25; oy = TS * P.squash * 0.1; }
  if (P.falling) { sx = 0.9; sy = 1.1; }
  if (S.won) { const k = Math.min(1, S.wonT * 3); oy -= Math.abs(Math.sin(S.time * 10)) * TS * 0.25 * k; }
  if (P.moving && !P.falling) oy -= Math.sin(P.mv * Math.PI) * TS * 0.08;
  const dig = P.dig && !P.dead;
  const swing = dig ? Math.sin(P.digAnim * (S.fx.drill > 0 ? 40 : 22)) : 0;
  if (dig) { ox += P.dig.dx * swing * TS * 0.04; oy += P.dig.dy * Math.abs(swing) * TS * 0.05; }
  const name = P.dead || P.hurtT > 0 ? "mole_hurt" : P.blink < 0 ? "mole_blink" : "mole";
  const face = P.face < 0;
  ctx.save(); ctx.translate(cx + ox, cy + oy + TS * 0.04); ctx.scale(sx, sy);
  spr(name, 0, 0, u * 0.9, face ? { flip: true } : undefined);
  ctx.restore();
  if (!P.dead) {
    if (S.fx.drill > 0) {
      const dd = P.dig || { dx: 0, dy: 1 };
      const jx = (Math.random() - 0.5) * (dig ? TS * 0.04 : 0);
      spr("drillbit", cx + dd.dx * TS * 0.42 + jx, cy + dd.dy * TS * 0.38 + TS * 0.08, u * 0.82, { rot: Math.atan2(dd.dy, dd.dx) });
    } else {
      let a;
      if (dig && P.dig.dy) a = (face ? 1 : -1) * (0.9 + swing * 0.7) + (face ? -0.3 : 0.3);
      else if (dig) a = (face ? -1 : 1) * (0.4 + swing * 0.9);
      else a = (face ? -1 : 1) * -0.5;
      if (S.won) a = (face ? 1 : -1) * 1.2;
      ctx.save(); ctx.translate(cx + (face ? -1 : 1) * TS * 0.22, cy + TS * 0.08 + oy); ctx.rotate(a); spr("pick", TS * (face ? -0.12 : 0.12), -TS * 0.2, u * 0.78, face ? { flip: true } : undefined); ctx.restore();
    }
  }
  if (S.fx.dizzy > 0 && !P.dead) for (let i = 0; i < 3; i++) { const a = S.time * 5 + (i * Math.PI * 2) / 3; spr("i_star", cx + Math.cos(a) * TS * 0.35, cy - TS * 0.48 + Math.sin(a) * TS * 0.1, u * 0.35); }
  ctx.globalAlpha = 1;
}
function lightRadius() {
  let L = 2 + 4.8 * clamp(S.oil / 100, 0, 1);
  if (S.fx.dark > 0) L *= 0.5;
  if (S.won) L = 9;
  return Math.max(1.2, L);
}
function drawDark(X, Y) {
  const m = moleXY();
  const a = clamp((m.y - 2) / 14, 0, 1) * 0.82;
  if (a <= 0.01) return;
  const k = dk.width / W;
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  dctx.globalCompositeOperation = "source-over";
  dctx.clearRect(0, 0, dk.width, dk.height);
  dctx.fillStyle = `rgba(6,4,8,${a})`; dctx.fillRect(0, 0, dk.width, dk.height);
  dctx.globalCompositeOperation = "destination-out";
  dctx.setTransform(k, 0, 0, k, 0, 0);
  const hole = (x, y, r, s = 1) => {
    const g = dctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${s})`); g.addColorStop(0.55, `rgba(0,0,0,${s * 0.75})`); g.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, 7); dctx.fill();
  };
  const flick = 1 + Math.sin(S.time * 13) * 0.015 + Math.sin(S.time * 7.3) * 0.02 + (S.oil < 20 ? Math.sin(S.time * 31) * 0.05 : 0);
  hole(X(m.x + 0.5), Y(m.y + 0.45), lightRadius() * TS * flick, 1);
  const y0 = Math.floor(S.cam) - 1, y1 = Math.min(S.D, Math.ceil(S.cam + VIEW_ROWS) + 1);
  let n = 0;
  for (let y = Math.max(0, y0); y < y1 && n < 40; y++) {
    const r = S.rows[y];
    for (let x = 0; x < COLS; x++) {
      if (r.t[x] === LAVA) { hole(X(x + 0.5), Y(y + 0.5), TS * 1.7, 0.85); n++; }
      else if (r.t[x] === OIL) { hole(X(x + 0.5), Y(y + 0.5), TS * 1.3, 0.8); n++; }
    }
  }
  for (const w of S.wobbles) for (const [x, y] of w.cells) hole(X(x + 0.5), Y(y + 0.5), TS * 0.9, 0.6);
  for (const b of S.bodies) for (const q of b.cells) hole(X(q.x + 0.5), Y(q.y + b.d + 0.5), TS * 0.9, 0.7);
  if (S.D < y1 + 2) hole(X(4.5), Y(S.D + 0.5), TS * 2.4, 0.9);
  for (const f of S.flashes) hole(X(f.x), Y(f.y), TS * f.r * (f.t / f.max + 0.3), 1);
  dctx.globalCompositeOperation = "source-over";
  ctx.drawImage(dk, 0, 0, W, H);
}

// ================= HUD =================
const hud = { depth: -1, prog: -1, gems: -1, oil: "", fx: "", mine: -1, hearts: -1 };
function updateHUD() {
  const d = Math.max(0, S.maxDepth);
  if (hud.mine !== S.mine) { hud.mine = S.mine; $("hMine").textContent = S.mine; $("hMine").style.fontSize = S.mine > 99 ? "11px" : S.mine > 9 ? "13px" : ""; }
  if (hud.depth !== d) { hud.depth = d; $("hDepth").innerHTML = Math.max(0, S.D - d) + "<small>m</small>"; $("hProg").style.width = clamp(d / S.D, 0, 1) * 100 + "%"; }
  if (hud.hearts !== S.hearts) {
    hud.hearts = S.hearts;
    $("hHearts").innerHTML = [0, 1, 2].map((i) => `<img alt="" src="${iconURL(i < S.hearts ? "i_heart" : "i_heart_empty")}">`).join("");
    $("hHearts").parentElement.setAttribute("aria-label", S.hearts + " hearts");
  }
  if (hud.gems !== S.gems) { hud.gems = S.gems; $("hGems").textContent = S.gems; }
  const o = Math.round(S.oil);
  if (hud.oil !== o) {
    hud.oil = o;
    const f = $("hFill"); f.style.transform = `scaleX(${Math.max(0.02, o / 100)})`;
    f.style.background = o > 50 ? "#ffd25a" : o > 25 ? "#ff9a3c" : "#e2474b";
    $("hMeter").classList.toggle("close", o <= 25);
  }
  const act = Object.entries(S.fx).filter(([, v]) => v > 0);
  const fk = act.map(([k]) => k).join(",");
  if (hud.fx !== fk) {
    hud.fx = fk;
    $("fx").innerHTML = act.map(([k]) => `<div class="fx ${isBadFx(k) ? "bad" : "good"}"><img alt="" src="${iconURL(FX_META[k].icon)}"></div>`).join("");
  }
}
function banner(k, n, h, danger) {
  if (mode === "title") return;
  const b = $("banner");
  $("bnK").textContent = k || ""; $("bnN").textContent = n || ""; $("bnH").textContent = h || "";
  b.classList.toggle("danger", !!danger);
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}

// ================= progress =================
const starsFor = () => store.get("stars", {});
function unlocked() { const s = starsFor(); let n = 1; while (s[n]) n++; return n; }
function nextMine() { return unlocked(); }
function renderGrid() {
  const s = starsFor(), u = unlocked();
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
  clearHeld();
  newMine(n);
  for (const k in hud) hud[k] = typeof hud[k] === "number" ? -1 : "";
  mode = "play"; overReady = false;
  for (const id of ["title", "over", "pause"]) $(id).hidden = true;
  $("hud").hidden = false;
  resize();
  S.cam = -4.5;
  last = performance.now();
  banner("Mine " + n, S.spec.name, n === 1 ? (COARSE ? "Hold the left or right side of the screen to steer" : "Hold ← or → to steer") : n === 2 ? "Loose blocks shake, then drop. Step aside!" : "");
}
function pause() {
  if (mode !== "play") return;
  mode = "pause"; clearHeld();
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
  const won = S.won;
  let stars = 0;
  const rows = [
    { icon: "chest", txt: "Reached the treasure", ok: won },
    { icon: "i_gem", txt: `${S.gemGoal}+ gems (got ${S.gems})`, ok: won && S.gems >= S.gemGoal },
    { icon: "i_heart", txt: S.hurt ? `No bumps (took ${S.hurt})` : "No bumps", ok: won && S.hurt === 0 },
  ];
  stars = rows.filter((r) => r.ok).length;
  if (won) { const s = starsFor(); s[S.mine] = Math.max(s[S.mine] || 0, stars); store.set("stars", s); }
  $("ovMine").textContent = "Mine " + S.mine;
  $("ovCause").textContent = won ? "Treasure!" : S.cause === "crush" ? "Squashed!" : S.cause === "lava" ? "Scorched!" : "Lamp's out!";
  $("ovCause").classList.toggle("win", won);
  $("ovStars").innerHTML = [0, 1, 2].map((i) => `<img alt="" src="${iconURL(i < stars ? "i_star" : "i_star_off")}">`).join("");
  $("ovRows").innerHTML = rows.map((r) => `<div class="${r.ok ? "on" : ""}"><img alt="" src="${iconURL(r.ok ? "i_star" : "i_star_off")}"><span>${r.txt}</span></div>`).join("");
  $("btnNext").hidden = !won;
  $("btnAgain").className = won ? "big ghost" : "big";
  $("over").hidden = false; $("hud").hidden = true;
  const imgs = $("ovStars").querySelectorAll("img");
  imgs.forEach((im, i) => setTimeout(() => { im.classList.add("pop"); if (i < stars) sfx("star", 0.8, 1 + i * 0.12); }, 250 + i * 280));
  (won ? $("btnNext") : $("btnAgain")).focus({ preventScroll: true });
  setTimeout(() => { overReady = true; }, 500);
}
function toTitle() {
  mode = "title";
  for (const id of ["over", "pause"]) $(id).hidden = true;
  $("hud").hidden = true;
  $("title").hidden = false;
  renderGrid();
  newMine(1); S.demo = 0;
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

// ================= loop =================
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === "play") { update(dt); if (S.won) S.wonT += dt; }
  else if (mode === "over") { updateParts(dt); S.time += dt; }
  else if (mode === "title" && S) attract(dt);
  if (S) { draw(); if (mode === "play") updateHUD(); }
}
// title screen: the mole digs mine 1 on its own behind the menu
function attract(dt) {
  S.demo = (S.demo || 0) - dt;
  if (S.demo < 0) { S.demo = 0.5 + Math.random(); held.L = held.R = 0; const r = Math.random(); if (r < 0.25) held.L = 1; else if (r < 0.5) held.R = 1; }
  S.oil = 100; S.hearts = 9;
  update(dt);
  if (S.won || S.P.dead || S.P.y > 26) { newMine(1); S.demo = 0; }
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
window.__um = { get S() { return S; }, get mode() { return mode; }, startMine, held, get, COLS, tough(x, y) { return S.rows[y] ? S.rows[y].k[x] : 1; }, step(dt) { if (mode === "play") update(dt); }, showResult };
})();
