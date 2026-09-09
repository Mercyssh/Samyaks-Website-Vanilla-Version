/* ============================================================
   abilities.js — fanned flip cards (DOM). Renders the deck from
   data, handles click-to-open (one at a time), outside-click / Esc
   to close. Hover/tint/lift/flip are all CSS (css/abilities.css).

   Titles from Old Files/AbilitiesMobile.tsx. front = card graphic,
   back = the landscape detail image. Placeholder art for now.
   ============================================================ */

const IMG = "./assets/img/abilities";

export const ABILITIES = [
  { title: "Connecting the Dots", front: `${IMG}/Card_1.png`, back: `${IMG}/Card_1_back.png` },
  { title: "Crafting Narratives", front: `${IMG}/Card_2.png`, back: `${IMG}/Card_2_back.png` },
  { title: "Building from Zero", front: `${IMG}/Card_3.png`, back: `${IMG}/Card_3_back.png` },
  { title: "Designing behaviour change", front: `${IMG}/Card_4.png`, back: `${IMG}/Card_4_back.png` },
];

/* one seamless period of a sine wave as a tiling SVG data-URI. Starts and
   ends at mid-height with matching slope, so background-repeat:repeat-x is
   continuous and a 1-period scroll loops invisibly. */
function waveTile({ period, amp, color, weight, height = 200 }) {
  const mid = height / 2;
  const steps = 48;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * period;
    const y = mid + amp * Math.sin((i / steps) * Math.PI * 2);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${period}' height='${height}' viewBox='0 0 ${period} ${height}'><path d='${d}' fill='none' stroke='${color}' stroke-width='${weight}' stroke-linecap='round'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* two thin sine waves behind the deck — different amplitude, period and
   scroll speed/direction, so their relative phase drifts continuously. */
function initWaves() {
  const section = document.querySelector(".abilities");
  if (!section || section.querySelector(".abilities__waves")) return;

  const waves = [
    { period: 500, amp: 31, color: "rgba(255,255,255,0.05)", weight: 2 },
    { period: 600, amp: 22, color: "rgba(255,255,255,0.05)", weight: 1.5 },
  ];

  const layer = document.createElement("div");
  layer.className = "abilities__waves";
  layer.setAttribute("aria-hidden", "true");
  waves.forEach((w, i) => {
    const span = document.createElement("span");
    span.className = `abilities__wave abilities__wave--${i + 1}`;
    // set via the DOM API — the data-URI holds quotes that would break an inline style attribute
    span.style.setProperty("--wave-img", waveTile(w));
    span.style.setProperty("--wave-period", `${w.period}px`);
    layer.appendChild(span);
  });
  section.appendChild(layer);
}

export function initAbilities() {
  const deck = document.getElementById("abilitiesDeck");
  if (!deck) return;

  initWaves();

  // one collective shadow, laid on the perspective floor (lies flat because
  // it inherits the floor's tilted plane) rather than in the upright deck.
  const floor = document.querySelector(".abilities__floor");
  if (floor) floor.innerHTML = `<span class="abil-shadow" aria-hidden="true"></span>`;

  deck.innerHTML = ABILITIES.map(
    (a, i) => `
    <button type="button" class="abil-card" style="--i:${i}" aria-expanded="false" aria-label="${a.title}">
      <span class="abil-card__inner">
        <span class="abil-card__face abil-card__front">
          <img src="${a.front}" alt="${a.title}" loading="lazy" />
        </span>
        <span class="abil-card__face abil-card__back">
          <img src="${a.back}" alt="${a.title} — detail" loading="lazy" />
        </span>
      </span>
    </button>`
  ).join("");

  const cards = [...deck.querySelectorAll(".abil-card")];
  let openCard = null;

  const close = () => {
    if (!openCard) return;
    openCard.classList.remove("is-open");
    openCard.setAttribute("aria-expanded", "false");
    openCard = null;
    deck.classList.remove("has-open");
  };
  const open = (card) => {
    if (openCard === card) return close();
    close();
    card.classList.add("is-open");
    card.setAttribute("aria-expanded", "true");
    openCard = card;
    deck.classList.add("has-open");
  };

  cards.forEach((c) => c.addEventListener("click", (e) => { e.stopPropagation(); open(c); }));
  document.addEventListener("click", (e) => { if (openCard && !e.target.closest(".abil-card")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}
