const regions = {
  global: {
    meta: "Global view",
    title: "Start with the whole planet.",
    summary:
      "This map mixes two effective-altruist questions: where is suffering concentrated, and where can people or institutions in a region alter the largest outcomes?",
    lens: "Scale, neglect, leverage",
    pressure: "Burden and influence do not sit in the same places",
    footnote:
      "Wealthier regions often show up here because of policy and institutional leverage. Poorer regions more often show up because the direct welfare burden is still enormous.",
    issues: [
      {
        tag: "Human welfare",
        title: "Malaria and child survival",
        body: "A tractable, preventable burden still falls heavily on children, especially in sub-Saharan Africa.",
        response: "Back delivery systems that actually reach children: bednets, seasonal prevention, treatment access.",
      },
      {
        tag: "Animals",
        title: "Industrial animal agriculture",
        body: "A vast amount of suffering remains hidden inside food systems, especially in poultry, fish, and shrimp production.",
        response: "Cut demand, push welfare reforms, and treat animal numbers as morally relevant rather than background noise.",
      },
      {
        tag: "Systems",
        title: "Pandemic preparedness and frontier governance",
        body: "A small number of regions house institutions that can shape catastrophic-risk policy for everyone else.",
        response: "Support better oversight, better preparedness, and better coordination before crises arrive.",
      },
    ],
  },
  "north-america": {
    meta: "North America",
    title: "Power sits here, so governance issues rise.",
    summary:
      "From an EA lens, North America matters less because of local disease burden and more because of labs, capital, large firms, and political institutions with global reach.",
    lens: "Leverage over global systems",
    pressure: "Policy, capital, compute, animal agriculture",
    footnote:
      "The claim is not that North America suffers most locally. It is that decisions made here can spill outward across the planet.",
    issues: [
      {
        tag: "Governance",
        title: "AI oversight and frontier model governance",
        body: "A large share of frontier AI capacity, funding, and policy debate is concentrated here.",
        response: "Push for stronger oversight, evaluation, and institutional competence before capabilities outpace controls.",
      },
      {
        tag: "Biosecurity",
        title: "Pandemic preparedness",
        body: "Research capacity and international coordination leverage are both unusually high in this region.",
        response: "Strengthen surveillance, indoor air standards, vaccine readiness, and emergency institutions.",
      },
      {
        tag: "Animals",
        title: "Industrial meat and procurement defaults",
        body: "Large-scale poultry and livestock systems still turn cheap food into hidden suffering.",
        response: "Change procurement defaults and push corporate standards rather than treating food choices as purely private.",
      },
    ],
  },
  "south-america": {
    meta: "Latin America",
    title: "Violence, state capacity, and ecological leverage.",
    summary:
      "This region combines serious harms from organized violence and weak institutions with globally significant ecological and food-system spillovers.",
    lens: "Institutional fragility plus ecological leverage",
    pressure: "Violence, forests, food systems",
    footnote:
      "This is a coarse regional sketch. The main point is that human welfare, ecological stability, and animal welfare can all be live at once here.",
    issues: [
      {
        tag: "Human welfare",
        title: "Violence and criminal governance",
        body: "Organized crime and weak institutions can dominate daily life and distort development for millions.",
        response: "Support state-capacity improvements, violence prevention, and institutions that reduce coercive control.",
      },
      {
        tag: "Climate",
        title: "Deforestation and land-use pressure",
        body: "Forest loss, especially around the Amazon, creates global climate and biodiversity costs far beyond the region.",
        response: "Back enforcement, indigenous land protection, and policies that reduce destructive land conversion.",
      },
      {
        tag: "Animals",
        title: "Poultry and fish welfare",
        body: "Growing animal production means many moral patients can be harmed by ordinary food-system choices.",
        response: "Support welfare standards and demand shifts before poor defaults harden further.",
      },
    ],
  },
  europe: {
    meta: "Europe",
    title: "Regulatory leverage is the main story.",
    summary:
      "Europe's strongest EA case is often indirect: regulation, procurement, aid, and trade standards here can shape outcomes well beyond Europe itself.",
    lens: "Policy leverage",
    pressure: "Regulation, standards, diplomacy",
    footnote:
      "Low direct burden does not imply low priority if the rulemaking leverage is unusually high.",
    issues: [
      {
        tag: "Governance",
        title: "AI and biotech regulation",
        body: "Europe has disproportionate influence over safety standards, compliance norms, and institutional design.",
        response: "Use that leverage for credible safety regimes rather than shallow performative rules.",
      },
      {
        tag: "Animals",
        title: "Farmed-animal welfare reform",
        body: "Retail and regulatory decisions in Europe can change conditions for very large numbers of animals.",
        response: "Push cage-free, broiler, fish, and procurement reforms that move entire sectors.",
      },
      {
        tag: "Human welfare",
        title: "Aid architecture and refugee policy",
        body: "Funding choices and border policy can strongly affect vulnerable people far beyond Europe's borders.",
        response: "Favor humane asylum systems and evidence-based development spending over symbolic politics.",
      },
    ],
  },
  africa: {
    meta: "Africa",
    title: "Some of the clearest cases of preventable suffering.",
    summary:
      "This coarse region mostly points toward sub-Saharan Africa, where malaria, child mortality, undernutrition, and toxic exposure still create enormous and tractable human losses.",
    lens: "Acute welfare burden",
    pressure: "Child survival, poverty, health access",
    footnote:
      "The continent is not morally homogeneous. This panel compresses large internal variation for a high-level map.",
    issues: [
      {
        tag: "Human welfare",
        title: "Malaria and child survival",
        body: "Malaria still falls overwhelmingly on African children and remains unusually tractable relative to the suffering involved.",
        response: "Invest in bednets, prevention, treatment access, and delivery systems that reach remote households.",
      },
      {
        tag: "Health",
        title: "Lead exposure and dirty air",
        body: "Toxic exposures and polluted air can quietly damage cognition, health, and lifetime outcomes at massive scale.",
        response: "Support lead remediation, cleaner fuels, and environmental-health interventions that are still underfunded.",
      },
      {
        tag: "Poverty",
        title: "Extreme poverty and undernutrition",
        body: "Cash constraints and poor access to basic services still produce large, preventable losses in wellbeing.",
        response: "Use direct transfers and highly evidenced health and nutrition programs where implementation is strong.",
      },
    ],
  },
  "middle-east": {
    meta: "Middle East and North Africa",
    title: "Conflict turns ordinary problems into collapses.",
    summary:
      "In an EA frame, the region's most pressing issues are often the ones that rapidly destroy health systems: war, displacement, outbreaks, and water stress.",
    lens: "Conflict and fragility",
    pressure: "Displacement, service collapse, climate stress",
    footnote:
      "In fragile settings, interventions that preserve health access or put cash in people's hands can become unusually valuable very quickly.",
    issues: [
      {
        tag: "Human welfare",
        title: "Conflict and displacement",
        body: "War displaces families, destroys infrastructure, and creates long tails of trauma and poverty.",
        response: "Prioritize civilian protection, humanitarian access, and fast, flexible assistance that reaches people in motion.",
      },
      {
        tag: "Health",
        title: "Health-system interruption and outbreaks",
        body: "When clinics collapse, treatable diseases and maternal risks become much deadlier.",
        response: "Support emergency health logistics, vaccination continuity, and outbreak response capacity.",
      },
      {
        tag: "Climate",
        title: "Water insecurity and extreme heat",
        body: "Heat and water stress compound fragile politics and make everyday survival harder.",
        response: "Back resilience, cooling, and water-access work where institutions can actually deliver.",
      },
    ],
  },
  "south-asia": {
    meta: "South Asia",
    title: "Huge population, chronic exposures, rising animal scale.",
    summary:
      "The moral weight here comes from very large numbers of people living with persistent harms, plus food systems that can affect staggering numbers of animals.",
    lens: "Scale",
    pressure: "Air, toxins, heat, animals",
    footnote:
      "Many of the harms in South Asia are chronic rather than spectacular, which is one reason they remain easy to underrate.",
    issues: [
      {
        tag: "Health",
        title: "Air pollution",
        body: "Air pollution remains one of the region's largest contributors to disease burden and early death.",
        response: "Treat clean air as a first-order public-health intervention rather than an aesthetic preference.",
      },
      {
        tag: "Health",
        title: "Lead exposure and industrial contamination",
        body: "Hidden toxic exposure can do irreversible damage at enormous scale, especially for children.",
        response: "Push lead regulation, safer recycling, and enforcement that actually removes exposure pathways.",
      },
      {
        tag: "Animals",
        title: "Rapidly scaling poultry and aquaculture",
        body: "As demand grows, huge numbers of animals can enter systems with poor welfare by default.",
        response: "Build welfare standards early instead of waiting for cruel norms to become entrenched.",
      },
    ],
  },
  "east-asia": {
    meta: "East and Southeast Asia",
    title: "Animal numbers and systemic risks dominate.",
    summary:
      "This region matters heavily for aquatic animal scale, dense urban-industrial systems, and technologies that can spill across borders.",
    lens: "Animal scale plus systemic risk",
    pressure: "Aquaculture, pandemics, dense industry",
    footnote:
      "A region can be simultaneously a human-health priority, an animal-welfare priority, and a governance priority.",
    issues: [
      {
        tag: "Animals",
        title: "Fish and shrimp welfare at extreme scale",
        body: "Aquatic food systems can involve very large numbers of sentient beings, even when each individual looks easy to ignore.",
        response: "Take invertebrate and fish uncertainty seriously and push for welfare improvements before scale grows further.",
      },
      {
        tag: "Biosecurity",
        title: "Pandemic surveillance and preparedness",
        body: "Dense populations, trade, and livestock interfaces make early detection and response unusually important.",
        response: "Improve surveillance, reporting, lab safety, and regional coordination before emergencies spread.",
      },
      {
        tag: "Health",
        title: "Urban air pollution and industrial exposure",
        body: "Chronic exposure in dense urban corridors can quietly remove huge amounts of healthy life.",
        response: "Treat emissions control and clean energy as direct health policy, not just climate policy.",
      },
    ],
  },
  oceania: {
    meta: "Oceania",
    title: "Small population, outsized regional stewardship.",
    summary:
      "The strongest EA case in Oceania is usually about what the region can do for neighbors and for global preparedness rather than local burden alone.",
    lens: "Preparedness and regional support",
    pressure: "Biosecurity, Pacific resilience, animal systems",
    footnote:
      "The region matters partly because competent institutions can act early and help nearby countries with fewer buffers.",
    issues: [
      {
        tag: "Biosecurity",
        title: "Biosecurity and pandemic preparedness",
        body: "Island geography and strong institutions make preparation and containment unusually tractable.",
        response: "Invest early in surveillance, indoor air, and response capacity while systems are still manageable.",
      },
      {
        tag: "Climate",
        title: "Climate resilience for Pacific communities",
        body: "Nearby island states face acute climate exposure despite contributing little to the underlying damage.",
        response: "Fund adaptation, relocation support, and infrastructure that protects communities before crisis becomes forced migration.",
      },
      {
        tag: "Animals",
        title: "Animal farming and live-export welfare",
        body: "Local industry choices can create severe suffering for animals even in a relatively wealthy region.",
        response: "Push better welfare rules and reduce dependence on practices built around invisibility.",
      },
    ],
  },
};

