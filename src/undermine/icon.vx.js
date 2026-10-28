include("art.vx.js")
scene("app_icon", { w: 180, h: 180, bg: lin(["#3a2416", "#120d0b"], 90) },
  rect(0, 118, 180, 62, "#5a3a22"),
  tile("dirt_top_0", 0, 118, 6, 2, { scale: 1 }),
  rect(66, 118, 48, 62, "#2e1f14"),
  stamp("gem_emerald", 30, 150, { anchor: "center", scale: 1.1 }), stamp("gem_ruby", 150, 158, { anchor: "center", scale: 1 }),
  stamp("mole", 90, 92, { anchor: "center", scale: 3.6 }),
  stamp("pick", 136, 74, { anchor: "center", scale: 2.2 }))
