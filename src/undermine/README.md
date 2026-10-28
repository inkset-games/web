# Undermine (source)

The playable build is the single file `docs/experiments/undermine/index.html`. This folder is what it is built from.

| File | What it is |
|---|---|
| `game.js` | The whole game: world generation, the Gulper, crates, bargains, rendering, HUD. |
| `shell.html` | Page markup and CSS. `build.js` drops the assets and `game.js` into it. |
| `art.vx.js` | Sprites, drawn with [vex](https://github.com/uilianks/vex). |
| `icon.vx.js` | The 180×180 app icon (`docs/experiments/undermine/icon.png`). |
| `sounds.cx.js` | Sound effects and the music loop, made with [chirp](https://github.com/uilianks/chirp). |
| `build.js` | Bundles everything into the single HTML file (SFX and music become inline MP3s; needs `ffmpeg`). |
| `bot.js`, `sim.js` | A simple bot and a headless balance check. |

## Rebuild

```bash
# once: clone vex and chirp somewhere and run npm install in each
node path/to/vex/bin/vex.js build art.vx.js
node path/to/chirp/bin/chirp.js build sounds.cx.js --no-preview
node build.js                      # writes docs/experiments/undermine/index.html
node sim.js 10 good                # optional: 10 bot runs, prints depth and cause of death
```

The share card (`og.png`) and the experiments thumbnail (`thumb.jpg`) come from `social/cards.html`; the gameplay slice in them is `social/undermine-play.png`. Run `node social/render.js` twice from the repo root after changing them (the experiments card uses the fresh thumbnail).

## Tuning knobs

- `wormSpeed()` sets the Gulper's pace by depth, plus the catch-up boost when you get far ahead.
- `genRow()` sets how much rock, hard rock, caves, gems, crates, TNT, boulders and lava each depth gets. Biomes change every 100 m; shrines sit at 50, 150, 250 m and so on.
- `PACTS`, `GOOD` and `BAD` list the bargains and crate effects.