const regionOrder = [
  "global",
  "north-america",
  "south-america",
  "europe",
  "africa",
  "middle-east",
  "south-asia",
  "east-asia",
  "oceania",
];

const regionLabels = {
  global: "Global",
  "north-america": "North America",
  "south-america": "Latin America",
  europe: "Europe",
  africa: "Africa",
  "middle-east": "Middle East & North Africa",
  "south-asia": "South Asia",
  "east-asia": "East & Southeast Asia",
  oceania: "Oceania",
};

const switcher = document.getElementById("region-switcher");
const meta = document.getElementById("region-meta");
const title = document.getElementById("region-title");
const summary = document.getElementById("region-summary");
const lens = document.getElementById("region-lens");
const pressure = document.getElementById("region-pressure");
const issues = document.getElementById("issues");
const footnote = document.getElementById("region-footnote");
const svgRegions = document.querySelectorAll(".region-group");

let activeRegion = "global";

function buildSwitcher() {
  const fragment = document.createDocumentFragment();

  for (const regionId of regionOrder) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "region-pill";
    button.dataset.region = regionId;
    button.textContent = regionLabels[regionId];
    button.addEventListener("click", () => setActiveRegion(regionId));
    fragment.appendChild(button);
  }

  switcher.appendChild(fragment);
}

