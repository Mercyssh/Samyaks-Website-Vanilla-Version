# Guides

Small how-tos for toggling/tuning bits of the build.

## Landing background layers

The landing hero stacks several full-section background layers, all at
`z-index: 0` (behind the 3D scene at `--z-scene: 1` and the content at
`--z-content: 2`). In DOM/paint order:

1. `.landing__criss` — criss-cross tile (`assets/img/gridtile.png`), rotated 45°, radial-masked, screen-centred.
2. `.landing__motif` — rotating brand motif (`assets/img/workverse-logo-bgmotif.png`), screen-centred.
3. `.landing__grid` — the original dotted pattern (**currently disabled**, see below).
4. `.landing__halo` — static green radial glow.
5. `.landing__stars` — twinkling star field (dots injected by `js/sections/landing.js`).

### Re-enabling the dotted grid pattern

The dotted grid is **disabled, not removed**. It's hidden by the
`landing__grid--off` class in `index.html`:

```html
<div class="landing__grid landing__grid--off" aria-hidden="true"></div>
```

To bring it back, delete `landing__grid--off` from that element so it reads:

```html
<div class="landing__grid" aria-hidden="true"></div>
```

The dotted styles themselves still live under `.landing__grid` in
`css/landing.css` — nothing else needs to change. (`.landing__grid--off`
is just `display: none;`.)

### Tuning the background layers

All knobs are CSS custom properties on their element in `css/landing.css`,
except the star count/timing which is a JS config.

| Variable / config | Where | Controls |
|---|---|---|
| `--criss-opacity` | `.landing__criss` | Overall opacity of the criss-cross tile |
| `--criss-tile` | `.landing__criss` | On-screen size of one tile (smaller = denser weave) |
| `--motif-size` | `.landing__motif` | Diameter of the rotating motif (in `vmin`) |
| `--motif-opacity` | `.landing__motif` | Opacity of the rotating motif |
| `--motif-dur` | `.landing__motif` | Seconds per full rotation (larger = slower) |
| `--tw-max` | `.landing__star` | Peak opacity a star reaches at the top of its twinkle |
| `STARS.count` | `js/sections/landing.js` | Number of star dots |
| `STARS.minSize` / `maxSize` | `js/sections/landing.js` | Dot size range (px) |
| `STARS.minDur` / `maxDur` | `js/sections/landing.js` | Twinkle period range (s) |
| `STARS.maxDelay` | `js/sections/landing.js` | Max random start offset (desyncs the field) |

The motif spin and star twinkle are both disabled under
`prefers-reduced-motion: reduce` (stars fall back to a static dim opacity).
