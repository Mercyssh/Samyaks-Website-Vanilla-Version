/* ============================================================
   what-i-build.js — pinned card-stack.

   Structure (matches the live site + Old Files/WhatIBuildMobile.tsx):
   - three pillar CARDS, stacked; as you scroll the section is pinned
     and the current card shrinks + fades while the next rises from
     the bottom (GSAP ScrollTrigger scrub). Tabs sync + are clickable.
   - each card: media · tags · title · body · stats(number+label) · Read More.
   - Read More opens a full-screen OVERLAY with a sub-project pill menu;
     each sub-project shows title · byline · stats · media · rich
     sections ("## The Problem / The Design / The Innovation").

   Copy: card copy = live-site text dump. Overlay sub-projects use the
   real project names (from the pillar tags) + the one fully-written
   example that exists (Ashoka CSBC). Everything marked TODO(copy) needs
   the real byline/stats/section text — do not invent it.
   ============================================================ */

const PLACEHOLDER = "./assets/img/placeholder.svg";

/* ---- card-stack transition tuning ---- */
const EASE_OUT = "power1.in";  // outgoing card: fade + scale-down curve
const EASE_IN = "power3.out";  // incoming card: rise-from-below curve
const OUT_SCALE = 0.7;        // how far the outgoing card scales down (1 = none)

const PILLARS = [
  {
    tab: "Making Nonprofits AI-Native",
    title: "Making Nonprofits AI-Native",
    tint: "#16240E",
    img: PLACEHOLDER,
    tags: ["Neuroda (AI coach)", "Nimaya", "Ashoka University CSBC", "Yash Raj Films’s Foundation"],
    body: [
      "The organisations solving the hardest problems for public good are the last to get AI's superpowers. I'm changing that.",
      "I build AI systems that augment human capability inside institutions that can't afford to get it wrong: agentic program managers, personalised workplace coaches for teams and context-aware behavioural analysis tools for public health.",
    ],
    stats: [
      { n: "50,000+", l: "professionals guided by AI coach" },
      { n: "90%", l: "reduction in reporting and compliance errors" },
      { n: "15,000+", l: "beneficiaries impacted via AI-managed programs" },
      { n: "3,000+", l: "rural Indians surveyed via bots trained on behavioural science and local context" },
    ],
    projects: [
      { label: "Neuroda (AI coach)", title: "Neuroda", img: PLACEHOLDER, byline: "", stats: [], sections: [] }, // TODO(copy)
      { label: "Nimaya", title: "Nimaya", img: PLACEHOLDER, byline: "", stats: [], sections: [] }, // TODO(copy)
      {
        label: "Ashoka University CSBC",
        title: "Ashoka University — Centre for Social and Behavioural Change",
        img: PLACEHOLDER,
        byline: "AI for designing, testing and scaling behavioural interventions in critical cause areas. (In progress)",
        stats: [],
        sections: [
          {
            h: "The Problem",
            body: "Ashoka University's Centre for Social and Behavioural Change designs interventions for critical cause areas — malnutrition, financial inclusion, anaemia and more. Testing whether these interventions actually work requires conducting thousands of structured interviews with beneficiaries in the field. Enumerators need to be trained, their interview quality needs to be assessed, and the resulting data needs to be analysed for patterns that reveal whether a behavioural nudge is landing. All of this is slow, expensive and hard to scale.",
          },
          {
            h: "The Design",
            body:
              "I'm building an intelligent system that operates across two layers:\n" +
              "- *Training and assessment* – AI simulates different respondent types for enumerator practice sessions. Trainees conduct interviews with AI-played beneficiaries who vary in cooperativeness, comprehension and emotional state. The AI then assesses interview quality against a rubric and returns targeted feedback.\n" +
              "- *Analysis* – transcripts from the field are read for the patterns that show whether an intervention is landing, at a volume no research team could code by hand.",
          },
        ],
      },
      { label: "Yash Raj Films’s Foundation", title: "Yash Raj Films Foundation", img: PLACEHOLDER, byline: "", stats: [], sections: [] }, // TODO(copy)
    ],
  },
  {
    tab: "Crafting Learning Simulations",
    title: "Crafting Learning Simulations",
    tint: "#0E2029",
    img: PLACEHOLDER,
    tags: ["Workverse", "Kamlaverse (SEWA)", "Ishara (Phoenix Hospitality)"],
    body: [
      "Simulations are a powerful tool to train the brain to do what AI cannot.",
      "I design immersive simulations where people step into realistic workplace scenarios, navigating ambiguity, making high-stakes decisions and collaborating with complex personalities. Each simulation builds the capabilities AI cannot replace: judgement, creative problem-solving and the ability to act when there is no right answer.",
    ],
    stats: [
      { n: "50,000+", l: "learners trained" },
      { n: "40+", l: "universities and organisations" },
      { n: "3 virtual", l: "simulation platforms built" },
    ],
    // TODO(copy): overlay byline/stats/sections for each
    projects: [
      { label: "Workverse", title: "Workverse", img: PLACEHOLDER, byline: "", stats: [], sections: [] },
      { label: "Kamlaverse (SEWA)", title: "Kamlaverse (SEWA)", img: PLACEHOLDER, byline: "", stats: [], sections: [] },
      { label: "Ishara (Phoenix Hospitality)", title: "Ishara (Phoenix Hospitality)", img: PLACEHOLDER, byline: "", stats: [], sections: [] },
    ],
  },
  {
    tab: "Building Movements for Behavioural Change",
    title: "Building Movements for Behavioural Change",
    tint: "#231A2C",
    img: PLACEHOLDER,
    tags: ["UN Young Changemakers Conclave", "Operation Black Dot", "Election Commission of India", "Green Batti Project"],
    body: [
      "When behavioural science, influencers and storytelling meet, millions shift how they think and act. I build movements that shape how people engage with critical cause areas such as preventive healthcare, financial inclusion, education and nutrition.",
      "Beyond movements, I convene unlikely combinations for dialogue: world leaders alongside comedians, Bollywood icons with grassroots sarpanchs, designing conversations that turn awareness into action.",
    ],
    stats: [
      { n: "300,000+", l: "rural citizens engaged for movements on anaemia, ration intake and COVID protocols" },
      { n: "100,000+", l: "youth mobilised for civic engagement" },
      { n: "20", l: "national conclaves with the UN" },
      { n: "100+", l: "global speakers convened" },
    ],
    // TODO(copy): overlay byline/stats/sections for each
    projects: [
      { label: "UN Young Changemakers Conclave", title: "United Nations Young Changemakers Conclave", img: PLACEHOLDER, byline: "", stats: [], sections: [] },
      { label: "Operation Black Dot", title: "Operation Black Dot (in partnership with Election Commission of India)", img: PLACEHOLDER, byline: "", stats: [], sections: [] },
      { label: "Election Commission of India", title: "Election Commission of India", img: PLACEHOLDER, byline: "", stats: [], sections: [] },
      { label: "Green Batti Project", title: "Green Batti Project", img: PLACEHOLDER, byline: "", stats: [], sections: [] },
    ],
  },
];

