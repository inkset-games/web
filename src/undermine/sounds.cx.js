// Undermine sounds. Earthy thuds, chip blips for pickups, a low worm.
sfx("dig1", { vol: 0.55 },
  noise({ color: "brown", dur: 0.06, env: [0.001, 0.05, 0.1, 0.05], filter: { type: "lp", from: 1800, to: 300 } }),
  tone({ wave: "triangle", freq: 150, to: 70, dur: 0.05, env: [0.001, 0.04, 0, 0.03], vol: 0.6 }))
sfx("dig2", { base: "dig1", pitch: 3 })
sfx("dig3", { base: "dig1", pitch: -3 })
sfx("chip", { vol: 0.42 },
  noise({ dur: 0.03, env: [0.001, 0.03, 0, 0.03], filter: { type: "bp", cutoff: 2600, q: 1.2 } }),
  tone({ wave: "triangle", freq: 1250, to: 900, dur: 0.04, env: [0.001, 0.04, 0, 0.05], vol: 0.35 }),
  tone({ wave: "triangle", freq: 220, to: 120, dur: 0.05, env: [0.001, 0.04, 0, 0.03], vol: 0.6 }))
sfx("clank", { vol: 0.42 },
  tone({ wave: "fm", fm: { ratio: 3.7, index: 3, decay: 0.08 }, freq: 820, dur: 0.05, env: [0.001, 0.08, 0, 0.12], vol: 0.45 }),
  noise({ dur: 0.03, env: [0.001, 0.03, 0, 0.03], filter: { type: "hp", cutoff: 3000 } , vol: 0.6}))
sfx("break", { vol: 0.6 },
  noise({ color: "pink", dur: 0.14, env: [0.001, 0.12, 0.1, 0.1], filter: { type: "lp", from: 3500, to: 400 } }),
  tone({ wave: "triangle", freq: 120, to: 50, dur: 0.12, env: [0.001, 0.1, 0, 0.05], vol: 0.8 }),
  at(0.03, noise({ dur: 0.05, env: [0.001, 0.04, 0, 0.04], filter: { type: "bp", cutoff: 1800 }, vol: 0.5 })))
sfx("step", { vol: 0.6 }, noise({ color: "brown", dur: 0.025, env: [0.001, 0.02, 0, 0.02], filter: { type: "lp", cutoff: 900 } }))
sfx("land", { vol: 0.5 },
  noise({ color: "brown", dur: 0.06, env: [0.001, 0.06, 0, 0.05], filter: { type: "lp", cutoff: 700 } }),
  tone({ wave: "sine", freq: 110, to: 55, dur: 0.06, env: [0.001, 0.06, 0, 0.04] }))
sfx("gem", { vol: 0.36 },
  tone({ wave: "square", duty: 0.25, freq: "E6", dur: 0.04, env: [0.001, 0.02, 0.6, 0.02] }),
  at(0.045, tone({ wave: "square", duty: 0.25, freq: "B6", dur: 0.12, env: [0.001, 0.04, 0.5, 0.12] })))
sfx("craft", { vol: 0.4, fx: [reverb({ size: 0.3, mix: 0.15 })] },
  tone({ wave: "square", duty: 0.3, freq: "G4", dur: 0.25, arp: { notes: [0, 7, 12, 19], rate: 0.05 }, env: [0.002, 0.08, 0.6, 0.12] }))
sfx("crate", { vol: 0.55 },
  noise({ color: "pink", dur: 0.08, env: [0.001, 0.06, 0, 0.06], filter: { type: "bp", cutoff: 900 } }),
  tone({ wave: "triangle", freq: 300, to: 140, dur: 0.08, env: [0.001, 0.06, 0, 0.04] }),
  at(0.06, tone({ wave: "square", duty: 0.5, freq: "C5", to: "C6", dur: 0.12, env: [0.002, 0.05, 0.4, 0.05], vol: 0.25 })))
sfx("powerup", { vol: 0.4, fx: [reverb({ size: 0.4, mix: 0.2 })] },
  tone({ wave: "square", duty: 0.3, freq: "C5", to: "C6", dur: 0.45, arp: { notes: [0, 4, 7, 12], rate: 0.04 }, env: [0.005, 0.1, 0.6, 0.2] }))
sfx("powerdown", { vol: 0.42, fx: [reverb({ size: 0.4, mix: 0.2 })] },
  tone({ wave: "square", duty: 0.5, freq: "E4", to: "E3", dur: 0.5, vibrato: { rate: 9, depth: 0.6 }, env: [0.005, 0.1, 0.6, 0.2] }),
  at(0.05, tone({ wave: "triangle", freq: "B3", to: "B2", dur: 0.45, env: [0.005, 0.1, 0.6, 0.2], vol: 0.6 })))
