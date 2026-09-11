/* ============================================================
   landing.js — landing hero bits that need JS.

   The halo is a static centred CSS gradient (no mouse-follow); the
   criss-cross tile + rotating motif are pure CSS. This module only
   injects the twinkling-star field into #landingStars — DOM dots that
   slowly fade in/out (cheaper + simpler than a 3D particle pass, and
   they layer trivially with the other CSS bg elements).

   Tuning: edit STARS below (or override the CSS vars in css/landing.css:
   --tw-max on .landing__star). Disabled under prefers-reduced-motion.
   ============================================================ */

// ---- exposed controls for the star field ----
const STARS = {
  count: 90,        // number of stars
  minSize: 1,       // px — smallest dot
  maxSize: 2.6,     // px — largest dot
  minDur: 2.5,      // s  — fastest twinkle period
  maxDur: 6.5,      // s  — slowest twinkle period
  maxDelay: 6,      // s  — max random start offset (desyncs the field)
};

const rand = (a, b) => a + Math.random() * (b - a);

// ---- mobile press carousel ----
const NEWS_AUTOPLAY_MS = 4000; // delay between auto-advances (ms)

/* Auto-advance the mobile landing press carousel. Mobile-only; pauses while
   the user is swiping (and when the tab is hidden), and keeps its index in
   sync with manual swipes. */
export function initLandingCarousel() {
  const track = document.querySelector("#landing .landing-m__track");
  if (!track) return;
  const slides = [...track.children];
  if (slides.length < 2) return;
  if (!window.matchMedia("(max-width: 768px)").matches) return;      // mobile only
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let i = 0, pauseUntil = 0;
  const width = () => track.clientWidth || 1;
  const go = (n) => {
    i = ((n % slides.length) + slides.length) % slides.length;
    track.scrollTo({ left: i * width(), behavior: "smooth" });
  };
  const tick = () => { if (Date.now() >= pauseUntil && !document.hidden) go(i + 1); };

  // manual swipe pauses autoplay briefly and keeps the index in sync
  track.addEventListener("pointerdown", () => { pauseUntil = Date.now() + NEWS_AUTOPLAY_MS * 1.5; }, { passive: true });
  track.addEventListener("scroll", () => { i = Math.round(track.scrollLeft / width()); }, { passive: true });

  setInterval(tick, NEWS_AUTOPLAY_MS);
}

export function initLanding() {
  const host = document.getElementById("landingStars");
  if (!host) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < STARS.count; i++) {
    const s = document.createElement("span");
    s.className = "landing__star";
    s.style.left = rand(0, 100).toFixed(3) + "%";
    s.style.top = rand(0, 100).toFixed(3) + "%";
    s.style.setProperty("--s", rand(STARS.minSize, STARS.maxSize).toFixed(2) + "px");
    if (!reduce) {
      s.style.setProperty("--tw-dur", rand(STARS.minDur, STARS.maxDur).toFixed(2) + "s");
      s.style.setProperty("--tw-delay", "-" + rand(0, STARS.maxDelay).toFixed(2) + "s");
    }
    frag.appendChild(s);
  }
  host.appendChild(frag);
}
