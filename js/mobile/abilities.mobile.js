/* ============================================================
   abilities.mobile.js — swipeable fanned deck (mobile).

   Port of Old Files/AbilitiesMobile.tsx:
     • cards dealt in a downward-fanning arc; one sits front-centre
     • drag / fling left-right (or tap a dot) to deal a different card
       to the front; a fling projects momentum then spring-snaps
     • tap the FRONT card → full-screen scrollable overlay of its back
       image; tap a splayed card → bring it forward
     • dots under the deck + a swipe hint

   Reuses the section title + hint already in index.html; the desktop
   floor + fanned deck (#abilitiesDeck) are hidden on mobile by CSS.
   Data (front = cover, back = overlay) comes from the shared ABILITIES
   array in js/sections/abilities.js. Styling: css/mobile.css.
   ============================================================ */

import { ABILITIES } from "../sections/abilities.js";
import { getImageOverlay } from "./image-overlay.js";

/* ============================================================
   CONFIG — the Framer "AbilitiesMobile" component's settings, editable
   here in one place. Colours/backgrounds and the deck's height
   (stageAspect) are CSS instead (css/mobile.css → .abil-m__stage
   aspect-ratio, .abil-m__card width).

   | Setting     | Framer control | Controls                                  |
   |-------------|----------------|-------------------------------------------|
   | cardW       | Card Width     | front card width, % of the deck stage     |
   | spreadAngle | Fan Angle      | tilt between neighbouring cards (deg)      |
   | spreadX     | Fan Spread     | sideways gap between neighbours (px)       |
   | dropY       | Fan Drop       | how far outer cards sink (px per step)     |
   | loop        | Loop           | wrap past the first / last card            |
   | hintText    | Hint Text      | the swipe hint under the deck              |
   | step        | (drag feel)    | px of drag that equals one card            |
   ============================================================ */
const CONFIG = {
  cardW: 62,
  spreadAngle: 12,
  spreadX: 26,
  dropY: 8,
  loop: false,
  hintText: "Swipe to explore · tap to open",
  step: 96,
};

const prefersReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Nearest way round a looped ring, so the card just before the active one
   fans left instead of splaying the whole deck the long way. No-op unlooped. */
function wrapRel(rel, count, loop) {
  if (!loop || count < 2) return rel;
  let r = rel % count;
  if (r > count / 2) r -= count;
  else if (r < -count / 2) r += count;
  return r;
}

export function initAbilitiesMobile() {
  const section = document.querySelector(".abilities");
  const deckHost = document.getElementById("abilitiesDeck");
  if (!section || !deckHost) return;

  const cards = ABILITIES;
  const count = cards.length;
  if (!count) return;

  const hint = section.querySelector(".abilities__hint");
  if (hint) hint.textContent = CONFIG.hintText;

  const overlay = getImageOverlay();

  /* ---- build DOM ---- */
  const wrap = document.createElement("div");
  wrap.className = "abil-m";
  wrap.setAttribute("data-reveal", "fade");
  wrap.innerHTML = `
    <div class="abil-m__stage">
      ${cards
        .map(
          (c, i) => `
        <button type="button" class="abil-m__card" data-i="${i}" aria-label="${c.title}">
          <img src="${c.front}" alt="${c.title}" draggable="false" loading="lazy" />
        </button>`
        )
        .join("")}
    </div>
    <div class="abil-m__dots" role="tablist" aria-label="Cards">
      ${cards
        .map((_, i) => `<button type="button" class="abil-m__dot" data-i="${i}" aria-label="Go to card ${i + 1}"></button>`)
        .join("")}
    </div>`;
  section.appendChild(wrap);

  const stage = wrap.querySelector(".abil-m__stage");
  const cardEls = [...wrap.querySelectorAll(".abil-m__card")];
  const dotEls = [...wrap.querySelectorAll(".abil-m__dot")];

  /* ---- state ---- */
  let position = 0;         // continuous, fractional cursor along the deck
  let active = 0;           // snapped index
  let raf = 0;

  const clampPos = (p) => (CONFIG.loop ? p : Math.max(0, Math.min(count - 1, p)));

  const render = (pos) => {
    for (let i = 0; i < count; i++) {
      const rel = wrapRel(i - pos, count, CONFIG.loop);
      const a = Math.abs(rel);
      const rotate = rel * CONFIG.spreadAngle;
      const x = rel * CONFIG.spreadX;
      const y = a * CONFIG.dropY;
      const scale = 1 - Math.min(a, 5) * 0.05;
      const opacity = a > 3.4 ? 0 : 1 - a * 0.13;
      const el = cardEls[i];
      el.style.transform = `translate(-50%, 0) translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.zIndex = String(1000 - Math.round(a * 10));
      el.style.pointerEvents = a > 2.6 ? "none" : "auto";
    }
  };

  const paintDots = () => {
    dotEls.forEach((d, i) => d.classList.toggle("is-active", i === active));
  };

  const tweenTo = (to) => {
    cancelAnimationFrame(raf);
    if (prefersReduced()) { position = to; render(position); return; }
    const from = position;
    const t0 = performance.now();
    const dur = 520;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      position = from + (to - from) * e;
      render(position);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const settleTo = (target) => {
    const t = clampPos(target);
    active = ((Math.round(t) % count) + count) % count;
    paintDots();
    tweenTo(t);
  };

  /* ---- drag / fling ---- */
  let dragging = false;
  let moved = false;
  let startX = 0;
  let basePos = 0;
  let lastX = 0;
  let lastT = 0;
  let vx = 0; // px/s

  stage.addEventListener("pointerdown", (e) => {
    if (count < 2) return;
    dragging = true;
    moved = false;
    startX = lastX = e.clientX;
    lastT = performance.now();
    vx = 0;
    basePos = position;
    cancelAnimationFrame(raf);
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) moved = true;
    let p = basePos - dx / CONFIG.step;
    // rubber-band past the ends instead of a hard wall (only when not looping)
    if (!CONFIG.loop) {
      if (p < 0) p = p * 0.35;
      else if (p > count - 1) p = count - 1 + (p - (count - 1)) * 0.35;
    }
    position = p;
    render(position);
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) vx = ((e.clientX - lastX) / dt) * 1000;
    lastX = e.clientX;
    lastT = now;
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    try { stage.releasePointerCapture(e.pointerId); } catch {}
    // project the fling forward, then snap to the nearest card
    const projected = position - (vx / CONFIG.step) * 0.16;
    settleTo(Math.round(projected));
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  /* ---- taps ---- */
  cardEls.forEach((el, i) => {
    el.addEventListener("click", () => {
      // swallow the click that ends a real swipe
      if (moved) { moved = false; return; }
      if (i === active) overlay.open(cards[i].back, cards[i].title);
      else settleTo(i);
    });
  });
  dotEls.forEach((d, i) => d.addEventListener("click", () => settleTo(i)));

  /* ---- init ---- */
  render(position);
  paintDots();
}
