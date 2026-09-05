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
     label     required — text shown in the selection list
     group     optional — sub-heading; consecutive items sharing a
                          group collapse under one label (Media only)
     subtitle  optional — small muted line under the label (Books years)
     title     optional — detail headline (falls back to label)
     blurb     optional — detail body copy
     href      optional — "Read Article" link ("#"/empty = disabled)
     img       optional — detail preview image
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
          href: "#", // TODO(copy): real article URL
          img: PLACEHOLDER,
        },
        // TODO(copy): NDTV / CNBC editorial headlines + blurbs + URLs
        { group: "Editorials", label: "NDTV", title: "NDTV editorial", href: "#", img: PLACEHOLDER },
        { group: "Editorials", label: "CNBC", title: "CNBC editorial", href: "#", img: PLACEHOLDER },

        { group: "Interviews", label: "NDTV", title: "NDTV interview", href: "#", img: PLACEHOLDER },
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

  /* ---- detail (right half) ---- */
  const paint = (it) => {
    const hasLink = it.href && it.href !== "#";
    detailEl.innerHTML = `
      <div class="media__detail-text">
        <h3 class="media__detail-title">${it.title || it.label}</h3>
        ${it.blurb ? `<p class="media__detail-blurb">${it.blurb}</p>` : ""}
        <a class="media__cta" href="${it.href || "#"}"${hasLink ? ' target="_blank" rel="noopener"' : ' aria-disabled="true"'}>
          Read Article →
        </a>
      </div>
      <figure class="media__preview">
        <div class="media__preview-bar"><span></span><span></span><span></span></div>
        <img src="${it.img || PLACEHOLDER}" alt="Preview of ${it.title || it.label}" loading="lazy" />
      </figure>`;
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
