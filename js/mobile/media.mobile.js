/* ============================================================
   media.mobile.js — Publication, Media & Awards (mobile).

   Port of Old Files/MediaAwardsMobile.tsx:
     • category pills (Media / Awards / Fellowships / Books) — swipe row
     • item chips inside a category — horizontal strip, grouped by an
       optional `group` heading (Editorials / Interviews / Announcements)
     • the selected item → a stacked card (media on top): article =
       image · title · blurb · "Read Article"; video = title · player;
       image = title · image
     • "Read Article" → the shared full-screen scrollable image overlay
     • swipe the card left/right (or tap a dot) to change item

   Reuses MEDIA_CONFIG (its `panels` = the categories). The desktop
   split-panel (.media__body) is hidden on mobile by CSS.
   Styling: css/mobile.css.
   ============================================================ */

import { MEDIA_CONFIG } from "../sections/media.js";
import { getImageOverlay } from "./image-overlay.js";

const PLACEHOLDER = "./assets/img/placeholder.svg";

/* ============================================================
   CONFIG — the Framer "MediaAwardsMobile" component's settings, editable
   here. Colours/fonts/sizes are CSS (css/mobile.css → the ".media-m*"
   rules). A per-item `mediaAspect` in MEDIA_CONFIG still overrides these.

   | Setting        | Controls                                       |
   |----------------|------------------------------------------------|
   | videoAspect    | default aspect of a video well (w / h)         |
   | swipeThreshold | px of horizontal drag to change item           |
   | reserveExtra   | px added on top of the first item's height when |
   |                | reserving the card container (absorbs taller    |
   |                | items so switching never reflows the layout)    |
   ============================================================ */
const CONFIG = {
  videoAspect: "16 / 9",
  swipeThreshold: 60,
  reserveExtra: 10,
};

/* Horizontal-only "scroll into view" — never moves the window vertically
   (plain scrollIntoView would jump the page to a rail below the fold). */
function ensureVisibleX(container, el) {
  const c = container.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  if (e.left < c.left) container.scrollBy({ left: e.left - c.left - 12, behavior: "smooth" });
  else if (e.right > c.right) container.scrollBy({ left: e.right - c.right + 12, behavior: "smooth" });
}

