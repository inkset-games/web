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
| `bot.js`, `sim.js` | Three bots (`idle`, `naive`, and `good`, which plans a route by dig time) and a headless balance check. |

## Rebuild

```bash
# once: clone vex and chirp somewhere and run npm install in each
node path/to/vex/bin/vex.js build art.vx.js
node path/to/chirp/bin/chirp.js build sounds.cx.js --no-preview
node build.js                      # writes docs/experiments/undermine/index.html
node sim.js 1 30 good              # optional: a bot plays mines 1–30 and prints the results (also: idle, naive)
```

The share card (`og.png`) and the experiments thumbnail (`thumb.jpg`) come from `social/cards.html`; the gameplay slice in them is `social/undermine-play.png`. Run `node social/render.js` twice from the repo root after changing them (the experiments card uses the fresh thumbnail).

## How it's meant to play

Digging straight down is always possible and always safe, but it starves you. Oil cans are never in the starting column, so a player who never steers runs dry (the `idle` bot clears about 1 mine in 30). Every sideways step undermines something: blocks of one colour stick together, and a group with nothing under it shakes for a moment, then drops. A drop is a little slower than you dig, so it only catches you when you stall on rock or bedrock; the red lane above the mole shows when one is lined up. If a dropped group lands touching its own colour and makes 4 or more, it pops again (a combo) and refills some oil. Three bumps and the mine is over.

## Tuning knobs

- `mineSpec(n)` turns a mine number into its layout and pace: depth, colour clumping, rock, bedrock ledges, lava, crates, lamp `tank` (seconds), `oilEvery` (rows between cans), `wobble` (warning before a drop) and `fallMax` (drop speed). Difficulty ramps over about 30 mines with a five-mine wave (the 4th is hardest, every 5th is a breather), then holds. Each mine is seeded by its number, so a mine replays the same every time.
- Toughness: coloured blocks are soft, normal, bolted or plated (`TOUGH` dig times). `soft`, `tough` and `plate` in `mineSpec()` set the share of each, and `toughen()` lays them out in bands and seams from noise.
- Oil: cans are placed by `placeOil()`. Combo oil is set in `chainPop()`. Digging a chain gives speed, not oil.
- Gravity: `settle()`, `dropGroup()` and `updateGravity()`. `hurt()` takes a heart for a crush or lava.
- Stars: reach the chest, collect `gemGoal` gems (set in `newMine()`), and take no bumps.
- `GOOD` and `BAD` list what crates can do.