function renderIssues(region) {
  issues.textContent = "";

  for (const issue of region.issues) {
    const card = document.createElement("article");
    card.className = "issue-card";
    card.innerHTML = `
      <p class="issue-tag">${issue.tag}</p>
      <h3>${issue.title}</h3>
      <p>${issue.body}</p>
      <p class="issue-response"><span>EA response:</span> ${issue.response}</p>
    `;
    issues.appendChild(card);
  }
}

function updateSelectionState() {
  for (const button of switcher.querySelectorAll(".region-pill")) {
    const isActive = button.dataset.region === activeRegion;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }

  for (const regionNode of svgRegions) {
    regionNode.classList.toggle("active", regionNode.dataset.region === activeRegion);
  }
}

function setActiveRegion(regionId) {
  activeRegion = regionId;
  const region = regions[regionId];

  meta.textContent = region.meta;
  title.textContent = region.title;
  summary.textContent = region.summary;
  lens.textContent = region.lens;
  pressure.textContent = region.pressure;
  footnote.textContent = region.footnote;

  renderIssues(region);
  updateSelectionState();
}

for (const regionNode of svgRegions) {
  regionNode.addEventListener("click", () => setActiveRegion(regionNode.dataset.region));
  regionNode.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setActiveRegion(regionNode.dataset.region);
    }
  });
}

buildSwitcher();
setActiveRegion(activeRegion);