/** youtube / vimeo watch URLs → embeddable player URLs. */
function toEmbedUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}?rel=0`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") || u.pathname.split("/").pop();
      return `https://www.youtube.com/embed/${id}?rel=0`;
    }
    if (host.endsWith("vimeo.com"))
      return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}`;
    return url;
  } catch { return url; }
}

/** youtube watch/short URL → its id (for the thumbnail), or "" if not youtube. */
function youtubeId(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1);
    if (host.endsWith("youtube.com")) return u.searchParams.get("v") || u.pathname.split("/").pop() || "";
    return "";
  } catch { return ""; }
}

/** derive a poster from a youtube video when none was supplied. hqdefault
    always exists; the 16:9 well cover-crops its letterbox bars away. */
function autoPoster(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

/** article / image / video, inferred the same way the desktop paint does. */
function itemType(it) {
  if (it.video) return "video";
  if (it.blurb) return "article";
  return "image";
}

function mediaFrame(it) {
  const type = itemType(it);
  if (type === "video") {
    const poster = it.poster || it.img || autoPoster(it.video) || PLACEHOLDER;
    return `<div class="media-m__frame"><div class="media-m__well" style="--aspect:${it.mediaAspect || CONFIG.videoAspect}" data-video="${it.video}">
        <img src="${poster}" alt="" />
        <button type="button" class="media-m__play" aria-label="Play video"><span></span></button>
      </div></div>`;
  }
  // image: the graphic controls its own height — full width, height auto.
  return `<div class="media-m__frame"><img class="media-m__img" src="${it.img || PLACEHOLDER}" alt="${it.title || it.label}" loading="lazy" /></div>`;
}

function cardHTML(it) {
  const type = itemType(it);
  if (type === "video" || type === "image") {
    return `
      ${it.title ? `<h3 class="media-m__title media-m__title--center">${it.title}</h3>` : ""}
      ${mediaFrame(it)}`;
  }
  // article
  const clamp = it.article ? " is-clamped" : "";
  const cta = it.article
    ? `<button type="button" class="media-m__cta" data-read>${it.buttonLabel || "Read Article"}</button>`
    : it.href && it.href !== "#"
    ? `<a class="media-m__cta" href="${it.href}" target="_blank" rel="noopener">${it.buttonLabel || "Read Article"}</a>`
    : "";
  return `
    ${mediaFrame(it)}
    <h3 class="media-m__title">${it.title || it.label}</h3>
    ${it.blurb ? `<p class="media-m__blurb${clamp}">${it.blurb}</p>` : ""}
    ${cta}`;
}

export function initMedia_Mobile() {
  const section = document.getElementById("media");
  if (!section) return;
  const panels = MEDIA_CONFIG.panels || [];
  if (!panels.length) return;

  // mobile uses the short section title (desktop keeps the full one).
  // data-title drives the offset echo pseudo-element, so update both.
  const title = section.querySelector(".section-title");
  if (title) { title.textContent = "Recognition"; title.setAttribute("data-title", "Recognition"); }

  const overlay = getImageOverlay();

  const wrap = document.createElement("div");
  wrap.className = "media-m";
  wrap.setAttribute("data-reveal", "");
  wrap.innerHTML = `
    <div class="media-m__cats" role="tablist" aria-label="Categories">
      ${panels.map((p, i) => `<button type="button" class="media-m__cat" role="tab" data-i="${i}">${p.name}</button>`).join("")}
    </div>
    <div class="media-m__chips"></div>
    <div class="media-m__card-wrap"><article class="media-m__card"></article></div>
    <div class="media-m__dots"></div>`;
  section.appendChild(wrap);

  const catEls = [...wrap.querySelectorAll(".media-m__cat")];
  const chipsEl = wrap.querySelector(".media-m__chips");
  const cardWrap = wrap.querySelector(".media-m__card-wrap");
  const cardEl = wrap.querySelector(".media-m__card");
  const dotsEl = wrap.querySelector(".media-m__dots");

  /* Reserve a fixed height on the card container: the first (default-open)
     item's height + CONFIG.reserveExtra. Always measured from item 0 so the
     reservation never drifts as you switch items, and the buffer absorbs the
     taller items so switching never reflows the layout / jumps the scroll. */
  const reserveHeight = () => {
    const first = items()[0];
    if (!first) return;
    const saved = cardEl.innerHTML;
    cardEl.innerHTML = cardHTML(first);
    const h = cardEl.offsetHeight;
    cardEl.innerHTML = saved;
    cardWrap.style.minHeight = (h + CONFIG.reserveExtra) + "px";
  };

  let catIndex = 0;
  let itemIndex = 0;

  const items = () => panels[catIndex].items || [];

  /* ---- chips (grouped) ---- */
  const renderChips = () => {
    const list = items();
    const groups = [];
    list.forEach((it, i) => {
      const name = ((it && it.group) || "").trim();
      const last = groups[groups.length - 1];
      if (last && last.name === name) last.entries.push({ it, i });
      else groups.push({ name, entries: [{ it, i }] });
    });
    const hasLabels = groups.some((g) => g.name);
    chipsEl.classList.toggle("has-labels", hasLabels);
    chipsEl.innerHTML = groups
      .map(
        (g) => `
      <div class="media-m__group">
        ${hasLabels ? `<span class="media-m__group-label"${g.name ? "" : ' aria-hidden="true"'}>${g.name || "&nbsp;"}</span>` : ""}
        <div class="media-m__chip-row">
          ${g.entries.map(({ it, i }) => `<button type="button" class="media-m__chip" data-i="${i}">${it.label}</button>`).join("")}
        </div>
      </div>`
      )
      .join("");
    chipsEl.querySelectorAll(".media-m__chip").forEach((b) =>
      b.addEventListener("click", () => selectItem(+b.dataset.i))
    );
  };

  const paintChips = () => {
    chipsEl.querySelectorAll(".media-m__chip").forEach((b) => {
      const on = +b.dataset.i === itemIndex;
      b.classList.toggle("is-active", on);
      if (on) ensureVisibleX(chipsEl, b);
    });
  };

  /* ---- dots ---- */
  const renderDots = () => {
    const list = items();
    dotsEl.innerHTML = list.length > 1
      ? list.map((_, i) => `<button type="button" class="media-m__dot" data-i="${i}" aria-label="Go to item ${i + 1}"></button>`).join("")
      : "";
    dotsEl.querySelectorAll(".media-m__dot").forEach((d) =>
      d.addEventListener("click", () => selectItem(+d.dataset.i))
    );
  };
  const paintDots = () => {
    dotsEl.querySelectorAll(".media-m__dot").forEach((d) =>
      d.classList.toggle("is-active", +d.dataset.i === itemIndex)
    );
  };

  /* ---- card ---- */
  const paintCard = () => {
    const it = items()[itemIndex];
    if (!it) { cardEl.innerHTML = ""; return; }
    cardEl.innerHTML = cardHTML(it);
    // restart the entrance animation
    cardEl.classList.remove("is-swap");
    void cardEl.offsetWidth;
    cardEl.classList.add("is-swap");

    // A card's image measured before it loads reports height 0; once one
    // decodes, recompute the reservation (always from item 0, so no drift).
    cardEl.querySelectorAll(".media-m__img, .media-m__well img").forEach((img) => {
      if (img.complete) return;
      const cat = catIndex;
      img.addEventListener("load", () => { if (cat === catIndex) reserveHeight(); }, { once: true });
    });

    const readBtn = cardEl.querySelector("[data-read]");
    if (readBtn) readBtn.addEventListener("click", () => overlay.open(it.article, it.title || it.label));

    const play = cardEl.querySelector(".media-m__play");
    if (play) play.addEventListener("click", () => {
      const well = play.closest(".media-m__well");
      const src = well.dataset.video;
      const embed = toEmbedUrl(src);
      const isFile = /\.mp4($|\?)/i.test(src);
      well.innerHTML = isFile
        ? `<video src="${src}" controls autoplay playsinline></video>`
        : `<iframe src="${embed}" title="${it.title || it.label || "video"}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    });
  };

  const selectItem = (i) => {
    const list = items();
    if (i < 0 || i >= list.length) return;
    itemIndex = i;
    paintChips();
    paintDots();
    paintCard();
  };

  const goItem = (dir) => {
    const list = items();
    if (list.length < 2) return;
    selectItem((itemIndex + dir + list.length) % list.length);
  };

  const selectCat = (i) => {
    catIndex = i;
    itemIndex = 0;
    const catsRail = catEls[0] && catEls[0].parentElement;
    catEls.forEach((c, ci) => {
      const on = ci === i;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-selected", on ? "true" : "false");
      if (on && catsRail) ensureVisibleX(catsRail, c);
    });
    renderChips();
    renderDots();
    reserveHeight();
    selectItem(0);
  };

  catEls.forEach((c, i) => c.addEventListener("click", () => selectCat(i)));

  /* ---- swipe the card to change item ---- */
  let sx = 0, sy = 0, dragging = false, decided = false, horiz = false;
  cardWrap.addEventListener("pointerdown", (e) => {
    dragging = true; decided = false; horiz = false; sx = e.clientX; sy = e.clientY;
  });
  cardWrap.addEventListener("pointermove", (e) => {
    if (!dragging || decided) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { decided = true; horiz = Math.abs(dx) > Math.abs(dy); }
  });
  const endSwipe = (e) => {
    if (!dragging) return;
    dragging = false;
    if (!horiz) return;
    const dx = e.clientX - sx;
    if (dx < -CONFIG.swipeThreshold) goItem(1);
    else if (dx > CONFIG.swipeThreshold) goItem(-1);
  };
  cardWrap.addEventListener("pointerup", endSwipe);
  cardWrap.addEventListener("pointercancel", endSwipe);

  /* ---- init ---- */
  selectCat(0);
}
