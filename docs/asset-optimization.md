# Asset optimization

## Image pass — DONE (2026-09-11)

Converted PNG/JPG → **WebP** across the site, downscaling only where a file was
stored much larger than it can ever display (DPR capped at 2×, per the perf plan).
Alpha was preserved on every image that had it. Originals were git-tracked and have
been removed (recoverable via `git checkout` if ever needed).

**Result: referenced images ~29 MB → ~5.2 MB (~83% smaller).** No code change needed
by you — all references in `js/sections/*` and `css/landing.css` were rewired to `.webp`.

Per-group rules used (quality = ImageMagick WebP q, method 6):

| Group | Files | Rule | Why |
|---|---|---|---|
| Abilities fronts | `Card_1–4` | cap width 560, q90, keep alpha | only ever shown ≤272 px (×2 = 544); text on card |
| Abilities backs | `Card_1–4_back` | keep 1440×2400, q88, alpha | open card shows them ~1176 px wide (×2 needs ~2352); text |
| Media article screenshots | `harpercollinsbook-full`, `nimayaxyourstory-full` | keep full res, q86 | scrollable overlay, capped at 920 px wide; **text-heavy → kept sharp** |
| Media thumbnails (large) | `hindustantimes`, `cnbc`, `ndtv` | cap height 900, q86 | detail pane caps at 440 px tall (×2 = 880) |
| Media thumbnails (small) | `nimayaxgovt`, `harpercollins…`, `nimayaxyourstory`, `*-thmb` | keep res, q84–86 | already near display size |
| Award logos | `forbesasia`, `bombayadclub`, `timesleadindia` | resize to 900 px, q86, alpha | were 2000 px for a ~440 px slot |
| Fellowship logos | `ink…`, `rc…` | keep 546², q88 | already small |
| WIB card media | all card1/2/3 images | cap long edge 1600, q84 | photos, shown ≤980 px in overlay |
| Landing motif | `workverse-logo-bgmotif` | keep 1180², q88, alpha | rotating background motif |

**Left as-is on purpose:** `gridtile*.png` (2 KB tiling textures — WebP wouldn't beat
them), the landing press-logo masks (`*.svg`, already-tiny `*.webp`), `placeholder.svg`,
and `recognition/books/*.webp` (already small & optimal).

### ⚠️ Unused assets flagged (not touched)
`assets/img/abilities/Card_1–4_full_mobile.png` — **8.3 MB total, referenced nowhere**
in the code (mobile abilities reuses the normal front/back images). They're also the only
**untracked** image files, so deleting them is *not* git-recoverable. I left them in place.
**Recommend deleting them** (bigger than every shipping image combined) — say the word and
I will, or you can just remove that folder's `*_full_mobile.png`.

---

## Video pass — DONE (2026-09-11)

All videos re-encoded/remuxed **in place** (same `.mp4` filenames → no code changes).
Per the confirmed audio facts: **only the media-section interview clips carry audio**;
every other video is a muted decorative loop, so audio was stripped from those.

**Result: ~61 MB → ~12.7 MB (~79% smaller).**

| File | Before | What changed | After |
|---|---|---|---|
| what-i-build/card2/Simulations x Employability.mp4 | 1920×1080 · 60 fps · ~14 Mbps · 28.3 MB | H.264, →1280×720, →30 fps, **audio stripped**, CRF 28, faststart | 1280×720 · 1.9 MB |
| what-i-build/card2/Simulations x Livelihoods.mp4 | 1920×1080 · 24 fps · ~3.5 Mbps · 20.5 MB | H.264, →1280×720, **audio stripped**, CRF 28, faststart | 1280×720 · 2.9 MB |
| what-i-build/card2 thmb.mp4 | 500×800 · 24 fps · ~3.6 Mbps · 5.7 MB | H.264, kept res, **audio stripped**, CRF 28, faststart | 500×800 · 0.55 MB |
| what-i-build/card1 thmb.mp4 | 1376×768 · 24 fps · ~2.3 Mbps · 1.6 MB | H.264, →1280×714, no audio, CRF 28, faststart | 1280×714 · 0.8 MB |
| recognition/media/ndtv.mp4 | 1276×720 · 30 fps · ~0.5 Mbps · 3.0 MB · audio | **remux only** (+faststart); audio + quality untouched | 1276×720 · 3.0 MB |
| recognition/media/bbc.mp4 | 640×362 · 30 fps · ~0.26 Mbps · 3.7 MB · audio | **remux only** (+faststart); audio + quality untouched | 640×362 · 3.7 MB |

The two interview clips were already lean, so they were only remuxed to move the `moov`
atom to the front (progressive playback) — no re-encode, no quality loss.

### Optional further win (not done — needs a code change)
Videos are emitted as single `<video src>` tags. Adding **VP9/AV1 WebM** alongside the MP4
(dual `<source>`) would shave roughly another 30–50% off the loops, but it requires
refactoring the `<video>` emitters in `what-i-build.js`, `media.js`, and the two mobile
modules to output paired sources. Say the word if you want that pass.
