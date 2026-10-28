(() => {
"use strict";

// ================= constants =================
const COLS = 9;
const E = 0, DIRT = 1, ROCK = 2, HARD = 3, BED = 4, BOULDER = 5, GEM = 6, CRATE = 7, TNT = 8, LAVA = 9, RUNE = 10;
const HARDNESS = { [DIRT]: 0.15, [ROCK]: 0.42, [HARD]: 1.05, [BOULDER]: 0.6, [GEM]: 0.15, [CRATE]: 0.18, [TNT]: 0.15, [RUNE]: 0.2 };
const MOVE_T = 0.085, FALL_T0 = 0.11, FALL_TMIN = 0.04;
const WAKE_DEPTH = 10;
const GEM_KINDS = [
  { id: "amber", v: 10 }, { id: "emerald", v: 20 }, { id: "sapphire", v: 40 }, { id: "ruby", v: 75 }, { id: "diamond", v: 150 },
];
const BIOMES = [
  { id: "top", name: "Topsoil", cave: 0.80, rock: 0.10, hard: 0.0, lava: 0, gemB: 0, dust: "#9c6b45", chip: "#a39b8f", glow: "#ffcf8a" },
  { id: "clay", name: "The Clay Beds", cave: 0.74, rock: 0.17, hard: 0.04, lava: 0, gemB: 0.2, dust: "#c8693e", chip: "#b07c69", glow: "#ffb38a" },
  { id: "stone", name: "Old Stone", cave: 0.67, rock: 0.24, hard: 0.10, lava: 0.01, gemB: 0.4, dust: "#86817a", chip: "#737b88", glow: "#e8e2d4" },
  { id: "cryst", name: "Crystal Hollow", cave: 0.63, rock: 0.22, hard: 0.13, lava: 0.0, gemB: 1.2, dust: "#5d4f8e", chip: "#56a8bb", glow: "#c9b6ff" },
  { id: "magma", name: "Magma Veins", cave: 0.66, rock: 0.24, hard: 0.15, lava: 0.10, gemB: 0.7, dust: "#66332b", chip: "#615654", glow: "#ffb070" },
  { id: "abyss", name: "The Abyss", cave: 0.64, rock: 0.26, hard: 0.2, lava: 0.05, gemB: 1.0, dust: "#2a3a52", chip: "#46527a", glow: "#a8c8ff" },
];
const ROMAN = ["", " II", " III", " IV", " V", " VI", " VII", " VIII", " IX", " X"];
const biomeIdx = (y) => { const b = Math.floor(Math.max(0, y) / 100); return b < 6 ? b : 2 + ((b - 2) % 4); };
const biomeLap = (y) => { const b = Math.floor(Math.max(0, y) / 100); return b < 6 ? 0 : Math.floor((b - 2) / 4); };
const biomeName = (y) => BIOMES[biomeIdx(y)].name + (ROMAN[biomeLap(y)] ?? " ∞");
const isShrineRow = (y) => y >= 50 && (y - 50) % 100 === 0;

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
  get(k, d) { try { const v = localStorage.getItem("undermine:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("undermine:" + k, JSON.stringify(v)); } catch {} },
};

// ================= sprites =================
const SPR = {};          // name -> { img, w, h }
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
  const c = raster(name, u * DPR * (opt && opt.scale || 1));
  const w = s.w * u * (opt && opt.scale || 1), h = s.h * u * (opt && opt.scale || 1);
  if (!opt || (!opt.rot && !opt.flip && !opt.sx && opt.alpha == null)) { ctx.drawImage(c, cx - w / 2, cy - h / 2, w, h); return; }
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
let actx = null, master = null, musicGain = null, rumbleGain = null, muted = store.get("muted", false);
const BUF = {};
let musicSrc = null, rumbleSrc = null;
function decode(buf) { return new Promise((res, rej) => { const p = actx.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); }); }
async function initAudio() {
  if (actx) { if (actx.state === "suspended") actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(actx.destination);
  musicGain = actx.createGain(); musicGain.gain.value = 0.42; musicGain.connect(master);
  rumbleGain = actx.createGain(); rumbleGain.gain.value = 0; rumbleGain.connect(master);
  await Promise.all(Object.entries(ASSETS.sounds).map(async ([k, uri]) => {
    try { const b64 = uri.slice(uri.indexOf(",") + 1); const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); BUF[k] = await decode(u8.buffer); } catch (e) { /* skip */ }
  }));
  startLoops();
}
function startLoops() {
  if (!actx) return;
  if (!musicSrc && BUF.theme) { musicSrc = actx.createBufferSource(); musicSrc.buffer = BUF.theme; musicSrc.loop = true; musicSrc.connect(musicGain); musicSrc.start(); }
  if (!rumbleSrc && BUF.rumble) { rumbleSrc = actx.createBufferSource(); rumbleSrc.buffer = BUF.rumble; rumbleSrc.loop = true; rumbleSrc.connect(rumbleGain); rumbleSrc.start(); }
}
const lastPlay = {};
function sfx(name, vol = 1, rate = 1) {
  if (!actx || muted || !BUF[name] || mode === "title") return;
  const now = actx.currentTime;
  if (lastPlay[name] && now - lastPlay[name] < 0.03) return;
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
let W = 0, H = 0, DPR = 1, TS = 40, OX = 0, VIEW_H = 0, PAD_H = 0, VIEW_ROWS = 14;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  dk.width = Math.round(W / 2); dk.height = Math.round(H / 2);
  PAD_H = showPad ? (H < 640 ? 90 : 104) : 0;
  VIEW_H = H - PAD_H;
  TS = Math.floor(Math.min(W / (COLS + (W > 600 ? 0.6 : 0.15)), VIEW_H / 13.2));
  TS = Math.max(24, TS);
  OX = Math.round((W - COLS * TS) / 2);
  VIEW_ROWS = VIEW_H / TS;
  rasterCache.clear();
  makeShadows();
  hudBottom = 0;
}
let showPad = COARSE;
const SHADOW = {};
function makeShadows() {
  const px = Math.max(1, Math.round(TS * DPR));
  const mk = (w, h, x0, y0, x1, y1, a) => {
    const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * DPR)); c.height = Math.max(1, Math.round(h * DPR));
    const g = c.getContext("2d"), gr = g.createLinearGradient(x0 * DPR, y0 * DPR, x1 * DPR, y1 * DPR);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); return c;
  };
  SHADOW.top = mk(TS, TS * 0.4, 0, 0, 0, TS * 0.4, 0.55);
  SHADOW.left = mk(TS * 0.3, TS, 0, 0, TS * 0.3, 0, 0.4);
  SHADOW.right = mk(TS * 0.3, TS, TS * 0.3, 0, 0, 0, 0.4);
}
window.addEventListener("resize", resize);

// ================= input =================
const held = { L: 0, R: 0, D: 0, U: 0 };
const tapped = { L: 0, R: 0, D: 0 };   // a quick tap between two frames still counts
let heldOrder = 0;
const KEYMAP = { ArrowLeft: "L", KeyA: "L", ArrowRight: "R", KeyD: "R", ArrowDown: "D", KeyS: "D", ArrowUp: "U", KeyW: "U" };
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const d = KEYMAP[e.code];
  if (mode === "shrine") { shrineKey(e); return; }
  if (d) { if (!held[d]) { held[d] = ++heldOrder; tapped[d] = performance.now(); } e.preventDefault(); return; }
  if (e.code === "Space" || e.code === "KeyX" || e.code === "KeyB") {
    e.preventDefault();
    if (mode === "play") useBomb();
    else if (mode === "over" && overReady) startRun();
    else if (mode === "title" && !$("btnPlay").hidden) startRun();
    return;
  }
  if (e.code === "Enter") { if (mode === "over" && overReady) startRun(); else if (mode === "title" && !$("btnPlay").hidden) startRun(); else if (mode === "pause") resume(); return; }
  if (e.code === "KeyP" || e.code === "Escape") { if (mode === "play") pause(); else if (mode === "pause") resume(); return; }
  if (e.code === "KeyM") setMuted(!muted);
});
window.addEventListener("keyup", (e) => { const d = KEYMAP[e.code]; if (d) held[d] = 0; });
window.addEventListener("blur", () => { for (const k in held) held[k] = 0; if (mode === "play") pause(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "play") pause(); });

for (const b of document.querySelectorAll(".pb[data-dir]")) {
  const d = b.dataset.dir;
  const on = (e) => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); held[d] = ++heldOrder; tapped[d] = performance.now(); b.classList.add("on"); if (!actx) initAudio(); };
  const off = (e) => { held[d] = 0; b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
  b.addEventListener("contextmenu", (e) => e.preventDefault());
}
$("padBomb").addEventListener("pointerdown", (e) => { e.preventDefault(); if (mode === "play") useBomb(); });
// touch fallback for devices that claim a fine pointer: first touch reveals the pad
window.addEventListener("touchstart", () => { if (!showPad) { showPad = true; document.body.classList.add("coarse"); resize(); if (mode === "play") $("pad").hidden = false; } }, { passive: true });

function inputDir() {
  let best = null, bo = 0;
  for (const k of ["L", "R", "D"]) if (held[k] && held[k] > bo) { bo = held[k]; best = k; }
  if (!best) { const now = performance.now(); for (const k of ["L", "R", "D"]) if (now - tapped[k] < 140) { best = k; tapped[k] = 0; } }
  if (!best) return null;
  let dx = best === "L" ? -1 : best === "R" ? 1 : 0, dy = best === "D" ? 1 : 0;
  if (dx && S.fx.dizzy > 0) dx = -dx;
  return { dx, dy };
}

