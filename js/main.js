/* ============================================================
   main.js — boot: Lenis smooth scroll + GSAP ScrollTrigger,
   then init nav + preloader. Section modules hook in later.
   ============================================================ */

import { initPreloader } from "./preloader.js";
import { initNav } from "./nav.js";
import { initLanding } from "./sections/landing.js";
import { initWhatIBuild } from "./sections/what-i-build.js";
import { initAbilities } from "./sections/abilities.js";
import { initJourney } from "./sections/journey.js";
import { initMedia } from "./sections/media.js";
import { initReveal } from "./reveal.js";
import { initLandingScene } from "./three/landing-scene.js";
import { isMobile, watchBreakpoint } from "./responsive.js";
import { initAbilitiesMobile } from "./mobile/abilities.mobile.js";
import { initWhatIBuildMobile } from "./mobile/what-i-build.mobile.js";
import { initMedia_Mobile } from "./mobile/media.mobile.js";

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

/* ---- Section modules ----
   Landing + Journey are still desktop-only for now (mobile phase later).
   Abilities / What I Build / Media each boot ONE build — desktop or the
   bespoke mobile layer (js/mobile/*) — chosen from the breakpoint. The
   two never coexist; crossing 768px reloads (see watchBreakpoint). */
const mobile = isMobile();

initLanding();
initJourney();

if (mobile) {
  initWhatIBuildMobile();
  initAbilitiesMobile();
  initMedia_Mobile();
} else {
  initWhatIBuild();
  initAbilities();
  initMedia();
}

watchBreakpoint();

/* ---- 3D scenes ---- */
initLandingScene();

/* ---- Entrance reveals: start after the preloader, with a hard
   safety fallback so content can never stay hidden if site:ready
   never fires. ---- */
let revealStarted = false;
const startReveal = () => {
  if (revealStarted) return;
  revealStarted = true;
  initReveal();
};
document.addEventListener("site:ready", startReveal, { once: true });
setTimeout(startReveal, 5000);

/* Keep ScrollTrigger honest when the layout settles / fonts swap. */
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger && ScrollTrigger.refresh());
}
window.addEventListener("load", () => ScrollTrigger && ScrollTrigger.refresh());

export default app;