/* -------------------------------------------------------------- helpers --- */

const inlineMd = (s) => s.replace(/\*(.+?)\*/g, "<em>$1</em>");

/** Render a section body: paragraphs + "- " bullet lists + *italics*. */
function renderRich(body) {
  const lines = (body || "").split("\n");
  let html = "";
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (inList) { html += "</ul>"; inList = false; } continue; }
    if (line.startsWith("- ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inlineMd(line.slice(2))}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${inlineMd(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

/** Card/overlay graphic. Pass `video` (a src) to use a looping muted <video>,
 *  otherwise `img` (falls back to the shared placeholder). `poster` is optional. */
function mediaHTML(item, cls) {
  if (item.video) {
    return `<video class="${cls}" src="${item.video}"${item.poster ? ` poster="${item.poster}"` : ""} autoplay muted loop playsinline></video>`;
  }
  return `<img class="${cls}" src="${item.img || PLACEHOLDER}" alt="${item.title}" loading="lazy" />`;
}

const statsRow = (stats) =>
  stats && stats.length
    ? `<div class="wib-stats">${stats
        .map((s) => `<div class="wib-stat"><span class="wib-stat__n">${s.n}</span><span class="wib-stat__l">${s.l}</span></div>`)
        .join("")}</div>`
    : "";

/* --------------------------------------------------------------- cards --- */

function cardHTML(p, i) {
  return `
  <article class="wib-card" data-card="${i}" style="--tint:${p.tint}">
    <figure class="wib-card__media">${mediaHTML(p, "wib-card__media-el")}</figure>
    <div class="wib-card__content">
      <ul class="wib-card__tags">${p.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
      <h3 class="wib-card__title">${p.title}</h3>
      <div class="wib-card__body">${p.body.map((t) => `<p>${t}</p>`).join("")}</div>
      ${statsRow(p.stats)}
      <button class="wib-card__more" type="button" data-more="${i}">Read More →</button>
    </div>
  </article>`;
}

/* ------------------------------------------------------------------ boot --- */

export function initWhatIBuild() {
  const tabsEl = document.getElementById("wibTabs");
  const stackEl = document.getElementById("wibStack");
  const pinEl = document.getElementById("wibPin");
  if (!tabsEl || !stackEl || !pinEl) return;

  const { gsap, ScrollTrigger, lenis, prefersReduced } = window.__app || {};
  const n = PILLARS.length;

  /* ---- tabs ---- */
  const tabs = PILLARS.map((p, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wib__tab";
    btn.setAttribute("role", "tab");
    btn.innerHTML = `<span class="wib__tab-num">${String(i + 1).padStart(2, "0")}</span><span class="wib__tab-label">${p.tab}</span>`;
    tabsEl.appendChild(btn);
    return btn;
  });
  const setActiveTab = (i) => {
    tabs.forEach((t, ti) => {
      const on = ti === i;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
  };

  /* ---- cards ---- */
  stackEl.innerHTML = PILLARS.map((p, i) => cardHTML(p, i)).join("");
  const cards = [...stackEl.querySelectorAll(".wib-card")];

  /* ---- Read More overlay wiring ---- */
  const overlay = initOverlay();
  stackEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-more]");
    if (btn) overlay.open(PILLARS[+btn.dataset.more]);
  });

  /* ---- scroll behaviour ---- */
  const canScrub = gsap && ScrollTrigger && !prefersReduced;

  if (!canScrub) {
    // Fallback: static vertical stack, tabs jump to a card.
    stackEl.classList.add("wib__stack--static");
    setActiveTab(0);
    tabs.forEach((t, i) =>
      t.addEventListener("click", () => cards[i].scrollIntoView({ behavior: "smooth", block: "center" }))
    );
    return;
  }

  // stacked: card 0 in place, the rest already opaque (y set per-segment below)
  gsap.set(cards, { position: "absolute", inset: 0 });
  gsap.set(cards, { autoAlpha: 1, scale: 1, y: 0 });
  setActiveTab(0);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: pinEl,
      start: "top top",
      end: "+=" + window.innerHeight * (n - 1),
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,   // re-read window.innerHeight on resize
      onUpdate: (self) => setActiveTab(Math.round(self.progress * (n - 1))),
    },
  });
  for (let i = 0; i < n - 1; i++) {
    // out: stays put, fades + scales down slightly (no upward move)
    tl.to(cards[i], { autoAlpha: 0, scale: OUT_SCALE, ease: EASE_OUT, duration: 1 }, i);
    // in: already opaque, starts fully below the viewport and rises over the outgoing card
    tl.fromTo(cards[i + 1], { y: () => window.innerHeight }, { y: 0, ease: EASE_IN, duration: 1 }, i);
  }

  // tabs → scroll to that card's segment
  tabs.forEach((t, i) =>
    t.addEventListener("click", () => {
      const st = tl.scrollTrigger;
      const y = st.start + (i / (n - 1)) * (st.end - st.start);
      if (lenis) lenis.scrollTo(y);
      else window.scrollTo({ top: y, behavior: "smooth" });
    })
  );
}