// ================= bargains =================
const PACTS = [
  { id: "jaw", name: "Iron Jaw", icon: "i_jaw", boon: "Dig 35% faster.", bane: "The Gulper is 12% faster.", max: 3, apply(M) { M.dig *= 1.35; M.worm *= 1.12; } },
  { id: "pockets", name: "Deep Pockets", icon: "i_gem", boon: "Gems are worth double.", bane: "Your lamp shrinks.", max: 2, apply(M) { M.gem *= 2; M.light -= 1; } },
  { id: "skull", name: "Thick Skull", icon: "i_skull", boon: "Falling boulders bounce off you.", bane: "Crates lean cursed.", max: 1, apply(M) { M.boulderSafe = true; M.luck -= 0.15; } },
  { id: "keg", name: "Powder Keg", icon: "i_bomb", boon: "+3 bombs, and your blasts are bigger.", bane: "TNT fuses burn twice as fast.", max: 1, apply(M, S) { S.bombs = Math.min(9, S.bombs + 3); M.bombR = 2; M.fuse *= 0.5; } },
  { id: "hoard", name: "Hoarder", icon: "crate", boon: "Twice as many crates.", bane: "Gems turn up less often.", max: 2, apply(M) { M.crates *= 2; M.gems *= 0.6; } },
  { id: "heart", name: "Stout Heart", icon: "i_heart", boon: "+1 max heart and a full heal.", bane: "Dig 15% slower.", max: 3, apply(M, S) { S.maxHearts = Math.min(6, S.maxHearts + 1); S.hearts = S.maxHearts; M.dig *= 0.85; } },
  { id: "eyes", name: "Night Eyes", icon: "i_eye", boon: "See gems, crates and TNT in the dark.", bane: "The Gulper is 8% faster.", max: 1, apply(M) { M.nightEyes = true; M.worm *= 1.08; } },
  { id: "glass", name: "Glass Cannon", icon: "i_star", boon: "All points ×1.5 from now on.", bane: "Your max hearts drop to 1.", max: 1, apply(M, S) { M.score *= 1.5; S.maxHearts = 1; S.hearts = 1; } },
  { id: "paw", name: "Lucky Paw", icon: "i_gold", boon: "Crates lean lucky.", bane: "Boulders are more common.", max: 2, apply(M) { M.luck += 0.2; M.boulders *= 1.7; } },
  { id: "slow", name: "Slow Burn", icon: "i_clock", boon: "Power-ups last twice as long.", bane: "So do power-downs.", max: 1, apply(M) { M.goodTime *= 2; M.badTime *= 2; } },
  { id: "fever", name: "Gold Fever", icon: "gem_ruby", boon: "Craft a bomb every 7 gems.", bane: "More TNT and lava.", max: 1, apply(M) { M.craft = 7; M.hazards *= 1.7; } },
  { id: "lamp", name: "Miner's Lamp", icon: "i_lantern", boon: "Your lamp burns brighter.", bane: "Crates lean cursed.", max: 2, apply(M) { M.light += 1.5; M.luck -= 0.12; } },
  { id: "feather", name: "Featherfall", icon: "i_wing", boon: "Fall twice as fast.", bane: "Hard rock turns up more.", max: 1, apply(M) { M.fall *= 2; M.hardMore *= 1.5; } },
  { id: "whisper", name: "Worm Whisperer", icon: "i_bait", boon: "Bombs knock the Gulper twice as far.", bane: "It surges more often.", max: 1, apply(M) { M.knock *= 2; M.surge *= 1.6; } },
];

// ================= crate effects =================
const GOOD = [
  { id: "drill", name: "Drill!", desc: "Dig three times faster", icon: "i_drill", w: 3, t: 8 },
  { id: "bombs", name: "+2 bombs", desc: "Space or the bomb button", icon: "i_bomb", w: 2.5 },
  { id: "shield", name: "Shield", desc: "Blocks one hit, or one bite", icon: "i_shield", w: 2 },
  { id: "heart", name: "+1 heart", desc: "Patched up", icon: "i_heart", w: 2 },
  { id: "lantern", name: "Lantern", desc: "See further for a while", icon: "i_lantern", w: 1.4, t: 16 },
  { id: "magnet", name: "Gem magnet", desc: "Pulls in nearby gems", icon: "i_magnet", w: 2, t: 12 },
  { id: "repel", name: "Stink bomb", desc: "The Gulper backs off", icon: "i_repel", w: 2 },
  { id: "gold", name: "Gold rush", desc: "Every bit of dirt pays", icon: "i_gold", w: 1.5, t: 10 },
];
const BAD = [
  { id: "dizzy", name: "Dizzy!", desc: "Left is right, right is left", icon: "i_dizzy", w: 2, t: 6 },
  { id: "sore", name: "Sore arms", desc: "Digging is slow for a bit", icon: "i_sore", w: 2, t: 7 },
  { id: "dark", name: "Blackout", desc: "Your lamp sputters", icon: "i_dark", w: 2, t: 8 },
  { id: "bait", name: "You smell tasty", desc: "The Gulper speeds up", icon: "i_bait", w: 2, t: 7 },
  { id: "rockfall", name: "Rockfall!", desc: "Look up. Move!", icon: "i_rockfall", w: 2 },
];
const FX_META = Object.fromEntries([...GOOD, ...BAD].filter((e) => e.t).map((e) => [e.id, e]));
const isBadFx = (id) => BAD.some((b) => b.id === id);

// ================= run state =================
let S = null, rnd = Math.random, mode = "title", overReady = false;

function freshMods() {
  return { dig: 1, worm: 1, gem: 1, light: 0, luck: 0, boulderSafe: false, bombR: 1, fuse: 1, crates: 1, gems: 1, score: 1,
    goodTime: 1, badTime: 1, craft: 12, nightEyes: false, fall: 1, hazards: 1, boulders: 1, hardMore: 1, knock: 1, surge: 1 };
}
function newRun() {
  const seed = (Math.random() * 2 ** 31) | 0;
  rnd = mulberry32(seed);
  S = {
    seed, rows: [], genY: 0, lastSlab: -99,
    P: { x: 4, y: -1, px: 4, py: -1, fromX: 4, fromY: -1, mv: 1, mvDur: MOVE_T, moving: false, falling: false, fallN: 0, face: 1,
      dig: null, digAnim: 0, digTick: 0, squash: 0, blink: 2, hurtT: 0, inv: 0, dead: false, bob: 0 },
    path: [{ x: 4, y: -1 }], pidx: new Map([["4,-1", 0]]),
    worm: { w: 0, active: false, stall: 0, stun: 0, surgeT: 0, warnT: 0, nextSurge: 70, roarCD: 0, eat: 0 },
    maxDepth: 0, score: 0, gems: 0, gemCraft: 0, bombs: 1, hearts: 3, maxHearts: 3, shields: 0,
    fx: { drill: 0, lantern: 0, magnet: 0, gold: 0, dizzy: 0, sore: 0, dark: 0, bait: 0 },
    M: freshMods(), pacts: [],
    combo: 0, comboT: 0, magnetT: 0,
    wobbles: [], falls: [], fuses: [], lavaT: new Map(), parts: [], floats: [], flashes: [],
    shake: 0, hitstop: 0, time: 0, cam: -4, camX: 0, nextBiome: 100, nextShrine: 50, hintT: 0, hinted: {},
    over: false, cause: "", flash: 0, redPulse: 0,
  };
  genUntil(48);
}

// ================= world generation =================
function rowAt(y) { genUntil(y); return S.rows[y]; }
function get(x, y) {
  if (x < 0 || x >= COLS) return BED;
  if (y < 0) return E;
  return rowAt(y).t[x];
}
function setT(x, y, t) { if (x < 0 || x >= COLS || y < 0) return; const r = rowAt(y); r.t[x] = t; r.hp[x] = 0; }
function genUntil(y) { while (S.genY <= y + 1) genRow(S.genY++); }

function genRow(y) {
  const r = { t: new Uint8Array(COLS), hp: new Float32Array(COLS), g: new Uint8Array(COLS), v: new Uint8Array(COLS) };
  S.rows[y] = r;
  const B = BIOMES[biomeIdx(y)], M = S.M, lap = biomeLap(y);
  const d = y;
  for (let x = 0; x < COLS; x++) r.v[x] = (hash2(x, y, S.seed) * 2) | 0;
  if (isShrineRow(y)) { r.t.fill(RUNE); return; }
  // difficulty ramps with depth, not just biome
  const pRock = clamp(B.rock + d / 4000 + lap * 0.02, 0, 0.42);
  const pHard = clamp((d < 40 ? 0 : B.hard + (d - 40) / 6000 + lap * 0.02) * M.hardMore, 0, 0.32);
  const caveThr = B.cave - Math.min(0.06, d / 8000);
  const pGem = (0.045 + B.gemB * 0.03) * M.gems;
  const pCrate = 0.012 * M.crates;
  const pTnt = d < 70 ? 0 : clamp(0.006 + d / 40000, 0, 0.022) * M.hazards;
  const pBoulder = (d < 6 ? 0 : clamp(0.02 + d / 12000, 0, 0.06)) * M.boulders;
  const pLava = (B.lava + (d > 250 ? 0.01 : 0)) * M.hazards;
  for (let x = 0; x < COLS; x++) {
    let t = DIRT;
    const cave = vnoise(x * 0.42, y * 0.2, S.seed) * 0.65 + vnoise(x * 0.9 + 50, y * 0.45, S.seed + 7) * 0.35;
    const vein = vnoise(x * 0.55 + 100, y * 0.33, S.seed + 3);
    if (y > 5 && cave > caveThr) t = E;
    else {
      const k = 0.35 + vein * 1.3;
      const q = rnd();
      if (y > 1 && q < pHard * k) t = HARD;
      else if (y > 1 && q < (pHard + pRock) * k) t = ROCK;
    }
    if (t === DIRT && y > 1) {
      const q = rnd();
      if (q < pGem) { t = GEM; r.g[x] = pickGem(d); }
      else if (q < pGem + pCrate) t = CRATE;
      else if (q < pGem + pCrate + pTnt) t = TNT;
      else if (q < pGem + pCrate + pTnt + pBoulder) t = BOULDER;
      else if (pLava && q < pGem + pCrate + pTnt + pBoulder + pLava * 0.35) t = LAVA;
    } else if (t === E && pLava && rnd() < pLava * 0.5) t = LAVA;
    r.t[x] = t;
  }
  // bedrock slabs from 120 m
  if (d >= 120 && y - S.lastSlab > 3 && rnd() < clamp(0.05 + d / 12000, 0, 0.12)) {
    const len = 2 + ((rnd() * 3) | 0), x0 = (rnd() * (COLS - len + 1)) | 0;
    for (let x = x0; x < x0 + len; x++) r.t[x] = BED;
    S.lastSlab = y;
  }
  // first rows stay friendly
  if (y <= 1) for (let x = 0; x < COLS; x++) r.t[x] = DIRT;
  // settle the row above: nothing heavy hangs over a hole at birth
  if (y > 0) {
    const up = S.rows[y - 1];
    for (let x = 0; x < COLS; x++) if (r.t[x] === E && (up.t[x] === BOULDER || up.t[x] === LAVA)) up.t[x] = up.t[x] === BOULDER ? ROCK : E;
  }
}
function pickGem(d) {
  const w = [Math.max(0.6, 10 - d / 50), 6, Math.min(6, d / 60), Math.min(5, d / 140), Math.min(3, Math.max(0, (d - 150) / 300))];
  let tot = w.reduce((a, b) => a + b, 0), q = rnd() * tot;
  for (let i = 0; i < w.length; i++) { q -= w[i]; if (q <= 0) return i; }
  return 0;
}

