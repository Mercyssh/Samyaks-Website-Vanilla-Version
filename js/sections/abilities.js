/* ============================================================
   abilities.js — fanned flip cards (DOM). Renders the deck from
   data, handles click-to-open (one at a time), outside-click / Esc
   to close. Hover/tint/lift/flip are all CSS (css/abilities.css).

   Titles from Old Files/AbilitiesMobile.tsx. front = card graphic,
   back = the landscape detail image. Placeholder art for now.
   ============================================================ */

const IMG = "./assets/img/abilities";

const ABILITIES = [
  { title: "Connecting the Dots", front: `${IMG}/Card_1.png`, back: `${IMG}/Card_1_back.png` },
  { title: "Crafting Narratives", front: `${IMG}/Card_2.png`, back: `${IMG}/Card_2_back.png` },
  { title: "Building from Zero", front: `${IMG}/Card_3.png`, back: `${IMG}/Card_3_back.png` },
  { title: "Designing behaviour change", front: `${IMG}/Card_4.png`, back: `${IMG}/Card_4_back.png` },
];

export function initAbilities() {
  const deck = document.getElementById("abilitiesDeck");
  if (!deck) return;

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
