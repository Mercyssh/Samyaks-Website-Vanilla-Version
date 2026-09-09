/* ============================================================
   what-i-build.mobile.js — snap-rail card selector (mobile).

   Port of Old Files/WhatIBuildMobile.tsx:
     • a pill row (one per pillar) above a horizontal snap-scrolling
       rail of cards; swipe the rail or tap a pill to change card
     • whichever card sits nearest centre is "active": it flips in
       (rotateY 360→0), its video plays, its stat rotator runs
     • each card: media · tags · title · "Tap to read more" · stats
       (a single scrambling stat that cycles, OR a static 2-col grid)
       · body copy
     • tapping a card opens the shared Read-More overlay

   The overlay is the very same one the desktop uses (#wibOverlay):
   we import its controller so the rich sub-project write-ups aren't
   duplicated. Data comes from the shared PILLARS array. The desktop
   pinned stack (.wib__pin) is hidden on mobile by CSS.
   ============================================================ */

import { PILLARS, initOverlay } from "../sections/what-i-build.js";

/* ============================================================
   CONFIG — the Framer "WhatIBuildMobile" component's visual/behaviour
   settings, surfaced here so you can edit them in one place. Colours,
   fonts and sizes are CSS instead (see css/mobile.css → the ".wib-m*"
   rules — e.g. --tint per card, .wib-m__title / .wib-m__stat-n sizes).

   | Setting       | Framer control    | Controls                                   |
   |---------------|-------------------|--------------------------------------------|
   | showTags      | Show Tags         | render the project tag chips on each card  |
   | cardFlip      | Card Flip         | rotateY flip-in when a card becomes active |
   | statLayout    | Stat Layout       | "rotator" (one cycling stat) | "grid" (all)|
   | statInterval  | Stat Interval     | ms each rotating stat is shown (rotator)   |
   | scrambleMs    | Scramble Duration | ms the char-scramble transition runs       |
   | mediaAspect   | Media Aspect      | card media box aspect ratio (w / h)        |
   ============================================================ */
const CONFIG = {
  showTags: true,
  cardFlip: true,
  statLayout: "rotator", // "rotator" | "grid"
  statInterval: 2600,
  scrambleMs: 700,
  mediaAspect: "1 / 1",
};

const SCRAMBLE_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%+#@&$*";

const prefersReduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Scroll a horizontal rail so `el` is visible — WITHOUT the page-jumping
   side effect scrollIntoView has (it can scroll the window vertically to a
   rail that's still below the fold). Only ever moves the rail's scrollLeft. */
function ensureVisibleX(container, el) {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  if (e.left < c.left) container.scrollBy({ left: e.left - c.left - 12, behavior: "smooth" });
  else if (e.right > c.right) container.scrollBy({ left: e.right - c.right + 12, behavior: "smooth" });
}

/* ---- char-by-char scramble between two strings on one <span> ---- */
function scramble(el, to, { enabled = true } = {}) {
  const from = el.dataset.text || "";
  el.dataset.text = to;
  if (from === to) { el.textContent = to; return; }
  if (!enabled || prefersReduced()) { el.textContent = to; return; }

  const total = Math.max(10, Math.round(CONFIG.scrambleMs / 16.7));
  const len = Math.max(from.length, to.length);
  const q = [];
  for (let n = 0; n < len; n++) {
    const start = Math.floor(Math.random() * total * 0.4);
    const end = start + Math.floor(total * 0.3) + Math.floor(Math.random() * total * 0.3);
    q.push({ f: from[n] || "", t: to[n] || "", start, end, char: "" });
  }
  let frame = 0;
  cancelAnimationFrame(el._scrRaf || 0);
  const tick = () => {
    let out = "";
    let done = 0;
    for (const c of q) {
      if (frame >= c.end) { out += c.t; done++; }
      else if (frame >= c.start) {
        if (c.t === " " || c.f === " ") out += " ";
        else { if (!c.char || Math.random() < 0.3) c.char = SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]; out += c.char; }
      } else out += c.f;
    }
    el.textContent = out;
    if (done === q.length) return;
    frame++;
    el._scrRaf = requestAnimationFrame(tick);
  };
  el._scrRaf = requestAnimationFrame(tick);
}