// ================= path / worm =================
function pushPath(x, y) {
  const key = x + "," + y, W = S.worm;
  if (S.pidx.has(key)) {
    const i = S.pidx.get(key);
    for (let j = S.path.length - 1; j > i; j--) { const p = S.path[j]; S.pidx.delete(p.x + "," + p.y); }
    S.path.length = i + 1;
    if (i > W.w + 3 && S.path.length > 4 && !S.hinted.loop && W.active) { S.hinted.loop = true; toastMsg("i_bait", "Shortcut!", "Doubling back lets it cut the corner", "bad"); }
    return;
  }
  S.pidx.set(key, S.path.length);
  S.path.push({ x, y });
}
function lead() { return S.path.length - 1 - S.worm.w; }
function pathPos(f) {
  f = clamp(f, 0, S.path.length - 1);
  const i = Math.floor(f), t = f - i, a = S.path[i], b = S.path[Math.min(i + 1, S.path.length - 1)];
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), dx: b.x - a.x, dy: b.y - a.y };
}
function wormSpeed() {
  const d = S.maxDepth;
  let v = 1.55 + 2.4 * (1 - Math.exp(-d / 260)) + d * 0.0016;
  v *= S.M.worm;
  if (S.fx.bait > 0) v *= 1.5;
  if (S.worm.surgeT > 0) v *= 1.8;
  const L = lead();
  if (L > 24) v *= Math.min(2.8, 1 + (L - 24) * 0.07);
  else if (L < 4) v *= 0.82;
  return v;
}
function updateWorm(dt) {
  const W = S.worm;
  if (!W.active) {
    if (S.maxDepth >= WAKE_DEPTH) {
      W.active = true; sfx("roar", 0.9); shake(0.5);
      banner("Something woke up", "The Gulper", "It follows your exact tunnel. Keep moving.", true);
    }
    return;
  }
  W.roarCD -= dt;
  // surges: the worm lunges every so often once you're past 120 m
  if (S.maxDepth > 120) {
    if (W.surgeT > 0) W.surgeT -= dt;
    else if (W.warnT > 0) { W.warnT -= dt; if (W.warnT <= 0) W.surgeT = 4.5; }
    else { W.nextSurge -= dt * S.M.surge; if (W.nextSurge <= 0) { W.warnT = 1.6; W.nextSurge = 45 + rnd() * 35; sfx("roar", 0.9); shake(0.6); banner("", "It surges!", "", true, 1); } }
  }
  if (W.stun > 0) { W.stun -= dt; return; }
  if (W.stall > 0) { W.stall -= dt; W.eat += dt; if (W.eat > 0.12) { W.eat = 0; const h = pathPos(W.w); burst(h.x + 0.5 + h.dx * 0.5, h.y + 0.5 + h.dy * 0.5, 4, "#8d857b", 3); } return; }
  const nw = W.w + wormSpeed() * dt;
  const end = S.path.length - 1;
  for (let i = Math.max(1, Math.floor(W.w) + 1); i <= Math.min(Math.floor(nw), end); i++) {
    const p = S.path[i];
    if (p.x === S.P.x && p.y === S.P.y) break;
    const t = get(p.x, p.y);
    if (t !== E) {
      W.w = i - 1 + 0.6;
      W.stall = (t === BOULDER ? 1.3 : t === LAVA ? 0.8 : 0.5) * (t === BOULDER ? S.M.knock : 1);
      if (t === TNT) { lightFuse(p.x, p.y, 0.1); }
      else { setT(p.x, p.y, E); }
      sfx("crash", 0.5, 0.8); floatText(p.x + 0.5, p.y, "CHOMP", "#ff9a8a");
      return;
    }
  }
  W.w = Math.min(nw, end);
  const L = lead();
  if (L < 0.55 && !S.P.dead) {
    if (S.shields > 0) {
      S.shields--; W.w = Math.max(0, W.w - 10); W.stun = 1.3; S.P.inv = 1.2;
      sfx("shield"); sfx("roar", 0.6); shake(0.5); floatText(S.P.x + 0.5, S.P.y, "SHIELD!", "#8fd0ff"); flashScreen("#58b6ff", 0.35);
    } else die("worm");
  } else if (L < 7 && W.roarCD <= 0) { W.roarCD = 7 + rnd() * 5; sfx("roar", 0.5, 1.15); }
}

// ================= player =================
function digMul() {
  let m = S.M.dig;
  if (S.fx.drill > 0) m *= 3;
  if (S.fx.sore > 0) m *= 0.45;
  return m;
}
function startMove(dx, dy, dur) {
  const P = S.P;
  P.fromX = P.x; P.fromY = P.y; P.x += dx; P.y += dy; P.mv = 0; P.mvDur = dur; P.moving = true;
  pushPath(P.x, P.y);
  if (P.y > S.maxDepth) onNewDepth(P.y);
}
function onNewDepth(y) {
  const gained = y - Math.max(0, S.maxDepth);
  S.maxDepth = y;
  if (gained > 0) S.score += gained * 10 * S.M.score;
  genUntil(y + 40);
  if (y >= S.nextBiome) {
    S.nextBiome += 100;
    sfx("milestone");
    let sub = "";
    if (S.hearts < S.maxHearts) { S.hearts++; sub = "A breather. +1 heart."; setTimeout(() => sfx("heart", 0.8), 400); }
    banner(y + " metres", biomeName(y), sub);
  }
}
function updatePlayer(dt) {
  const P = S.P;
  if (P.dead) return;
  P.inv = Math.max(0, P.inv - dt);
  P.squash = Math.max(0, P.squash - dt * 4);
  P.blink -= dt; if (P.blink < -0.12) P.blink = 2 + rnd() * 3;
  if (P.moving) {
    P.mv += dt / P.mvDur;
    if (P.mv >= 1) { P.mv = 1; P.moving = false; arrive(); }
    else return;
  }
  // gravity
  const below = get(P.x, P.y + 1);
  if (below === E) {
    P.falling = true; P.fallN++;
    startMove(0, 1, Math.max(FALL_TMIN, FALL_T0 - P.fallN * 0.014) / S.M.fall);
    return;
  }
  if (below === LAVA) { hurt("lava"); }
  if (P.falling) {
    P.falling = false;
    if (P.fallN > 1) { P.squash = Math.min(1, 0.3 + P.fallN * 0.08); sfx("land", Math.min(1, 0.4 + P.fallN * 0.08)); burst(P.x + 0.5, P.y + 1, 6, BIOMES[biomeIdx(P.y + 1)].dust, 2); if (P.fallN > 5) shake(0.15); }
    P.fallN = 0;
  }
  const dir = inputDir();
  if (!dir) { P.dig = null; return; }
  const { dx, dy } = dir;
  if (dx) P.face = dx;
  const tx = P.x + dx, ty = P.y + dy;
  if (tx < 0 || tx >= COLS) { P.dig = null; return; }
  const t = get(tx, ty);
  if (t === E) {
    P.dig = null; startMove(dx, dy, MOVE_T);
    if (!P.falling) sfx("step", 0.6, 0.9 + rnd() * 0.3);
    return;
  }
  if (t === LAVA) { hurt("lava"); P.dig = null; return; }
  if (t === BED) {
    if (!P.dig || P.dig.x !== tx || P.dig.y !== ty) { sfx("clank", 0.6, 0.6); P.dig = { x: tx, y: ty, dx, dy, bed: true }; P.digTick = 0; if (!S.hinted.bed) { S.hinted.bed = true; toastMsg("bedrock", "Bedrock", "Too hard to dig. Go around, or bomb it", "bad"); } }
    P.digAnim += dt; P.digTick += dt; if (P.digTick > 0.35) { P.digTick = 0; sfx("clank", 0.4, 0.6); sparks(tx + 0.5 - dx * 0.45, ty + 0.5 - dy * 0.45, 3); }
    return;
  }
  const r = rowAt(ty);
  if (t === TNT && S.fuses.some((f) => f.x === tx && f.y === ty)) { P.dig = null; return; }
  if (!P.dig || P.dig.x !== tx || P.dig.y !== ty) { P.dig = { x: tx, y: ty, dx, dy }; P.digTick = 0.06; }
  const hardMul = 1 + biomeLap(ty) * 0.08 + (ty > 500 ? 0.1 : 0);
  r.hp[tx] += dt * digMul() / (HARDNESS[t] * hardMul);
  P.digAnim += dt * (S.fx.drill > 0 ? 2.2 : 1);
  P.digTick += dt;
  const tickEvery = S.fx.drill > 0 ? 0.06 : 0.11;
  if (P.digTick >= tickEvery) {
    P.digTick = 0;
    const B = BIOMES[biomeIdx(ty)];
    const cx = tx + 0.5 - dx * 0.45, cy = ty + 0.5 - dy * 0.45 + (dy ? 0 : 0.1);
    if (t === ROCK || t === BOULDER) { sfx("chip", 0.7, 0.9 + rnd() * 0.25); burst(cx, cy, 2, B.chip, 2.2); }
    else if (t === HARD) { sfx("clank", 0.55, 0.9 + rnd() * 0.25); sparks(cx, cy, 2); burst(cx, cy, 1, B.chip, 2); }
    else { sfx("dig" + (1 + ((rnd() * 3) | 0)), 0.75); burst(cx, cy, 2, B.dust, 2); }
  }
  if (r.hp[tx] >= 1) {
    r.hp[tx] = 0;
    if (t === TNT) { lightFuse(tx, ty); P.dig = null; return; }
    breakTile(tx, ty, "dig");
    P.dig = null;
  }
}
function arrive() {
  const P = S.P;
  // landing in a gold rush etc handled elsewhere; check what we stepped into
  if (isShrineRow(P.y) && P.y >= S.nextShrine) { S.nextShrine = P.y + 100; openShrine(P.y); }
}
function hurt(cause) {
  const P = S.P;
  if (P.inv > 0 || P.dead) return;
  if (S.shields > 0) { S.shields--; P.inv = 1; sfx("shield"); floatText(P.x + 0.5, P.y, "SHIELD!", "#8fd0ff"); flashScreen("#58b6ff", 0.3); return; }
  S.hearts--; P.inv = 1.4; P.hurtT = 0.5;
  sfx(cause === "lava" ? "sizzle" : "hurt"); if (cause === "lava") sfx("hurt", 0.7);
  shake(0.45); S.hitstop = 0.08; flashScreen("#e2474b", 0.35);
  if (S.hearts <= 0) die(cause);
}
function die(cause) {
  const P = S.P;
  if (P.dead) return;
  P.dead = true; S.cause = cause;
  if (mode === "title") return; S.hearts = Math.max(0, S.hearts);
  if (cause === "worm") { sfx("gulp"); sfx("roar", 0.8, 0.9); shake(0.9); flashScreen("#2a0710", 0.7); }
  else { burst(P.x + 0.5, P.y + 0.5, 18, "#c8956a", 4); shake(0.6); }
  const run = S;
  setTimeout(() => { if (S === run) sfx("gameover", 0.8); }, 500);
  setTimeout(() => { if (S === run) gameOver(); }, 1500);
}

