/* ============================================================
   preloader.js — progress bar that trickles to ~90%, then
   completes once fonts + page load are ready, then fades and
   dispatches `site:ready` to gate entrance animations.
   (GLB/scene gating is added in Phase 4.)
   ============================================================ */

export function initPreloader() {
  const el = document.getElementById("preloader");
  const bar = document.getElementById("preloaderBar");
  const pct = document.getElementById("preloaderPct");
  if (!el || !bar || !pct) return;

  let progress = 0;
  let done = false;

  const set = (v) => {
    progress = Math.max(progress, Math.min(100, v));
    bar.style.right = 100 - progress + "%";
    pct.textContent = Math.round(progress) + "%";
    el.setAttribute("aria-valuenow", String(Math.round(progress)));
  };

  const trickle = setInterval(() => {
    if (progress < 90) set(progress + (90 - progress) * 0.08 + 0.4);
  }, 120);

  const finish = () => {
    if (done) return;
    done = true;
    clearInterval(trickle);
    set(100);
    setTimeout(() => {
      el.classList.add("is-done");
      document.dispatchEvent(new CustomEvent("site:ready"));
    }, 350);
  };

  const fontsReady =
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const pageLoaded = new Promise((res) => {
    if (document.readyState === "complete") res();
    else window.addEventListener("load", res, { once: true });
  });

  Promise.all([fontsReady, pageLoaded]).then(() => setTimeout(finish, 250));

  // safety: never trap the user behind the loader
  setTimeout(finish, 6000);
}
