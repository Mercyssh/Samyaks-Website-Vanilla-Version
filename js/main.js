/* ============================================================
   main.js — boot: Lenis smooth scroll + GSAP ScrollTrigger,
   then init nav + preloader. Section modules hook in later.
   ============================================================ */

import { initPreloader } from "./preloader.js";
import { initNav } from "./nav.js";
import { initMedia } from "./sections/media.js";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const { gsap, ScrollTrigger, Lenis } = window;

if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

/* ---- Smooth scroll (skipped when reduced motion is requested) ---- */
let lenis = null;
if (!prefersReduced && Lenis) {
  lenis = new Lenis({
    lerp: 0.1,
    smoothWheel: true,
    wheelMultiplier: 1,
  });
  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.documentElement.classList.add("lenis", "lenis-smooth");
}

/* Shared app handle for section modules (Phase 2+). */
const app = { lenis, gsap, ScrollTrigger, prefersReduced };
window.__app = app;

initPreloader();
initNav(app);

/* ---- Section modules ---- */
initMedia();

/* Keep ScrollTrigger honest when the layout settles / fonts swap. */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger && ScrollTrigger.refresh());
}
window.addEventListener("load", () => ScrollTrigger && ScrollTrigger.refresh());

export default app;
