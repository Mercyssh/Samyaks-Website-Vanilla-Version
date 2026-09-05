/* ============================================================
   journey.js — the three "Acts" as a DOM timeline overlay.
   Copy: recordings (journey.mp4) + live text dump. Some node
   descriptions were only partly legible in the recording and
   are marked TODO(copy) for your correction.
   Phase 4 adds the scroll-driven 3D path behind this content.
   ============================================================ */

const LEAD =
  "Every stage taught me something the next one needed. Convening taught me scale. Scale taught me systems. Systems taught me where AI, human behaviour and storytelling actually meet, and why no single discipline can solve what matters most.";

const ACTS = [
  {
    years: "2006–2010",
    title: "Early Enthusiasm",
    built:
      "The conviction that young people are an underestimated force, and that the right format can unlock their energy at scale.", // TODO(copy): verify exact wording
    nodes: [
      {
        role: "President",
        org: "The Indian International Model United Nations",
        desc:
          "At 16, built South Asia's largest MUN simulation, engaging 10,000+ students from public schools across India, Pakistan and Sri Lanka — the first proof that young people show up when you design something worth showing up for.",
      },
      {
        role: "Founder",
        org: "YouthPortal.In",
        desc:
          "A digital platform where brand managers and young people co-created campaigns — an early experiment in giving youth a seat at the table, not just a spot in the audience.",
      },
    ],
  },
  {
    years: "2010–2024",
    title: "Gaining Wisdom",
    built:
      "The craft of behaviour change at scale — how to move people, brands and governments at the same time.", // TODO(copy): verify
    nodes: [
      { role: "President", org: "United Nations Young Changemakers Conclave", desc: "" }, // TODO(copy)
      { role: "Founder", org: "Welcome (Acquired)", desc: "" }, // TODO(copy): confirm name/spelling
      { role: "Chief Youth Marketer", org: "DDB India", desc: "" }, // TODO(copy)
    ],
  },
  {
    years: "2025–Present",
    title: "Building the Future",
    built:
      "The tools and institutions where AI, human behaviour and storytelling actually converge — not as separate disciplines, but as one practice.",
    nodes: [
      {
        role: "Co-Founder",
        org: "Nimaya Foundation",
        desc:
          "Building India's most future-forward nonprofit with Navya Nanda — enabling young women from restricted backgrounds to master GenAI and creator skills.",
      },
      {
        role: "Senior Fellow",
        org: "Ashoka University",
        desc:
          "Working at the intersection of AI, human behaviour and storytelling to build impact organisations around behavioural science — anaemia, breastfeeding, child nutrition.", // TODO(copy): verify
      },
    ],
  },
];

export function initJourney() {
  const leadEl = document.getElementById("journeyLead");
  const actsEl = document.getElementById("journeyActs");
  if (!actsEl) return;
  if (leadEl) leadEl.textContent = LEAD;

  actsEl.innerHTML = ACTS.map(
    (a) => `
    <article class="act">
      <header class="act__head">
        <span class="act__years">${a.years}</span>
        <h3 class="act__title">${a.title}</h3>
      </header>
      ${a.built ? `<p class="act__built">${a.built}</p>` : ""}
      <div class="act__nodes">
        ${a.nodes
          .map(
            (n) => `
          <div class="node">
            <p class="node__role">${n.role}</p>
            <p class="node__org">${n.org}</p>
            ${n.desc ? `<p class="node__desc">${n.desc}</p>` : ""}
          </div>`
          )
          .join("")}
      </div>
    </article>`
  ).join("");
}
