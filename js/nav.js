/* ============================================================
   nav.js — floating pill: smooth anchor scroll,
   hide-on-scroll-down / show-on-scroll-up, and scroll-spy.
   ============================================================ */

export function initNav({ lenis } = {}) {
  const nav = document.getElementById("nav");
  if (!nav) return;

  const links = [...nav.querySelectorAll("[data-nav]")];
  const sections = links
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  /* ---- mobile collapse (hamburger dropdown; see css/nav.css) ---- */
  const toggle = document.getElementById("navToggle");
  const current = document.getElementById("navCurrent");
  const closeMenu = () => {
    nav.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  };
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // tap outside the bar / dropdown closes it
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !e.target.closest("#nav")) closeMenu();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  /* ---- smooth anchor scroll (and close the mobile menu on pick) ---- */
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---- hide on scroll-down, show on scroll-up ---- */
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (Math.abs(y - lastY) > 6) {
      if (y > lastY && y > 120) { nav.classList.add("is-hidden"); closeMenu(); }
      else nav.classList.remove("is-hidden");
      lastY = y;
    }
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );

  /* ---- scroll-spy ---- */
  const linkFor = new Map(sections.map((s, i) => [s.id, links[i]]));
  const setActive = (id) => {
    links.forEach((l) => l.classList.remove("is-active"));
    const link = linkFor.get(id);
    if (link) {
      link.classList.add("is-active");
      if (current) current.textContent = link.textContent; // mobile bar label
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      // pick the most-visible intersecting section
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
  );
  sections.forEach((s) => io.observe(s));

  // sensible default before first intersection fires
  if (sections[0]) setActive(sections[0].id);
}