// ================= tiles breaking =================
function breakTile(x, y, cause) {
  const t = get(x, y); if (t === E) return;
  const r = rowAt(y);
  const B = BIOMES[biomeIdx(y)];
  setT(x, y, E);
  const cx = x + 0.5, cy = y + 0.5;
  if (t === ROCK || t === HARD || t === BOULDER || t === BED) { if (cause === "dig") sfx("break", 0.8, 0.9 + rnd() * 0.2); burst(cx, cy, 10, B.chip, 3.2); burst(cx, cy, 5, B.dust, 2.5); }
  else if (t === RUNE) { burst(cx, cy, 10, "#b9a4ff", 3); }
  else if (t === LAVA) { burst(cx, cy, 8, "#ffb040", 3); }
  else { if (cause === "dig") sfx("dig" + (1 + ((rnd() * 3) | 0)), 0.9, 0.85); burst(cx, cy, 8, B.dust, 2.6); }
  if (t === GEM) collectGem(x, y, r.g[x]);
  if (t === CRATE) openCrate(x, y);
  if (S.fx.gold > 0 && (t === DIRT || t === ROCK || t === HARD) && cause === "dig") { const v = Math.round(5 * S.M.score); S.score += v; floatText(cx, y, "+" + v, "#ffd25a", 0.8); coins(cx, cy); }
}
function collectGem(x, y, g) {
  const k = GEM_KINDS[g];
  S.combo = S.comboT > 0 ? Math.min(12, S.combo + 1) : 1; S.comboT = 2.8;
  const mult = Math.min(4, 1 + (S.combo - 1) * 0.5);
  const pts = Math.round(k.v * mult * S.M.gem * S.M.score);
  S.score += pts; S.gems++; S.gemCraft++;
  sfx("gem", 0.8, Math.pow(2, Math.min(S.combo - 1, 10) / 12));
  floatText(x + 0.5, y, "+" + pts + (S.combo > 1 ? "  ×" + mult : ""), "#fff4dc", 1 + Math.min(0.5, S.combo * 0.05));
  sparkle(x + 0.5, y + 0.5, k.id);
  if (S.gemCraft >= S.M.craft) {
    S.gemCraft = 0;
    if (S.bombs < 9) { S.bombs++; setTimeout(() => sfx("craft", 0.8), 120); floatText(S.P.x + 0.5, S.P.y - 0.6, "BOMB CRAFTED", "#ffd25a", 1.1); }
  }
}
function openCrate(x, y) {
  sfx("crate");
  const pGood = clamp(0.68 - S.maxDepth / 3000 + S.M.luck, 0.15, 0.95);
  const good = rnd() < pGood;
  let e = pickWeighted(good ? GOOD : BAD, rnd());
  if (e.id === "heart" && S.hearts >= S.maxHearts) e = GOOD[0];
  applyEffect(e, good, x, y);
}
function applyEffect(e, good, x, y) {
  setTimeout(() => sfx(good ? "powerup" : "powerdown", 0.85), 100);
  toastMsg(e.icon, e.name, e.desc, good ? "good" : "bad");
  burst(x + 0.5, y + 0.5, 14, good ? "#7fe08a" : "#c77dff", 3);
  if (e.t) S.fx[e.id] = Math.max(S.fx[e.id], e.t * (good ? S.M.goodTime : S.M.badTime));
  switch (e.id) {
    case "bombs": S.bombs = Math.min(9, S.bombs + 2); break;
    case "shield": S.shields = Math.min(3, S.shields + 1); break;
    case "heart": S.hearts = Math.min(S.maxHearts, S.hearts + 1); break;
    case "repel": if (S.worm.active) { S.worm.w = Math.max(0, S.worm.w - 16); S.worm.stun = 1.5; } break;
    case "rockfall": rockfall(); break;
  }
}
function rockfall() {
  const P = S.P;
  shake(0.4); sfx("wobble", 1);
  let n = 0;
  for (let k = 0; k < 4; k++) {
    const x = clamp(P.x + Math.round((rnd() - 0.5) * 3), 0, COLS - 1);
    const y0 = P.y - 4 - k * 2 - ((rnd() * 2) | 0);
    // drop into the nearest open cell above you
    for (let y = y0; y > y0 - 6; y--) {
      if (y < 0) break;
      if (get(x, y) === E) { S.falls.push({ x, y, vy: 0, delay: 0.5 + k * 0.25 }); n++; break; }
    }
  }
  if (!n) S.falls.push({ x: P.x, y: P.y - 5, vy: 0, delay: 0.6 });
}

// ================= hazards: boulders, lava, TNT =================
function lightFuse(x, y, t) {
  if (S.fuses.some((f) => f.x === x && f.y === y)) return;
  S.fuses.push({ x, y, t: t != null ? t : 1.5 * S.M.fuse, max: t != null ? t : 1.5 * S.M.fuse });
  if (t == null) { sfx("fuse", 0.8); if (!S.hinted.tnt) { S.hinted.tnt = true; toastMsg("tnt", "Lit!", "Get clear of the TNT", "bad"); } }
}
function explode(cx, cy, R, src) {
  sfx("bomb", src === "bomb" ? 0.9 : 1);
  shake(src === "bomb" ? 0.55 : 0.75); S.hitstop = 0.05;
  S.flashes.push({ x: cx + 0.5, y: cy + 0.5, r: R + 2.5, t: 0.4, max: 0.4 });
  for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
    if (x < 0 || x >= COLS || y < 0) continue;
    if (src === "bomb" && x === S.P.x && y === S.P.y) continue;
    const t = get(x, y);
    if (t === TNT && !(x === cx && y === cy)) { lightFuse(x, y, 0.15); continue; }
    if (t !== E) breakTile(x, y, "blast");
    fire(x + 0.5, y + 0.5, 3);
  }
  for (let i = 0; i < 18; i++) S.parts.push({ x: cx + 0.5, y: cy + 0.5, vx: (rnd() - 0.5) * 9, vy: (rnd() - 0.5) * 9, life: 0.9 + rnd() * 0.6, max: 1.5, c: "#3a332c", s: 0.35 + rnd() * 0.3, g: -1, smoke: true });
  const P = S.P;
  if (src !== "bomb" && Math.abs(P.x - cx) <= R && Math.abs(P.y - cy) <= R) hurt("tnt");
  // the Gulper hates loud noises
  if (S.worm.active) {
    const h = pathPos(S.worm.w);
    const near = Math.hypot(h.x - cx, h.y - cy) <= R + 2.5 || (src === "bomb" && lead() < 8);
    if (near) {
      S.worm.w = Math.max(0, S.worm.w - 7 * S.M.knock); S.worm.stun = 1.6; sfx("roar", 0.6, 1.2);
      const h2 = pathPos(S.worm.w); floatText(h2.x + 0.5, h2.y, "KNOCKED BACK", "#ffd25a", 1.1);
    }
  }
}
function useBomb() {
  const P = S.P;
  if (P.dead || S.bombs <= 0) { if (S.bombs <= 0) sfx("click", 0.6, 0.7); return; }
  S.bombs--;
  explode(P.x, P.y + S.M.bombR, S.M.bombR, "bomb");
}
function updateHazards(dt) {
  const P = S.P;
  const top = Math.max(0, Math.floor(S.cam) - 6), bot = Math.floor(S.cam + VIEW_ROWS) + 8;
  // unstable boulders and lava
  for (let y = top; y <= bot; y++) {
    const r = rowAt(y), rb = rowAt(y + 1);
    for (let x = 0; x < COLS; x++) {
      const t = r.t[x];
      if (t === BOULDER && rb.t[x] === E && !S.wobbles.some((w) => w.x === x && w.y === y)) { S.wobbles.push({ x, y, t: 0.5 }); sfx("wobble", 0.7); }
      if (t === LAVA && rb.t[x] === E) {
        const k = y * COLS + x;
        const tt = (S.lavaT.get(k) || 0) + dt;
        if (tt > 0.16) {
          S.lavaT.delete(k);
          if (P.x === x && P.y === y + 1) { r.t[x] = E; hurt("lava"); burst(x + 0.5, y + 1.2, 8, "#ffb040", 3); }
          else { r.t[x] = E; rb.t[x] = LAVA; S.lavaT.set((y + 1) * COLS + x, -0.02); }
        } else S.lavaT.set(k, tt);
      }
    }
  }
  for (let i = S.wobbles.length - 1; i >= 0; i--) {
    const w = S.wobbles[i];
    if (get(w.x, w.y) !== BOULDER) { S.wobbles.splice(i, 1); continue; }
    w.t -= dt;
    if (w.t <= 0) { S.wobbles.splice(i, 1); setT(w.x, w.y, E); S.falls.push({ x: w.x, y: w.y, vy: 1, delay: 0 }); }
  }
  for (let i = S.falls.length - 1; i >= 0; i--) {
    const f = S.falls[i];
    if (f.delay > 0) { f.delay -= dt; if (f.delay <= 0) sfx("wobble", 0.5); continue; }
    f.vy = Math.min(16, f.vy + 34 * dt);
    const ny = f.y + f.vy * dt;
    let done = false;
    for (let cell = Math.floor(f.y) + 1; cell <= Math.floor(ny) + 1; cell++) {
      const pc = P.moving ? (P.mv > 0.5 ? { x: P.x, y: P.y } : { x: P.fromX, y: P.fromY }) : { x: P.x, y: P.y };
      if (f.x === pc.x && cell === pc.y && !P.dead) {
        // hit the mole
        S.falls.splice(i, 1); done = true;
        sfx("crash", 0.9); burst(f.x + 0.5, pc.y, 14, "#8d857b", 3.5);
        if (S.M.boulderSafe) { floatText(pc.x + 0.5, pc.y - 0.5, "BONK", "#fff4dc", 1.1); shake(0.3); }
        else hurt("boulder");
        break;
      }
      const t = get(f.x, cell);
      if (t !== E) {
        const y = cell - 1;
        if (y >= 0) setT(f.x, y, BOULDER);
        sfx("crash", 0.75, 0.9 + rnd() * 0.2); shake(0.25); burst(f.x + 0.5, y + 1, 8, "#8d857b", 2.5);
        if (t === TNT) lightFuse(f.x, cell, 0.4);
        S.falls.splice(i, 1); done = true; break;
      }
    }
    if (!done) f.y = ny;
  }
  for (let i = S.fuses.length - 1; i >= 0; i--) {
    const f = S.fuses[i];
    f.t -= dt;
    if (get(f.x, f.y) !== TNT) { S.fuses.splice(i, 1); continue; }
    if (f.t <= 0) { S.fuses.splice(i, 1); setT(f.x, f.y, E); explode(f.x, f.y, 1, "tnt"); }
  }
}