sfx("bomb", { vol: 0.85, fx: [crush({ bits: 9, rate: 18000 }), drive({ amount: 1.5 }), reverb({ size: 0.5, mix: 0.18 })] },
  noise({ color: "brown", dur: 0.6, env: [0.002, 0.25, 0.4, 0.6], filter: { type: "lp", from: 5000, to: 120 } }),
  tone({ wave: "sine", freq: 100, to: 30, dur: 0.5, env: [0.001, 0.25, 0.4, 0.3], vol: 0.9 }))
sfx("fuse", { vol: 0.3, dur: 1.1 }, noise({ dur: 1.1, env: [0.01, 0.1, 0.8, 0.05], filter: { type: "hp", cutoff: 4000 }, tremolo: { rate: 18, depth: 0.6 } }))
sfx("wobble", { vol: 0.9 },
  noise({ color: "brown", dur: 0.3, env: [0.01, 0.1, 0.6, 0.1], filter: { type: "lp", cutoff: 500 }, tremolo: { rate: 14, depth: 0.9 } }))
sfx("crash", { vol: 0.75, fx: [reverb({ size: 0.4, mix: 0.15 })] },
  noise({ color: "brown", dur: 0.25, env: [0.001, 0.2, 0.2, 0.2], filter: { type: "lp", from: 2500, to: 200 } }),
  tone({ wave: "sine", freq: 90, to: 38, dur: 0.25, env: [0.001, 0.2, 0, 0.1] }),
  at(0.02, noise({ color: "pink", dur: 0.1, env: [0.001, 0.08, 0, 0.08], filter: { type: "bp", cutoff: 1500 }, vol: 0.5 })))
sfx("hurt", { vol: 0.55 },
  tone({ wave: "square", duty: 0.5, freq: 520, to: 160, slide: 0.22, dur: 0.22, env: [0.001, 0.1, 0.5, 0.08] }),
  noise({ dur: 0.08, env: [0.001, 0.06, 0, 0.05], filter: { type: "bp", cutoff: 1400 }, vol: 0.6 }))
sfx("shield", { vol: 0.45, fx: [reverb({ size: 0.5, mix: 0.25 })] },
  tone({ wave: "fm", fm: { ratio: 2.01, index: 2.5, decay: 0.3 }, freq: "A5", dur: 0.3, env: [0.001, 0.2, 0.3, 0.3] }),
  tone({ wave: "sine", freq: "E6", dur: 0.25, env: [0.01, 0.2, 0.3, 0.3], vol: 0.4 }))
sfx("roar", { vol: 0.42, fx: [drive({ amount: 2.2 }), reverb({ size: 0.7, mix: 0.3 })] },
  tone({ wave: "saw", freq: 70, to: 48, dur: 0.9, vibrato: { rate: 11, depth: 1.2 }, env: [0.05, 0.3, 0.7, 0.4], filter: { type: "lp", cutoff: 700 } }),
  tone({ wave: "saw", freq: 105, to: 71, dur: 0.9, vibrato: { rate: 8, depth: 1.5 }, env: [0.08, 0.3, 0.6, 0.4], filter: { type: "lp", cutoff: 900 }, vol: 0.5 }),
  noise({ color: "brown", dur: 0.9, env: [0.05, 0.3, 0.6, 0.4], filter: { type: "lp", cutoff: 500 }, vol: 0.7 }))
sfx("rumble", { vol: 0.8, dur: 4, loop: true },
  noise({ color: "brown", dur: 4.4, filter: { type: "lp", cutoff: 220 }, tremolo: { rate: 3, depth: 0.5 } }),
  tone({ wave: "sine", freq: 41, dur: 4.4, tremolo: { rate: 1.5, depth: 0.4 }, vol: 0.5 }))
sfx("shrine", { vol: 0.4, fx: [reverb({ size: 0.85, mix: 0.4 }), chorus({ mix: 0.4 })] },
  tone({ wave: "triangle", freq: "D4", dur: 1.2, env: [0.15, 0.3, 0.7, 0.8] }),
  tone({ wave: "triangle", freq: "A4", dur: 1.2, env: [0.2, 0.3, 0.7, 0.8], vol: 0.8 }),
  at(0.15, tone({ wave: "fm", fm: { ratio: 3.5, index: 3, decay: 0.5 }, freq: "F5", dur: 0.5, env: [0.001, 0.3, 0.3, 0.8], vol: 0.6 })),
  at(0.35, tone({ wave: "fm", fm: { ratio: 3.5, index: 3, decay: 0.5 }, freq: "A5", dur: 0.5, env: [0.001, 0.3, 0.3, 0.8], vol: 0.5 })),
  at(0.55, tone({ wave: "fm", fm: { ratio: 3.5, index: 3, decay: 0.5 }, freq: "D6", dur: 0.6, env: [0.001, 0.3, 0.3, 0.9], vol: 0.45 })))
