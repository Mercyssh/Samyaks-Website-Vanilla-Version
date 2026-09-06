/* ============================================================
   reveal.js — adds .is-in to [data-reveal] elements as they
   scroll into view (once each). Styling/timing lives in
   css/reveal.css; this only toggles the class.

   Stagger: give a container [data-reveal-group="0.1"] and its
   direct [data-reveal] children get an incremental --reveal-delay
   (seconds per step; default 0.08).
   ============================================================ */

export function initReveal() {
  const items = [...document.querySelectorAll("[data-reveal]")];
  if (!items.length) return;

  // auto-stagger direct children of any [data-reveal-group]
  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    const step = parseFloat(group.getAttribute("data-reveal-group")) || 0.08;
    group.querySelectorAll(":scope > [data-reveal]").forEach((el, i) => {
      el.style.setProperty("--reveal-delay", i * step + "s");
    });
  });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
  );

  items.forEach((el) => io.observe(el));
}