const useRotator = () => CONFIG.statLayout === "rotator";

function cardMedia(p) {
  if (p.video)
    return `<video src="${p.video}" muted loop playsinline preload="metadata" disablepictureinpicture></video>`;
  return `<img src="${p.img || "./assets/img/placeholder.svg"}" alt="${p.title}" loading="lazy" />`;
}

function statsHTML(p) {
  const stats = p.stats || [];
  if (!stats.length) return "";
  if (!useRotator()) {
    // static grid: every stat on screen at once (Framer "grid" layout)
    return `<div class="wib-m__stats wib-m__stats--grid">
      ${stats.map((s) => `<div class="wib-m__stat"><span class="wib-m__stat-n">${s.n}</span><span class="wib-m__stat-l">${s.l}</span></div>`).join("")}
    </div>`;
  }
  const dots = stats.length > 1
    ? `<div class="wib-m__stat-dots">${stats.map(() => `<span></span>`).join("")}</div>`
    : "";
  return `<div class="wib-m__stats">
      <div class="wib-m__stat">
        <span class="wib-m__stat-n"></span>
        <span class="wib-m__stat-l"></span>
      </div>
      ${dots}
    </div>`;
}

function cardHTML(p, i) {
  const tags = CONFIG.showTags && p.tags && p.tags.length
    ? `<ul class="wib-m__tags">${p.tags.map((t) => `<li>${t}</li>`).join("")}</ul>`
    : "";
  return `
    <div class="wib-m__slide">
      <article class="wib-m__card" data-i="${i}" style="--tint:${p.tint}" role="button" tabindex="0" aria-label="${p.title} — read more">
        <figure class="wib-m__media" style="aspect-ratio:${CONFIG.mediaAspect}">${cardMedia(p)}</figure>
        ${tags}
        <h3 class="wib-m__title">${p.title}</h3>
        <div class="wib-m__hint">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2.5a1.75 1.75 0 0 1 1.75 1.75V11a.75.75 0 0 0 1.5 0V6.75a1.75 1.75 0 0 1 3.5 0V11a.75.75 0 0 0 1.5 0V9.25a1.75 1.75 0 0 1 3.5 0V15c0 3.6-2.4 6.5-6 6.5h-1.9c-1.9 0-3.1-.7-4.3-2.2l-3.2-4c-.7-.9-.6-2.2.4-2.9.8-.6 1.9-.5 2.6.2l.8.8V4.25A1.75 1.75 0 0 1 9 2.5Z"/></svg>
          <span class="wib-m__hint-txt">Tap to read more</span>
        </div>
        ${statsHTML(p)}
        <div class="wib-m__body">${p.body.map((t) => `<p>${t}</p>`).join("")}</div>
      </article>
    </div>`;
}

