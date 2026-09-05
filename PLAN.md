# Rebuild samyakchakrabarty.com in vanilla HTML/CSS/JS + Three.js

## Context

The current site is built in **Framer + Spline**. It loads slowly and feels laggy
because it depends on Framer's runtime, Framer's CDN, and Spline's servers (streaming
`.splinecode` scenes at runtime). The goal is a **self-hosted, zero-build,
dependency-light rebuild** that keeps the visual identity and interactions but loads
fast and owns all its assets.

Section order (top → bottom): **Landing → What I Build → Abilities → Journey → Media**,
with a floating pill **Nav** and an initial **Preloader**.

## The three 3D scenes (corrected, per user)

The desktop site has **three genuine Spline scenes**, each replaced by a hand-built
**Three.js** scene. (My earlier DOM scan only caught one because the other two are
lazy/scroll-mounted — corrected below.)

1. **Landing** — a **scroll-driven camera animation**. As you scroll, the scene's
   camera animation plays *in place* (the section is pinned) before the page visually
   scrolls on. → Three.js camera path driven by GSAP ScrollTrigger pin + scrub.
   *(Mobile uses a **separate** mobile 3D scene — deferred to the mobile phase.)*
2. **Abilities** — an **interactive** scene, **no scroll animation**. You **click a
   card to flip it around and bring it closer** to see its back side. → Three.js with
   raycasting for clicks + tween for the flip/zoom; camera is static.
   *(Mobile does this in pure HTML/CSS/JS — the fanned card deck in
   `Old Files/AbilitiesMobile.tsx` — no 3D on mobile.)*
3. **Journey** — a **scroll-driven camera animation** that **moves the camera through
   the scene**; when it finishes, normal page scroll resumes. → same pin+scrub pattern
   as Landing, camera travels a path through the scene. *(Present on mobile too.)*

Everything else (What I Build, Media, the What-I-Build card stack, the landing's HTML
overlays, nav, timeline) is **DOM/CSS + video**, not 3D.

## Decisions locked in (from user)

- **3D:** rebuild all three Spline scenes **by hand in Three.js** (no `.splinecode` at
  runtime, no Spline runtime).
- **No build tooling.** Zero-tooling: hand-vendored minified libraries in `/vendor`,
  loaded via `<script type="module">` + an import map. No Vite, no bundler, no React.
- **Dependencies allowed:** **Three.js** (3D), **GSAP + ScrollTrigger** (pin/scrub),
  **Lenis** (smooth scroll). All vendored locally as static files.
- **Assets:** user provides Magistral + Plus Jakarta Sans fonts and the **GLB** exports
  (plus `.splinecode` / screen-recordings as reference). **Images/videos: use a shared
  placeholder image everywhere for now**, swap in real media later.
- **Scope:** **desktop-first.** Mobile-specific layouts/scenes are a later phase.

## Tech stack

| Concern | Choice |
|---|---|
| Markup/styles | Hand-written **HTML + CSS** (CSS custom properties) |
| Interactivity | **Vanilla ES modules** (`<script type="module">`, import map) |
| Smooth scroll | **Lenis** (vendored) |
| Scroll animation | **GSAP + ScrollTrigger** (vendored) |
| 3D | **Three.js** (vendored) — Landing, Abilities, Journey scenes |
| Build | **None.** Static files served as-is |
| Hosting | Any static host / CDN (Netlify, Cloudflare Pages, GitHub Pages) |

## Project structure

```
/ (repo root)
  index.html
  /js
    main.js                # boot: Lenis + ScrollTrigger, section init, raf loop
    preloader.js
    nav.js                 # floating pill, hide-on-scroll, scroll-spy
    /sections
      landing.js           # HTML overlays + mounts landing 3D scene
      what-i-build.js      # pillar tabs + pinned card stack + stat rotator
      abilities.js         # mounts abilities 3D scene
      journey.js           # mounts journey 3D scene + timeline overlay
      media.js             # editorial/interview/announcement tabs + article cards
    /three
      renderer.js          # shared: renderer, resize, visibility-pause, raf hookup
      landing-scene.js     # GLB load + scroll-scrubbed camera path
      abilities-scene.js   # GLB load + raycast click-to-flip/zoom
      journey-scene.js     # GLB load + scroll-scrubbed camera travel
      /shaders             # any GLSL (glow/particles/background)
  /css
    tokens.css             # colors, fonts, spacing vars
    base.css               # reset, typography, @font-face
    *.css                  # one file per section
  /vendor                  # three.module.js, gsap.min.js, ScrollTrigger.min.js, lenis
  /assets
    /fonts                 # magistral*.woff2, plus-jakarta-sans*.woff2
    /models                # landing.glb, abilities.glb, journey.glb
    /img                   # placeholder.jpg (used everywhere for now)
    /video                 # (later)
```

