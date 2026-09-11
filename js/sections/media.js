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
const REC = "./assets/img/recognition/"; // recognition asset root
const MEDIA = REC + "media/";
const AWARDS = REC + "awards/";
const FELLOWS = REC + "fellowships/";
const BOOKS = REC + "books/";

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
export const MEDIA_CONFIG = {
  panels: [
    {
      name: "Media",
      items: [
        {
          group: "Editorials",
          label: "Hindustan Times",
          title: "Soft Skills: The missing piece in employability",
          blurb:
            "India's aspiration to become an economic superpower is intricately tied to its ability to leverage the demographic dividend and uplift disadvantaged regions. However, this ambition faces a significant challenge",
          img: MEDIA + "hindustantimes.webp",
          article: MEDIA + "hindustantimes-full.webp",
        },
        {
          group: "Editorials",
          label: "NDTV",
          title: "The World Of Work Has Changed.",
          blurb:
            "Kumudini is a 22-year-old living at Mumbai's Dharavi slum. Her father works at a leather tannery and her mother as a domestic help. They worked hard to send her to a private school and then took a loan against the little gold they had to pay for her college.",
          img: MEDIA + "ndtv.webp",
          article: MEDIA + "ndtv-full.webp",
        },
        {
          group: "Editorials",
          label: "CNBC",
          title: "CSR 2.0: How can it be optimised in the age of GenAI",
          blurb:
            "Intelligent technologies and forecasts such as generative AI raise the question of how we can save India's next generation from automation-induced unemployment and professional irrelevance",
          img: MEDIA + "cnbc.webp",
          article: MEDIA + "cnbc-full.webp",
        },

        // Interviews: live site shows only a media preview (no headline/blurb).
        // The NDTV entry keeps the sample video preview. Swap `video` for an
        // .mp4 path to serve a file instead; mediaAspect avoids any JS sizing.
        { group: "Interviews", label: "NDTV", video: MEDIA + "ndtv.mp4", poster: MEDIA + "ndtv-thmb.webp", mediaAspect: "16 / 9" },
        { group: "Interviews", label: "BBC", video: MEDIA + "bbc.mp4", poster: MEDIA + "bbc-thmb.webp", mediaAspect: "16 / 9" },
        { group: "Interviews", label: "Master's Union", video: "https://www.youtube.com/watch?v=p0eOyAhMJeQ", mediaAspect: "16 / 9" },
        { group: "Interviews", label: "Analytics India Magazine", video: "https://www.youtube.com/watch?v=Oe0D_68UkNA", mediaAspect: "16 / 9" },

        {
          group: "Announcements",
          label: "Nimaya x Govt's AI Mission",
          title: "Samyak Chakrabarty and Navya Nanda's Nimaya partners with Govt's AI Mission",
          blurb:
            "Samyak Chakrabarty and Navya Nanda's Nimaya has signed an MOU with IndiaAI, an IBD of Digital India Corporation, Ministry of Electronics & Information Technology (MeitY), to ensure women from under-served communities have an edge in leveraging AI at work.",
          img: MEDIA + "nimayaxgovt.webp",
          article: MEDIA + "nimayaxgovt-full.webp",
        },
        {
          group: "Announcements",
          label: "Harper Collins Book",
          title: "Samyak Chakrabarty & Navya Naveli Nanda Author A Playbook For India's Gen Z",
          blurb:
            "At a time when advice for young people often feels overbearing, The Map positions itself as something quieter and more thoughtful. Written by Navya Naveli Nanda and Samyak Chakrabarty, and releasing later this year with HarperCollins India",
          img: MEDIA + "harpercollinsbook.webp",
          article: MEDIA + "harpercollinsbook-full.webp",
        },
        {
          group: "Announcements",
          label: "Nimaya x Yourstory",
          title: "Samyak Chakrabarty and Navya Naveli Nanda's Nimaya is helping young women kickstart their careers",
          blurb:
            "Started in 2021 by Navya Naveli Nanda, Founder of Project Naveli and Samyak Chakrabarty, Founder of Workverse, the initiative has trained more than 350 girls so far, helping them overcome fears and enter the workforce.",
          img: MEDIA + "nimayaxyourstory.webp",
          article: MEDIA + "nimayaxyourstory-full.webp",
        },
      ],
    },
    {
      name: "Awards",
      // Awards have no blurb → they render "stacked" (title above the graphic,
      // per image1). `title` mirrors `label` so the name also heads the detail.
      items: [
        { label: "Forbes Asia's most influential social entrepreneurs", title: "Forbes Asia's most influential social entrepreneurs", href: "#", img: AWARDS + "forbesasia.webp" },
        { label: "Campaign South Asia Young Achiever", title: "Campaign South Asia Young Achiever", href: "#", img: AWARDS + "campaignsouthasia.webp" },
        { label: "Bombay Ad Club Young Emvie", title: "Bombay Ad Club Young Emvie", href: "#", img: AWARDS + "bombayadclub.webp" },
        { label: "Times Lead India", title: "Times Lead India", href: "#", img: AWARDS + "timesleadindia.webp" },
      ],
    },
    {
      name: "Fellowships",
      items: [
        {
          label: "INK Fellowship",
          blurb: "India's most prestigious fellowship for young leaders in social innovation",
          href: "#",
          img: FELLOWS + "inkfellowship.webp",
        },
        {
          label: "RC Fellowship Trust of India",
          title: "RC Fellowship",
          blurb:
            "In the memory of Silicon Valley Genius and mentor to Google's Founders Prof Rajeev Motwani - RC Fellowship invites social innovators from India to Palo Alto to learn from leaders of future forward companies such as GoogleX, Tesla, SpaceX and Neuralink.",
          href: "#",
          img: FELLOWS + "rcfellowship.webp",
        },
      ],
    },
    {
      name: "Books",
      items: [
        {
          label: "The Map",
          subtitle: "2027",
          blurb:
            "(Slated for release in 2027 by Harper Collins) Co-authoring with Navya Naveli Nanda, amongst India's top youth influencers. The Map is a play book for youth to navigate the new world. Themes include work, identity, dope (dopamine) , morality and privacy",
          href: "#",
          img: BOOKS + "themap.webp",
        },
        {
          label: "Generation Einstein",
          blurb:
            "Commissioned by Ronnie Screwvala for UTV (now Disney India), I co-authored Generation Einstein with Dutch youth-trends researcher Jeroen Boschma. The book mapped 16+ mindset archetypes of Indian millennials and Gen Z as consumers, uncovering the triggers that shape their purchase decisions and brand loyalties. Widely circulated among industry leaders, it was read by over 300 C-suite executives across consumer brands, media platforms, and advertising agencies.",
          href: "#",
          img: BOOKS + "generationeinstein.webp",
        },
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

  /* ---- detail (right half) ----
     Three layout modes, keyed off the `title` / `blurb` fields:
       • blurb present            → full (text column left, graphic right)
       • title, no blurb          → stacked (title centred ABOVE the graphic)
       • neither title nor blurb  → graphic-only (just the centred graphic)
     The blurb's clamp + fade only make sense as a "there's more → Read
     Article" hint, so when there's no read-more button we show it in full. */
  const paint = (it) => {
    const showRead = !!it.article;
    const hasBlurb = !!it.blurb;
    const hasTitle = !!it.title;
    const hasText = hasBlurb || hasTitle;

    detailEl.classList.toggle("is-graphic-only", !hasText);
    detailEl.classList.toggle("is-stacked", hasTitle && !hasBlurb);

    const textBlock = hasText
      ? `<div class="media__detail-text">
          <h3 class="media__detail-title">${it.title || it.label}</h3>
          ${hasBlurb ? `<p class="media__detail-blurb${showRead ? "" : " media__detail-blurb--full"}">${it.blurb}</p>` : ""}
          ${showRead ? `<button class="media__cta" type="button" data-read>${it.buttonLabel || "Read Article"}</button>` : ""}
        </div>`
      : "";

    detailEl.innerHTML = `
      ${textBlock}
      <div class="media__preview">
        ${renderMedia(it)}
      </div>`;

    const readBtn = detailEl.querySelector("[data-read]");
    if (readBtn) readBtn.addEventListener("click", () => openOverlay(it.article, it.title || it.label));
  };

  /* Decode an item's image before we reveal it, so the swapped-in content
     paints already-sized instead of collapsing to zero height (title-only)
     and snapping back once the image loads. Videos reserve their own height
     via CSS, so only still images need this. Resolves immediately when there's
     nothing to load, and is capped so a slow/broken image can't stall the fade. */
  const preload = (it) =>
    new Promise((resolve) => {
      const src = it && !it.video ? it.img : null;
      if (!src) return resolve();
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = src;
      if (img.complete) resolve();       // already cached
      setTimeout(resolve, 800);          // never block the swap on a slow image
    });

  const FADE_MS = 220; // keep in sync with the .is-swapping opacity transition
  let current = -1;
  let swapToken = 0;
  // Cross-fade to `it`: fade out, wait for BOTH the fade and the image decode,
  // then paint + fade in. A token makes only the latest request win, so rapid
  // clicks don't paint a stale item.
  const swapDetail = (it) => {
    const token = ++swapToken;
    detailEl.classList.add("is-swapping");
    Promise.all([
      new Promise((r) => setTimeout(r, FADE_MS)),
      preload(it),
    ]).then(() => {
      if (token !== swapToken) return;
      paint(it);
      detailEl.classList.remove("is-swapping");
    });
  };

  const select = (i) => {
    const items = panels[panelIndex].items || [];
    if (i < 0 || i >= items.length) return;
    current = i;
    buttons.forEach((b, bi) => b.classList.toggle("is-active", bi === i));
    swapDetail(items[i]);
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
      else swapDetail(items[0]); // same preload + fade path as select()
    }
  };

  if (cycleEl) cycleEl.addEventListener("click", () => showPanel(panelIndex + 1));

  buildTicker();
  showPanel(0, { initial: true });
}
