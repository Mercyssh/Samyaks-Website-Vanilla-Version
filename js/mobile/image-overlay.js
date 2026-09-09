/* ============================================================
   image-overlay.js — shared full-screen, vertically-scrollable
   image overlay for the mobile builds.

   Ported from the `ImageOverlay` / `ArticleOverlay` pattern in
   Old Files/AbilitiesMobile.tsx + MediaAwardsMobile.tsx:
     • a fixed, full-screen sheet with a titled header + close button
     • the image runs full width and scrolls vertically
     • body scroll locked behind it (via <body> class)
     • Escape closes; Android hardware/gesture Back closes instead of
       navigating away (throwaway history entry, popstate intercept)

   One instance is created lazily and reused for every open. Returns
   { open(src, title), close() }. Styling lives in css/mobile.css.
   ============================================================ */

let singleton = null;

function build() {
  const el = document.createElement("div");
  el.className = "m-imgov";
  el.hidden = true;
  el.innerHTML = `
    <div class="m-imgov__bar">
      <span class="m-imgov__title"></span>
      <button class="m-imgov__close" type="button" aria-label="Close">
        <svg viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="m-imgov__scroll" data-lenis-prevent data-close>
      <img class="m-imgov__img" src="" alt="" />
    </div>`;
  document.body.appendChild(el);

  const titleEl = el.querySelector(".m-imgov__title");
  const imgEl = el.querySelector(".m-imgov__img");
  const closeEl = el.querySelector(".m-imgov__close");

  let hideTimer = 0;
  let pushedState = false;

  const close = () => {
    if (el.hidden) return;
    el.classList.remove("is-open");
    document.body.classList.remove("m-overlay-open");
    // balance history: if WE pushed the throwaway entry (closed via ✕ /
    // backdrop / Esc), pop it back off. If Back closed us, it's already gone.
    if (pushedState) {
      pushedState = false;
      if (history.state && history.state.mImgOverlay) history.back();
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      el.hidden = true;
      imgEl.src = "";
    }, 300);
  };

  const open = (src, title) => {
    if (!src) return;
    clearTimeout(hideTimer);
    imgEl.src = src;
    imgEl.alt = title ? `${title} — detail` : "Detail";
    titleEl.textContent = title || "";
    el.hidden = false;
    el.querySelector(".m-imgov__scroll").scrollTop = 0;
    document.body.classList.add("m-overlay-open");
    // Android back → close (intercepted below), not a page navigation.
    history.pushState({ mImgOverlay: true }, "");
    pushedState = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add("is-open"))
    );
  };

  closeEl.addEventListener("click", close);
  el.addEventListener("click", (e) => {
    // click on the scroll gutter (not the image itself) closes
    if (e.target.closest("[data-close]") && !e.target.closest(".m-imgov__img")) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("popstate", () => {
    if (pushedState) { pushedState = false; close(); }
  });

  return { open, close };
}

export function getImageOverlay() {
  if (!singleton) singleton = build();
  return singleton;
}