sfx("pick", { vol: 0.45, fx: [reverb({ size: 0.6, mix: 0.3 })] },
  tone({ wave: "fm", fm: { ratio: 1, index: 3 }, freq: "D3", dur: 0.4, env: [0.005, 0.2, 0.5, 0.5] }),
  tone({ wave: "fm", fm: { ratio: 1, index: 3 }, freq: "A3", dur: 0.4, env: [0.005, 0.2, 0.5, 0.5], vol: 0.6 }),
  noise({ color: "brown", dur: 0.3, env: [0.001, 0.2, 0.3, 0.3], filter: { type: "lp", cutoff: 400 }, vol: 0.5 }))
sfx("milestone", { vol: 0.38, fx: [reverb({ size: 0.4, mix: 0.18 })] },
  tone({ wave: "square", duty: 0.25, freq: "A4", dur: 0.08, env: [0.002, 0.04, 0.6, 0.04] }),
  at(0.09, tone({ wave: "square", duty: 0.25, freq: "D5", dur: 0.08, env: [0.002, 0.04, 0.6, 0.04] })),
  at(0.18, tone({ wave: "square", duty: 0.25, freq: "F5", dur: 0.08, env: [0.002, 0.04, 0.6, 0.04] })),
  at(0.27, tone({ wave: "square", duty: 0.25, freq: "A5", dur: 0.3, env: [0.002, 0.1, 0.6, 0.2] })))
sfx("gameover", { vol: 0.5, fx: [reverb({ size: 0.6, mix: 0.25 })] },
  tone({ wave: "square", duty: 0.5, freq: "A4", dur: 0.18, env: [0.002, 0.05, 0.6, 0.05] }),
  at(0.2, tone({ wave: "square", duty: 0.5, freq: "F4", dur: 0.18, env: [0.002, 0.05, 0.6, 0.05] })),
  at(0.4, tone({ wave: "square", duty: 0.5, freq: "D4", dur: 0.18, env: [0.002, 0.05, 0.6, 0.05] })),
  at(0.6, tone({ wave: "square", duty: 0.5, freq: "C#4", to: "A3", slide: 0.6, dur: 0.7, vibrato: { rate: 6, depth: 0.3, delay: 0.2 }, env: [0.002, 0.1, 0.7, 0.3] })),
  at(0.6, tone({ wave: "triangle", freq: "D2", dur: 0.9, env: [0.002, 0.1, 0.7, 0.3], vol: 0.8 })))
sfx("gulp", { vol: 0.7, fx: [reverb({ size: 0.4, mix: 0.2 })] },
  tone({ wave: "sine", freq: 300, to: 60, slide: 0.25, dur: 0.3, env: [0.005, 0.2, 0.5, 0.1] }),
  noise({ color: "brown", dur: 0.3, env: [0.005, 0.2, 0.3, 0.2], filter: { type: "lp", from: 1200, to: 200 } }))
sfx("click", { vol: 0.35 }, tone({ wave: "triangle", freq: "A5", dur: 0.03, env: [0.001, 0.03, 0.3, 0.03] }))
sfx("heart", { vol: 0.4, fx: [reverb({ size: 0.3, mix: 0.15 })] },
  tone({ wave: "square", duty: 0.25, freq: "C5", dur: 0.07, env: [0.002, 0.03, 0.6, 0.03] }),
  at(0.08, tone({ wave: "square", duty: 0.25, freq: "E5", dur: 0.07, env: [0.002, 0.03, 0.6, 0.03] })),
  at(0.16, tone({ wave: "square", duty: 0.25, freq: "G5", dur: 0.07, env: [0.002, 0.03, 0.6, 0.03] })),
  at(0.24, tone({ wave: "square", duty: 0.25, freq: "C6", dur: 0.2, env: [0.002, 0.05, 0.6, 0.15] })))
sfx("sizzle", { vol: 0.4 }, noise({ dur: 0.35, env: [0.005, 0.1, 0.5, 0.2], filter: { type: "hp", from: 6000, to: 2500 } }), tone({ wave: "square", freq: 200, to: 90, dur: 0.15, env: [0.001, 0.1, 0, 0.05], vol: 0.3 }))

