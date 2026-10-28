# Undermine (source)

The playable build is the single file `docs/experiments/undermine/index.html`. This folder is what it is built from.

| File | What it is |
|---|---|
| `game.js` | The whole game: mine generation, colour chains, lamp oil, crates, rendering, HUD, progress. |
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
node sim.js 1 30 good              # optional: a bot plays mines 1–30 and prints the results
```

The share card (`og.png`) and the experiments thumbnail (`thumb.jpg`) come from `social/cards.html`; the gameplay slice in them is `social/undermine-play.png`. Run `node social/render.js` twice from the repo root after changing them (the experiments card uses the fresh thumbnail).

## Tuning knobs

- `mineSpec(n)` turns a mine number into its layout: depth, colour clumping (how big chains get), rock, boulders, bedrock slabs, lava, crates and oil cans. Difficulty ramps over about 25 mines, then holds. Each mine is seeded by its number, so a mine replays the same every time.
- Oil: `burn` in `newMine()` sets how long a full lamp lasts. `chainPop()` sets how much oil a chain gives back, and `hurt()` sets what boulders and lava take.
- Star targets (`chainGoal`, `gemGoal`) are set at the end of `newMine()`.
- `GOOD` and `BAD` list what crates can do.
