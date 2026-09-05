/* ============================================================
   media.js — "Publication, Media & Awards"

   Left half  : a stylised "selection window" (the panel chrome —
                gradient border/fill, 3D tilt, offset ghost, dot-grid
                + X corner motifs, and a cycle button that switches
                between panels: Media › Awards › Fellowships › Books).
   Right half : the featured-item detail (#mediaDetail), unchanged.

   Everything below is driven from MEDIA_CONFIG — panels, their items
   and the optional per-item detail copy. Data shape mirrors
   Old Files/MediaAwardsMobile.tsx (categories → items, with an
   optional `group` sub-heading and an optional `subtitle`).
   ============================================================ */

const PLACEHOLDER = "./assets/img/placeholder.svg";

/* ---------------------------------------------------------------- config ---
   MEDIA_CONFIG is the single source of truth. Swap it for a fetched
   JSON blob later with zero render changes — the shape is identical.

   panel : { name, items: [item] }
   item  : {
     label       required — text shown in the selection list
     group       optional — sub-heading; consecutive items sharing a
                            group collapse under one label (Media only)
     subtitle    optional — small muted line under the label (Books years)
     title       optional — detail headline (falls back to label)
     blurb       optional — detail body copy (clamped + faded)

     -- preview graphic (right half) — pick ONE source --
     img         image preview (used when there's no `video`)
     video       YouTube/Vimeo URL, or a path to an .mp4 file
     videoKind   optional — "youtube" | "mp4" (auto-detected if omitted)
     poster      optional — poster image for an mp4
     mediaAspect optional — e.g. "16 / 9"; sets the video box aspect so
                            the width is derived with no JS measuring.
                            Images size themselves from their own ratio.

     -- read-more overlay --
     article     full-length screenshot shown in the overlay. The
                 "Read Article" button appears ONLY when this is set.
     buttonLabel optional — button text (default "Read Article")
   }
--------------------------------------------------------------------------- */
const MEDIA_CONFIG = {
  panels: [
    {
      name: "Media",
      items: [
        {
          group: "Editorials",
          label: "Hindustan Times",
          title: "Soft Skills: The missing piece in employability",
          blurb:
            "India's aspiration to become an economic superpower is intricately tied to its ability to leverage the demographic dividend and uplift disadvantaged regions. However, this ambition faces a significant challenge.",
          img: PLACEHOLDER,
          article: PLACEHOLDER, // TODO(copy): full-length article screenshot
        },
        // TODO(copy): NDTV / CNBC editorial headlines + blurbs + URLs
        { group: "Editorials", label: "NDTV", title: "NDTV editorial", img: PLACEHOLDER },
        { group: "Editorials", label: "CNBC", title: "CNBC editorial", img: PLACEHOLDER },

        // Example of a video preview (YouTube). Swap `video` for an .mp4
        // path to serve a file instead; mediaAspect avoids any JS sizing.
        { group: "Interviews", label: "NDTV", title: "NDTV interview", video: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", mediaAspect: "16 / 9" },
        { group: "Interviews", label: "BBC", title: "BBC interview", href: "#", img: PLACEHOLDER },
        { group: "Interviews", label: "Master's Union", title: "Master's Union", href: "#", img: PLACEHOLDER },
        { group: "Interviews", label: "Analytics India Magazine", title: "Analytics India Magazine", href: "#", img: PLACEHOLDER },

        { group: "Announcements", label: "Nimaya x Govt's AI Mission", title: "Nimaya x Government's AI Mission", href: "#", img: PLACEHOLDER },
        { group: "Announcements", label: "Harper Collins Book", title: "HarperCollins book", href: "#", img: PLACEHOLDER },
        { group: "Announcements", label: "Nimaya x Yourstory", title: "Nimaya x YourStory", href: "#", img: PLACEHOLDER },
      ],
    },
    {
      name: "Awards",
      items: [
        { label: "Forbes Asia's most influential social entrepreneurs", title: "Forbes Asia's most influential social entrepreneurs", href: "#", img: PLACEHOLDER },
        { label: "Campaign South Asia Young Achiever", title: "Campaign South Asia Young Achiever", href: "#", img: PLACEHOLDER },
        { label: "Bombay Ad Club Young Emvie", title: "Bombay Ad Club Young Emvie", href: "#", img: PLACEHOLDER },
        { label: "Times Lead India", title: "Times Lead India", href: "#", img: PLACEHOLDER },
      ],
    },
    {
      name: "Fellowships",
      items: [
        { label: "INK Fellowship", title: "INK Fellowship", href: "#", img: PLACEHOLDER },
        { label: "RC Fellowship", title: "RC Fellowship", href: "#", img: PLACEHOLDER },
      ],
    },
    {
      name: "Books",
      items: [
        { label: "The Map", subtitle: "2027", title: "The Map", href: "#", img: PLACEHOLDER },
        { label: "Generation Einstein", subtitle: "2013", title: "Generation Einstein", href: "#", img: PLACEHOLDER },
      ],
    },
  ],
};

/* --------------------------------------------------------------- helpers --- */

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
  } catch {
    return url;
  }
}