// Music: a low, driving minor loop. 104 bpm, 8 bars.
inst("bass", { wave: "triangle", env: [0.003, 0.08, 0.7, 0.05], vol: 0.55 })
inst("sub", { wave: "square", duty: 0.5, env: [0.003, 0.1, 0.5, 0.05], vol: 0.12, filter: { type: "lp", cutoff: 600 } })
inst("lead", { wave: "square", duty: 0.25, env: [0.005, 0.1, 0.45, 0.12], vol: 0.13, vibrato: { rate: 5.5, depth: 0.15, delay: 0.12 } })
inst("bell", { wave: "fm", fm: { ratio: 3.5, index: 2.5, decay: 0.4 }, env: [0.001, 0.4, 0.2, 0.5], vol: 0.12 })
const B = (r) => `${r}2 . ${r}2 ${r}3 . ${r}2 ${r}3 . ${r}2 . ${r}2 ${r}3 . ${r}3 ${r}2 .`
song("theme", { bpm: 104, vol: 0.6, fx: [reverb({ size: 0.5, mix: 0.18 }), limiter({ ceiling: 0.9 })] },
  track("bass", [B("D"), B("D"), B("A#"), B("C"), B("D"), B("D"), B("A#"), B("A")].join(" | ")),
  track("sub", [B("D"), B("D"), B("A#"), B("C"), B("D"), B("D"), B("A#"), B("A")].join(" | ")),
  track("bell", [". . . . . . . . . . . . . . . .", ". . . . . . . . . . . . . . . .",
    "D5 . . F5 . . A5 . . . G5 . F5 . E5 .", "F5 . . . E5 . . . C5 . . . . . . .",
    "D5 . . F5 . . A5 . . . C6 . A5 . G5 .", "A5 . . . G5 . F5 . E5 . . . . . . .",
    "F5 . . G5 . . A5 . . . D6 . C6 . A#5 .", "A5 . . . . . . . C#5 . . . E5 . . ."].join(" | ")),
  track("lead", [". . . . . . . . . . . . . . . .", ". . . . . . . . . . . . . . . .", ". . . . . . . . . . . . . . . .", ". . . . . . . . . . . . . . . .",
    "A4 - - - - - - - - - - - - - - -", "C5 - - - - - - - A#4 - - - A4 - - -", "D5 - - - - - - - F5 - - - - - - -", "E5 - - - - - - - C#5 - - - - - - -"].join(" | ")),
  track("kick", "x . . . . . x . x . . . . . . . | x . . . . . x . x . . . . . x ."),
  track("snare", ". . . . x . . . . . . . x . . . | . . . . x . . . . . . . x . . x", { vol: 0.6 }),
  track("hat", ". . x . . . x . . . x . . . x x", { vol: 0.35 }))

sfx("win", { vol: 0.42, fx: [reverb({ size: 0.5, mix: 0.2 })] },
  ...["C5", "E5", "G5"].map((n, i) => at(i * 0.1, tone({ wave: "square", duty: 0.25, freq: n, dur: 0.09, env: [0.002, 0.04, 0.6, 0.04] }))),
  at(0.3, tone({ wave: "square", duty: 0.25, freq: "C6", dur: 0.5, vibrato: { rate: 6, depth: 0.2, delay: 0.15 }, env: [0.002, 0.1, 0.7, 0.3] })),
  at(0.3, tone({ wave: "triangle", freq: "C3", dur: 0.5, env: [0.002, 0.1, 0.7, 0.3], vol: 0.8 })),
  at(0.3, tone({ wave: "square", duty: 0.5, freq: "E5", dur: 0.5, env: [0.002, 0.1, 0.6, 0.3], vol: 0.4 })))
sfx("star", { vol: 0.4, fx: [reverb({ size: 0.4, mix: 0.2 })] },
  tone({ wave: "fm", fm: { ratio: 3.5, index: 2.5, decay: 0.3 }, freq: "A5", dur: 0.25, env: [0.001, 0.2, 0.3, 0.4] }),
  at(0.06, tone({ wave: "fm", fm: { ratio: 3.5, index: 2.5, decay: 0.3 }, freq: "E6", dur: 0.25, env: [0.001, 0.2, 0.3, 0.4], vol: 0.7 })))

// one pop per block in a colour chain; the game raises the pitch as the chain grows
sfx("pop", { vol: 0.4 },
  tone({ wave: "sine", freq: 520, to: 980, slide: 0.05, dur: 0.05, env: [0.001, 0.04, 0.2, 0.05] }),
  tone({ wave: "triangle", freq: 1040, to: 1600, slide: 0.04, dur: 0.03, env: [0.001, 0.03, 0, 0.03], vol: 0.4 }),
  noise({ dur: 0.015, env: [0.001, 0.015, 0, 0.01], filter: { type: "hp", cutoff: 5000 }, vol: 0.25 }))
sfx("bigchain", { vol: 0.42, fx: [reverb({ size: 0.5, mix: 0.25 })] },
  tone({ wave: "square", duty: 0.25, freq: "G5", to: "G6", dur: 0.35, arp: { notes: [0, 4, 7, 12, 16], rate: 0.035 }, env: [0.002, 0.08, 0.6, 0.25] }),
  tone({ wave: "triangle", freq: "G3", dur: 0.35, env: [0.002, 0.08, 0.6, 0.25], vol: 0.6 }))
