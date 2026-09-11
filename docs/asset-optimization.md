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

## Video pass — PLAN (not yet run)

Current videos total **~64 MB**, all H.264 MP4. They fall in two buckets, which need
different treatment:

| Bucket | Files | Now | Issue |
|---|---|---|---|
| **Decorative loops** (muted, background) | `card2/Simulations x Employability` (29 MB), `…Livelihoods` (21 MB), `card1 thmb`, `card2 thmb` | 1080p **60 fps ~14 Mbps**, some with an **audio track that's never heard** | wildly over-spec for a ~600 px muted loop |
| **Content clips** (audio matters) | `recognition/media/ndtv.mp4`, `bbc.mp4` | 720p ~0.5–1 Mbps, real interviews | already lean; audio must stay |

### Steps (ffmpeg is installed locally)
For the **decorative loops** — the ~50 MB of easy wins:
1. Drop to **30 fps**, **strip audio** (`-an`), scale to ~2× display width (≈720p is plenty; likely less).
2. Encode two deliverables: **AV1/VP9 WebM** (smallest) + an **H.264 MP4 fallback** for Safari, and add both `<source>`s.
3. Add `-movflags +faststart` (MP4) so playback starts before full download.
4. Generate a **poster** frame (first frame → WebP) so nothing loads until in view.
Expected: those two 21–29 MB files → **~1–3 MB each**.

For the **content clips**: keep audio + resolution, just re-encode at a sane CRF and add the WebM/MP4 pair + faststart. Modest savings, no quality loss.

### Automated or needs you?
**Semi-automated.** The encoding itself is a scriptable ffmpeg batch I can run in one pass.
Three decisions need **your** input first, because they change output, not just size:
- **Which loops are truly muted/decorative** (safe to strip audio + drop fps) vs. any that should keep sound.
- **Acceptable resolution** for each loop (I'll propose per file from its on-screen size; you confirm).
- **A quality eyeball** after encoding — compression artefacts in motion are subjective, so you should spot-check the re-encoded loops before we delete originals.

Ping me when you want to run it and I'll propose exact per-file targets first.