Modules resolve via an **import map** in `index.html` (e.g. `"three"` →
`/vendor/three.module.js`), so imports stay clean with no bundler.

## Design tokens (observed)

- **Accent greens:** `#A6FF3D` / `#9BE83A` / `#8CC63F` → standardized to a few CSS vars.
- **Backgrounds:** near-black page; **Abilities is a light/white** section.
- **Type:** **Magistral** for headings (incl. bold), **Plus Jakarta Sans** for body.
  Self-hosted `@font-face`, `font-display: swap`.

## Section-by-section rebuild

**Nav** — Floating rounded pill (Home, What I build, Abilities, Journey, Media). Reveal
on scroll-up / hide on scroll-down; **scroll-spy** highlights the active section.
Reference: `Old Files/ScrollNav.tsx`. CSS + small scroll listener.

**Preloader** — Full-screen overlay; progress bar fills as fonts + GLB models + the
first scene report ready, then fades and emits `site:ready` to gate entrance
animations. Simplified port of `Old Files/SplinePreloader.tsx` (gate on our own loads,
not Spline).

**Landing** — Pinned section. **Three.js scene** (scene 1) with a scroll-scrubbed
camera animation, plus HTML/CSS overlays: dot-grid background, a green radial **halo
that follows the mouse**, and press logos in the corners (Hindustan Times, ET HRWorld,
CNBC, ThePrint). ScrollTrigger pins the section and scrubs the camera; on completion
the pin releases and normal scroll resumes.

**What I Build** — Large **outlined metallic title**, intro paragraph, and a **3-pillar
tab switcher**: (1) Making Nonprofits AI-Native, (2) Crafting Learning Simulations,
(3) Building Movements for Behavioural Change. Below, a **pinned card stack**; each
pillar's card scrubs in with a slight perspective transform. Each card = media
(placeholder image for now) + tag chips + heading + body + 3–4 stats. Reference:
`Old Files/WhatIBuildMobile.tsx` (scramble stat rotator + "Read More" overlay; desktop
likely shows stats inline). Copy captured from the live site.

