// Undermine: tiles (32u), mole, worm, pickups and icons.
pal({ k: "#17120f", w: "#fff4dc", y: "#ffd25a", Y: "#e09a2b", r: "#e2474b", R: "#8e2233", b: "#58b6ff", B: "#2a5fa8",
  g: "#6fd16a", G: "#2f8a4f", p: "#c77dff", P: "#6b3fa8", o: "#ff8a3c", O: "#b4481e", s: "#b9b2a6", S: "#6d675e", n: "#3a332c",
  m0: "#3b2418", m1: "#6e4630", m2: "#9c6a48", m3: "#c8956a", pink: "#f3a0a8", wm0: "#5a1f2e", wm1: "#a3374d", wm2: "#d9606e", wm3: "#f29a92" })

const BIOMES = {
  top:   { d0: "#5a3a22", d1: "#7d5233", d2: "#9c6b45", r0: "#4f4a44", r1: "#7a736a", r2: "#a39b8f", h0: "#2c2a2e", h1: "#4b4850", h2: "#6e6a75", wl: "#2e1f14" },
  clay:  { d0: "#7a3119", d1: "#a64a26", d2: "#c8693e", r0: "#5b3a32", r1: "#86584a", r2: "#b07c69", h0: "#3a1f1c", h1: "#5d302a", h2: "#87473b", wl: "#3a170c" },
  stone: { d0: "#4c4945", d1: "#67635c", d2: "#86817a", r0: "#33373f", r1: "#4f5561", r2: "#737b88", h0: "#1d2027", h1: "#30343e", h2: "#4b5160", wl: "#1e1c1a" },
  cryst: { d0: "#2f2650", d1: "#43386c", d2: "#5d4f8e", r0: "#1f4f5c", r1: "#2f7488", r2: "#56a8bb", h0: "#2a1a49", h1: "#4a2f7c", h2: "#8a5fd0", wl: "#17122a" },
  magma: { d0: "#45201b", d1: "#5e2c25", d2: "#7a3d31", r0: "#2b2626", r1: "#433b3a", r2: "#615654", h0: "#1c1414", h1: "#2f2020", h2: "#4a2f2a", wl: "#1a0b0a" },
  abyss: { d0: "#1a2536", d1: "#26354b", d2: "#384d6b", r0: "#232a3e", r1: "#36405c", r2: "#56648f", h0: "#0d1019", h1: "#191e2e", h2: "#2b3450", wl: "#080b12" },
}

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }
for (const [id, c] of Object.entries(BIOMES)) {
  for (let v = 0; v < 2; v++) {
    const R = rng(id.length * 97 + v * 31 + 7)
    const peb = []
    for (let i = 0; i < 9; i++) { const x = 3 + R() * 26, y = 3 + R() * 26, rr = 0.9 + R() * 1.6; peb.push(ellipse(x, y, rr * 1.3, rr, { fill: i % 3 ? c.d0 : c.d2, opacity: 0.85 })) }
    sprite(`dirt_${id}_${v}`, { w: 32, h: 32 },
      rect(0, 0, 32, 32, c.d1), peb,
      curve([2, 9 + v * 6, 12, 7 + v * 6, 22, 11 + v * 6, 30, 8 + v * 6], { stroke: c.d0, sw: 1, opacity: 0.45 }),
      curve([3, 24 - v * 3, 14, 26 - v * 3, 27, 23 - v * 3], { stroke: c.d2, sw: 1, opacity: 0.35 }))
  }
  // rock: a chunky stone set in dirt
  sprite(`rock_${id}`, { w: 32, h: 32 },
    rect(0, 0, 32, 32, c.d1),
    blob([4, 10, 12, 3, 24, 4, 30, 12, 29, 25, 18, 30, 6, 28, 2, 19], { fill: c.r1, smooth: 0.35 }),
    clip(blob([4, 10, 12, 3, 24, 4, 30, 12, 29, 25, 18, 30, 6, 28, 2, 19], { fill: "k", smooth: 0.35 }),
      poly([0, 32, 32, 14, 32, 32], { fill: c.r0, opacity: 0.8 }),
      blob([7, 9, 13, 5, 20, 6, 15, 11], { fill: c.r2, opacity: 0.9 }),
      line([16, 14, 20, 19, 18, 24], { stroke: c.r0, sw: 1.4 })),
    blob([4, 10, 12, 3, 24, 4, 30, 12, 29, 25, 18, 30, 6, 28, 2, 19], { stroke: c.r0, sw: 1.2, smooth: 0.35 }))
  // hard rock: faceted, fills the tile
  sprite(`hard_${id}`, { w: 32, h: 32 },
    rect(0, 0, 32, 32, c.h1),
    poly([0, 0, 18, 0, 11, 12, 0, 9], c.h2), poly([18, 0, 32, 0, 32, 13, 22, 15, 11, 12], c.h1),
    poly([0, 9, 11, 12, 8, 24, 0, 27], c.h0), poly([11, 12, 22, 15, 21, 27, 8, 24], c.h2),
    poly([22, 15, 32, 13, 32, 32, 24, 32, 21, 27], c.h0), poly([0, 27, 8, 24, 21, 27, 24, 32, 0, 32], c.h1),
    line([0, 9, 11, 12, 18, 0], { stroke: "#00000055", sw: 1 }), line([11, 12, 8, 24, 0, 27], { stroke: "#00000055", sw: 1 }),
    line([11, 12, 22, 15, 32, 13], { stroke: "#ffffff22", sw: 1 }), line([22, 15, 21, 27, 24, 32], { stroke: "#00000055", sw: 1 }),
    line([8, 24, 21, 27], { stroke: "#ffffff1c", sw: 1 }),
    circle(14, 18, 1.1, { fill: "#ffffff66" }), circle(26, 8, 0.9, { fill: "#ffffff55" }))
  // back wall behind dug tunnels
  sprite(`wall_${id}`, { w: 32, h: 32 },
    rect(0, 0, 32, 32, c.wl),
    ellipse(9, 10, 5, 3, { fill: c.d0, opacity: 0.35 }), ellipse(23, 22, 6, 3.5, { fill: c.d0, opacity: 0.3 }),
    ellipse(25, 6, 2, 1.4, { fill: c.d0, opacity: 0.4 }), ellipse(6, 25, 2.4, 1.6, { fill: c.d0, opacity: 0.35 }))
}