/* --------------------------------------------------------------- overlay --- */

function initOverlay() {
  const el = document.getElementById("wibOverlay");
  const tabsEl = document.getElementById("wibOvTabs");
  const bodyEl = document.getElementById("wibOvBody");
  const closeEl = document.getElementById("wibOvClose");
  if (!el || !tabsEl || !bodyEl) return { open() {} };

  let hideTimer = 0;
  let projects = [];

  const paint = (proj) => {
    bodyEl.innerHTML = `
      <header class="wib-ov__head">
        <h3 class="wib-ov__title">${proj.title}</h3>
        ${proj.byline ? `<p class="wib-ov__byline">${proj.byline}</p>` : ""}
        ${statsRow(proj.stats)}
      </header>
      <figure class="wib-ov__media">${mediaHTML(proj, "wib-ov__media-el")}</figure>
      <div class="wib-ov__sections">
        ${
          proj.sections && proj.sections.length
            ? proj.sections.map((s) => `<section class="wib-ov__section"><h4>${s.h}</h4>${renderRich(s.body)}</section>`).join("")
            : `<p class="wib-ov__todo">Full write-up coming soon.</p>` // TODO(copy)
        }
      </div>`;
    bodyEl.scrollTop = 0;
  };

  const select = (i) => {
    [...tabsEl.children].forEach((t, ti) => t.classList.toggle("is-active", ti === i));
    paint(projects[i]);
  };

  const open = (pillar) => {
    projects = pillar.projects || [];
    if (!projects.length) return;
    tabsEl.innerHTML = projects
      .map((p, i) => `<button type="button" class="wib-ov__pill${i === 0 ? " is-active" : ""}" data-ov="${i}">${p.label}</button>`)
      .join("");
    paint(projects[0]);
    clearTimeout(hideTimer);
    el.hidden = false;
    document.body.classList.add("wib-overlay-open");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
  };

  const close = () => {
    if (el.hidden) return;
    el.classList.remove("is-open");
    document.body.classList.remove("wib-overlay-open");
    hideTimer = setTimeout(() => { el.hidden = true; }, 320);
  };

  tabsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ov]");
    if (b) select(+b.dataset.ov);
  });
  closeEl && closeEl.addEventListener("click", close);
  el.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  return { open };
}
