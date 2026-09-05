/* ============================================================
   landing.js — mouse-follow halo (rAF-throttled, only while the
   hero is in view). Press cards + tagline are static HTML.
   The centre 3D device is mounted in Phase 4.
   ============================================================ */

export function initLanding() {
  const section = document.getElementById("landing");
  const halo = document.getElementById("landingHalo");
  if (!section || !halo) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  let inView = true;
  const io = new IntersectionObserver(
    ([e]) => (inView = e.isIntersecting),
    { threshold: 0 }
  );
  io.observe(section);

  let raf = 0;
  let mx = 50;
  let my = 45;
  const apply = () => {
    raf = 0;
    halo.style.setProperty("--mx", mx + "%");
    halo.style.setProperty("--my", my + "%");
  };

  section.addEventListener(
    "pointermove",
    (e) => {
      if (!inView) return;
      const r = section.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 100;
      my = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(apply);
    },
    { passive: true }
  );
}
