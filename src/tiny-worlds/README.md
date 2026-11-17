# Tiny Worlds (source)

The playable build is the single file `docs/experiments/tiny-worlds/index.html`. This folder is what it is built from. It's the browser version of the Tiny Worlds iOS app in inkset-games/core (`games/tiny-worlds-ios`), and it shares the app's art.

| File | What it is |
|---|---|
| `game.js` | The whole game: art parsing, the endless-zoom camera, the canvas renderer, painting rules, touch/mouse input, the gallery. Ported from the app's `Camera.swift`, `Coloring.swift`, `Studio.swift` and `ArtRenderer.swift`. |
| `shell.html` | Page markup, CSS and share tags. `build.js` drops `packs.js` and `game.js` into it. |
| `packs.js` | The six picture packs (generated, don't edit). |
| `sync-art.js` | Regenerates `packs.js` from the app's art source, `games/tiny-worlds-ios/art-src/prototype.html` in inkset-games/core. |
| `build.js` | Bundles everything into the single HTML file. |
| `shots.js` | Renders the gameplay slice for the share cards (`social/tiny-worlds-play.png`) and the icon (`icon.png`). |
| `check.js` | Headless smoke test: finishes the first world of every pack by tapping, at phone size. |

## Rebuild

```bash
node src/tiny-worlds/sync-art.js ../core/games/tiny-worlds-ios/art-src/prototype.html   # only when the app's art changed
node src/tiny-worlds/build.js         # writes docs/experiments/tiny-worlds/index.html
node src/tiny-worlds/check.js         # optional: every pack's first world can be finished
node src/tiny-worlds/shots.js         # only when the look changed; then:
node social/render.js && node social/render.js   # share card, thumbnail, experiments card (twice: it uses the fresh thumbnail)
```

`render.js` re-renders every card; put back any it changed that you didn't mean to (`git checkout docs/og/home.png` and so on).

## How it plays

The gallery is the landing page: every pack as a card with its finished picture and your progress through its four worlds. Tapping a card zooms its painting up out of the card. The grid button (top left) brings the gallery back. Zooming out never drops you into the gallery; the zoom is infinite both ways.

- **Guided** colors (default): each world has its own paints, and areas that take the selected paint show drifting stripes. Tap an area that takes a different paint to switch to that paint. A paint gets a check once it's used up, and the next one is picked for you.
- **Free** colors: the world's paints plus five extras, no stripes, repaint anything.
- **Tap** painting (default): one tap fills an area. Taps are forgiving: a tap on a line, a gap or a finished area counts for the nearest striped area within about 20px.
- **Brush** painting: one finger paints inside the area it started in, and covering about 82% fills the rest. Double-tap fills. A drag that starts anywhere else moves the picture.
- Pinch (or mouse wheel / trackpad pinch) zooms, one finger drags and flings, tapping a little window flies into it, and the button beside the grid flies out one world.
- Once only slivers of a paint are left (under 12 square units visible), they fill themselves, so a world never stalls on a speck at its edge.

Painting, style and the last pack are saved in `localStorage` under the `tiny-worlds:` prefix. Nothing is sent anywhere.

## Rendering notes

- The camera stores one transform, for the deepest world that still covers the screen, and re-bases up or down a level as you zoom, so numbers stay small at any depth.
- The world you're painting is the deepest one that's big enough and under the middle of the screen, with some stickiness so it doesn't flicker mid-pinch. Only that world shows stripes; when focus moves, the old world's stripes fade out as the new one's fade in.
- Worlds are drawn from cached bitmaps (redrawn only when their paint changes); the focused world draws just its striped areas as vectors on top. Big worlds (over 1024 device px) are drawn as vectors with off-screen shapes skipped. Stripes alone redraw at about 30 fps.