export function initWhatIBuildMobile() {
  const section = document.getElementById("what-i-build");
  if (!section) return;

  const overlay = initOverlay();

  const wrap = document.createElement("div");
  wrap.className = "wib-m";
  wrap.innerHTML = `
    <div class="wib-m__sel" role="tablist" aria-label="What I build">
      ${PILLARS.map((p, i) => `<button type="button" class="wib-m__pill" role="tab" data-i="${i}">${p.tab}</button>`).join("")}
    </div>
    <div class="wib-m__rail">${PILLARS.map((p, i) => cardHTML(p, i)).join("")}</div>
    <div class="wib-m__dots">${PILLARS.map((_, i) => `<button type="button" class="wib-m__dot" data-i="${i}" aria-label="Go to card ${i + 1}"></button>`).join("")}</div>`;
  section.appendChild(wrap);

  const rail = wrap.querySelector(".wib-m__rail");
  const pills = [...wrap.querySelectorAll(".wib-m__pill")];
  const dots = [...wrap.querySelectorAll(".wib-m__dot")];
  const cards = [...wrap.querySelectorAll(".wib-m__card")];
  const videos = cards.map((c) => c.querySelector("video"));

  /* per-card stat rotator state (only in "rotator" layout — the grid is static) */
  const rotators = useRotator()
    ? cards.map((card, i) => ({
        stats: PILLARS[i].stats || [],
        idx: 0,
        timer: 0,
        nEl: card.querySelector(".wib-m__stat-n"),
        lEl: card.querySelector(".wib-m__stat-l"),
        dotEls: [...card.querySelectorAll(".wib-m__stat-dots span")],
      }))
    : [];

  const paintStat = (r, enabled) => {
    if (!r || !r.stats.length) return;
    const s = r.stats[r.idx % r.stats.length];
    scramble(r.nEl, s.n || "", { enabled });
    scramble(r.lEl, s.l || "", { enabled });
    r.dotEls.forEach((d, di) => d.classList.toggle("is-on", di === r.idx % r.stats.length));
  };
  const stopRotator = (r) => { if (r) { clearInterval(r.timer); r.timer = 0; } };
  const startRotator = (r) => {
    if (!r) return;
    stopRotator(r);
    r.idx = 0;
    paintStat(r, false); // seed silently
    if (r.stats.length < 2) return;
    r.timer = setInterval(() => { r.idx = (r.idx + 1) % r.stats.length; paintStat(r, true); }, CONFIG.statInterval);
  };

  let active = -1;
  let prev = 0;

  const flipIn = (card, dir) => {
    if (!CONFIG.cardFlip || prefersReduced() || !card.animate) return;
    card.animate(
      [
        { transform: `perspective(1100px) rotateY(${dir * 360}deg)`, opacity: 0.35, offset: 0 },
        { opacity: 1, offset: 0.4 },
        { transform: "perspective(1100px) rotateY(0deg)", opacity: 1, offset: 1 },
      ],
      { duration: 850, easing: "cubic-bezier(0.16,1,0.3,1)" }
    );
  };

  const setActive = (i, { flip = true } = {}) => {
    if (i === active) return;
    const dir = i > prev ? 1 : -1;
    prev = i;
    active = i;
    const sel = pills[0] && pills[0].parentElement;
    pills.forEach((p, pi) => {
      const on = pi === i;
      p.classList.toggle("is-active", on);
      p.setAttribute("aria-selected", on ? "true" : "false");
      if (on && sel) ensureVisibleX(sel, p);
    });
    dots.forEach((d, di) => d.classList.toggle("is-active", di === i));
    videos.forEach((v, vi) => {
      if (!v) return;
      if (vi === i) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      else v.pause();
    });
    rotators.forEach((r, ri) => (ri === i ? startRotator(r) : stopRotator(r)));
    if (flip) flipIn(cards[i], dir);
  };

  /* rail → active index: whichever card is nearest the horizontal centre */
  let scrollRaf = 0;
  const measure = () => {
    scrollRaf = 0;
    const centre = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    [...rail.children].forEach((el, i) => {
      const c = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(c - centre);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  };
  rail.addEventListener("scroll", () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(measure); }, { passive: true });

  const goTo = (i) => {
    const el = rail.children[i];
    if (!el) return;
    rail.scrollTo({ left: el.offsetLeft - (rail.clientWidth - el.clientWidth) / 2, behavior: "smooth" });
  };

  pills.forEach((p, i) => p.addEventListener("click", () => goTo(i)));
  dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));

  /* tap a card → Read-More overlay */
  const openFrom = (el) => { if (el) overlay.open(PILLARS[+el.dataset.i]); };
  rail.addEventListener("click", (e) => openFrom(e.target.closest(".wib-m__card")));
  rail.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".wib-m__card");
    if (card) { e.preventDefault(); openFrom(card); }
  });

  /* seed the first card as active (no flip on first paint) */
  setActive(0, { flip: false });
}
