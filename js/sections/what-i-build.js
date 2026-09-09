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
    video: "./assets/img/what-i-build/card1%20thmb.mp4",
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
      {
        label: "AI x Behavioural Research",
        title: "Ashoka University - Centre for Social and Behavioural Change",
        img: PLACEHOLDER,
        byline: "AI that compresses the feedback loop on behavioural interventions, from months to weeks.",
        stats: [],
        sections: [
          {
            h: "The problem",
            body: `Ashoka University's Centre for Social and Behavioural Change designs interventions for critical cause areas: malnutrition, financial inclusion, anaemia. Testing whether these interventions actually shift behaviour requires thousands of structured interviews with beneficiaries in the field. Enumerators need to be trained, their interview quality assessed, and the resulting data analysed for patterns that reveal whether a behavioural nudge is landing.
All of this is slow, expensive and hard to scale.`,
          },
          {
            h: "The Design",
            body: `I'm building an AI system that works across two layers. First, it trains the people who do the fieldwork, simulating different respondent types so enumerators can practise interviews with AI-played beneficiaries who vary in cooperativeness, comprehension and emotional state. The AI assesses interview quality and sharpens skills before anyone enters the field.
Second, and more ambitiously, we're training AI to analyse field responses at scale, reading emotional cues, interpreting voice patterns and identifying what a successful behavioural intervention actually looks like in the data.`,
          },
          {
            h: "The innovation",
            body: `This is AI as a research instrument, not an efficiency tool. It can help test whether a behavioural nudge around nutrition actually changes how a mother feeds her child, or whether a financial literacy intervention shifts how a farmer manages risk. The ambition is to compress the distance between designing an intervention and knowing whether it works, turning what used to take months of fieldwork into real time analysis.`,
          },
        ],
      },
      {
        label: "AI x Workplace Coaching",
        title: "Neuroda",
        img: PLACEHOLDER,
        byline: "An AI workplace mentor that helps young professionals think, decide and solve, not just search for answers.",
        stats: [
          { n: "30,000+", l: "early-career professionals guided" },
          { n: "15,000+", l: "workplace scenarios mapped" },
        ],
        sections: [
          {
            h: "The Problem",
            body: `In an AI-powered workplace, freshers are expected to think beyond their academic training from day one. But most struggle with everyday workplace ambiguity, situations that require judgement, experience and the ability to apply structured thinking frameworks. Conventional chatbots give answers. They don't teach you how to arrive at one.`,
          },
          {
            h: "The Design",
            body: `Like Krishna to Arjuna, Neuroda plays the role of a strategic mentor in the battlefield of work. Instead of giving direct answers, it guides users to break down complex problems, explore multiple ways of thinking, apply relevant mental models: first-principles reasoning, Pareto analysis, systems mapping, and co-create practical solutions.
The system is trained specifically on Indian workplace realities: navigating hierarchy, entrepreneurial thinking, resourcefulness under constraints and complex interpersonal dynamics. It continuously learns about each user's evolving abilities and workplace context, adapting its guidance over time.`,
          },
          {
            h: "The Innovation",
            body: `Neuroda doesn't converse in text threads. Its thinking unfolds through visual mind maps and illustrated frameworks. Users see how solutions are constructed, not just what the answer is. They internalise structured thinking patterns by watching their own reasoning take shape. The system also generates capability insights for employers, surfacing strengths like judgement, initiative and collaboration that a resume can never capture.`,
          },
        ],
      },
      {
        label: "AI x Program Operations",
        title: "Nimaya Foundation",
        img: PLACEHOLDER,
        byline: "Turning a nonprofit that trains 10,000+ women into an intelligence-driven organisation.",
        stats: [
          { n: "90%", l: "reduction in programmatic errors" },
          { n: "10,000+", l: "women trained across 4 states" },
          { n: "2x", l: "improvement in communication and reporting quality" },
          { n: "3x", l: "faster curriculum upgrade and deployment" },
        ],
        sections: [
          {
            h: "The Problem",
            body: `Nimaya, now part of the Government's India AI Mission, runs a 40-hour GenAI training program simultaneously across multiple colleges and cohorts, often upskilling 2,000 young women at a time across 5 states. Coordination spans college administrations, frequently updated curriculums, trainers, mentors, capstone partners and the learners/beneficiaries. Small human errors in attendance, skipping trainer feedback or incorrect fund utilisation statements create serious compliance risks, especially now that the program is recognised as a micro-credit under India's National Education Policy.
The organisation was solving 21st-century problems with 20th-century tools.`,
          },
          {
            h: "The Design",
            body: `I didn't automate Nimaya's workflows. I redesigned its entire operational backbone around AI, making it an AI-native organisation, not just an AI-assisted one.
The system now screens thousands of learners/beneficiaries through AI-conducted calls that evaluate motivation and career readiness, not just demographics. It generates operational plans that factor in trainer availability, college schedules and field capacity. It processes learner feedback across formats (forms, calls, WhatsApp) and produces separate reports for funders, curriculum teams and trainers. Critically, these feedback insights don't just sit in a report. They're automatically integrated into curriculum upgrade workflows, and the system tracks whether those upgrades are actually implemented.
The AI also identifies star learners, spotting patterns of exceptional ability, initiative or growth trajectory, and flags them to program managers with specific recommendations on what further support their career paths would need. Talent that would have gone unnoticed in a spreadsheet now gets surfaced and acted on.
One AI-augmented program manager now delivers 3x the output. Decisions are data-driven. The team's time has shifted from administrative firefighting to actually improving learner outcomes.`,
          },
          {
            h: "The innovation",
            body: `This isn't AI bolted onto a nonprofit. It's proof that the organisations doing the hardest work for public good can operate with the same intelligence, foresight and efficiency as a well-funded company, without losing the human judgement that makes their work matter. The template is designed to scale: what works for Nimaya becomes a playbook for any institution willing to make the leap.`,
          },
        ],
      },
      {
        label: "AI x Welfare Delivery",
        title: "Yash Chopra Foundation - Saathi Program",
        img: PLACEHOLDER,
        byline: "AI-powered welfare delivery for 5,000+ Hindi film industry workers.",
        stats: [
          { n: "7,000+", l: "beneficiaries across ration, healthcare, education and travel support" },
        ],
        sections: [
          {
            h: "The problem",
            body: `The Yash Chopra Foundation (Yash Raj Films' philanthropic arm) runs the Saathi Program, providing ration support, healthcare benefits, education assistance and travel reimbursement to daily wage workers of Bollywood. Managing claims, communications and compliance for 7,000+ beneficiaries across multiple benefit categories was heavily manual: slow to process, inconsistent in communication and difficult to scale as the program expanded to include retired and specially-abled workers.`,
          },
          {
            h: "The design",
            body: `I'm building an AI layer that handles the core operational pipeline: beneficiary communications, claims processing and compliance reporting. The system manages routine queries from workers about their entitlements and application status, processes claims with consistent evaluation criteria across categories, and generates compliance-ready reports for the Foundation's leadership. What previously required manual follow-ups across spreadsheets and phone calls now runs through an intelligent system that keeps beneficiaries informed and the program accountable.`,
          },
          {
            h: "The innovation",
            body: `The foundation's beneficiaries are film industry workers, many of them daily wage earners with limited digital literacy. The AI system had to be designed for simplicity and trust, not sophistication. The real challenge wasn't the technology; it was making sure a carpenter or a lighting technician could interact with it as naturally as they'd speak to a program coordinator. When AI serves a welfare program, the bar isn't just efficiency. It's whether the person on the other end still feels seen and heard.`,
          },
        ],
      },
    ],
  },
  {
    tab: "Crafting Learning Simulations",
    title: "Crafting Learning Simulations",
    tint: "#0E2029",
    video: "./assets/img/what-i-build/card2%20thmb.mp4",
    tags: ["Workverse", "Kamlaverse (SEWA)", "Ishara (Phoenix Hospitality)"],
    body: [
      "Simulations are a powerful tool to train the brain to do what AI cannot.",
      "I design immersive simulations where people step into realistic workplace scenarios, navigating ambiguity, making high-stakes decisions and collaborating with complex personalities. Each simulation builds the capabilities AI cannot replace: judgement, creative problem-solving and the ability to act when there is no right answer.",
    ],
    stats: [
      { n: "50,000+", l: "learners trained" },
      { n: "40+", l: "universities and organisations" },
      { n: "3", l: "virtual simulation platforms built" },
    ],
    projects: [
      {
        label: "Simulations x Employability",
        title: "Workverse",
        img: PLACEHOLDER,
        byline: "A simulated world of work where graduates master the skills AI can't replace.",
        stats: [
          { n: "60,000+", l: "graduates trained" },
          { n: "40+", l: "universities and organisations" },
          { n: "5", l: "simulated environments" },
          { n: "20+", l: "workplace characters" },
        ],
        sections: [
          {
            h: "The problem",
            body: `India produces over 4 crore graduates a year. The capabilities that will define success in an AI-driven workplace (judgement, creative problem-solving, collaboration under pressure) are the exact ones no classroom is designed to teach. Soft skills are recognised as essential by India's National Education Policy, yet for most institutions they remain a tick-box exercise. Graduates encounter real workplace dynamics for the first time only after they start working.`,
          },
          {
            h: "The design",
            body: `You can't teach resourcefulness or emotional intelligence through instruction. But you can build a world where people have no choice but to exercise it. Workverse drops learners into a startup where they enter as fresh recruits and compete to become CEO. As they progress, they work across five distinct environments, handling difficult clients, navigating office politics, managing crises with incomplete information and collaborating with over twenty different personalities, each with their own motivations and blind spots.
The experience feels like a story you're living through, not a course you're sitting through. Every scenario is written as a narrative arc with real emotional stakes. The characters respond differently depending on how you approach them. The learning happens because you're too absorbed in the situation to realise you're being trained.`,
          },
          {
            h: "The innovation",
            body: `While learners are immersed in the simulation, the system is quietly observing, tracking how they respond across scenarios to build a Workplace Intelligence Profile. This isn't a test score. It's an industry-aligned portrait of how someone thinks, decides and collaborates, drawn from their actual behaviour across dozens of situations. For the first time, graduates can show employers what they're capable of, beyond a degree certificate.`,
          },
        ],
      },
      {
        label: "Simulations x Livelihoods",
        title: "Kamlaverse (SEWA)",
        img: PLACEHOLDER,
        byline: "Training rural women to run modern cafes, without a single classroom session.",
        stats: [],
        sections: [
          {
            h: "The problem",
            body: `SEWA, the world's largest collective of self-employed women, runs a growing network of Kamla farm-to-table cafes. Thousands of women needed to be trained in modern hospitality standards, but most came from rural backgrounds with limited exposure to the kind of customer interactions a contemporary cafe demands. Traditional classroom training couldn't bridge that gap at scale: it was too slow, too abstract and too disconnected from the situations these women would actually face.`,
          },
          {
            h: "The design",
            body: `Kamlaverse recreates the Kamla cafe as an interactive simulation where participants alternate between the roles of guest and staff. They practise greeting modern customers, managing orders, handling unexpected situations and internalising service protocols, all through scenario-based role play with an AI mentor providing real-time feedback.
The design bridges two worlds: modern hospitality standards and the lived reality of rural women. Instead of written manuals or lecture-style instruction, learning happens through visual storytelling and repeated practice in situations that mirror exactly what they'll encounter on the cafe floor.`,
          },
          {
            h: "The innovation",
            body: `The breakthrough wasn't the technology. It was the adaptation. Taking modern service frameworks and re-expressing them in a language, pace and context that felt natural to women who had never worked in formal hospitality. The simulation gave them a safe space to build confidence before they ever served a real customer, and that confidence is now visible across Kamla cafes as SEWA members deliver consistent customer experiences while expanding livelihood opportunities for women across Gujarat.`,
          },
        ],
      },
      {
        label: "Simulations x Inclusion",
        title: "Isharaverse (Phoenix Hospitality)",
        img: PLACEHOLDER,
        byline: "A training simulation for a restaurant chain staffed entirely by deaf and mute professionals.",
        stats: [],
        sections: [
          {
            h: "The problem",
            body: `Phoenix Hospitality runs Ishara, a restaurant chain that employs deaf and mute staff. The challenge wasn't just hospitality training. It was rethinking how training itself works when spoken language, verbal feedback and audio cues are entirely off the table. Every assumption conventional training makes about how people receive information had to be discarded.`,
          },
          {
            h: "The design",
            body: `The simulation was rebuilt from the ground up around a fully visual and gestural interaction model. Every element (customer interactions, service protocols, feedback from the AI mentor) was redesigned to work without sound or text-heavy instruction. The interface didn't add accessibility as a feature; accessibility was the design language itself. Staff learn by doing: navigating realistic restaurant scenarios through visual cues, gestural prompts and spatial storytelling.`,
          },
          {
            h: "The innovation",
            body: `Designing for the hardest constraint first unlocked something larger. The visual-first training language turned out to be more intuitive for all learners, not just deaf and mute staff. What began as an inclusion challenge became a proof point: when you design for the edges, the centre benefits too.`,
          },
        ],
      },
    ],
  },
  {
    tab: "Building Movements for Behavioural Change",
    title: "Building Movements for Behavioural Change",
    tint: "#231A2C",
    img: "./assets/img/what-i-build/card3%20thmb.png",
    tags: ["UN Young Changemakers Conclave", "Operation Black Dot", "Election Commission of India", "Green Batti Project"],
    body: [
      "When behavioural science, influencers and storytelling meet, millions shift how they think and act. I build movements that shape how people engage with critical cause areas such as preventive healthcare, financial inclusion, education and nutrition.",
      "Beyond movements, I convene unlikely combinations for dialogue: world leaders alongside comedians, Bollywood icons with grassroots sarpanchs, designing conversations that turn awareness into action.",
    ],
    stats: [
      { n: "300,000+", l: "rural citizens engaged for movements on anaemia, ration intake and COVID protocols" },
      { n: "100,000+", l: "youth mobilised for civic engagement" },
      { n: "20", l: "national youth conclaves with the UN" },
      { n: "100+", l: "global speakers convened" },
    ],
    projects: [
      {
        label: "#BanoIronNaari",
        title: "#BanoIronNaari - Government of Uttar Pradesh",
        img: PLACEHOLDER,
        byline: "A behavioural campaign that turned anaemia awareness into action for rural women across the state of Uttar Pradesh",
        stats: [
          { n: "100,000+", l: "enquiries generated for nearest anaemia testing clinics" },
          { n: "3", l: "distinct audience segments targeted with tailored messaging" },
          { n: "Distributed", l: "across anganwadi networks statewide" },
        ],
        sections: [
          {
            h: "The problem",
            body: `Anaemia is widespread across Uttar Pradesh, but awareness alone wasn't the barrier. Rural women knew iron deficiency was a problem. What was missing was a clear, emotionally compelling path from knowing to doing. No one was connecting the medical reality to the daily choices these women were already making.`,
          },
          {
            h: "The design",
            body: `I brought together behavioural scientists, storytellers and Bollywood actress Sara Ali Khan to build a series of videos grounded in behavioural science, specifically the theory of incentives and loss aversion. Rather than a single generic message, the campaign created three distinct narratives for three distinct realities: adolescent girls, pregnant women and young mothers. Each video made the consequences of inaction vivid and the path to action simple.
But the videos were only the trigger. We trained ASHA workers across anganwadis (the village-level ecosystems where these women already gather) to distribute the content and start offline conversations. The videos opened the door; the human follow-up walked women through it, nudging them to get tested and start a supplement plan supported by the government.`,
          },
          {
            h: "The innovation",
            body: `Most public health campaigns broadcast a message and hope it lands. This one was designed as a behavioural chain: celebrity attention captures interest, loss aversion creates urgency, and a trusted frontline worker converts that urgency into a clinic visit. Every link in the chain was deliberate. The result: 100,000+ women didn't just watch a video. They asked where to get tested.`,
          },
        ],
      },
      {
        label: "#GourmetRation",
        title: "#GourmetRation - Government of Uttar Pradesh",
        img: PLACEHOLDER,
        byline: "Turning government ration kits from something children refuse into something they ask for.",
        stats: [],
        sections: [
          {
            h: "The problem",
            body: `Young children in rural Uttar Pradesh were rejecting food made from government-provided ration. Thanks to social media exposure, even children in remote areas had awareness of more tempting dietary options: chips, packaged snacks, branded drinks. Mothers struggled to feed their children nutritious meals when the raw ingredients looked and tasted boring by comparison. The government had just launched new ration kits that included healthy millets, but uptake was sluggish. The nutrition was right, but the appeal was missing.`,
          },
          {
            h: "The design",
            body: `I brought together master chefs Ranveer Brar and Pooja Dhingra to take the actual ration kit ingredients and create dishes that looked and tasted like something a child would choose, not something they'd be forced to eat. Then I partnered with behavioural scientists and creative writers to build a series of videos featuring the chefs, showing mothers step by step how to transform seemingly boring ration items into inviting meals.
The videos were distributed to lakhs of rural households through anganwadi networks and frontline workers, the same trusted channels these mothers already interacted with. The format was designed for shareability: short, visual, recipe-driven, with chefs who carried credibility across both urban and rural audiences.`,
          },
          {
            h: "The innovation",
            body: `The insight was that the problem was never nutrition. It was perception. Children weren't malnourished because ration was unavailable. They were malnourished because ration couldn't compete with what social media made desirable. Instead of fighting that reality, we co-opted it, using the same celebrity-driven, visually aspirational format that makes junk food appealing, but pointed at millets and government ration. Behavioural science applied not to the mother's compliance, but to the child's desire.`,
          },
        ],
      },
      {
        label: "United Nations Young Changemakers Conclave",
        title: "United Nations Young Changemakers Conclave",
        img: PLACEHOLDER,
        byline: "A national platform that made achieving the Sustainable Development Goals feel personal and aspirational for young Indians.",
        stats: [
          { n: "20", l: "successive national conclaves" },
          { n: "100+", l: "global speakers convened" },
          { n: "400,000+", l: "youth engaged" },
        ],
        sections: [
          {
            h: "The problem",
            body: `The United Nations India office wanted to mobilise young people around the Sustainable Development Goals. But the conversation was stuck inside a bubble, limited to youth already active in the development sector and policy professionals. For the wider population, global development felt distant, overly technical and uninspiring. A new format was needed to make these issues feel relevant, engaging and worth showing up for.`,
          },
          {
            h: "The design",
            body: `I designed the Conclave as a festival of ideas rather than a policy conference. Every element was a deliberate break from convention.
Unlikely combinations: Nobel laureate Muhammad Yunus alongside Bollywood actor Kareena Kapoor. Former Canadian Prime Minister Justin Trudeau in conversation with women sarpanchs from rural India. Entrepreneurs like Upgrad's Ronnie Screwvala and Zerodha's Nikhil Kamath sharing a stage with grassroots changemakers from tier-2 towns. A leading comedian role-playing as Environment Minister to explore climate policy. These are pairings that would never happen at a traditional UN event, generating the kind of narratives that travel far beyond the room.
Aspirational access: Hosted at venues like the Indian Navy's seaside gardens and the US Consulate's lawns, creating an informal yet prestigious environment where young people from low-income institutions felt they belonged in the same conversation as the people they'd only ever seen on screens.`,
          },
          {
            h: "The innovation",
            body: `The Conclave proved that global development conversations don't need to be solemn to be serious. By treating the SDGs as cultural material, not policy material, the platform attracted 400,000+ applications from young people who would never have attended a traditional UN event. The format democratised participation without diluting substance.`,
          },
        ],
      },
      {
        label: "Operation Black Dot",
        title: "Operation Black Dot (in partnership with Election Commission of India)",
        img: PLACEHOLDER,
        byline: "A youth-led movement that turned voting from a civic duty into a cultural act.",
        stats: [
          { n: "100,000+", l: "youth engaged" },
          { n: "60", l: "college campuses" },
          { n: "50+", l: "celebrity influencers and 10+ consumer brands" },
          { n: "15+", l: "political leaders across party lines" },
        ],
        sections: [
          {
            h: "The Problem",
            body: `Urban upper-income youth in India weren't voting. Not out of apathy exactly, but because the system felt irrelevant: they didn't know the candidates, the registration process was cumbersome, and participating in elections was widely perceived as uncool. The challenge wasn't awareness; it was identity. Voting needed to become something this demographic wanted to be seen doing.`,
          },
          {
            h: "The Design",
            body: `Operation Black Dot was built around three behavioural pillars (awareness, advocacy, action) with interventions designed to dismantle each barrier:
Awareness: Informal "on-the-beanbag" dialogues between students and Members of Parliament at popular youth hangouts, stripping away the formality that made politics feel alien. Presence at major youth festivals like NH7 Weekender, meeting young people where they already were.
Advocacy: Partnership with the Election Commission of India to enable voter ID registration directly from college campuses through an interactive app, removing the logistical excuse.
Action: Collaboration with Tata Nano to provide transport to polling booths, eliminating the last-mile barrier on voting day. "Black Dot" celebration parties at Hard Rock Cafe after voting, making the ink mark on your finger a badge of honour, not just a smudge.`,
          },
          {
            h: "The Innovation",
            body: `The movement didn't lecture people about civic duty. It reframed voting as a social and cultural act, something aspirational rather than obligatory. The innovation was behavioural, not technological: understanding that for this demographic, the barriers were identity-based, not information-based, and designing every intervention around that insight.`,
          },
        ],
      },
      {
        label: "Moonshot Philanthropy Summit",
        title: "Moonshot Philanthropy Summit (In collaboration with Ashoka University)",
        img: PLACEHOLDER,
        byline: "Convincing India's philanthropists to fund impact organisations the way VCs fund startups.",
        stats: [],
        sections: [
          {
            h: "The problem",
            body: `India's CSR spending exceeds Rs. 25,000 crore annually, yet the vast majority flows into conventional, output-driven interventions: building schools, funding treatments, constructing infrastructure. Many of the problems this funding tries to solve (malnutrition, vaccine hesitancy, financial exclusion) are rooted in human behaviour, not just access gaps. Meanwhile, the tools that could transform impact delivery (behavioural science, AI, digital storytelling) remain fragmented and underfunded. There is a confidence gap: philanthropists don't yet see how these approaches can deliver measurable, scalable returns on impact.`,
          },
          {
            h: "The design",
            body: `The Summit is designed to shift philanthropic thinking: from funding what exists to funding what is possible. The format brings together evidence, emotion and imagination in a single room:
Collisions: the summit seats VCs and startup founders alongside NGO leaders and philanthropists. AI experts alongside frontline workers. The conversations that emerge aren't panel discussions. They're exchanges where moonshot thinking meets ground reality, where bold investment metrics meet the complexity of last-mile delivery, and where the people building the future of technology sit across from the people who know what communities actually need.
Live case narratives: beneficiaries and project leads share the journey from behavioural insight to intervention to outcome, making the case through human stories, not just data.
Vision lab: unfunded, high-potential moonshot ideas presented to provoke ambition: AI-powered domestic violence support, behavioural nudges for climate-conscious consumption, personalised financial literacy for first-time earners.`,
          },
          {
            h: "The innovation",
            body: `Most philanthropy funds outcomes. This summit asks funders to invest in upgrading the systems and investment mindsets that produce outcomes, at the intersection of behavioural science, AI and storytelling.
Two shifts emerged from these dialogues. First, a reimagining of impact metrics, moving beyond outputs (children enrolled, meals served) toward measures that capture whether behaviour, capability and systems actually changed. Second, a new way of thinking about technology in development: not AI imposed from the outside or from a single discipline's vantage point, but AI and emerging tech integrated into localised solutions, shaped by the context they serve rather than the lab they came from.
The reframe isn't subtle: the highest-leverage investment isn't another school or hospital. It's the behavioural and technological infrastructure that makes schools and hospitals actually work.`,
          },
        ],
      },
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
      <button class="wib-card__more" type="button" data-more="${i}">
        <span class="wib-card__more-label">Read More</span>
        <span class="wib-card__more-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>
        </span>
      </button>
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

  /* size the stack to the TALLEST card's natural content height. Cards are
     position:absolute (overlapping) once GSAP takes over, so they can't drive
     the container height themselves — we lay them out in flow briefly, take the
     max offsetHeight, and pin the stack to it. */
  const MEDIA_RATIO = 3 / 5;   // media width : height (3:5 portrait)
  const sizeStack = () => {
    stackEl.classList.add("wib__stack--measuring");
    const cs = getComputedStyle(cards[0]);
    const frameY =              // card vertical padding + borders (card box -> media box)
      parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) +
      parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    /* circular sizing: media width depends on card height, card height depends on how
       text wraps in the width the media leaves. Iterate a few times until it settles. */
    let mediaW = parseFloat(getComputedStyle(stackEl).getPropertyValue("--wib-media-w")) || 280;
    let max = 0;
    for (let pass = 0; pass < 5; pass++) {
      stackEl.style.setProperty("--wib-media-w", mediaW + "px");
      max = 0;
      for (const c of cards) max = Math.max(max, c.offsetHeight);
      const next = Math.round(Math.max(max - frameY, 0) * MEDIA_RATIO);
      if (Math.abs(next - mediaW) <= 1) { mediaW = next; break; }
      mediaW = next;
    }
    stackEl.classList.remove("wib__stack--measuring");
    if (max) stackEl.style.height = Math.ceil(max) + "px";
    stackEl.style.setProperty("--wib-media-w", mediaW + "px");
  };

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

  // size the stack before cards go absolute, and re-measure once fonts settle
  // (glyph metrics change line counts → height) and on resize (fluid type/width).
  sizeStack();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeStack);

  // stacked: card 0 in place, the rest already opaque (y set per-segment below)
  gsap.set(cards, { position: "absolute", inset: 0 });
  gsap.set(cards, { autoAlpha: 1, scale: 1, y: 0 });
  setActiveTab(0);

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { sizeStack(); ScrollTrigger.refresh(); }, 150);
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: pinEl,
      start: "top top",
      end: () => "+=" + window.innerHeight * (n - 1),   // function → survives innerHeight=0 at init
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