sprite("bedrock", { w: 32, h: 32 },
  rect(0, 0, 32, 32, "#15151b"),
  clip(rect(0, 0, 32, 32, "k"), Array.from({ length: 8 }, (_, i) => line([i * 8 - 12, 34, i * 8 + 4, -2], { stroke: "#26262f", sw: 3 }))),
  rect(1, 1, 30, 30, { stroke: "#2f2f3a", sw: 2, r: 3 }),
  sym(16, circle(5, 5, 1.6, "#4a4a58"), circle(5, 27, 1.6, "#4a4a58")))

sprite("boulder", { w: 32, h: 32, outline: "k", ow: 1.2 },
  blob([16, 2, 26, 5, 30, 15, 27, 26, 16, 30, 5, 27, 2, 16, 6, 6], { fill: "#8d857b" }),
  clip(blob([16, 2, 26, 5, 30, 15, 27, 26, 16, 30, 5, 27, 2, 16, 6, 6], "k"),
    circle(22, 24, 15, { fill: "#5d564e" }), circle(11, 9, 6, { fill: "#b8b0a3" }), circle(10, 8, 2.5, { fill: "#d8d0c3" })),
  curve([19, 10, 22, 15, 20, 19], { stroke: "#4a443d", sw: 1.3 }), curve([9, 20, 13, 22], { stroke: "#4a443d", sw: 1.2 }))

sprite("tnt", { w: 32, h: 32 },
  rect(0, 0, 32, 32, "#4a2a1a"),
  rect(3, 3, 26, 26, { fill: "#c8372d", r: 3 }),
  rect(3, 3, 26, 5, { fill: "#e45a45", r: 3 }),
  rect(3, 12, 26, 9, "#f2e2c4"),
  text(16, 19.6, "TNT", { size: 8.5, weight: "bold", anchor: "middle", fill: "#8e1c1c", font: "Arial Black, Arial, sans-serif" }),
  rect(3, 3, 26, 26, { stroke: "#5e1414", sw: 1.5, r: 3 }),
  sym(16, circle(6.5, 25.5, 1.2, "#5e1414")))

sprite("crate", { w: 32, h: 32 },
  rect(0, 0, 32, 32, "#3a2414"),
  rect(2, 2, 28, 28, { fill: "#b77a3c", r: 2 }),
  clip(rect(2, 2, 28, 28, "k"), poly([30, 2, 30, 30, 2, 30], { fill: "#8a5426", opacity: 0.6 }), rect(2, 2, 28, 3, "#d9a061")),
  rect(4.5, 4.5, 23, 23, { stroke: "#6e3f1a", sw: 1.6 }),
  circle(16, 16, 7.5, { fill: "#ffd25a", stroke: "#6e3f1a", sw: 1.4 }),
  text(16, 20.3, "?", { size: 12, weight: "bold", anchor: "middle", fill: "#6e3f1a", font: "Arial Black, Arial, sans-serif" }),
  sym(16, circle(5, 5, 1, "#6e3f1a"), circle(5, 27, 1, "#6e3f1a")))

