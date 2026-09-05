/* ============================================================
   what-i-build.js — three pillars as a tab switcher + card.
   Copy: live-site text dump (samyakchakrabarty.com).
   Phase 3 upgrades the tab switch into a pinned scroll-scrub
   card stack; for now it's a click/keyboard tablist.
   ============================================================ */

const PLACEHOLDER = "./assets/img/placeholder.svg";

const PILLARS = [
  {
    tab: "Making Nonprofits AI-Native",
    heading: "Making Nonprofits AI-Native",
    tags: ["Neuroda (AI coach)", "Nimaya", "Ashoka University CSBC", "Yash Raj Films’s Foundation"],
    body:
      "The organisations solving the hardest problems for public good are the last to get AI's superpowers. I'm changing that. I build AI systems that augment human capability inside institutions that can't afford to get it wrong: agentic program managers, personalised workplace coaches for teams and context-aware behavioural analysis tools for public health.",
    img: PLACEHOLDER,
    href: "#", // TODO(copy): Read More destination
    stats: [
      { n: "50,000+", l: "professionals guided by AI coach" },
      { n: "90%", l: "reduction in reporting and compliance errors" },
      { n: "15,000+", l: "beneficiaries impacted via AI-managed programs" },
      { n: "3,000+", l: "rural Indians surveyed via bots trained on behavioural science and local context" },
    ],
  },
  {
    tab: "Crafting Learning Simulations",
    heading: "Crafting Learning Simulations",
    tags: ["Workverse", "Kamlaverse (SEWA)", "Ishara (Phoenix Hospitality)"],
    body:
      "Simulations are a powerful tool to train the brain to do what AI cannot. I design immersive simulations where people step into realistic workplace scenarios, navigating ambiguity, making high-stakes decisions and collaborating with complex personalities. Each simulation builds the capabilities AI cannot replace: judgement, creative problem-solving and the ability to act when there is no right answer.",
    img: PLACEHOLDER,
    href: "#",
    stats: [
      { n: "50,000+", l: "learners trained" },
      { n: "40+", l: "universities and organisations" },
      { n: "3 virtual", l: "simulation platforms built" },
    ],
  },
  {
    tab: "Building Movements for Behavioural Change",
    heading: "Building Movements for Behavioural Change",
    tags: ["UN Young Changemakers Conclave", "Operation Black Dot", "Election Commission of India", "Green Batti Project"],
    body:
      "When behavioural science, influencers and storytelling meet, millions shift how they think and act. I build movements that shape how people engage with critical cause areas such as preventive healthcare, financial inclusion, education and nutrition. Beyond movements, I convene unlikely combinations for dialogue: world leaders alongside comedians, Bollywood icons with grassroots sarpanchs, designing conversations that turn awareness into action.",
    img: PLACEHOLDER,
    href: "#",
    stats: [
      { n: "300,000+", l: "rural citizens engaged for movements on anaemia, ration intake and COVID protocols" },
      { n: "100,000+", l: "youth mobilised for civic engagement" },
      { n: "20", l: "national conclaves with the UN" },
      { n: "100+", l: "global speakers convened" },
    ],
  },
];

export function initWhatIBuild() {
  const tabsEl = document.getElementById("wibTabs");
  const stageEl = document.getElementById("wibStage");
  if (!tabsEl || !stageEl) return;

  /* ---- tabs ---- */
  const tabs = PILLARS.map((p, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wib__tab";
    btn.setAttribute("role", "tab");
    btn.innerHTML = `<span class="wib__tab-num">${String(i + 1).padStart(2, "0")}</span><span class="wib__tab-label">${p.tab}</span>`;
    btn.addEventListener("click", () => select(i));
    tabsEl.appendChild(btn);
    return btn;
  });

  /* ---- card render ---- */
  const cardHTML = (p) => `
    <article class="wib-card">
      <figure class="wib-card__media">
        <img src="${p.img}" alt="${p.heading}" loading="lazy" />
      </figure>
      <div class="wib-card__content">
        <ul class="wib-card__tags">
          ${p.tags.map((t) => `<li class="wib-card__tag">${t}</li>`).join("")}
        </ul>
        <h3 class="wib-card__heading">${p.heading}</h3>
        <p class="wib-card__body">${p.body}</p>
        <div class="wib-card__stats">
          ${p.stats
            .map(
              (s) => `<div class="wib-stat"><span class="wib-stat__n">${s.n}</span><span class="wib-stat__l">${s.l}</span></div>`
            )
            .join("")}
        </div>
        <a class="wib-card__more" href="${p.href}"${p.href && p.href !== "#" ? ' target="_blank" rel="noopener"' : ' aria-disabled="true"'}>Read More →</a>
      </div>
    </article>`;

  let current = -1;
  let swapTimer = 0;
  const select = (i) => {
    if (i < 0 || i === current) return;
    current = i;
    tabs.forEach((t, ti) => {
      const on = ti === i;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    stageEl.classList.add("is-swapping");
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      stageEl.innerHTML = cardHTML(PILLARS[i]);
      stageEl.classList.remove("is-swapping");
    }, 200);
  };

  // initial (no fade)
  stageEl.innerHTML = cardHTML(PILLARS[0]);
  tabs[0].classList.add("is-active");
  tabs[0].setAttribute("aria-selected", "true");
  current = 0;
}
