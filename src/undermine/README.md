# Undermine (source)

The playable build is the single file `docs/experiments/undermine/index.html`. This folder is what it is built from.

| File | What it is |
|---|---|
| `game.js` | The whole game: mine generation, tapping, explosives, the shop, rendering, HUD and progress. |
| `shell.html` | Page markup and CSS. `build.js` drops the assets and `game.js` into it. |
| `art.vx.js` | Sprites, drawn with [vex](https://github.com/uilianks/vex). |
| `icon.vx.js` | The 180×180 app icon (`docs/experiments/undermine/icon.png`). |
| `sounds.cx.js` | Sound effects and the music loop, made with [chirp](https://github.com/uilianks/chirp). |
| `build.js` | Bundles everything into the single HTML file (SFX and music become inline MP3s; needs `ffmpeg`). |
| `sim.js` | A headless balance check: a greedy bot plays the campaign from a fresh save and shops between runs. |

## Rebuild

```bash
# once: clone vex and chirp somewhere and run npm install in each
node path/to/vex/bin/vex.js build art.vx.js
node path/to/chirp/bin/chirp.js build sounds.cx.js --no-preview
node build.js                      # writes docs/experiments/undermine/index.html
node sim.js 30 8                   # optional: play mines 1–30, up to 8 runs each (CONTINUE=1 to go past a stuck mine)
```

The share card (`og.png`) and the experiments thumbnail (`thumb.jpg`) come from `social/cards.html`; the gameplay slice in them is `social/undermine-play.png`. Run `node social/render.js` twice from the repo root after changing them (the experiments card uses the fresh thumbnail).

## How it plays

Tap a block to break it: the mole keeps swinging until it gives, one swing per hit, and you can line up to three more taps. A tap that lands just beside or below a block counts for the nearest block you can hit. Only open space and the blocks around it are visible, the rest is dark until you dig into it, and caves light up all at once when you break in. The camera keeps the mole in the lower third, near your thumb. Each hit is one swing; dirt breaks in one hit, stone and hard rock take more, and the mole steps next to whichever block you tap (it can hop one row up, and falls into any hole under it). Tapping open space walks there for free. From your first tap a crusher creeps down the shaft from the surface and speeds up if you get far ahead, so dawdling gets you squashed. When the swings run out, or the crusher catches you, the run is over, but every gem you dug up is kept, and the shop between runs sells more pick power, more swings, gem luck and bombs. Food in the dirt gives swings back. TNT blasts 3×3, dynamite drills a column, a lightning crystal zaps the nearest gems, and gas pockets blow up and set off the gas next to them. Break into the chamber at the bottom of a mine to open the treasure chest and unlock the next mine.

## Tuning knobs

- `mineSpec(n)`: depth, rock toughness (`hpMul`), the share of stone and hard rock, food, explosives, ledges and gems for mine `n`. Rock type comes from noise and is split by share in `genMine()`.
- `crush` in `mineSpec(n)` is how many rows a second the crusher falls; it also catches up at 0.3 rows/s for every row past 7 ahead (in `update()`).
- `BASE_HP`, `FOOD` and `GEM_VALUE` at the top of `game.js`.
- `sim.js` taps every `TAP` seconds (default 0.35); try `TAP=0.7` to check a slow player against the crusher.
- `UPGRADES` with `pickDamage`, `maxSwings` and `luckMul`: prices grow by `grow` per level, then flatten to +12% after level 12, so power and swings never max out.
- Stars: reach the chest, dig 30% of the mine's gems, and finish with a quarter of your swings left.
