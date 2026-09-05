/* ============================================================
   media.js — "Publication, Media & Awards"
   Renders a grouped coverage list + a featured detail panel.

   Copy sources:
   - Groups/outlets: live-site text dump (samyakchakrabarty.com).
   - Full article copy known only for the Hindustan Times piece.
   TODO(copy): real headline + blurb + href for every item marked
   below; swap placeholder.svg for the real preview images.
   ============================================================ */

const PLACEHOLDER = "./assets/img/placeholder.svg";

const MEDIA_GROUPS = [
  {
    group: "Editorials",
    items: [
      {
        outlet: "Hindustan Times",
        title: "Soft Skills: The missing piece in employability",
        blurb:
          "India's aspiration to become an economic superpower is intricately tied to its ability to leverage the demographic dividend and uplift disadvantaged regions. However, this ambition faces a significant challenge.",
        href: "#", // TODO(copy): real article URL
        img: PLACEHOLDER,
      },
      // TODO(copy): NDTV / CNBC editorial headlines + blurbs + URLs
      { outlet: "NDTV", title: "NDTV editorial", blurb: "", href: "#", img: PLACEHOLDER },
      { outlet: "CNBC", title: "CNBC editorial", blurb: "", href: "#", img: PLACEHOLDER },
    ],
  },
  {
    group: "Interviews",
    items: [
      { outlet: "NDTV", title: "NDTV interview", blurb: "", href: "#", img: PLACEHOLDER },
      { outlet: "BBC", title: "BBC interview", blurb: "", href: "#", img: PLACEHOLDER },
      { outlet: "Master's Union", title: "Master's Union", blurb: "", href: "#", img: PLACEHOLDER },
      { outlet: "Analytics India Magazine", title: "Analytics India Magazine", blurb: "", href: "#", img: PLACEHOLDER },
    ],
  },
  {
    group: "Announcements",
    items: [
      { outlet: "Nimaya x Govt's AI Mission", title: "Nimaya x Government's AI Mission", blurb: "", href: "#", img: PLACEHOLDER },
      { outlet: "HarperCollins Book", title: "HarperCollins book", blurb: "", href: "#", img: PLACEHOLDER },
      { outlet: "Nimaya x YourStory", title: "Nimaya x YourStory", blurb: "", href: "#", img: PLACEHOLDER },
    ],
  },
];

export function initMedia() {
  const listEl = document.getElementById("mediaList");
  const detailEl = document.getElementById("mediaDetail");
  if (!listEl || !detailEl) return;

  // flat index so master + detail agree on identity
  const flat = [];
  MEDIA_GROUPS.forEach((g) => g.items.forEach((it) => flat.push(it)));

  /* ---- render master list ---- */
  const buttons = [];
  listEl.innerHTML = "";
  MEDIA_GROUPS.forEach((g) => {
    const groupEl = document.createElement("div");
    groupEl.className = "media__group";
    const label = document.createElement("p");
    label.className = "media__group-label";
    label.textContent = g.group;
    groupEl.appendChild(label);

    g.items.forEach((it) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "media__item";
      btn.innerHTML = `<span class="media__item-outlet">${it.outlet}</span>`;
      btn.addEventListener("click", () => select(flat.indexOf(it)));
      groupEl.appendChild(btn);
      buttons.push(btn);
    });
    listEl.appendChild(groupEl);
  });

  /* ---- detail rendering ---- */
  let current = -1;
  const paint = (it) => {
    const hasLink = it.href && it.href !== "#";
    detailEl.innerHTML = `
      <div class="media__detail-text">
        <p class="media__detail-outlet">${it.outlet}</p>
        <h3 class="media__detail-title">${it.title}</h3>
        ${it.blurb ? `<p class="media__detail-blurb">${it.blurb}</p>` : ""}
        <a class="media__cta" href="${it.href}"${hasLink ? ' target="_blank" rel="noopener"' : ' aria-disabled="true"'}>
          Read Article →
        </a>
      </div>
      <figure class="media__preview">
        <div class="media__preview-bar"><span></span><span></span><span></span></div>
        <img src="${it.img}" alt="Preview of ${it.title}" loading="lazy" />
      </figure>`;
  };

  let swapTimer = 0;
  const select = (i) => {
    if (i < 0 || i === current) return;
    current = i;
    buttons.forEach((b, bi) => b.classList.toggle("is-active", bi === i));
    detailEl.classList.add("is-swapping"); // fade out (opacity 0.25s in CSS)
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      paint(flat[i]);
      detailEl.classList.remove("is-swapping"); // fade back in
    }, 220);
  };

  // initial state (no fade)
  paint(flat[0]);
  buttons[0].classList.add("is-active");
  current = 0;
}