sprite("lava", { w: 32, h: 32 },
  rect(0, 0, 32, 32, { fill: lin(["#ffcf4a", "#ff7a1a", "#c42b14"], 90) }),
  ellipse(9, 9, 4, 2, { fill: "#fff1a8", opacity: 0.8 }), ellipse(23, 17, 3, 1.6, { fill: "#fff1a8", opacity: 0.6 }),
  circle(14, 24, 2.2, { fill: "#8e1c0e", opacity: 0.7 }), circle(26, 7, 1.4, { fill: "#8e1c0e", opacity: 0.6 }))

sprite("rune", { w: 32, h: 32 },
  rect(0, 0, 32, 32, "#2b2440"),
  rect(1.5, 1.5, 29, 29, { stroke: "#5f4fa0", sw: 1.4, r: 3 }),
  path("M16 6 L16 26 M10 11 L16 16 L22 11 M11 22 L16 18 L21 22", { stroke: "#b9a4ff", sw: 2, glow: { r: 2.5, color: "#8f74ff" } }))

// gems (drawn on top of a dirt tile)
const GEMS = { amber: ["#ffcf5a", "#d98a1e", "#fff1b0"], emerald: ["#5fe08a", "#1f8a4f", "#c8ffd8"], sapphire: ["#5aa8ff", "#1f4fb0", "#d0e6ff"],
  ruby: ["#ff5a6e", "#a8173a", "#ffd0d6"], diamond: ["#e8fbff", "#7fc6e0", "#ffffff"] }
for (const [id, [m, d, l]] of Object.entries(GEMS))
  sprite(`gem_${id}`, { w: 22, h: 22, outline: "k", ow: 1.4 },
    poly([11, 1, 20, 8, 11, 21, 2, 8], m),
    poly([11, 1, 20, 8, 11, 8], l), poly([2, 8, 11, 8, 11, 21], d), poly([11, 8, 20, 8, 11, 21], { fill: d, opacity: 0.5 }),
    poly([6, 8, 11, 1, 16, 8, 11, 8], { fill: l, opacity: 0.6 }))

// ---------- mole miner (faces right) ----------
sprite("mole", { w: 34, h: 34, outline: "k", ow: 1.5 },
  ellipse(16, 22, 11, 10, "m1"),
  clip(ellipse(16, 22, 11, 10, "k"), ellipse(20, 27, 11, 8, { fill: "m0", opacity: 0.6 }), ellipse(12, 16, 6, 4, { fill: "m2", opacity: 0.7 })),
  ellipse(18, 25, 6, 5, "m3"),
  ellipse(8, 31, 4.5, 2.3, "pink"), ellipse(22, 31, 4.5, 2.3, "pink"),
  ellipse(27, 21, 5, 4, "m2"), circle(31.5, 20.5, 2.6, "pink"), circle(32.1, 19.8, 0.9, "w"),
  circle(24, 19, 1.7, "k"), circle(24.5, 18.4, 0.6, "w"),
  // helmet + lamp
  path("M6 15 Q8 3 18 3 Q27 3 28 13 L28 15 Z", "y"),
  clip(path("M6 15 Q8 3 18 3 Q27 3 28 13 L28 15 Z", "k"), rect(4, 11, 26, 5, "Y"), circle(13, 6, 4, { fill: "#fff3b8", opacity: 0.7 })),
  rect(4, 13.5, 26, 2.6, { fill: "Y", r: 1.2 }),
  rect(23, 6, 6, 5, { fill: "s", r: 1.5 }), circle(29, 8.5, 2.4, { fill: "#fffbe0", glow: { r: 3, color: "y" } }))
sprite("mole_blink", { base: "mole" }, rect(21.6, 16.6, 5, 4.4, "m2"), line([22, 19.2, 26, 19.2], { stroke: "k", sw: 1.1 }))
sprite("mole_hurt", { base: "mole" }, rect(21.6, 16.6, 5, 4.4, "m2"), line([22.2, 17.4, 25.8, 20.6], { stroke: "k", sw: 1.1 }), line([22.2, 20.6, 25.8, 17.4], { stroke: "k", sw: 1.1 }))