const isYouTube = (url) => /youtu\.?be|youtube\.com/.test(url || "");

/** Preview graphic markup — image, YouTube embed or mp4 <video>. */
function renderMedia(it) {
  const aspectStyle = it.mediaAspect ? ` style="--media-aspect:${it.mediaAspect}"` : "";
  const kind = it.videoKind || (it.video ? (isYouTube(it.video) ? "youtube" : "mp4") : "image");

  if (kind === "youtube" && it.video) {
    return `<div class="media__video"${aspectStyle}>
        <iframe src="${toEmbedUrl(it.video)}" title="${it.title || it.label || "video"}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen loading="lazy"></iframe>
      </div>`;
  }
  if (kind === "mp4" && it.video) {
    return `<div class="media__video"${aspectStyle}>
        <video src="${it.video}" controls playsinline${it.poster ? ` poster="${it.poster}"` : ""}></video>
      </div>`;
  }
  return `<img class="media__media" src="${it.img || PLACEHOLDER}" alt="Preview of ${it.title || it.label}" loading="lazy" />`;
}

/* ------------------------------------------------------------------ boot --- */
export function initMedia() {
  const listEl = document.getElementById("mediaList");
  const detailEl = document.getElementById("mediaDetail");
  const labelEl = document.getElementById("mediaSelLabel");
  const cycleEl = document.getElementById("mediaSelCycle");
  const tickerEl = document.getElementById("mediaSelTicker");
  if (!listEl || !detailEl) return;

  const panels = MEDIA_CONFIG.panels || [];
  if (!panels.length) return;

  let panelIndex = 0;

  /* ---- ticker: one tick per panel, arranged around the cycle button ---- */
  const buildTicker = () => {
    if (!tickerEl) return;
    tickerEl.innerHTML = "";
    const n = panels.length;
    // signed offset from centre (…-1.5, -0.5, 0.5, 1.5…); CSS turns it into
    // an angle via --sel-tick-spacing, so the fan is controlled from CSS.
    panels.forEach((_, i) => {
      const tick = document.createElement("span");
      tick.className = "mediaSel__tick";
      tick.style.setProperty("--i", i - (n - 1) / 2);
      tickerEl.appendChild(tick);
    });
  };
  const paintTicker = () => {
    if (!tickerEl) return;
    [...tickerEl.children].forEach((t, i) =>
      t.classList.toggle("is-on", i === panelIndex)
    );
  };

  /* ---- selection list for the active panel ---- */
  let buttons = [];
  const renderList = () => {
    const items = panels[panelIndex].items || [];
    listEl.innerHTML = "";
    buttons = [];

    // Fold consecutive items sharing a `group` into one labelled segment,
    // preserving authored order. No item has a group → no labels rendered
    // (Awards / Fellowships / Books look flat, like the reference).
    const groups = [];
    items.forEach((it, i) => {
      const name = ((it && it.group) || "").trim();
      const last = groups[groups.length - 1];
      if (last && last.name === name) last.entries.push({ it, i });
      else groups.push({ name, entries: [{ it, i }] });
    });
    const hasLabels = groups.some((g) => g.name);

    groups.forEach((g) => {
      const groupEl = document.createElement("div");
      groupEl.className = "mediaSel__group";

      if (hasLabels) {
        const label = document.createElement("p");
        label.className = "mediaSel__group-label";
        // empty <span> keeps ungrouped rows aligned on the same baseline
        label.innerHTML = `<span>${g.name || ""}</span>`;
        groupEl.appendChild(label);
      }

      g.entries.forEach(({ it, i }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "mediaSel__item";
        btn.innerHTML =
          `<span class="mediaSel__item-label">${it.label}</span>` +
          (it.subtitle ? `<span class="mediaSel__item-sub">${it.subtitle}</span>` : "");
        btn.addEventListener("click", () => select(i));
        groupEl.appendChild(btn);
        buttons.push(btn);
      });
      listEl.appendChild(groupEl);
    });
  };

  /* ---- read-more overlay (shared, one instance) ---- */
  const overlayEl = document.getElementById("mediaOverlay");
  const overlayImg = document.getElementById("mediaOverlayImg");
  const overlayClose = document.getElementById("mediaOverlayClose");
  let hideTimer = 0;
  let rafId = 0;

  const openOverlay = (src, alt) => {
    if (!overlayEl || !src) return;
    clearTimeout(hideTimer);
    overlayImg.src = src;
    overlayImg.alt = alt ? `${alt} — full article` : "Full article";
    overlayEl.hidden = false;
    document.body.classList.add("media-overlay-open");
    // two RAFs: unhide paints first, then the class flips → transition runs
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() =>
      requestAnimationFrame(() => overlayEl.classList.add("is-open"))
    );
  };
  const closeOverlay = () => {
    if (!overlayEl || overlayEl.hidden) return;
    overlayEl.classList.remove("is-open");
    document.body.classList.remove("media-overlay-open");
    hideTimer = setTimeout(() => {
      overlayEl.hidden = true;
      overlayImg.src = "";
    }, 320); // keep in sync with the CSS transition duration
  };

  if (overlayEl) {
    overlayClose && overlayClose.addEventListener("click", closeOverlay);
    // click on the backdrop / scroll gutter (marked data-close) closes it
    overlayEl.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]") && !e.target.closest(".media-overlay__img"))
        closeOverlay();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeOverlay();
    });
  }

  /* ---- detail (right half) ---- */
  const paint = (it) => {
    const showRead = !!it.article;
    detailEl.innerHTML = `
      <div class="media__detail-text">
        <h3 class="media__detail-title">${it.title || it.label}</h3>
        ${it.blurb ? `<p class="media__detail-blurb">${it.blurb}</p>` : ""}
        ${showRead ? `<button class="media__cta" type="button" data-read>${it.buttonLabel || "Read Article"}</button>` : ""}
      </div>
      <div class="media__preview">
        ${renderMedia(it)}
      </div>`;

    const readBtn = detailEl.querySelector("[data-read]");
    if (readBtn) readBtn.addEventListener("click", () => openOverlay(it.article, it.title || it.label));
  };

  let current = -1;
  let swapTimer = 0;
  const select = (i) => {
    const items = panels[panelIndex].items || [];
    if (i < 0 || i >= items.length) return;
    current = i;
    buttons.forEach((b, bi) => b.classList.toggle("is-active", bi === i));
    detailEl.classList.add("is-swapping"); // fade out (opacity in CSS)
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      paint(items[i]);
      detailEl.classList.remove("is-swapping");
    }, 220);
  };

  // Swap panels without the detail fade — the whole list changes at once.
  const showPanel = (i, { initial = false } = {}) => {
    panelIndex = ((i % panels.length) + panels.length) % panels.length;
    if (labelEl) labelEl.textContent = panels[panelIndex].name;
    paintTicker();
    renderList();
    current = -1;
    const items = panels[panelIndex].items || [];
    if (buttons[0]) buttons[0].classList.add("is-active");
    current = 0;
    if (items[0]) {
      if (initial) paint(items[0]);
      else {
        // reuse the same fade path so the right half feels consistent
        detailEl.classList.add("is-swapping");
        clearTimeout(swapTimer);
        swapTimer = setTimeout(() => {
          paint(items[0]);
          detailEl.classList.remove("is-swapping");
        }, 220);
      }
    }
  };

  if (cycleEl) cycleEl.addEventListener("click", () => showPanel(panelIndex + 1));

  buildTicker();
  showPanel(0, { initial: true });
}