// ================= effects / particles =================
function shake(a) { if (!reduceMotion) S.shake = Math.max(S.shake, a); }
function flashScreen(c, a) { S.flash = a; S.flashC = c; }
function burst(x, y, n, c, sp) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: (rnd() - 0.5) * sp * 2, vy: -rnd() * sp * 1.4 - 0.5, life: 0.35 + rnd() * 0.45, max: 0.8, c, s: 0.06 + rnd() * 0.09, g: 22 }); }
function sparks(x, y, n) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: (rnd() - 0.5) * 8, vy: -rnd() * 6, life: 0.2 + rnd() * 0.2, max: 0.4, c: "#ffe9a8", s: 0.04, g: 20, glow: true }); }
function fire(x, y, n) { for (let i = 0; i < n; i++) S.parts.push({ x: x + (rnd() - 0.5) * 0.6, y: y + (rnd() - 0.5) * 0.6, vx: (rnd() - 0.5) * 3, vy: -rnd() * 3, life: 0.3 + rnd() * 0.4, max: 0.7, c: rnd() < 0.5 ? "#ffcf4a" : "#ff6a1a", s: 0.18 + rnd() * 0.18, g: -3, glow: true }); }
function coins(x, y) { for (let i = 0; i < 3; i++) S.parts.push({ x, y, vx: (rnd() - 0.5) * 4, vy: -2 - rnd() * 3, life: 0.6, max: 0.6, c: "#ffd25a", s: 0.08, g: 18, glow: true }); }
const GEMC = { amber: "#ffcf5a", emerald: "#5fe08a", sapphire: "#5aa8ff", ruby: "#ff5a6e", diamond: "#e8fbff" };
function sparkle(x, y, id) { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; S.parts.push({ x, y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 0.45, max: 0.45, c: GEMC[id], s: 0.07, g: 0, glow: true, drag: 3 }); } }
function floatText(x, y, txt, c, sc = 1) { S.floats.push({ x, y, txt, c, t: 0, max: 1.1, sc }); }
function updateParts(dt) {
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.life -= dt; if (p.life <= 0) { S.parts.splice(i, 1); continue; }
    p.vy += p.g * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    if (p.smoke) { p.vx *= 1 - 2.5 * dt; p.vy *= 1 - 2.5 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  if (S.parts.length > 600) S.parts.splice(0, S.parts.length - 600);
  for (let i = S.floats.length - 1; i >= 0; i--) { const f = S.floats[i]; f.t += dt; if (f.t > f.max) S.floats.splice(i, 1); }
  for (let i = S.flashes.length - 1; i >= 0; i--) { const f = S.flashes[i]; f.t -= dt; if (f.t <= 0) S.flashes.splice(i, 1); }
}

// ================= main update =================
function update(dt) {
  if (S.hitstop > 0) { S.hitstop -= dt; dt *= 0.08; }
  S.time += dt;
  for (const k in S.fx) if (S.fx[k] > 0) S.fx[k] = Math.max(0, S.fx[k] - dt);
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  if (S.fx.magnet > 0) {
    S.magnetT -= dt;
    if (S.magnetT <= 0) {
      S.magnetT = 0.12;
      const P = S.P;
      for (let y = P.y - 2; y <= P.y + 2; y++) for (let x = P.x - 2; x <= P.x + 2; x++) {
        if (y < 0 || x < 0 || x >= COLS) continue;
        const r = rowAt(y);
        if (r.t[x] === GEM) { r.t[x] = DIRT; collectGem(x, y, r.g[x]); S.parts.push({ x: x + 0.5, y: y + 0.5, vx: (P.x - x) * 6, vy: (P.y - y) * 6, life: 0.18, max: 0.18, c: GEMC[GEM_KINDS[r.g[x]].id], s: 0.14, g: 0, glow: true }); }
      }
    }
  }
  updatePlayer(dt);
  updateHazards(dt);
  updateWorm(dt);
  updateParts(dt);
  S.shake = Math.max(0, S.shake - dt * 1.8);
  S.flash = Math.max(0, S.flash - dt * 1.6);
  // camera
  const P = S.P;
  const py = P.moving ? lerp(P.fromY, P.y, P.mv) : P.y;
  const target = py - VIEW_ROWS * 0.36;
  S.cam = lerp(S.cam, target, 1 - Math.exp(-dt * (P.falling ? 12 : 7)));
  if (S.cam < -4.5) S.cam = -4.5;
  // tutorial nudges
  if (!S.hinted.dig && S.time > 1.2 && S.maxDepth < 1) { S.hinted.dig = true; toastMsg("mole", "Hold to dig", COARSE ? "Hold ▼ to dig down" : "Hold ↓ (or S) to dig down", "good"); }
  // the Gulper's rumble gets louder as it gets closer
  if (rumbleGain && actx) {
    const L = S.worm.active && !S.P.dead ? lead() : 99;
    const v = S.worm.active ? clamp(1 - (L - 2) / 18, 0.05, 1) : 0;
    rumbleGain.gain.setTargetAtTime(v * 0.9, actx.currentTime, 0.2);
  }
  S.redPulse = S.worm.active ? clamp(1 - (lead() - 2) / 6, 0, 1) : 0;
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
  const y0 = Math.floor(cam) - 1, y1 = Math.ceil(cam + VIEW_ROWS) + 1;
  // sky
  if (y0 < 0) {
    const g = ctx.createLinearGradient(0, Y(-6), 0, Y(0));
    g.addColorStop(0, "#5aa8e8"); g.addColorStop(1, "#ffe0b0");
    ctx.fillStyle = g; ctx.fillRect(0, Y(-12), W, Y(0) - Y(-12) + 1);
    ctx.fillStyle = "#fff4c8"; ctx.beginPath(); ctx.arc(X(COLS - 1.2), Y(-3.4), TS * 0.8, 0, 7); ctx.fill();
    ctx.fillStyle = "#3f8f4f";
    ctx.beginPath(); ctx.moveTo(0, Y(0));
    for (let i = 0; i <= 12; i++) { const xx = (i / 12) * W; ctx.lineTo(xx, Y(-0.8 - Math.sin(i * 1.3) * 0.5 - 0.4)); }
    ctx.lineTo(W, Y(0)); ctx.closePath(); ctx.fill();
  }
  // side walls (decorative, undiggable)
  for (let y = Math.max(0, y0); y <= y1; y++) {
    const bi = BIOMES[biomeIdx(y)].id;
    for (let x = -Math.ceil(OX / TS) - 1; x < 0; x++) spr(`dirt_${bi}_${(x + y) & 1}`, X(x) + TS / 2, Y(y) + TS / 2, u * 1.002);
    for (let x = COLS; x < COLS + Math.ceil(OX / TS) + 1; x++) spr(`dirt_${bi}_${(x + y) & 1}`, X(x) + TS / 2, Y(y) + TS / 2, u * 1.002);
  }
  if (OX > 0) {
    ctx.fillStyle = "rgba(5,3,2,.55)"; ctx.fillRect(0, Y(Math.max(0, y0)), OX, H + TS * 4); ctx.fillRect(X(COLS), Y(Math.max(0, y0)), W - X(COLS), H + TS * 4);
    const gl = ctx.createLinearGradient(OX - 10, 0, OX, 0); gl.addColorStop(0, "rgba(0,0,0,0)"); gl.addColorStop(1, "rgba(0,0,0,.5)");
    ctx.fillStyle = gl; ctx.fillRect(OX - 10, Y(Math.max(0, y0)), 10, H + TS * 4);
    const gr = ctx.createLinearGradient(X(COLS), 0, X(COLS) + 10, 0); gr.addColorStop(0, "rgba(0,0,0,.5)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr; ctx.fillRect(X(COLS), Y(Math.max(0, y0)), 10, H + TS * 4);
  }
  // tiles
  for (let y = Math.max(0, y0); y <= y1; y++) {
    const r = rowAt(y);
    const B = BIOMES[biomeIdx(y)], bi = B.id;
    for (let x = 0; x < COLS; x++) {
      const t = r.t[x], cx = X(x) + TS / 2, cy = Y(y) + TS / 2;
      if (t === E || t === LAVA) {
        spr(`wall_${bi}`, cx, cy, u * 1.002);
        // soft inner shadows from solid neighbours
        const up = y > 0 ? rowAt(y - 1).t[x] : E;
        if (up !== E && up !== LAVA) ctx.drawImage(SHADOW.top, X(x), Y(y), TS, TS * 0.4);
        const l = get(x - 1, y), rr = get(x + 1, y);
        if (l !== E && l !== LAVA) ctx.drawImage(SHADOW.left, X(x), Y(y), TS * 0.3, TS);
        if (rr !== E && rr !== LAVA) ctx.drawImage(SHADOW.right, X(x) + TS * 0.7, Y(y), TS * 0.3, TS);
        if (t === LAVA) {
          spr("lava", cx, cy, u * 1.002);
          ctx.fillStyle = `rgba(255,240,160,${0.15 + 0.15 * Math.sin(S.time * 4 + x * 1.7 + y)})`; ctx.fillRect(X(x), Y(y), TS, TS);
        }
        continue;
      }
      // solid
      if (t === DIRT || t === GEM || t === CRATE || t === TNT) spr(`dirt_${bi}_${r.v[x]}`, cx, cy, u * 1.002);
      if (t === ROCK) spr(`rock_${bi}`, cx, cy, u * 1.002);
      else if (t === HARD) spr(`hard_${bi}`, cx, cy, u * 1.002);
      else if (t === BED) spr("bedrock", cx, cy, u * 1.002);
      else if (t === RUNE) { spr("rune", cx, cy, u * 1.002); ctx.fillStyle = `rgba(185,164,255,${0.08 + 0.08 * Math.sin(S.time * 3 + x)})`; ctx.fillRect(X(x), Y(y), TS, TS); }
      else if (t === GEM) spr("gem_" + GEM_KINDS[r.g[x]].id, cx, cy, u * 0.85);
      else if (t === CRATE) spr("crate", cx, cy, u * 0.92);
      else if (t === TNT) {
        const lit = S.fuses.find((f) => f.x === x && f.y === y);
        let sc = 0.95;
        if (lit) { const k = 1 - lit.t / lit.max; sc = 0.95 + Math.abs(Math.sin(S.time * (10 + k * 30))) * 0.12 * (0.4 + k); }
        spr("tnt", cx, cy, u * sc);
        if (lit && Math.sin(S.time * (10 + (1 - lit.t / lit.max) * 30)) > 0) { ctx.fillStyle = "rgba(255,255,255,.45)"; ctx.fillRect(X(x) + TS * 0.08, Y(y) + TS * 0.08, TS * 0.84, TS * 0.84); }
      }
      else if (t === BOULDER) {
        spr(`wall_${bi}`, cx, cy, u * 1.002);
        const w = S.wobbles.find((q) => q.x === x && q.y === y);
        spr("boulder", cx + (w ? Math.sin(S.time * 50) * TS * 0.06 : 0), cy, u * 0.98);
      }
      // grass lip on the surface
      if (y === 0) { ctx.fillStyle = "#4fae55"; ctx.fillRect(X(x), Y(0) - TS * 0.06, TS, TS * 0.16); ctx.fillStyle = "#2f8a4f"; ctx.fillRect(X(x), Y(0) + TS * 0.1, TS, TS * 0.05); }
      // cracks while digging
      const hp = r.hp[x];
      if (hp > 0.02) drawCracks(X(x), Y(y), hp, x * 7 + y * 13);
      // a lit floor edge where the tile faces a dug space above
      if (y > 0) { const up = rowAt(y - 1).t[x]; if (up === E) { ctx.fillStyle = "rgba(255,240,210,.08)"; ctx.fillRect(X(x), Y(y), TS, TS * 0.07); } }
    }
  }
  // falling boulders
  for (const f of S.falls) {
    if (f.delay > 0) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(S.time * 30); }
    spr("boulder", X(f.x) + TS / 2, Y(f.y) + TS / 2, u * 0.98);
    ctx.globalAlpha = 1;
  }
  // the Gulper
  if (S.worm.active) drawWorm(X, Y, u);
  // the mole
  drawMole(X, Y, u);
  // particles
  for (const p of S.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.smoke ? a * 0.5 : a;
    ctx.fillStyle = p.c;
    const s = p.s * TS * (p.smoke ? (2 - a) : 1);
    if (p.smoke || p.glow) { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), s, 0, 7); ctx.fill(); }
    else ctx.fillRect(X(p.x) - s / 2, Y(p.y) - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  // darkness
  drawDark(X, Y, u);
  // things that glow through the dark
  for (const p of S.parts) if (p.glow) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1) * 0.8; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), p.s * TS * 0.8, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (S.worm.active) drawWormEyes(X, Y);
  // floating text
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of S.floats) {
    const k = f.t / f.max;
    ctx.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    const fs = Math.round(TS * 0.36 * f.sc * (k < 0.1 ? 0.6 + k * 4 : 1));
    ctx.font = `${fs}px "Lilita One", "Arial Black", sans-serif`;
    const yy = Y(f.y) - k * TS * 0.9;
    ctx.lineWidth = Math.max(3, fs * 0.22); ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.lineJoin = "round";
    ctx.strokeText(f.txt, X(f.x), yy); ctx.fillStyle = f.c; ctx.fillText(f.txt, X(f.x), yy);
  }
  ctx.globalAlpha = 1;
  // off-screen worm marker
  if (S.worm.active && !P.dead) {
    const h = pathPos(S.worm.w);
    if (Y(h.y) < 0) {
      const L = lead();
      const xx = clamp(X(h.x + 0.5), OX + 20, OX + COLS * TS - 20);
      if (!hudBottom) hudBottom = $("hud").hidden ? 20 : $("hud").getBoundingClientRect().bottom + 14;
      const ay = hudBottom + Math.sin(S.time * 6) * 2;
      ctx.fillStyle = L < 8 ? "#e2474b" : "rgba(226,71,75,.55)";
      ctx.beginPath(); ctx.moveTo(xx, ay + 6); ctx.lineTo(xx - 9, ay - 6); ctx.lineTo(xx + 9, ay - 6); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  // proximity vignette + screen flash
  if (S.redPulse > 0 && !P.dead) {
    const a = S.redPulse * (0.35 + 0.2 * Math.sin(S.time * (6 + S.redPulse * 6)));
    const g = ctx.createRadialGradient(W / 2, VIEW_H * 0.45, Math.min(W, H) * 0.25, W / 2, VIEW_H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(120,0,10,0)"); g.addColorStop(1, `rgba(150,10,20,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (S.worm.surgeT > 0 || S.worm.warnT > 0) { ctx.fillStyle = `rgba(160,20,30,${0.08 + 0.06 * Math.sin(S.time * 20)})`; ctx.fillRect(0, 0, W, H); }
  if (S.flash > 0) { ctx.globalAlpha = S.flash; ctx.fillStyle = S.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function drawCracks(x, y, hp, seed) {
  ctx.strokeStyle = "rgba(10,6,4,.75)"; ctx.lineWidth = Math.max(1.2, TS * 0.045); ctx.lineCap = "round";
  const n = 1 + Math.floor(hp * 4);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = hash2(seed, i, 1) * Math.PI * 2, len = TS * (0.18 + 0.3 * hp);
    const mx = x + TS / 2 + Math.cos(a + 0.5) * len * 0.5, my = y + TS / 2 + Math.sin(a + 0.5) * len * 0.5;
    ctx.moveTo(x + TS / 2, y + TS / 2); ctx.lineTo(mx, my); ctx.lineTo(x + TS / 2 + Math.cos(a) * len, y + TS / 2 + Math.sin(a) * len);
  }
  ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${hp * 0.12})`; ctx.fillRect(x, y, TS, TS);
}
function moleXY() {
  const P = S.P;
  let k = P.moving ? P.mv : 1;
  if (P.moving && !P.falling) k = 1 - (1 - k) * (1 - k);
  return { x: lerp(P.fromX, P.x, k), y: lerp(P.fromY, P.y, k) };
}
function drawMole(X, Y, u) {
  const P = S.P;
  if (P.dead && S.cause === "worm") return;
  const m = moleXY();
  const cx = X(m.x) + TS / 2, cy = Y(m.y) + TS / 2;
  if (P.inv > 0 && Math.sin(S.time * 40) > 0.3 && !P.dead) ctx.globalAlpha = 0.45;
  // squash on landing, bob while walking, shove while digging
  let sx = 1, sy = 1, ox = 0, oy = 0;
  if (P.squash > 0) { sx = 1 + P.squash * 0.3; sy = 1 - P.squash * 0.25; oy = TS * P.squash * 0.1; }
  if (P.falling) { sx = 0.9; sy = 1.1; }
  if (P.moving && !P.falling) oy -= Math.sin(P.mv * Math.PI) * TS * 0.08;
  const dig = P.dig && !P.dead;
  const swing = dig ? Math.sin(P.digAnim * (S.fx.drill > 0 ? 40 : 22)) : 0;
  if (dig) { ox += P.dig.dx * swing * TS * 0.04; oy += P.dig.dy * Math.abs(swing) * TS * 0.05; }
  const name = P.dead || P.hurtT > 0 ? "mole_hurt" : P.blink < 0 ? "mole_blink" : "mole";
  if (P.hurtT > 0) P.hurtT -= 1 / 60;
  const face = P.face < 0;
  // tool
  const drawTool = () => {
    if (S.fx.drill > 0) {
      const dd = P.dig || { dx: P.face, dy: 0 };
      const rot = Math.atan2(dd.dy, dd.dx) + (face && !dd.dy ? 0 : 0);
      const jx = (Math.random() - 0.5) * (dig ? TS * 0.04 : 0);
      spr("drillbit", cx + dd.dx * TS * 0.42 + jx, cy + dd.dy * TS * 0.38 + TS * 0.08, u * 0.82, { rot });
    } else {
      let a;
      if (dig && P.dig.dy) a = (face ? 1 : -1) * (0.9 + swing * 0.7) + (face ? -0.3 : 0.3);
      else if (dig) a = (face ? -1 : 1) * (0.4 + swing * 0.9);
      else a = (face ? -1 : 1) * -0.5;
      const hx = cx + (face ? -1 : 1) * TS * 0.22, hy = cy + TS * 0.08;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); spr("pick", TS * (face ? -0.12 : 0.12), -TS * 0.2, u * 0.78, { flip: face }); ctx.restore();
    }
  };
  ctx.save(); ctx.translate(cx + ox, cy + oy + TS * 0.04); ctx.scale(sx, sy);
  spr(name, 0, 0, u * 0.9, { flip: face });
  ctx.restore();
  if (!P.dead) drawTool();
  if (S.shields > 0 && !P.dead) {
    ctx.strokeStyle = `rgba(120,200,255,${0.5 + 0.2 * Math.sin(S.time * 6)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx, cy, TS * 0.62, 0, 7); ctx.stroke();
    ctx.fillStyle = "rgba(90,170,255,.12)"; ctx.fill();
  }
  if (S.fx.dizzy > 0 && !P.dead) {
    for (let i = 0; i < 3; i++) { const a = S.time * 5 + (i * Math.PI * 2) / 3; spr("i_star", cx + Math.cos(a) * TS * 0.35, cy - TS * 0.48 + Math.sin(a) * TS * 0.1, u * 0.35); }
  }
  ctx.globalAlpha = 1;
}
function drawWorm(X, Y, u) {
  const Wm = S.worm, segs = 11;
  const wob = (i) => Math.sin(S.time * 7 - i * 0.8) * 0.08;
  for (let i = segs; i >= 1; i--) {
    const p = pathPos(Wm.w - i * 0.55);
    const sc = 1.1 - i * 0.045;
    const nx = -p.dy, ny = p.dx;
    spr("worm_seg", X(p.x + 0.5 + nx * wob(i)), Y(p.y + 0.5 + ny * wob(i)), u * sc * 0.95);
  }
  const h = pathPos(Wm.w);
  let dx = h.dx, dy = h.dy;
  if (!dx && !dy) { dx = 0; dy = 1; }
  const rot = Math.atan2(dy, dx) - Math.PI / 2;
  const pulse = 1 + Math.sin(S.time * 9) * 0.04 + (Wm.stall > 0 ? Math.abs(Math.sin(S.time * 18)) * 0.08 : 0) + (S.P.dead && S.cause === "worm" ? 0.15 : 0);
  const shk = Wm.stun > 0 ? (Math.random() - 0.5) * TS * 0.1 : 0;
  spr("worm_head", X(h.x + 0.5 + dx * 0.15) + shk, Y(h.y + 0.5 + dy * 0.15), u * 0.95 * pulse, { rot });
  S._head = { x: h.x + 0.5 + dx * 0.15, y: h.y + 0.5 + dy * 0.15, rot };
}
function drawWormEyes(X, Y) {
  const h = S._head; if (!h) return;
  const ca = Math.cos(h.rot), sa = Math.sin(h.rot);
  for (const ex of [-12, 12]) {
    const lx = ex / 32 * 0.95, ly = -3 / 32 * 0.95;
    const px = h.x + lx * ca - ly * sa, py = h.y + lx * sa + ly * ca;
    const g = ctx.createRadialGradient(X(px), Y(py), 0, X(px), Y(py), TS * 0.3);
    g.addColorStop(0, "rgba(255,232,106,.95)"); g.addColorStop(0.25, "rgba(255,200,80,.5)"); g.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(px), Y(py), TS * 0.3, 0, 7); ctx.fill();
  }
}
function lightRadius() {
  const P = S.P;
  let L = 5.2 - Math.min(1.4, Math.max(0, P.y) / 250) + S.M.light;
  if (S.fx.lantern > 0) L += 2.6;
  if (S.fx.dark > 0) L *= 0.42;
  return Math.max(1.4, L);
}
function drawDark(X, Y, u) {
  const P = S.P;
  const m = moleXY();
  const depth = Math.max(0, m.y);
  const a = clamp((depth - 3) / 28, 0, 1) * 0.95;
  if (a <= 0.01) return;
  const k = dk.width / W;
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  dctx.globalCompositeOperation = "source-over";
  dctx.clearRect(0, 0, dk.width, dk.height);
  dctx.fillStyle = `rgba(6,4,8,${a})`; dctx.fillRect(0, 0, dk.width, dk.height);
  dctx.globalCompositeOperation = "destination-out";
  dctx.setTransform(k, 0, 0, k, 0, 0);
  const sx = 0;
  const hole = (x, y, r, s = 1) => {
    const g = dctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${s})`); g.addColorStop(0.55, `rgba(0,0,0,${s * 0.75})`); g.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, 7); dctx.fill();
  };
  const flick = 1 + Math.sin(S.time * 13) * 0.015 + Math.sin(S.time * 7.3) * 0.02;
  hole(X(m.x + 0.5), Y(m.y + 0.45), lightRadius() * TS * flick, 1);
  const y0 = Math.floor(S.cam) - 1, y1 = Math.ceil(S.cam + VIEW_ROWS) + 1;
  let n = 0;
  for (let y = Math.max(0, y0); y <= y1 && n < 40; y++) {
    const r = rowAt(y);
    for (let x = 0; x < COLS; x++) {
      const t = r.t[x];
      if (t === LAVA) { hole(X(x + 0.5), Y(y + 0.5), TS * 1.7, 0.85); n++; }
      else if (t === RUNE) { hole(X(x + 0.5), Y(y + 0.5), TS * 1.1, 0.5); }
    }
  }
  for (const f of S.fuses) hole(X(f.x + 0.5), Y(f.y + 0.5), TS * 1.6, 0.7);
  for (const f of S.flashes) hole(X(f.x), Y(f.y), TS * f.r * (f.t / f.max + 0.3), 1);
  if (S.worm.active && S._head) hole(X(S._head.x), Y(S._head.y), TS * 1.4, 0.35);
  dctx.globalCompositeOperation = "source-over";
  ctx.drawImage(dk, 0, 0, W, H);
  // Night Eyes: faint outlines of goodies through the dark
  if (S.M.nightEyes) {
    for (let y = Math.max(0, y0); y <= y1; y++) {
      const r = rowAt(y);
      for (let x = 0; x < COLS; x++) {
        const t = r.t[x];
        if (t === GEM || t === CRATE || t === TNT) {
          const d = Math.hypot(x - m.x, y - m.y);
          if (d < lightRadius() * 0.75) continue;
          ctx.globalAlpha = 0.4 + 0.15 * Math.sin(S.time * 3 + x + y);
          spr(t === GEM ? "gem_" + GEM_KINDS[r.g[x]].id : t === CRATE ? "crate" : "tnt", X(x) + TS / 2, Y(y) + TS / 2, u * 0.6);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ================= HUD =================
const hud = { depth: -1, score: -1, hearts: "", bombs: -1, gems: "", lead: "", fx: "", pacts: -1 };
function updateHUD() {
  const P = S.P;
  const d = Math.max(0, S.maxDepth);
  if (hud.depth !== d) { hud.depth = d; $("hDepth").innerHTML = d + "<small>m</small>"; }
  const sc = Math.round(S.score);
  if (hud.score !== sc) { hud.score = sc; $("hScore").textContent = sc.toLocaleString(); }
  const hk = S.hearts + "/" + S.maxHearts + "/" + S.shields;
  if (hud.hearts !== hk) {
    hud.hearts = hk;
    let h = "";
    for (let i = 0; i < S.maxHearts; i++) h += `<img alt="" src="${iconURL(i < S.hearts ? "i_heart" : "i_heart_empty")}">`;
    for (let i = 0; i < S.shields; i++) h += `<img alt="" src="${iconURL("i_shield")}">`;
    $("hHearts").innerHTML = h; $("hHearts").setAttribute("aria-label", S.hearts + " hearts");
  }
  if (hud.bombs !== S.bombs) { hud.bombs = S.bombs; $("hBombs").textContent = S.bombs; $("padBombN").textContent = S.bombs; $("padBomb").classList.toggle("empty", S.bombs <= 0); }
  const gk = S.gemCraft + "/" + S.M.craft;
  if (hud.gems !== gk) { hud.gems = gk; $("hGems").textContent = gk; }
  // worm meter
  let lbl, frac, close = false;
  if (!S.worm.active) { lbl = "asleep"; frac = 1; }
  else { const L = Math.max(0, lead()); lbl = Math.floor(L) + " m"; frac = clamp(L / 24, 0, 1); close = L < 7; }
  if (hud.lead !== lbl + frac.toFixed(2)) {
    hud.lead = lbl + frac.toFixed(2);
    $("hLead").textContent = lbl;
    const f = $("hFill"); f.style.transform = `scaleX(${Math.max(0.03, frac)})`;
    f.style.background = frac > 0.55 ? "#7fe08a" : frac > 0.28 ? "#ffd25a" : "#e2474b";
    $("hMeter").classList.toggle("close", close);
  }
  // effects
  const act = Object.entries(S.fx).filter(([, v]) => v > 0);
  const fk = act.map(([k, v]) => k + Math.ceil(v * 4)).join(",");
  if (hud.fx !== fk) {
    if (hud.fx.split(",").length !== fk.split(",").length) hudBottom = 0;
    hud.fx = fk;
    $("fx").innerHTML = act.map(([k, v]) => {
      const m = FX_META[k], bad = isBadFx(k), max = m.t * (bad ? S.M.badTime : S.M.goodTime);
      return `<div class="fx ${bad ? "bad" : "good"}"><img alt="" src="${iconURL(m.icon)}">${m.name.replace("!", "")}<i style="width:${(v / max) * 100}%"></i></div>`;
    }).join("");
  }
  if (hud.pacts !== S.pacts.length) {
    hud.pacts = S.pacts.length;
    $("pactsPill").hidden = !S.pacts.length;
    $("pacts").innerHTML = S.pacts.map((id) => { const p = PACTS.find((q) => q.id === id); return `<img alt="${p.name}" title="${p.name}: ${p.boon} ${p.bane}" src="${iconURL(p.icon)}">`; }).join("");
  }
}
let bannerTimer = 0;
function banner(k, n, h, danger, dur) {
  if (mode === "title") return;
  const b = $("banner");
  $("bnK").textContent = k || ""; $("bnN").textContent = n || ""; $("bnH").textContent = h || "";
  b.classList.toggle("danger", !!danger);
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
}
function toastMsg(icon, name, desc, kind) {
  if (mode === "title") return;
  const t = document.createElement("div");
  t.className = "t " + (kind || "");
  t.innerHTML = `<img alt="" src="${iconURL(icon)}"><div><b></b><span></span></div>`;
  t.querySelector("b").textContent = name; t.querySelector("span").textContent = desc;
  const box = $("toast");
  while (box.children.length > 2) box.firstChild.remove();
  box.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

// ================= shrine =================
let offers = [], offerSel = 0;
function openShrine(y) {
  mode = "shrine";
  for (const k in held) held[k] = 0;
  sfx("shrine", 0.9);
  const pool = PACTS.filter((p) => S.pacts.filter((q) => q === p.id).length < p.max && !(p.id === "glass" && S.maxHearts <= 1));
  offers = [];
  while (offers.length < 3 && pool.length) offers.push(pool.splice((rnd() * pool.length) | 0, 1)[0]);
  offerSel = COARSE ? -1 : 0;
  $("shK").textContent = "A shrine at " + y + " m";
  $("deals").innerHTML = offers.map((p, i) => `<button class="deal${i === offerSel ? " sel" : ""}" data-i="${i}"><img alt="" src="${iconURL(p.icon)}"><span class="nm">${p.name}</span><span class="bo">${p.boon}</span><span class="ba">${p.bane}</span><span class="num">Press ${i + 1}</span></button>`).join("");
  for (const b of $("deals").querySelectorAll(".deal")) b.addEventListener("click", () => takeOffer(+b.dataset.i));
  $("shrine").hidden = false;
  $("banner").classList.remove("show"); $("toast").innerHTML = "";
  shrineOpenedAt = performance.now();
}
let shrineOpenedAt = 0;
function shrineKey(e) {
  if (performance.now() - shrineOpenedAt < 450) return;   // don't eat a held dig key
  const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
  if (n != null && offers[n]) { takeOffer(n); return; }
  if (e.code === "ArrowLeft" || e.code === "KeyA" || e.code === "ArrowUp" || e.code === "KeyW") offerSel = Math.max(0, offerSel - 1);
  else if (e.code === "ArrowRight" || e.code === "KeyD" || e.code === "ArrowDown" || e.code === "KeyS") offerSel = Math.min(offers.length - 1, offerSel + 1);
  else if ((e.code === "Enter" || e.code === "Space") && offerSel >= 0) { e.preventDefault(); takeOffer(offerSel); return; }
  else return;
  e.preventDefault(); sfx("click", 0.5);
  $("deals").querySelectorAll(".deal").forEach((b, i) => b.classList.toggle("sel", i === offerSel));
}
function takeOffer(i) {
  if (mode !== "shrine") return;
  const p = offers[i]; if (!p) return;
  p.apply(S.M, S); S.pacts.push(p.id);
  sfx("pick", 0.9);
  $("shrine").hidden = true; mode = "play"; last = performance.now();
  toastMsg(p.icon, p.name, p.boon + " " + p.bane, "");
  for (let k = 0; k < 20; k++) S.parts.push({ x: S.P.x + 0.5, y: S.P.y + 0.5, vx: (rnd() - 0.5) * 8, vy: (rnd() - 0.5) * 8, life: 0.8, max: 0.8, c: "#b9a4ff", s: 0.08, g: 0, glow: true, drag: 2 });
}

// ================= flow =================
function startRun() {
  initAudio();
  for (const k in held) held[k] = 0;   // the title-screen demo drives these too
  for (const k in tapped) tapped[k] = 0;
  newRun();
  resetHud();
  mode = "play"; overReady = false;
  for (const id of ["title", "over", "pause", "shrine"]) $(id).hidden = true;
  $("hud").hidden = false; $("pad").hidden = !showPad;
  resize();
  S.cam = S.P.y - VIEW_ROWS * 0.36;
  last = performance.now();
}
function resetHud() { for (const k in hud) hud[k] = typeof hud[k] === "number" ? -1 : ""; hud.pacts = -1; $("toast").innerHTML = ""; $("banner").classList.remove("show"); }
function pause() {
  if (mode !== "play") return;
  mode = "pause";
  for (const k in held) held[k] = 0;
  $("pausePacts").innerHTML = pactChips();
  $("pause").hidden = false;
  if (actx) actx.suspend();
}
function resume() {
  if (mode !== "pause") return;
  $("pause").hidden = true; mode = "play"; last = performance.now();
  if (actx) actx.resume();
}
function pactChips() { return S.pacts.map((id) => { const p = PACTS.find((q) => q.id === id); return `<span><img alt="" src="${iconURL(p.icon)}">${p.name}</span>`; }).join(""); }
const CAUSES = {
  worm: ["Gulped!", "The Gulper caught up with you"],
  boulder: ["Crushed!", "A boulder had other plans"],
  lava: ["Scorched!", "Lava doesn't care how good you are"],
  tnt: ["Kaboom!", "You were standing a bit close to that"],
  quit: ["Gave up", "The surface was calling"],
};
function gameOver() {
  if (mode !== "play" && mode !== "pause") return;
  mode = "over";
  const best = store.get("best", { depth: 0, score: 0 });
  const d = Math.max(0, S.maxDepth), sc = Math.round(S.score);
  const nb = [];
  if (d > best.depth) nb.push("deepest"); if (sc > best.score) nb.push("highest score");
  store.set("best", { depth: Math.max(best.depth, d), score: Math.max(best.score, sc) });
  const [c, w] = CAUSES[S.cause] || CAUSES.worm;
  $("ovCause").textContent = c;
  $("ovWhy").textContent = w + " at " + d + " m in " + biomeName(d) + ".";
  $("ovDepth").textContent = d; $("ovGems").textContent = S.gems; $("ovScore").textContent = sc.toLocaleString();
  $("ovBest").textContent = nb.length && (best.depth > 0 || best.score > 0) ? "New best: " + nb.join(" & ") + "!" : nb.length ? "" : `Best: ${best.depth} m · ${best.score.toLocaleString()}`;
  $("ovPacts").innerHTML = pactChips();
  $("over").hidden = false; $("hud").hidden = true; $("pad").hidden = true;
  setTimeout(() => { overReady = true; }, 600);
  if (rumbleGain && actx) rumbleGain.gain.setTargetAtTime(0, actx.currentTime, 0.3);
}
function toTitle() {
  mode = "title";
  for (const id of ["over", "pause", "shrine"]) $(id).hidden = true;
  $("hud").hidden = true; $("pad").hidden = true;
  $("title").hidden = false;
  showBest();
  newRun();
}
function showBest() { const b = store.get("best", { depth: 0, score: 0 }); $("bestLine").textContent = b.depth > 0 ? `Deepest: ${b.depth} m · Best score: ${b.score.toLocaleString()}` : ""; }

$("btnPlay").addEventListener("click", startRun);
$("btnAgain").addEventListener("click", startRun);
$("btnMenu").addEventListener("click", toTitle);
$("btnPause").addEventListener("click", pause);
$("btnResume").addEventListener("click", resume);
$("btnQuit").addEventListener("click", () => { $("pause").hidden = true; if (actx) actx.resume(); S.cause = "quit"; mode = "play"; gameOver(); });
$("btnSound").addEventListener("click", () => { setMuted(!muted); if (!muted) initAudio(); });
$("btnPauseSound").addEventListener("click", () => setMuted(!muted));

// ================= loop =================
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === "play" || (mode === "over" && S)) { if (mode === "play") update(dt); else { updateParts(dt); S.time += dt; } }
  else if (mode === "title" && S) { attract(dt); }
  if (S) { draw(); if (mode === "play") updateHUD(); }
}
// title screen: the mole digs on its own behind the menu
let attractT = 0;
function attract(dt) {
  attractT -= dt;
  for (const k in held) held[k] = 0;
  const P = S.P;
  if (P.y > 30) { newRun(); }
  if (attractT < 0) attractT = 0.6 + Math.random() * 1.2;
  held[attractT > 0.4 || P.x <= 1 || P.x >= COLS - 2 ? "D" : (P.x < 4 ? "R" : "L")] = 1;
  S.worm.active = true;
  update(dt);
  S.worm.w = Math.max(0, clamp(S.worm.w, S.path.length - 12, S.path.length - 7));
  if (S.P.dead || S.hearts < 3) newRun();
}

// ================= boot =================
setMuted(muted);
resize();
loadSprites().then(() => {
  fillIcons();
  newRun();
  $("loading").hidden = true; $("btnPlay").hidden = false;
  if (!COARSE) $("btnPlay").focus();
  showBest();
  requestAnimationFrame(frame);
});
// expose a little for tests
window.__um = { get S() { return S; }, get mode() { return mode; }, startRun, useBomb, held, openShrine, takeOffer, lead: () => lead(), get, COLS,
  step(dt) { if (mode === "play") update(dt); }, get offers() { return offers; } };
})();