sprite("pick", { w: 30, h: 30, outline: "k", ow: 1.3 },
  line([5, 26, 20, 9], { stroke: "#8a5426", sw: 3.2 }),
  path("M10 6 Q20 0 28 12 Q21 7 13 9 Z", "s"),
  clip(path("M10 6 Q20 0 28 12 Q21 7 13 9 Z", "k"), path("M10 6 Q20 0 28 12 L28 14 Q20 4 10 8 Z", { fill: "w", opacity: 0.45 })))

sprite("drillbit", { w: 30, h: 22, outline: "k", ow: 1.3 },
  rect(0, 4, 9, 14, { fill: "S", r: 2 }), rect(1, 6, 7, 3, { fill: "s" }),
  poly([9, 2, 29, 11, 9, 20], "y"),
  clip(poly([9, 2, 29, 11, 9, 20], "k"), line([12, 1, 16, 21], { stroke: "Y", sw: 2.4 }), line([18, 1, 22, 21], { stroke: "Y", sw: 2.4 }), line([24, 3, 27, 19], { stroke: "Y", sw: 2 })))

// ---------- the Gulper ----------
sprite("worm_head", { w: 56, h: 56, outline: "k", ow: 2 },
  ellipse(28, 26, 25, 24, "wm1"),
  clip(ellipse(28, 26, 25, 24, "k"), ellipse(28, 12, 24, 10, { fill: "wm0", opacity: 0.6 }), ellipse(18, 22, 8, 12, { fill: "wm2", opacity: 0.5 })),
  // ridges
  curve([7, 18, 28, 13, 49, 18], { stroke: "wm0", sw: 2 }), curve([5, 27, 28, 22, 51, 27], { stroke: "wm0", sw: 1.6, opacity: 0.6 }),
  // mouth (facing down)
  ellipse(28, 40, 17, 12, "#2a0710"),
  clip(ellipse(28, 40, 17, 12, "k"), ellipse(28, 50, 12, 7, { fill: "#7a1530" }),
    radial(14, 28, 40, poly([26, 27.5, 30, 27.5, 28, 33.5], "w"))),
  // eyes
  sym(28, ellipse(16, 25, 5, 4.2, "#ffe86a"), ellipse(16.6, 25.4, 1.8, 3.4, "k")))
sprite("worm_seg", { w: 44, h: 44, outline: "k", ow: 2 },
  circle(22, 22, 20, "wm1"),
  clip(circle(22, 22, 20, "k"), circle(28, 30, 18, { fill: "wm0", opacity: 0.55 }), circle(15, 13, 8, { fill: "wm2", opacity: 0.6 }), circle(13, 11, 3, { fill: "wm3", opacity: 0.7 })),
  curve([4, 20, 22, 15, 40, 20], { stroke: "wm0", sw: 1.6, opacity: 0.8 }))

// ---------- icons (24u) ----------
const I = { w: 24, h: 24, outline: "k", ow: 1.3 }
sprite("i_heart", I, path("M12 21 C3 14 1 9 4 5.5 C7 2.5 11 4 12 7 C13 4 17 2.5 20 5.5 C23 9 21 14 12 21 Z", "r"), circle(7.5, 8, 2, { fill: "w", opacity: 0.6 }))
sprite("i_heart_empty", I, path("M12 21 C3 14 1 9 4 5.5 C7 2.5 11 4 12 7 C13 4 17 2.5 20 5.5 C23 9 21 14 12 21 Z", "#3a2a30"))
sprite("i_bomb", I, circle(11, 14, 8.5, "#2b2a35"), circle(8, 11, 2.6, { fill: "#6b6880" }), tf({ rot: 45, origin: [16.5, 5.5] }, rect(14, 3.5, 5, 4, { fill: "S", r: 1 })),
  curve([18, 4, 20, 1.6, 22.5, 2.6], { stroke: "Y", sw: 1.2 }), star(22, 2.5, 5, 2.4, 1, { fill: "y", glow: { r: 2, color: "o" } }))
