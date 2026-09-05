# Three.js scene specs — derived from the Spline screen-recordings

These describe the motion/interaction to rebuild in Three.js. The **GLB** supplies
geometry/materials; the choreography below is recreated in code (GSAP ScrollTrigger for
the scroll scenes, raycasting + tweens for Abilities). Spline "states" do **not** export
into GLB, so all animation is authored here.

Source recordings: `Spline Scene Recordings/{landing,abilities,journey}.mp4` (~10–12s each).

---

## 1. Landing (`assets/models/landing.glb`) — scroll scene

**Set:** a floating 3D **device (phone/tablet)** centered, its screen showing Samyak's
**portrait**. Green radial glow + dot-grid behind (DOM overlay handles the grid/glow and
the four corner **press logos** — Hindustan Times / ET HRWorld / CNBC / ThePrint — and
the **social icons** LinkedIn + mail beside the device). Tagline under the device:
"Breakthroughs happen between disciplines, not inside them. I operate as the central dot
that connects and enables all dots to solve what no single expert can."

**Motion (scroll 0→1, pinned):** the single device **fans open into three pillar cards**
— *Building · AI-Ready Orgs*, *Crafting · Learning Simulations & AI Mentors*,
*Enabling · Behaviour Change* (each with partner logos). This fan is the visual bridge
into the "What I Build" section.
*(Recording also shows the presenter clicking the social icons → LinkedIn/contact; that
is not part of the scene animation.)*

- GLB export ideally at **scroll=0** (single device, pre-fan).
- Primary motion is object transform (device → 3 cards) rather than a camera fly.

---

## 2. Abilities (`assets/models/abilities.glb`) — interactive scene (no scroll)

**Set:** **four cards** splayed in a shallow arc, static camera, dark background. Each
card = a colored front face with an animated graphic + a title:
1. **Connecting the Dots** (red) — node/network diagram (People, Government, Influencers,
   Public Institutions, Brands/Funders, Emerging Technologies → central glowing device).
2. **Crafting Narratives** (olive) — glowing device/rectangle.
3. **Building from Zero** (green) — rising "Scale" curve with a glowing dot.
4. **Designing behaviour change** (blue/purple) — neuron/brain network.

**Interaction:**
- **Hover** a card → it highlights **green** and lifts slightly forward.
- **Click** a card → it **flips ~180° and zooms toward the camera** to reveal its
  **back face**: a rich content panel (intro line + 3–4 captioned photos + body).
  - *Connecting the Dots* back: "Most projects fail not because of bad ideas but because
    the right people never end up in the same room…" — photos: Built Workverse /
    Launched Nimaya's GenAI Naari program / Adapted the same simulation philosophy.
  - *Crafting Narratives* back: "The difference between an idea people understand and an
    idea people act on is usually the story around it…" — Repositioned the UN's SDGs /
    Turned voting into a cultural act / Designed the Microshot Philanthropy Summit
    narrative / Wrote storylines for simulations (Ashoka + CSBC logos).
- **Click again / click away** → card flips back and returns to the fan.

**Build approach:** each card = rounded plane with front texture (graphic) + back texture
(content). Raycast on `pointermove` (hover) and `pointerdown` (select). Tween
rotation.y (flip) + position/scale (zoom). Only one card open at a time. Card fronts get
a subtle emissive/glow (shader or texture).

---

## 3. Journey (`assets/models/journey.glb`) — scroll scene

**Set:** a **3D path/road receding to a vanishing point**, floor rendered as a **green
wireframe grid**. Along the path: **green diamond/gem** markers and vertical **posts**.

**Motion (scroll 0→1, pinned):** the **camera travels forward** down the path. As it
passes waypoints, DOM/overlay content for three **Acts** fades in:
- **Act 1 — Early Enthusiasm (2006–2010):** President, The Indian International Model
  United Nations · Founder, YouthPortal.In.
- **Act 2 — Gaining Wisdom (2010–2024):** President, UN Young Changemakers Conclave ·
  Founder, Welcome (Acquired) · Chief Youth Marketer, DDB India.
- **Act 3 — Building the Future (2025–Present):** Co-Founder, Nimaya Foundation ·
  Senior Fellow, Ashoka University.

On completion the pin releases and the DOM **Media (Publication, Media & Awards)** section
rises over the scene.

- GLB export ideally at **scroll=0** (camera at path start).
- Need camera **start** and **end** position/target (or I reverse-engineer from the video).
- Primary motion is the **camera**; markers/posts are mostly static set dressing.