**Abilities** — **Light/white** section hosting **Three.js scene** (scene 2):
interactive cards; **click a card → it flips and moves closer** to reveal its back.
Implemented with `GLTFLoader` for the card geometry/textures + raycasting for clicks +
a flip/zoom tween; static camera. Ability themes ("Connecting the Dots", "Crafting
Narratives", "Building from Zero", "Designing behaviour change") from
`Old Files/AbilitiesMobile.tsx`.

**Journey** — Pinned section. **Three.js scene** (scene 3): scroll scrubs the **camera
traveling through the scene**; on completion the pin releases. A DOM **timeline** /
Publication-Media-Awards overlay accompanies it ("Every stage taught me something the
next one needed…"). Reference for interactions: `Old Files/JourneyMobile.tsx`.

**Media (Publication, Media & Awards)** — Category tabs (Editorials / Interviews /
Announcements) with outlet items and article cards ("Soft Skills: The missing piece in
employability", etc.), each linking out via "Read Article". Reference:
`Old Files/MediaAwardsMobile.tsx`. DOM + small tab controller.

## Three.js implementation notes

- **Shared renderer module**: one WebGL renderer strategy per scene, each with
  `powerPreference:"high-performance"`, capped `devicePixelRatio` (≤2), and a render
  loop that **pauses when the section is off-screen** (IntersectionObserver) and
  **lazy-inits on first approach**. Only one heavy scene runs at a time.
- **Landing / Journey (scroll scenes):** load GLB, place camera, define a camera path
  (positions/targets read from the `.splinecode`/recording), and drive progress `0→1`
  from a ScrollTrigger `pin: true, scrub: true`. Reuse the exact camera start/end
  transforms you provide.
- **Abilities (interactive):** load GLB cards, raycast on `pointerdown` to pick a card,
  tween rotation (flip) + position/scale (bring closer); click again or click away to
  return. No scroll coupling.
- Match lights/materials to the Spline scene using values read from the `.splinecode`
  (colors, intensity) rather than guessing.

## Performance strategy (the point of the rebuild)

- **Self-host everything**; **no Framer runtime, no Spline runtime.**
- Three.js + each GLB **lazy-loaded on approach**, scene render loops paused
  off-screen — no idle GPU/CPU for scenes you can't see.
- Minified vendored libs; hero is static DOM for a fast LCP; defer non-critical JS.
- Respect `prefers-reduced-motion` (disable smooth-scroll scrubbing + heavy anims).

## Phased execution

1. **Scaffold** — `index.html` + import map, tokens/base CSS, `@font-face`, vendored
   Three/GSAP/ScrollTrigger/Lenis, Lenis+ScrollTrigger boot, Nav, Preloader shell.
   *Verify: smooth scroll, nav scroll-spy, fonts render.*
2. **Static sections** — Landing HTML overlays, What I Build, Media, Journey timeline
   overlay — real copy, placeholder images. *Verify: desktop visual match at 1280–1440px.*
3. **Scroll animation pass** — pin/scrub landing overlays + the What-I-Build card stack
   + section entrances with ScrollTrigger. *Verify: feel matches, no jank.*
4. **Three.js scenes** — build from your GLB exports, in order: Abilities (interactive,
   self-contained) → Landing (scroll cam) → Journey (scroll cam). Wire pins/raycasting.
   *Verify: render, interactions/camera match, pause off-screen.*
5. **Polish + perf** — reduced-motion, cross-browser (Chrome/Firefox/Safari), image/
   video optimization. *Verify: smooth on desktop, no jank, no console errors.*
6. **Mobile phase (later)** — port bespoke mobile layouts + the mobile landing 3D scene
   + mobile Journey from the `Old Files` components; real images/videos swap-in.

## Requirements from you

1. **Fonts (blocking):** Magistral (regular + bold) and Plus Jakarta Sans as
   `.woff2`/`.ttf`. (Jakarta is also on Google Fonts; Magistral is licensed — need your
   files.)
2. **GLB exports (blocking the 3D step):** `landing.glb`, `abilities.glb`,
   `journey.glb`. Ideal extras per scene: the **`.splinecode`** and a **short
   screen-recording**; for Landing & Journey, the **camera start & end transforms**.
   Drop the recordings into the folder created for this:
   `D:\Projects\Samyak Deck\Raw Website\Spline Scene Recordings\`.
3. **Images/videos:** none needed now — I'll use one shared **placeholder image**
   everywhere and we swap real media in during the mobile/polish phase.
4. **Outbound links:** real destinations for "Read More" / "Read Article" / press items
   (can be added later; I'll stub them).
5. **Meta/brand:** favicon, page title/description, OG image, and target **host**
   (can be added at the polish phase).

## Verification (end-to-end)

- Open `index.html` (served from any static server) and walk all five sections at
  1280/1440/1920 widths; compare against the live site.
- Confirm smooth scroll, nav hide/scroll-spy, hero halo, pinned card stack, the three
  Three.js scenes (landing scroll-cam, abilities click-to-flip, journey scroll-travel),
  and that scene render loops pause off-screen.
- Test Chrome + Firefox + Safari; verify the `prefers-reduced-motion` path.

---

## Progress Tracker
_Updated: 2026-09-05 · ✅ done · 🔄 in progress · ⏳ blocked · ⬜ todo_

- ✅ **P1 Scaffold** — structure, vendored libs (three/gsap/scrolltrigger/lenis), fonts (Jakarta + Magistral woff2), nav, preloader, Lenis+ScrollTrigger boot. Browser-verified.
- ✅ **P2 Static sections** (first pass, awaiting user review) — ✅ Media (master/detail) · ✅ What I Build (metallic title, 3 pillar tabs, card+stats) · ✅ Landing overlays (press corners, halo, device placeholder, tagline) · ✅ Journey timeline (3 Acts / nodes). Copy TODOs flagged in-code.
- ⬜ **P3 Scroll-animation pass** — pin/scrub landing, WIB card stack, entrances.
- ⏳ **P4 Three.js scenes** — blocked on GLBs. Choreography ready in `docs/scene-specs.md`.
- ⬜ **P5 Polish + perf** — reduced-motion, cross-browser, asset optimization.
- ⬜ **P6 Mobile phase** — bespoke mobile layouts + mobile 3D.

**Assets:** ✅ fonts · ✅ recordings · ⏳ GLBs (user adding) · placeholder image in use.