sprite("i_drill", I, stamp("drillbit", 1, 4, { scale: 0.72 }))
sprite("i_shield", I, path("M12 1.5 L21 5 L20 13 Q18 19 12 22.5 Q6 19 4 13 L3 5 Z", "b"), path("M12 1.5 L12 22.5 Q6 19 4 13 L3 5 Z", "B"), path("M8 11 L11 14.5 L16.5 8", { stroke: "w", sw: 2.2 }))
sprite("i_lantern", I, rect(9, 1.5, 6, 3, { fill: "S", r: 1 }), rect(6, 4.5, 12, 15, { fill: "#ffe48a", r: 3, glow: { r: 3, color: "y" } }), rect(6, 4.5, 12, 15, { stroke: "S", sw: 1.6, r: 3 }), ellipse(12, 12, 2.6, 4, "o"), rect(5, 19.5, 14, 3, { fill: "S", r: 1 }))
sprite("i_magnet", I, path("M4 4 L10 4 L10 13 Q10 16 12 16 Q14 16 14 13 L14 4 L20 4 L20 13 Q20 22 12 22 Q4 22 4 13 Z", "r"), rect(4, 4, 6, 4, "s"), rect(14, 4, 6, 4, "s"))
sprite("i_repel", I, ellipse(12, 16, 9, 6, "g"), circle(12, 10, 5, "G"), curve([8, 6, 6, 2, 9, 1], { stroke: "g", sw: 2 }), curve([16, 6, 18, 2, 15, 1], { stroke: "g", sw: 2 }), path("M8 15 L16 17 M8 17 L16 15", { stroke: "k", sw: 1.6 }))
sprite("i_gold", I, circle(12, 12, 10, "y"), circle(12, 12, 7.5, "Y"), text(12, 16.4, "$", { size: 12, weight: "bold", anchor: "middle", fill: "y", font: "Arial Black, Arial, sans-serif" }))
sprite("i_dizzy", I, path("M12 12 m0 0 a1.5 1.5 0 0 1 3 0 a3 3 0 0 1 -6 0 a4.5 4.5 0 0 1 9 0 a6 6 0 0 1 -12 0 a7.5 7.5 0 0 1 15 0", { stroke: "p", sw: 2.4, fill: "none" }), star(20, 4, 5, 3, 1.3, "y"))
sprite("i_sore", I, rect(3, 9, 18, 7, { fill: "m2", r: 3.5 }), circle(18, 12.5, 5, "m3"), path("M7 3 L9 7 M12 2 L12 6.5 M17 3 L15 7", { stroke: "r", sw: 2 }))
sprite("i_dark", I, circle(12, 12, 10, "#1d1a2e"), circle(16, 9, 8.5, { fill: "#4a4566" }), circle(18, 7, 7.5, "#1d1a2e"), star(7, 15, 4, 2.4, 0.9, "w"))
sprite("i_bait", I, ellipse(12, 15, 8, 6, "pink"), curve([5, 14, 2, 10, 4, 6], { stroke: "pink", sw: 3 }), circle(14, 13, 1.2, "k"), path("M14 3 Q17 6 14 9 M18 2 Q21 6 18 10", { stroke: "o", sw: 1.6 }))
sprite("i_rockfall", I, stamp("boulder", 1, 0, { scale: 0.42 }), stamp("boulder", 11, 4, { scale: 0.36 }), stamp("boulder", 5, 11, { scale: 0.42 }))
sprite("i_gem", I, stamp("gem_emerald", 1, 1, { scale: 0.95 }))
sprite("i_eye", I, path("M1.5 12 Q12 2 22.5 12 Q12 22 1.5 12 Z", "w"), circle(12, 12, 4.6, "b"), circle(12, 12, 2.2, "k"), circle(10.6, 10.6, 1, "w"))
sprite("i_jaw", I, path("M2 6 L22 6 L20 11 L4 11 Z", "s"), path("M4 14 L20 14 L22 19 L2 19 Z", "s"),
  poly([5, 11, 7, 14.5, 9, 11, 11, 14.5, 13, 11, 15, 14.5, 17, 11, 19, 14.5, 19, 11], "w"))
sprite("i_star", I, star(12, 12.5, 5, 11, 4.8, "y"), star(12, 12.5, 5, 6, 2.6, { fill: "#fff3b8", opacity: 0.7 }))
sprite("i_clock", I, circle(12, 12, 10, "w"), circle(12, 12, 10, { stroke: "S", sw: 1.6 }), path("M12 5.5 L12 12 L16.5 14.5", { stroke: "k", sw: 2 }))
sprite("i_wing", I, path("M3 18 Q4 6 21 3 Q18 9 15 10 Q19 11 18 13 Q14 14 12 13 Q14 16 11 17 Q7 18 3 18 Z", "w"), curve([4, 17, 10, 11, 18, 5], { stroke: "s", sw: 1 }))
sprite("i_skull", I, path("M12 2 Q21 2 21 11 Q21 15 17 16.5 L17 21 L7 21 L7 16.5 Q3 15 3 11 Q3 2 12 2 Z", "w"), sym(12, circle(8.3, 10.5, 2.6, "k")), poly([12, 13, 13.4, 16, 10.6, 16], "k"))
